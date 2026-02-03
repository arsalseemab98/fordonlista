'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchBiluppgifterComplete } from '@/lib/biluppgifter/fetch-biluppgifter'

export interface SoldCarWithBuyer {
  id: number
  blocket_id: number | null
  regnummer: string
  // Säljdata
  slutpris: number | null
  liggtid_dagar: number | null
  saljare_typ: string | null
  saljare_namn: string | null
  sold_at: string | null
  // Bildata
  marke: string | null
  modell: string | null
  arsmodell: number | null
  miltal: number | null
  // Köpardata
  kopare_namn: string | null
  kopare_typ: string | null
  kopare_is_dealer: boolean
  kopare_alder: number | null
  kopare_adress: string | null
  kopare_postnummer: string | null
  kopare_postort: string | null
  kopare_telefon: string | null
  kopare_fordon: Array<{
    regnr: string
    model?: string
    year?: number
    ownership_time?: string
  }> | null
  adress_fordon: Array<{
    regnr: string
    model?: string
    year?: number
    status?: string
  }> | null
  buyer_fetched_at: string | null
  // Ägarbyte status
  agarbyte_gjort: boolean | null  // null=ej kollat, true=bekräftat, false=inte såld
}

/**
 * Normalisera namn för jämförelse
 * Tar bort AB, HB, etc och gör lowercase
 */
function normalizeNameForComparison(name?: string | null): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\s*(ab|hb|kb|ek\.?\s*för\.?|handelsbolag|aktiebolag|kommanditbolag)\s*/gi, '')
    .replace(/[^a-zåäö0-9]/g, '')
    .trim()
}

/**
 * Jämför två namn för att se om det är samma person/företag
 */
function isSameOwner(sellerName?: string | null, buyerName?: string | null): boolean {
  const normalized1 = normalizeNameForComparison(sellerName)
  const normalized2 = normalizeNameForComparison(buyerName)

  if (!normalized1 || !normalized2) return false

  // Exakt match
  if (normalized1 === normalized2) return true

  // Ett namn innehåller det andra (t.ex. "Johan" vs "Johan Andersson")
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    // Kräv minst 5 tecken för att undvika falska positiva
    const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2
    if (shorter.length >= 5) return true
  }

  return false
}

/**
 * Hämta köpardata för en såld bil
 * Anropas efter att bilen markerats som såld på Blocket
 */
export async function fetchBuyerForSoldCar(regnummer: string): Promise<{
  success: boolean
  data?: SoldCarWithBuyer
  error?: string
}> {
  const supabase = await createClient()
  const regnr = regnummer.toUpperCase().replace(/\s/g, '')

  // Hämta biluppgifter (ny ägare = köparen)
  const buResult = await fetchBiluppgifterComplete(regnr)

  if (!buResult.success) {
    return { success: false, error: buResult.error || 'Kunde inte hämta biluppgifter' }
  }

  // Returnera köpardata
  return {
    success: true,
    data: {
      id: 0,
      blocket_id: null,
      regnummer: regnr,
      slutpris: null,
      liggtid_dagar: null,
      saljare_typ: null,
      saljare_namn: null,
      sold_at: null,
      marke: null,
      modell: null,
      arsmodell: null,
      miltal: null,
      kopare_namn: buResult.owner_name || null,
      kopare_typ: buResult.is_dealer ? 'handlare' : 'privatperson',
      kopare_is_dealer: buResult.is_dealer || false,
      kopare_alder: buResult.owner_age || null,
      kopare_adress: buResult.owner_address || null,
      kopare_postnummer: buResult.owner_postal_code || null,
      kopare_postort: buResult.owner_postal_city || null,
      kopare_telefon: buResult.owner_phone || null,
      kopare_fordon: buResult.owner_vehicles || null,
      adress_fordon: buResult.address_vehicles || null,
      buyer_fetched_at: new Date().toISOString(),
      agarbyte_gjort: null, // Okänt vid manuell hämtning
    }
  }
}

/**
 * Processa sålda bilar och hämta köpardata
 * Körs som cron-jobb, hämtar för bilar sålda för 7-90 dagar sedan
 * Om inget ägarbyte efter 90 dagar = bilen anses inte vara såld
 */
