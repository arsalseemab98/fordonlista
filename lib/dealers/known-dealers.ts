'use server'

import { createClient } from '@/lib/supabase/server'

export interface KnownDealer {
  id: number
  name: string
  normalized_name: string
  source: string
  ad_count: number
  first_seen_at: string
  last_seen_at: string
  regions: string[] | null
}

/**
 * Normalize dealer name for matching
 * "Norrlands Bil AB" -> "norrlands bil ab"
 */
function normalizeNameForMatching(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces to single
}

/**
 * Extract the "core" name from a company name
 * "Norrlands Bil AB" -> "norrlands bil"
 * "ABC Bilar Handelsbolag" -> "abc bilar"
 */
function extractCoreName(name: string): string {
  const normalized = normalizeNameForMatching(name)

  // Remove common suffixes
  const suffixes = [
    ' ab', ' hb', ' kb', ' ek för', ' ekonomisk förening',
    ' handelsbolag', ' kommanditbolag', ' aktiebolag',
    ' i likvidation', ' konkurs', ' filial', ' sweden',
    ' nordic', ' scandinavia', ' group'
  ]

  let result = normalized
  for (const suffix of suffixes) {
    if (result.endsWith(suffix)) {
      result = result.slice(0, -suffix.length).trim()
    }
  }

  return result
}

/**
 * Check if two names likely refer to the same dealer
 */
function namesMatch(name1: string, name2: string): boolean {
  const core1 = extractCoreName(name1)
  const core2 = extractCoreName(name2)

  // Exact match after normalization
  if (core1 === core2) return true

  // One contains the other (for cases like "Norrland" vs "Norrlands Bil")
  if (core1.includes(core2) || core2.includes(core1)) {
    // Require at least 5 chars to avoid false positives
    const shorter = core1.length < core2.length ? core1 : core2
    return shorter.length >= 5
  }

  return false
}

/**
 * Populate known_dealers from blocket + biluppgifter data
 * Finds all ads where saljare_typ='handlare' and has biluppgifter owner_name
 */
export async function populateKnownDealers(): Promise<{
  success: boolean
  added: number
  updated: number
  total: number
  dealers: string[]
  error?: string
}> {
  const supabase = await createClient()

  try {
    // Join blocket_annonser with biluppgifter_data to get dealer names
    // Where saljare_typ = 'handlare' (confirmed dealer on Blocket)
    const { data: dealerAds, error: queryError } = await supabase
      .from('blocket_annonser')
      .select(`
        id,
        region,
        biluppgifter_data!blocket_id (
          owner_name
        )
      `)
      .eq('saljare_typ', 'handlare')
      .not('regnummer', 'is', null)

    if (queryError) {
      console.error('Error fetching dealer ads:', queryError)
      return { success: false, added: 0, updated: 0, total: 0, dealers: [], error: queryError.message }
    }

    if (!dealerAds || dealerAds.length === 0) {
      return { success: true, added: 0, updated: 0, total: 0, dealers: [], error: 'No dealer ads found with biluppgifter data' }
    }

    // Group by dealer name and count
    const dealerMap = new Map<string, { count: number; regions: Set<string> }>()

    for (const ad of dealerAds) {
      // biluppgifter_data is an array (left join), get first element
      const buData = Array.isArray(ad.biluppgifter_data)
        ? ad.biluppgifter_data[0]
        : ad.biluppgifter_data

      const ownerName = buData?.owner_name
      if (!ownerName) continue

      const normalized = normalizeNameForMatching(ownerName)

      if (!dealerMap.has(normalized)) {
        dealerMap.set(normalized, { count: 0, regions: new Set() })
      }

      const entry = dealerMap.get(normalized)!
      entry.count++
      if (ad.region) {
        entry.regions.add(ad.region)
      }
    }

    // Insert/update dealers
    let added = 0
    let updated = 0
    const dealerNames: string[] = []

    for (const [normalized, data] of dealerMap) {
      // Get original name (first occurrence)
      const originalAd = dealerAds.find(a => {
        const buData = Array.isArray(a.biluppgifter_data)
          ? a.biluppgifter_data[0]
          : a.biluppgifter_data
        return buData?.owner_name &&
               normalizeNameForMatching(buData.owner_name) === normalized
      })

      const buData = Array.isArray(originalAd?.biluppgifter_data)
        ? originalAd?.biluppgifter_data[0]
        : originalAd?.biluppgifter_data
      const originalName = buData?.owner_name || normalized

      // Upsert
      const { data: upsertResult, error: upsertError } = await supabase
        .from('known_dealers')
        .upsert({
          name: originalName,
          normalized_name: normalized,
          source: 'blocket',
          ad_count: data.count,
          regions: Array.from(data.regions),
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: 'normalized_name',
        })
        .select()

      if (upsertError) {
        console.error('Error upserting dealer:', upsertError)
        continue
      }

      dealerNames.push(originalName)
      // Note: we can't easily distinguish add vs update with upsert
      added++
    }

    // Get total count
    const { count: total } = await supabase
      .from('known_dealers')
      .select('*', { count: 'exact', head: true })

    return {
      success: true,
      added,
      updated: 0,
      total: total || 0,
      dealers: dealerNames,
    }

  } catch (error) {
    console.error('Error populating known dealers:', error)
    return { success: false, added: 0, updated: 0, total: 0, dealers: [], error: String(error) }
  }
}

