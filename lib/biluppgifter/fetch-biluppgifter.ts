'use server'

// Get the base URL for internal API calls
function getBaseUrl(): string {
  // In production on Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  // In development or custom deployment
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  // Default to localhost
  return 'http://localhost:3000'
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
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/api/biluppgifter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reg_number: regnr, fetch_profile: false }),
      cache: 'no-store',
    })

    if (!response.ok) {
      if (response.status === 403) {
        return { success: false, regnr, error: 'Cloudflare blockade - uppdatera cookies i Inställningar' }
      }
      return { success: false, regnr, error: `HTTP ${response.status}: ${response.statusText}` }
    }

    const data = await response.json()

    if (!data.success) {
      return { success: false, regnr, error: data.error || 'Okänt fel' }
    }

    return {
      success: true,
      regnr: data.regnr,
      mileage: data.mileage,
      mileage_unit: data.mileage_unit,
      num_owners: data.num_owners,
      annual_tax: data.annual_tax,
      inspection_until: data.inspection_until,
      owner_name: data.owner_name,
      owner_city: data.owner_city,
      owner_profile_id: data.owner_profile_id,
    }
  } catch (error) {
    console.error(`Error fetching biluppgifter vehicle for ${regnr}:`, error)
    return { success: false, regnr, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Note: Owner profile and address vehicles are now fetched by the internal API route
// when fetch_profile: true is passed to fetchBiluppgifterComplete

/**
 * Fetch complete data: vehicle + owner profile + address vehicles
 */
export async function fetchBiluppgifterComplete(regnr: string): Promise<BiluppgifterResult> {
  try {
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/api/biluppgifter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reg_number: regnr, fetch_profile: true }),
      cache: 'no-store',
    })

    if (!response.ok) {
      if (response.status === 403) {
        return { success: false, regnr, error: 'Cloudflare blockade - uppdatera cookies i Inställningar' }
      }
      return { success: false, regnr, error: `HTTP ${response.status}: ${response.statusText}` }
    }

    const data = await response.json()

    if (!data.success) {
      return { success: false, regnr, error: data.error || 'Okänt fel' }
    }

    return {
      success: true,
      regnr: data.regnr,
      mileage: data.mileage,
      mileage_unit: data.mileage_unit,
      num_owners: data.num_owners,
      annual_tax: data.annual_tax,
      inspection_until: data.inspection_until,
      owner_name: data.owner_name,
      owner_city: data.owner_city,
      owner_profile_id: data.owner_profile_id,
      owner_age: data.owner_age,
      owner_address: data.owner_address,
      owner_postal_code: data.owner_postal_code,
      owner_postal_city: data.owner_postal_city,
      owner_phone: data.owner_phone,
      owner_vehicles: data.owner_vehicles,
      address_vehicles: data.address_vehicles,
    }
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
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/api/biluppgifter`, {
      method: 'GET',
      cache: 'no-store',
    })
    if (!response.ok) return false
    const data = await response.json()
    return data.status === 'configured'
  } catch {
    return false
  }
}
