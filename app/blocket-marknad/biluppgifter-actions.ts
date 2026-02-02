'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchBiluppgifterComplete, BiluppgifterResult } from '@/lib/biluppgifter/fetch-biluppgifter'

export interface BiluppgifterData {
  id: number
  regnummer: string
  blocket_id: number | null
  // Fordonsdata
  mileage_km: number | null
  mileage_mil: number | null
  num_owners: number | null
  annual_tax: number | null
  inspection_until: string | null
  // Ägardata
  owner_name: string | null
  owner_age: number | null
  owner_city: string | null
  owner_address: string | null
  owner_postal_code: string | null
  owner_postal_city: string | null
  owner_phone: string | null
  // Relaterade fordon
  owner_vehicles: Array<{ regnr: string; description: string }> | null
  address_vehicles: Array<{ regnr: string; description: string }> | null
  // Historik
  mileage_history: Array<{ date: string; mileage_km: number }> | null
  owner_history: Array<{ date: string; type: string; name?: string }> | null
  // Metadata
  fetched_at: string | null
}

/**
 * Hämta biluppgifter för ett regnummer och spara i databasen
 */
export async function fetchAndSaveBiluppgifter(
  regnummer: string,
  blocketId?: number
): Promise<{
  success: boolean
  data?: BiluppgifterData
  error?: string
}> {
  const supabase = await createClient()
  const regnr = regnummer.toUpperCase().replace(/\s/g, '')

  // Hämta från biluppgifter-api
  const buResult: BiluppgifterResult = await fetchBiluppgifterComplete(regnr)

  if (!buResult.success) {
    return { success: false, error: buResult.error || 'Kunde inte hämta biluppgifter' }
  }

  // Förbered data för databas
  const dbData = {
    regnummer: regnr,
    blocket_id: blocketId || null,
    mileage_km: buResult.mileage || null,
    mileage_mil: buResult.mileage ? Math.round(buResult.mileage / 10) : null,
    num_owners: buResult.num_owners || null,
    annual_tax: buResult.annual_tax || null,
    inspection_until: buResult.inspection_until || null,
    owner_name: buResult.owner_name || null,
    owner_age: buResult.owner_age || null,
    owner_city: buResult.owner_city || null,
    owner_address: buResult.owner_address || null,
    owner_postal_code: buResult.owner_postal_code || null,
    owner_postal_city: buResult.owner_postal_city || null,
    owner_phone: buResult.owner_phone || null,
    owner_vehicles: buResult.owner_vehicles || [],
    address_vehicles: buResult.address_vehicles || [],
    mileage_history: buResult.mileage_history || [],
    owner_history: buResult.owner_history || [],
    is_dealer: buResult.is_dealer || false,
    previous_owner: buResult.previous_owner || null,
    fetched_at: new Date().toISOString(),
  }

  // Upsert (insert or update if exists)
  const { data, error } = await supabase
    .from('biluppgifter_data')
    .upsert(dbData, { onConflict: 'regnummer' })
    .select()
    .single()

  if (error) {
    console.error('Error saving biluppgifter:', error)
    return { success: false, error: 'Kunde inte spara biluppgifter' }
  }

  return { success: true, data: data as BiluppgifterData }
}

/**
 * Hämta sparad biluppgifter-data för ett regnummer
 */
export async function getBiluppgifterByRegnummer(
  regnummer: string
): Promise<BiluppgifterData | null> {
  const supabase = await createClient()
  const regnr = regnummer.toUpperCase().replace(/\s/g, '')

  const { data } = await supabase
    .from('biluppgifter_data')
    .select('*')
    .eq('regnummer', regnr)
    .single()

  return data as BiluppgifterData | null
}

/**
 * Hämta biluppgifter för flera Blocket-annonser
 */
