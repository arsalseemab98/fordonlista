'use server'

import { createClient } from '@/lib/supabase/server'

// Get biluppgifter API URL from database or env
async function getBiluppgifterApiUrl(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('api_tokens')
      .select('bearer_token') // Using bearer_token field for API URL
      .eq('service_name', 'biluppgifter')
      .maybeSingle()

    if (data?.bearer_token) {
      return data.bearer_token
    }
  } catch (error) {
    console.error('Error fetching biluppgifter API URL:', error)
  }

  return process.env.BILUPPGIFTER_API_URL || 'http://localhost:3456'
}

// Interfaces for internal use - the API route handles the actual scraping

export interface BiluppgifterResult {
  success: boolean
  regnr: string
  // Vehicle data
  mileage?: number
  mileage_unit?: string
  raw_mileage?: string
  num_owners?: number
  annual_tax?: number
  raw_annual_tax?: string
  inspection_until?: string
  // Owner data from vehicle page
  owner_name?: string
  owner_city?: string
  owner_profile_id?: string
  // Owner profile data (detailed)
  owner_age?: number
  owner_address?: string
  owner_postal_code?: string
  owner_postal_city?: string
  owner_phone?: string
  owner_personnummer?: string
  owner_type?: string
  // Other vehicles
  owner_vehicles?: Array<{ regnr: string; description: string }>
  address_vehicles?: Array<{ regnr: string; description: string; status?: string }>
  // Error
  error?: string
}

/**
 * Fetch vehicle data only (faster, less data)
 */
