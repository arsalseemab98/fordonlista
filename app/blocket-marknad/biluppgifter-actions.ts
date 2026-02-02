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