export async function processSoldCarsForBuyers(limit: number = 10): Promise<{
  success: boolean
  processed: number
  noOwnerChange: number
  errors: string[]
}> {
  const supabase = await createClient()

  // Hitta sålda bilar som:
  // 1. Har regnummer
  // 2. Sålda för 7-90 dagar sedan (tid för omregistrering)
  // 3. Inte redan har köpardata i blocket_salda
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  // Hämta sålda bilar från blocket_annonser
  const { data: soldAds, error: queryError } = await supabase
    .from('blocket_annonser')
    .select('id, regnummer, marke, modell, arsmodell, miltal, pris, saljare_typ, saljare_namn, forst_sedd, borttagen')
    .eq('borttagen_anledning', 'SÅLD')
    .not('regnummer', 'is', null)
    .gte('borttagen', ninetyDaysAgo.toISOString())
    .lte('borttagen', sevenDaysAgo.toISOString())
    .order('borttagen', { ascending: false })
    .limit(limit * 2) // Hämta fler för att filtrera

  if (queryError || !soldAds) {
    return { success: false, processed: 0, noOwnerChange: 0, errors: [queryError?.message || 'Query failed'] }
  }

  // Filtrera bort de som redan har köpardata
  const regnummers = soldAds.map(a => a.regnummer.toUpperCase())
  const { data: existing } = await supabase
    .from('blocket_salda')
    .select('regnummer')
    .in('regnummer', regnummers)

  const existingSet = new Set(existing?.map(e => e.regnummer) || [])
  const adsToProcess = soldAds
    .filter(a => !existingSet.has(a.regnummer.toUpperCase()))
    .slice(0, limit)

  if (adsToProcess.length === 0) {
    return { success: true, processed: 0, noOwnerChange: 0, errors: [] }
  }

  let processed = 0
  let noOwnerChange = 0
  const errors: string[] = []

  for (const ad of adsToProcess) {
    try {
      const regnr = ad.regnummer.toUpperCase().replace(/\s/g, '')

      // STEG 1: Hämta ORIGINAL ägare från biluppgifter_data (sparad när annonsen var aktiv)
      const { data: originalBuData } = await supabase
        .from('biluppgifter_data')
        .select('owner_name')
        .eq('blocket_id', ad.id)
        .single()

      const originalOwnerName = originalBuData?.owner_name || null

      // STEG 2: Hämta NUVARANDE ägare från biluppgifter (efter försäljning)
      const buResult = await fetchBiluppgifterComplete(regnr)

      if (!buResult.success) {
        errors.push(`${regnr}: ${buResult.error}`)
        continue
      }

      const currentOwnerName = buResult.owner_name || null

      // Beräkna liggtid
      const liggtidDagar = ad.forst_sedd && ad.borttagen
        ? Math.floor((new Date(ad.borttagen).getTime() - new Date(ad.forst_sedd).getTime()) / (1000 * 60 * 60 * 24))
        : null

      // Beräkna dagar sedan såld
      const daysSinceSold = ad.borttagen
        ? Math.floor((Date.now() - new Date(ad.borttagen).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      // STEG 3: Jämför ORIGINAL ägare med NUVARANDE ägare
      // Om vi inte har original-data, använd Blocket saljare_namn som fallback
      const sellerName = originalOwnerName || ad.saljare_namn || null

      // Avgör ägarbyte-status:
      // - Om samma ägare efter 90+ dagar = inte såld (agarbyte_gjort = false)
      // - Om samma ägare men < 90 dagar = vänta (skippa för nu, kolla igen senare)
      // - Om olika ägare = ägarbyte bekräftat (agarbyte_gjort = true)
      const sameOwner = isSameOwner(sellerName, currentOwnerName)

      // Om vi inte har original-data OCH inte Blocket-namn, anta ägarbyte (kan inte verifiera)
      const canVerify = sellerName !== null

      if (canVerify && sameOwner && daysSinceSold < 90) {
        // Fortfarande för tidigt, skippa och kolla igen senare
        continue
      }

      // Om vi kan verifiera: kolla om samma ägare
      // Om vi INTE kan verifiera: anta att ägarbyte skett (optimistiskt)
      const agarbyteGjort = canVerify ? !sameOwner : true

      if (!agarbyteGjort) {
        noOwnerChange++
      }

      // Spara i blocket_salda
      const { error: insertError } = await supabase
        .from('blocket_salda')
        .insert({
          blocket_id: ad.id,
          regnummer: regnr,
          // Säljdata (original ägare = säljaren)
          slutpris: ad.pris,
          liggtid_dagar: liggtidDagar,
          saljare_typ: ad.saljare_typ,
          saljare_namn: sellerName,  // Från biluppgifter_data eller Blocket
          sold_at: ad.borttagen,
          // Bildata
          marke: ad.marke,
          modell: ad.modell,
          arsmodell: ad.arsmodell,
          miltal: ad.miltal,
          // Köpardata (nuvarande ägare = köparen)
          kopare_namn: currentOwnerName,
          kopare_typ: buResult.is_dealer ? 'handlare' : 'privatperson',
          kopare_is_dealer: buResult.is_dealer || false,
          kopare_alder: buResult.owner_age,
          kopare_adress: buResult.owner_address,
          kopare_postnummer: buResult.owner_postal_code,
          kopare_postort: buResult.owner_postal_city,
          kopare_telefon: buResult.owner_phone,
          kopare_fordon: buResult.owner_vehicles || [],
          adress_fordon: buResult.address_vehicles || [],
          buyer_fetched_at: new Date().toISOString(),
          // Ägarbyte status
          agarbyte_gjort: agarbyteGjort,
        })

      if (insertError) {
        errors.push(`${regnr}: ${insertError.message}`)
        continue
      }

      processed++

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500))

    } catch (error) {
      errors.push(`${ad.regnummer}: ${String(error)}`)
    }
  }

  return { success: true, processed, noOwnerChange, errors }
}

