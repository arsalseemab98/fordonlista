'use server'

import { createClient } from '@/lib/supabase/server'

// Get configured API URL from database, fall back to env var or default
async function getBiluppgifterApiUrl(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('api_tokens')
      .select('refresh_token')
      .eq('service_name', 'biluppgifter')
      .maybeSingle()

    if (data?.refresh_token) {
      return data.refresh_token
    }
  } catch (error) {
    console.error('Error fetching biluppgifter API URL:', error)
  }

  return process.env.BILUPPGIFTER_API_URL || 'http://localhost:3456'
}

interface BiluppgifterVehicle {
  regnr: string
  page_title: string
  data: Record<string, Record<string, string>>
  owner?: {
    current_owner?: {
      name: string
      profile_id: string
      city: string
    }
    summary?: string
    history?: Array<{
      name: string
      profile_id: string
      city: string
      type?: string
      date?: string
    }>
  }
}

interface BiluppgifterOwnerProfile {
  profile_id: string
  name: string
  person_type?: string
  age?: number
  city?: string
  personnummer?: string
  address?: string
  postal_code?: string
  postal_city?: string
  phone?: string
  vehicles?: Array<{
    regnr: string
    description: string
    url: string
  }>
  address_vehicles?: Array<{
    regnr: string
    description: string
    url: string
    status?: string
  }>
}

interface BiluppgifterAddressVehicles {
  regnr: string
  owner: string
  address: string
  postal_code: string
  postal_city: string
  owner_vehicles: Array<{
    regnr: string
    description: string
  }>
  address_vehicles: Array<{
    regnr: string
    description: string
    status?: string
  }>
}

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

    const data: BiluppgifterVehicle = await response.json()
    return parseVehicleData(data)
  } catch (error) {
    console.error(`Error fetching biluppgifter vehicle for ${regnr}:`, error)
    return { success: false, regnr, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Fetch owner profile by profile ID
 */
export async function fetchBiluppgifterOwnerProfile(profileId: string): Promise<BiluppgifterOwnerProfile | null> {
  try {
    const apiUrl = await getBiluppgifterApiUrl()
    const response = await fetch(`${apiUrl}/api/profile/${profileId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error(`Error fetching owner profile ${profileId}:`, error)
    return null
  }
}

/**
 * Fetch all vehicles at an address
 */
export async function fetchBiluppgifterAddressVehicles(regnr: string): Promise<BiluppgifterAddressVehicles | null> {
  try {
    const apiUrl = await getBiluppgifterApiUrl()
    const response = await fetch(`${apiUrl}/api/address/${regnr}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })

    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error(`Error fetching address vehicles for ${regnr}:`, error)
    return null
  }
}

/**
 * Fetch complete data: vehicle + owner profile + address vehicles
 */
export async function fetchBiluppgifterComplete(regnr: string): Promise<BiluppgifterResult> {
  try {
    const apiUrl = await getBiluppgifterApiUrl()
    // First fetch vehicle data
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

    const vehicleData: BiluppgifterVehicle = await vehicleResponse.json()
    const result = parseVehicleData(vehicleData)

    // If we have owner profile ID, fetch detailed owner data
    if (result.owner_profile_id) {
      const ownerProfile = await fetchBiluppgifterOwnerProfile(result.owner_profile_id)
      if (ownerProfile) {
        result.owner_age = ownerProfile.age
        result.owner_address = ownerProfile.address
        result.owner_postal_code = ownerProfile.postal_code
        result.owner_postal_city = ownerProfile.postal_city
        result.owner_phone = ownerProfile.phone
        result.owner_personnummer = ownerProfile.personnummer
        result.owner_type = ownerProfile.person_type
        result.owner_vehicles = ownerProfile.vehicles
        result.address_vehicles = ownerProfile.address_vehicles
      }
    }

    // Alternatively, fetch address vehicles directly
    if (!result.address_vehicles) {
      const addressData = await fetchBiluppgifterAddressVehicles(regnr)
      if (addressData) {
        result.owner_address = result.owner_address || addressData.address
        result.owner_postal_code = result.owner_postal_code || addressData.postal_code
        result.owner_postal_city = result.owner_postal_city || addressData.postal_city
        result.owner_vehicles = addressData.owner_vehicles
        result.address_vehicles = addressData.address_vehicles
      }
    }

    return result
  } catch (error) {
    console.error(`Error fetching complete biluppgifter for ${regnr}:`, error)
    return { success: false, regnr, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Parse vehicle data from API response
 */
function parseVehicleData(data: BiluppgifterVehicle): BiluppgifterResult {
  let mileage: number | undefined
  let raw_mileage: string | undefined
  let mileage_unit: string | undefined
  let num_owners: number | undefined
  let annual_tax: number | undefined
  let raw_annual_tax: string | undefined
  let inspection_until: string | undefined

  // Look for data in various sections
  for (const [sectionName, sectionData] of Object.entries(data.data || {})) {
    for (const [label, value] of Object.entries(sectionData || {})) {
      const labelLower = label.toLowerCase()

      // Mätarställning (Mileage)
      if (labelLower.includes('mätarställning') || labelLower.includes('miltal') || labelLower.includes('mileage')) {
        raw_mileage = value
        const kmMatch = value.match(/(\d[\d\s]*)\s*km/i)
        const milMatch = value.match(/(\d[\d\s]*)\s*mil/i)

        if (kmMatch) {
          mileage = parseInt(kmMatch[1].replace(/\s/g, ''), 10)
          mileage_unit = 'km'
        } else if (milMatch) {
          const mil = parseInt(milMatch[1].replace(/\s/g, ''), 10)
          mileage = mil * 10 // Convert mil to km
          mileage_unit = 'mil'
        }
      }

      // Antal ägare (Number of owners)
      if (labelLower.includes('antal ägare') || labelLower.includes('ägare')) {
        const numMatch = value.match(/(\d+)/)
        if (numMatch) {
          num_owners = parseInt(numMatch[1], 10)
        }
      }

      // Årskatt (Annual tax)
      if (labelLower.includes('skatt') || labelLower.includes('fordonsskatt') || labelLower.includes('årsskatt')) {
        raw_annual_tax = value
        const taxMatch = value.match(/(\d[\d\s]*)\s*kr/i)
        if (taxMatch) {
          annual_tax = parseInt(taxMatch[1].replace(/\s/g, ''), 10)
        }
      }

      // Besiktning till (Inspection valid until)
      if (labelLower.includes('besiktning') || labelLower.includes('kontroll')) {
        // Match date formats: YYYY-MM-DD or YYYY-MM
        const dateMatch = value.match(/(\d{4}-\d{2}(?:-\d{2})?)/)
        if (dateMatch) {
          inspection_until = dateMatch[1]
        }
      }
    }
  }

  // Count owners from history if not found in data
  if (!num_owners && data.owner?.history) {
    num_owners = data.owner.history.length + 1 // +1 for current owner
  }

  return {
    success: true,
    regnr: data.regnr,
    mileage,
    mileage_unit,
    raw_mileage,
    num_owners,
    annual_tax,
    raw_annual_tax,
    inspection_until,
    owner_name: data.owner?.current_owner?.name,
    owner_city: data.owner?.current_owner?.city,
    owner_profile_id: data.owner?.current_owner?.profile_id,
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