export async function fetchBiluppgifterForBlocketAds(
  blocketIds: number[]
): Promise<{
  success: number
  failed: number
  errors: string[]
}> {
  const supabase = await createClient()

  // Hämta regnummer för alla annonser
  const { data: ads } = await supabase
    .from('blocket_annonser')
    .select('id, regnummer')
    .in('id', blocketIds)
    .not('regnummer', 'is', null)

  if (!ads || ads.length === 0) {
    return { success: 0, failed: 0, errors: ['Inga annonser med regnummer hittades'] }
  }

  let success = 0
  let failed = 0
  const errors: string[] = []

  // Hämta biluppgifter för varje annons (med delay för rate limiting)
  for (const ad of ads) {
    const result = await fetchAndSaveBiluppgifter(ad.regnummer, ad.id)

    if (result.success) {
      success++
    } else {
      failed++
      errors.push(`${ad.regnummer}: ${result.error}`)
    }

    // Rate limiting - vänta 500ms mellan requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return { success, failed, errors }
}

/**
 * Hämta biluppgifter för annonser som saknar data (batch)
 * Returnerar progress och kan avbrytas
 */
export async function fetchMissingBiluppgifter(
  limit: number = 10
): Promise<{
  success: number
  failed: number
  errors: string[]
  remaining: number
}> {
  const supabase = await createClient()

  // Hitta aktiva annonser med regnummer som INTE har biluppgifter ännu
  const { data: ads } = await supabase
    .from('blocket_annonser')
    .select('id, regnummer')
    .is('borttagen', null)
    .not('regnummer', 'is', null)
    .limit(limit)

  if (!ads || ads.length === 0) {
    return { success: 0, failed: 0, errors: [], remaining: 0 }
  }

  // Filtrera bort de som redan har biluppgifter
  const regnummers = ads.map(a => a.regnummer.toUpperCase())
  const { data: existing } = await supabase
    .from('biluppgifter_data')
    .select('regnummer')
    .in('regnummer', regnummers)

  const existingSet = new Set(existing?.map(e => e.regnummer) || [])
  const adsToFetch = ads.filter(a => !existingSet.has(a.regnummer.toUpperCase()))

  if (adsToFetch.length === 0) {
    // Räkna återstående
    const { count: remainingCount } = await supabase
      .from('blocket_annonser')
      .select('*', { count: 'exact', head: true })
      .is('borttagen', null)
      .not('regnummer', 'is', null)

    const { count: fetchedCount } = await supabase
      .from('biluppgifter_data')
      .select('*', { count: 'exact', head: true })

    return {
      success: 0,
      failed: 0,
      errors: ['Alla i denna batch har redan biluppgifter'],
      remaining: (remainingCount || 0) - (fetchedCount || 0)
    }
  }

  let success = 0
  let failed = 0
  const errors: string[] = []

  for (const ad of adsToFetch) {
    const result = await fetchAndSaveBiluppgifter(ad.regnummer, ad.id)

    if (result.success) {
      success++
    } else {
      failed++
      errors.push(`${ad.regnummer}: ${result.error}`)
    }

    // Rate limiting - 1 sekund mellan requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Räkna återstående
  const { count: totalWithRegnummer } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .is('borttagen', null)
    .not('regnummer', 'is', null)

  const { count: totalFetched } = await supabase
    .from('biluppgifter_data')
    .select('*', { count: 'exact', head: true })

  return {
    success,
    failed,
    errors,
    remaining: (totalWithRegnummer || 0) - (totalFetched || 0)
  }
}

/**
 * Hämta Blocket-annons med biluppgifter-data (JOIN)
 */
export async function getBlocketAdWithBiluppgifter(blocketId: number) {
  const supabase = await createClient()

  // Hämta Blocket-annons
  const { data: ad } = await supabase
    .from('blocket_annonser')
    .select('*')
    .eq('id', blocketId)
    .single()

  if (!ad) return null

  // Hämta biluppgifter om regnummer finns
  let biluppgifter = null
  if (ad.regnummer) {
    const { data } = await supabase
      .from('biluppgifter_data')
      .select('*')
      .eq('regnummer', ad.regnummer.toUpperCase())
      .single()
    biluppgifter = data
  }

  return {
    ...ad,
    biluppgifter,
  }
}

/**
 * Sök Blocket-annonser och matcha med biluppgifter
 */
export async function searchBlocketWithBiluppgifter(filters: {
  marke?: string
  modell?: string
  minPris?: number
  maxPris?: number
  limit?: number
}) {
  const supabase = await createClient()

  let query = supabase
    .from('blocket_annonser')
    .select(`
      id,
      regnummer,
      marke,
      modell,
      arsmodell,
      miltal,
      pris,
      stad,
      saljare_typ,
      biluppgifter_data!left(
        mileage_mil,
        num_owners,
        annual_tax,
        inspection_until,
        owner_name,
        owner_city,
        fetched_at
      )
    `)
    .is('borttagen', null)

  if (filters.marke) {
    query = query.ilike('marke', `%${filters.marke}%`)
  }
  if (filters.modell) {
    query = query.ilike('modell', `%${filters.modell}%`)
  }
  if (filters.minPris) {
    query = query.gte('pris', filters.minPris)
  }
  if (filters.maxPris) {
    query = query.lte('pris', filters.maxPris)
  }

  query = query.limit(filters.limit || 50)

  const { data, error } = await query

  if (error) {
    console.error('Error searching:', error)
    return []
  }

  return data
}