/**
 * Check if an owner name matches a known dealer
 */
export async function isKnownDealer(ownerName: string): Promise<{
  isDealer: boolean
  matchedDealer?: KnownDealer
  matchType?: 'exact' | 'partial' | 'reverse'
}> {
  if (!ownerName) {
    return { isDealer: false }
  }

  const supabase = await createClient()
  const normalized = normalizeNameForMatching(ownerName)
  const coreName = extractCoreName(ownerName)

  // Try exact match first
  const { data: exactMatch } = await supabase
    .from('known_dealers')
    .select('*')
    .eq('normalized_name', normalized)
    .single()

  if (exactMatch) {
    return { isDealer: true, matchedDealer: exactMatch, matchType: 'exact' }
  }

  // Try partial match (owner contains dealer name)
  const { data: allDealers } = await supabase
    .from('known_dealers')
    .select('*')
    .order('ad_count', { ascending: false })

  if (allDealers) {
    for (const dealer of allDealers) {
      const dealerCore = extractCoreName(dealer.name)

      // Owner contains dealer name
      if (coreName.includes(dealerCore) && dealerCore.length >= 5) {
        return { isDealer: true, matchedDealer: dealer, matchType: 'partial' }
      }

      // Dealer name contains owner name
      if (dealerCore.includes(coreName) && coreName.length >= 5) {
        return { isDealer: true, matchedDealer: dealer, matchType: 'reverse' }
      }
    }
  }

  return { isDealer: false }
}

/**
 * Get all known dealers
 */
export async function getAllKnownDealers(): Promise<KnownDealer[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('known_dealers')
    .select('*')
    .order('ad_count', { ascending: false })

  if (error) {
    console.error('Error fetching known dealers:', error)
    return []
  }

  return data || []
}

/**
 * Add a dealer manually
 */
export async function addKnownDealer(name: string, source: string = 'manual'): Promise<{
  success: boolean
  dealer?: KnownDealer
  error?: string
}> {
  const supabase = await createClient()
  const normalized = normalizeNameForMatching(name)

  const { data, error } = await supabase
    .from('known_dealers')
    .upsert({
      name,
      normalized_name: normalized,
      source,
      ad_count: 1,
    }, {
      onConflict: 'normalized_name',
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, dealer: data }
}

/**
 * Remove a dealer
 */
export async function removeKnownDealer(id: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('known_dealers')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get dealer stats
 */
export async function getDealerStats(): Promise<{
  total: number
  byRegion: Record<string, number>
  topDealers: Array<{ name: string; ad_count: number }>
}> {
  const supabase = await createClient()

  const { data: dealers } = await supabase
    .from('known_dealers')
    .select('*')
    .order('ad_count', { ascending: false })

  if (!dealers) {
    return { total: 0, byRegion: {}, topDealers: [] }
  }

  // Count by region
  const byRegion: Record<string, number> = {}
  for (const dealer of dealers) {
    if (dealer.regions) {
      for (const region of dealer.regions) {
        byRegion[region] = (byRegion[region] || 0) + 1
      }
    }
  }

  return {
    total: dealers.length,
    byRegion,
    topDealers: dealers.slice(0, 20).map(d => ({ name: d.name, ad_count: d.ad_count })),
  }
}
