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

// Konstanter
const CHECK_INTERVAL_DAYS = 14  // Kolla samma bil var 14:e dag
const MAX_DAYS_WINDOW = 90      // Efter 90 dagar utan ägarbyte = inte såld
const MIN_DAYS_BEFORE_CHECK = 7 // Vänta minst 7 dagar innan första koll

/**
 * Processa sålda bilar och hämta köpardata
 * Använder pending-tabell för att undvika onödiga API-anrop
 *
 * Flöde:
 * 1. Kolla pending-bilar som är redo för omkontroll (14+ dagar sedan senast)
 * 2. Kolla nya sålda bilar som inte finns i pending eller salda
 * 3. Vid ägarbyte → spara i blocket_salda
 * 4. Vid samma ägare < 90 dagar → lägg i pending
 * 5. Vid samma ägare >= 90 dagar → spara i blocket_salda (ej såld)
 */
export async function processSoldCarsForBuyers(limit: number = 50): Promise<{
  success: boolean
  processed: number
  noOwnerChange: number
  addedToPending: number
  errors: string[]
}> {
  const supabase = await createClient()

  let processed = 0
  let noOwnerChange = 0
  let addedToPending = 0
  const errors: string[] = []

  // ============================================
  // STEG 1: Processa bilar från PENDING som behöver kollas igen
  // ============================================
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - CHECK_INTERVAL_DAYS)

  const { data: pendingCars } = await supabase
    .from('blocket_salda_pending')
    .select('*')
    .lte('last_checked_at', fourteenDaysAgo.toISOString())
    .order('last_checked_at', { ascending: true })
    .limit(Math.floor(limit / 2))  // Hälften av limit för pending

  if (pendingCars && pendingCars.length > 0) {
    for (const pending of pendingCars) {
      try {
        const result = await checkAndProcessCar(supabase, {
          regnr: pending.regnummer,
          blocket_id: pending.blocket_id,
          originalOwner: pending.original_owner,
          marke: pending.marke,
          modell: pending.modell,
          arsmodell: pending.arsmodell,
          pris: pending.pris,
          sold_at: pending.sold_at,
          saljare_typ: null,
          forst_sedd: null,
        })

        if (result.status === 'completed') {
          // Ta bort från pending
          await supabase.from('blocket_salda_pending').delete().eq('id', pending.id)
          processed++
          if (!result.agarbyteGjort) noOwnerChange++
        } else if (result.status === 'pending') {
          // Uppdatera last_checked_at
          await supabase
            .from('blocket_salda_pending')
            .update({
              last_checked_at: new Date().toISOString(),
              check_count: (pending.check_count || 1) + 1,
            })
            .eq('id', pending.id)
        } else if (result.error) {
          errors.push(`${pending.regnummer}: ${result.error}`)
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500))

      } catch (error) {
        errors.push(`${pending.regnummer}: ${String(error)}`)
      }
    }
  }

  // ============================================
  // STEG 2: Hitta NYA sålda bilar att processa
  // ============================================
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - MIN_DAYS_BEFORE_CHECK)

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - MAX_DAYS_WINDOW)

  const remainingLimit = limit - (pendingCars?.length || 0)

  if (remainingLimit > 0) {
    const { data: soldAds, error: queryError } = await supabase
      .from('blocket_annonser')
      .select('id, regnummer, marke, modell, arsmodell, miltal, pris, saljare_typ, saljare_namn, forst_sedd, borttagen')
      .eq('borttagen_anledning', 'SÅLD')
      .not('regnummer', 'is', null)
      .gte('borttagen', ninetyDaysAgo.toISOString())
      .lte('borttagen', sevenDaysAgo.toISOString())
      .order('borttagen', { ascending: false })
      .limit(remainingLimit * 3)

    if (queryError) {
      errors.push(queryError.message)
    } else if (soldAds && soldAds.length > 0) {
      // Filtrera bort de som redan finns i salda eller pending
      const regnummers = soldAds.map(a => a.regnummer.toUpperCase())

      const [{ data: existingSalda }, { data: existingPending }] = await Promise.all([
        supabase.from('blocket_salda').select('regnummer').in('regnummer', regnummers),
        supabase.from('blocket_salda_pending').select('regnummer').in('regnummer', regnummers),
      ])

      const existingSet = new Set([
        ...(existingSalda?.map(e => e.regnummer) || []),
        ...(existingPending?.map(e => e.regnummer) || []),
      ])

      const newAdsToProcess = soldAds
        .filter(a => !existingSet.has(a.regnummer.toUpperCase()))
        .slice(0, remainingLimit)

      for (const ad of newAdsToProcess) {
        try {
          const regnr = ad.regnummer.toUpperCase().replace(/\s/g, '')

          // Hämta original ägare från biluppgifter_data
          const { data: originalBuData } = await supabase
            .from('biluppgifter_data')
            .select('owner_name')
            .eq('blocket_id', ad.id)
            .single()

          const originalOwner = originalBuData?.owner_name || ad.saljare_namn || null

          const result = await checkAndProcessCar(supabase, {
            regnr,
            blocket_id: ad.id,
            originalOwner,
            marke: ad.marke,
            modell: ad.modell,
            arsmodell: ad.arsmodell,
            pris: ad.pris,
            sold_at: ad.borttagen,
            saljare_typ: ad.saljare_typ,
            forst_sedd: ad.forst_sedd,
          })

          if (result.status === 'completed') {
            processed++
            if (!result.agarbyteGjort) noOwnerChange++
          } else if (result.status === 'pending') {
            // Lägg till i pending-tabellen
            await supabase.from('blocket_salda_pending').insert({
              blocket_id: ad.id,
              regnummer: regnr,
              original_owner: originalOwner,
              marke: ad.marke,
              modell: ad.modell,
              arsmodell: ad.arsmodell,
              pris: ad.pris,
              sold_at: ad.borttagen,
            })
            addedToPending++
          } else if (result.error) {
            errors.push(`${regnr}: ${result.error}`)
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1500))

        } catch (error) {
          errors.push(`${ad.regnummer}: ${String(error)}`)
        }
      }
    }
  }

  return { success: true, processed, noOwnerChange, addedToPending, errors }
}