export async function fetchBiluppgifterVehicle(regnr: string): Promise<BiluppgifterResult> {
  try {
    const apiUrl = await getBiluppgifterApiUrl()
    const response = await fetch(`${apiUrl}/api/vehicle/${regnr}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) {
      if (response.status === 403) {
        return { success: false, regnr, error: 'Cloudflare blockade - uppdatera cookies i biluppgifter-api' }
      }
      return { success: false, regnr, error: `HTTP ${response.status}: ${response.statusText}` }
    }

    const data = await response.json()
    return parseVehicleData(data, regnr)
  } catch (error) {
    console.error(`Error fetching biluppgifter vehicle for ${regnr}:`, error)
    return { success: false, regnr, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Parse vehicle data from biluppgifter-api response
 */
function parseVehicleData(data: Record<string, unknown>, regnr: string): BiluppgifterResult {
  const result: BiluppgifterResult = {
    success: true,
    regnr,
  }

  // Parse data sections
  const sections = data.data as Record<string, Record<string, string>> | undefined
  if (sections) {
    for (const sectionData of Object.values(sections)) {
      for (const [label, value] of Object.entries(sectionData || {})) {
        const labelLower = label.toLowerCase()

        // Mätarställning (Mileage)
        if (labelLower.includes('mätarställning') || labelLower.includes('miltal')) {
          const kmMatch = value.match(/([\d\s]+)\s*km/i)
          const milMatch = value.match(/([\d\s]+)\s*mil/i)

          if (kmMatch) {
            result.mileage = parseInt(kmMatch[1].replace(/\s/g, ''), 10)
            result.mileage_unit = 'km'
          } else if (milMatch) {
            const mil = parseInt(milMatch[1].replace(/\s/g, ''), 10)
            result.mileage = mil * 10
            result.mileage_unit = 'mil'
          }
        }

        // Antal ägare
        if (labelLower.includes('antal ägare')) {
          const numMatch = value.match(/(\d+)/)
          if (numMatch) {
            result.num_owners = parseInt(numMatch[1], 10)
          }
        }

        // Fordonsskatt
        if (labelLower.includes('skatt')) {
          const taxMatch = value.match(/([\d\s]+)\s*kr/i)
          if (taxMatch) {
            result.annual_tax = parseInt(taxMatch[1].replace(/\s/g, ''), 10)
          }
        }

        // Besiktning
        if (labelLower.includes('besiktning')) {
          const dateMatch = value.match(/(\d{4}-\d{2}(?:-\d{2})?)/)
          if (dateMatch) {
            result.inspection_until = dateMatch[1]
          }
        }
      }
    }
  }

  // Parse owner info
  const owner = data.owner as Record<string, unknown> | undefined
  if (owner?.current_owner) {
    const currentOwner = owner.current_owner as Record<string, string>
    result.owner_name = currentOwner.name
    result.owner_city = currentOwner.city
    result.owner_profile_id = currentOwner.profile_id
  }

  return result
}

// Note: Owner profile and address vehicles are now fetched by the internal API route
// when fetch_profile: true is passed to fetchBiluppgifterComplete

/**
 * Fetch complete data: vehicle + owner profile + address vehicles
 */
export async function fetchBiluppgifterComplete(regnr: string): Promise<BiluppgifterResult> {
  try {
    const apiUrl = await getBiluppgifterApiUrl()

    // Fetch vehicle data first
    const vehicleResponse = await fetch(`${apiUrl}/api/vehicle/${regnr}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })

    if (!vehicleResponse.ok) {
      if (vehicleResponse.status === 403) {
        return { success: false, regnr, error: 'Cloudflare blockade - uppdatera cookies i biluppgifter-api' }
      }
      return { success: false, regnr, error: `HTTP ${vehicleResponse.status}: ${vehicleResponse.statusText}` }
    }

    const vehicleData = await vehicleResponse.json()
    const result = parseVehicleData(vehicleData, regnr)

    // If we have owner profile ID, fetch detailed owner data
    if (result.owner_profile_id) {
      try {
        const profileResponse = await fetch(`${apiUrl}/api/profile/${result.owner_profile_id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        })

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          result.owner_age = profileData.age
          result.owner_address = profileData.address
          result.owner_postal_code = profileData.postal_code
          result.owner_postal_city = profileData.postal_city
          result.owner_phone = profileData.phone
          result.owner_vehicles = profileData.vehicles
          result.address_vehicles = profileData.address_vehicles
        }
      } catch (profileError) {
        console.error(`Error fetching owner profile:`, profileError)
      }
    }

    return result
  } catch (error) {
    console.error(`Error fetching complete biluppgifter for ${regnr}:`, error)
    return { success: false, regnr, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Rate limiting configuration for biluppgifter API
 * Adjust these values if getting rate limited (403/429 errors)
 */
const RATE_LIMIT_CONFIG = {
  batchSize: 3,           // Process 3 vehicles at a time
  delayBetweenBatches: 1500, // 1.5 seconds between batches
  delayOnError: 5000,     // 5 seconds extra delay if error occurs
  maxRetries: 2,          // Retry failed requests max 2 times
  largeBatchThreshold: 20, // Use slower rate for >20 vehicles
  largeBatchDelay: 2500,  // 2.5 seconds delay for large batches
}

/**
 * Fetch complete data for multiple vehicles (with rate limiting)
 * Automatically adjusts rate based on batch size to avoid bans
 */
export async function fetchBiluppgifterBatch(
  regnrs: string[],
  fetchComplete: boolean = false
): Promise<BiluppgifterResult[]> {
  const results: BiluppgifterResult[] = []
  const { batchSize, delayBetweenBatches, delayOnError, maxRetries, largeBatchThreshold, largeBatchDelay } = RATE_LIMIT_CONFIG

  // Use longer delays for larger batches to be safer
  const delayMs = regnrs.length > largeBatchThreshold ? largeBatchDelay : delayBetweenBatches

  console.log(`[biluppgifter] Starting batch fetch: ${regnrs.length} vehicles, ${Math.ceil(regnrs.length / batchSize)} batches, ${delayMs}ms delay`)

  for (let i = 0; i < regnrs.length; i += batchSize) {
    const batch = regnrs.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(regnrs.length / batchSize)

    console.log(`[biluppgifter] Processing batch ${batchNum}/${totalBatches}: ${batch.join(', ')}`)

    const fetchFn = fetchComplete ? fetchBiluppgifterComplete : fetchBiluppgifterVehicle

    // Process batch with retry logic
    const batchResults: BiluppgifterResult[] = []
    for (const regnr of batch) {
      let result: BiluppgifterResult | null = null
      let retries = 0

      while (!result && retries <= maxRetries) {
        try {
          result = await fetchFn(regnr)

          // If we got rate limited (403), add extra delay and retry
          if (!result.success && result.error?.includes('403')) {
            console.warn(`[biluppgifter] Rate limited on ${regnr}, waiting ${delayOnError}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, delayOnError))
            retries++
            result = null // Force retry
          }
        } catch (error) {
          console.error(`[biluppgifter] Error fetching ${regnr}:`, error)
          retries++
          if (retries <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delayOnError))
          }
        }
      }

      batchResults.push(result || { success: false, regnr, error: 'Max retries exceeded' })
    }

    results.push(...batchResults)

    // Wait between batches (but not after the last one)
    if (i + batchSize < regnrs.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  const successful = results.filter(r => r.success).length
  console.log(`[biluppgifter] Batch complete: ${successful}/${results.length} successful`)

  return results
}

/**
 * Legacy function for backwards compatibility
 */
export async function fetchBiluppgifter(regnr: string): Promise<BiluppgifterResult> {
  return fetchBiluppgifterVehicle(regnr)
}

export async function checkBiluppgifterHealth(): Promise<boolean> {
  try {
    const apiUrl = await getBiluppgifterApiUrl()
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      cache: 'no-store',
    })
    return response.ok
  } catch {
    return false
  }
}