/**
 * Hämta alla sålda bilar med köpardata
 */
export async function getSoldCarsWithBuyers(options?: {
  limit?: number
  kopareTyp?: 'privatperson' | 'handlare' | 'företag'
  onlyDealerBuyers?: boolean
}): Promise<SoldCarWithBuyer[]> {
  const supabase = await createClient()

  let query = supabase
    .from('blocket_salda')
    .select('*')
    .order('sold_at', { ascending: false })

  if (options?.kopareTyp) {
    query = query.eq('kopare_typ', options.kopareTyp)
  }

  if (options?.onlyDealerBuyers) {
    query = query.eq('kopare_is_dealer', true)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching sold cars:', error)
    return []
  }

  return data || []
}

/**
 * Statistik för sålda bilar
 */
export async function getSoldCarsStats(): Promise<{
  total: number
  agarbyteGjort: number
  ejAgarbyte: number
  privatTillPrivat: number
  privatTillHandlare: number
  handlareTillPrivat: number
  avgLiggtid: number
  avgPrissankning: number
}> {
  const supabase = await createClient()

  const { data: soldCars } = await supabase
    .from('blocket_salda')
    .select('saljare_typ, kopare_typ, kopare_is_dealer, liggtid_dagar, agarbyte_gjort')

  if (!soldCars || soldCars.length === 0) {
    return {
      total: 0,
      agarbyteGjort: 0,
      ejAgarbyte: 0,
      privatTillPrivat: 0,
      privatTillHandlare: 0,
      handlareTillPrivat: 0,
      avgLiggtid: 0,
      avgPrissankning: 0,
    }
  }

  const total = soldCars.length
  const agarbyteGjort = soldCars.filter(c => c.agarbyte_gjort === true).length
  const ejAgarbyte = soldCars.filter(c => c.agarbyte_gjort === false).length

  // Endast räkna de med bekräftat ägarbyte för köpar-statistik
  const confirmedSales = soldCars.filter(c => c.agarbyte_gjort === true)
  const privatTillPrivat = confirmedSales.filter(c => c.saljare_typ === 'privat' && !c.kopare_is_dealer).length
  const privatTillHandlare = confirmedSales.filter(c => c.saljare_typ === 'privat' && c.kopare_is_dealer).length
  const handlareTillPrivat = confirmedSales.filter(c => c.saljare_typ === 'handlare' && !c.kopare_is_dealer).length

  const liggtider = confirmedSales.filter(c => c.liggtid_dagar != null).map(c => c.liggtid_dagar!)
  const avgLiggtid = liggtider.length > 0
    ? Math.round(liggtider.reduce((a, b) => a + b, 0) / liggtider.length)
    : 0

  return {
    total,
    agarbyteGjort,
    ejAgarbyte,
    privatTillPrivat,
    privatTillHandlare,
    handlareTillPrivat,
    avgLiggtid,
    avgPrissankning: 0, // TODO: Implement when we track price history
  }
}