/**
 * Kolla en specifik bil och avgör status
 */
async function checkAndProcessCar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  car: {
    regnr: string
    blocket_id: number | null
    originalOwner: string | null
    marke: string | null
    modell: string | null
    arsmodell: number | null
    pris: number | null
    sold_at: string | null
    saljare_typ: string | null
    forst_sedd: string | null
  }
): Promise<{
  status: 'completed' | 'pending' | 'error'
  agarbyteGjort?: boolean
  error?: string
}> {
  // Hämta nuvarande ägare från biluppgifter
  const buResult = await fetchBiluppgifterComplete(car.regnr)

  if (!buResult.success) {
    return { status: 'error', error: buResult.error || 'Kunde inte hämta biluppgifter' }
  }

  const currentOwnerName = buResult.owner_name || null

  // Beräkna dagar sedan såld
  const daysSinceSold = car.sold_at
    ? Math.floor((Date.now() - new Date(car.sold_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Jämför original ägare med nuvarande
  const sameOwner = isSameOwner(car.originalOwner, currentOwnerName)
  const canVerify = car.originalOwner !== null

  // Avgör status
  if (!canVerify) {
    // Kan inte verifiera - anta ägarbyte
    await saveToSalda(supabase, car, buResult, true)
    return { status: 'completed', agarbyteGjort: true }
  }

  if (!sameOwner) {
    // Ägarbyte bekräftat!
    await saveToSalda(supabase, car, buResult, true)
    return { status: 'completed', agarbyteGjort: true }
  }

  if (daysSinceSold >= MAX_DAYS_WINDOW) {
    // Samma ägare efter 90 dagar = inte såld
    await saveToSalda(supabase, car, buResult, false)
    return { status: 'completed', agarbyteGjort: false }
  }

  // Samma ägare men < 90 dagar - vänta och kolla igen
  return { status: 'pending' }
}

/**
 * Spara bil i blocket_salda
 */
async function saveToSalda(
  supabase: Awaited<ReturnType<typeof createClient>>,
  car: {
    regnr: string
    blocket_id: number | null
    originalOwner: string | null
    marke: string | null
    modell: string | null
    arsmodell: number | null
    pris: number | null
    sold_at: string | null
    saljare_typ: string | null
    forst_sedd: string | null
  },
  buResult: Awaited<ReturnType<typeof fetchBiluppgifterComplete>>,
  agarbyteGjort: boolean
) {
  // Beräkna liggtid
  const liggtidDagar = car.forst_sedd && car.sold_at
    ? Math.floor((new Date(car.sold_at).getTime() - new Date(car.forst_sedd).getTime()) / (1000 * 60 * 60 * 24))
    : null

  await supabase.from('blocket_salda').insert({
    blocket_id: car.blocket_id,
    regnummer: car.regnr,
    slutpris: car.pris,
    liggtid_dagar: liggtidDagar,
    saljare_typ: car.saljare_typ,
    saljare_namn: car.originalOwner,
    sold_at: car.sold_at,
    marke: car.marke,
    modell: car.modell,
    arsmodell: car.arsmodell,
    miltal: null,
    kopare_namn: buResult.owner_name,
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
    agarbyte_gjort: agarbyteGjort,
  })
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
