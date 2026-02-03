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
    }
  }
}

/**
 * Processa sålda bilar och hämta köpardata
 * Körs som cron-jobb, hämtar för bilar sålda för 7-30 dagar sedan
 */
export async function processSoldCarsForBuyers(limit: number = 10): Promise<{
  success: boolean
  processed: number
  errors: string[]
}> {
  const supabase = await createClient()

  // Hitta sålda bilar som:
  // 1. Har regnummer
  // 2. Sålda för 7-30 dagar sedan (tid för omregistrering)
  // 3. Inte redan har köpardata i blocket_salda
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Hämta sålda bilar från blocket_annonser
  const { data: soldAds, error: queryError } = await supabase
    .from('blocket_annonser')
    .select('id, regnummer, marke, modell, arsmodell, miltal, pris, saljare_typ, forst_sedd, borttagen')
    .eq('borttagen_anledning', 'SÅLD')
    .not('regnummer', 'is', null)
    .gte('borttagen', thirtyDaysAgo.toISOString())
    .lte('borttagen', sevenDaysAgo.toISOString())
    .order('borttagen', { ascending: false })
    .limit(limit * 2) // Hämta fler för att filtrera

  if (queryError || !soldAds) {
    return { success: false, processed: 0, errors: [queryError?.message || 'Query failed'] }
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
    return { success: true, processed: 0, errors: [] }
  }

  let processed = 0
  const errors: string[] = []

  for (const ad of adsToProcess) {
    try {
      const regnr = ad.regnummer.toUpperCase().replace(/\s/g, '')

      // Hämta köpardata från biluppgifter
      const buResult = await fetchBiluppgifterComplete(regnr)

      if (!buResult.success) {
        errors.push(`${regnr}: ${buResult.error}`)
        continue
      }

      // Beräkna liggtid
      const liggtidDagar = ad.forst_sedd && ad.borttagen
        ? Math.floor((new Date(ad.borttagen).getTime() - new Date(ad.forst_sedd).getTime()) / (1000 * 60 * 60 * 24))
        : null

      // Spara i blocket_salda
      const { error: insertError } = await supabase
        .from('blocket_salda')
        .insert({
          blocket_id: ad.id,
          regnummer: regnr,
          // Säljdata
          slutpris: ad.pris,
          liggtid_dagar: liggtidDagar,
          saljare_typ: ad.saljare_typ,
          sold_at: ad.borttagen,
          // Bildata
          marke: ad.marke,
          modell: ad.modell,
          arsmodell: ad.arsmodell,
          miltal: ad.miltal,
          // Köpardata
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

  return { success: true, processed, errors }
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
  privatTillPrivat: number
  privatTillHandlare: number
  handlareTillPrivat: number
  avgLiggtid: number
  avgPrissankning: number
}> {
  const supabase = await createClient()

  const { data: soldCars } = await supabase
    .from('blocket_salda')
    .select('saljare_typ, kopare_typ, kopare_is_dealer, liggtid_dagar')

  if (!soldCars || soldCars.length === 0) {
    return {
      total: 0,
      privatTillPrivat: 0,
      privatTillHandlare: 0,
      handlareTillPrivat: 0,
      avgLiggtid: 0,
      avgPrissankning: 0,
    }
  }

  const total = soldCars.length
  const privatTillPrivat = soldCars.filter(c => c.saljare_typ === 'privat' && !c.kopare_is_dealer).length
  const privatTillHandlare = soldCars.filter(c => c.saljare_typ === 'privat' && c.kopare_is_dealer).length
  const handlareTillPrivat = soldCars.filter(c => c.saljare_typ === 'handlare' && !c.kopare_is_dealer).length

  const liggtider = soldCars.filter(c => c.liggtid_dagar != null).map(c => c.liggtid_dagar!)
  const avgLiggtid = liggtider.length > 0
    ? Math.round(liggtider.reduce((a, b) => a + b, 0) / liggtider.length)
    : 0

  return {
    total,
    privatTillPrivat,
    privatTillHandlare,
    handlareTillPrivat,
    avgLiggtid,
    avgPrissankning: 0, // TODO: Implement when we track price history
  }
}
