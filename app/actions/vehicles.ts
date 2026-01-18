'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { fetchCarInfo } from '@/lib/carinfo/fetch-carinfo'

export interface CarInfoData {
  reg_number: string
  status?: string
  make?: string
  model?: string
  make_model?: string
  year?: number
  color?: string
  horsepower?: number
  fuel_type?: string
  transmission?: string
  skatt?: number
  co2_gkm?: number
  mileage_km?: number
  antal_agare?: number
  valuation_company?: number
  valuation_private?: number
  total_in_sweden?: number
  senaste_avställning?: string
  senaste_påställning?: string
  första_registrering?: string
  besiktning_till?: string
  vehicle_history?: Array<{ date: string; event: string; details?: string }>
}

export async function saveCarInfoToVehicle(vehicleId: string, carInfo: CarInfoData) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    carinfo_fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Map car.info fields to vehicle columns
  if (carInfo.make) updateData.make = carInfo.make
  if (carInfo.model) updateData.model = carInfo.model
  if (carInfo.year) updateData.year = carInfo.year
  if (carInfo.color) updateData.color = carInfo.color
  if (carInfo.horsepower) updateData.horsepower = carInfo.horsepower
  if (carInfo.fuel_type) updateData.fuel_type = carInfo.fuel_type
  if (carInfo.transmission) updateData.transmission = carInfo.transmission
  if (carInfo.skatt) updateData.skatt = carInfo.skatt
  if (carInfo.co2_gkm) updateData.co2_gkm = carInfo.co2_gkm
  if (carInfo.mileage_km) updateData.mileage = carInfo.mileage_km
  if (carInfo.antal_agare) updateData.antal_agare = carInfo.antal_agare
  if (carInfo.valuation_company) updateData.valuation_company = carInfo.valuation_company
  if (carInfo.valuation_private) updateData.valuation_private = carInfo.valuation_private
  if (carInfo.total_in_sweden) updateData.total_in_sweden = carInfo.total_in_sweden
  if (carInfo.vehicle_history) updateData.vehicle_history = carInfo.vehicle_history

  // Handle dates
  if (carInfo.senaste_avställning) {
    updateData.senaste_avställning = carInfo.senaste_avställning
  }
  if (carInfo.senaste_påställning) {
    updateData.senaste_påställning = carInfo.senaste_påställning
  }
  if (carInfo.första_registrering) {
    updateData.första_registrering = carInfo.första_registrering
  }
  if (carInfo.besiktning_till) {
    updateData.besiktning_till = carInfo.besiktning_till
  }

  // Handle status (i_trafik/avställd)
  if (carInfo.status) {
    updateData.in_traffic = carInfo.status === 'i_trafik'
  }

  const { error } = await supabase
    .from('vehicles')
    .update(updateData)
    .eq('id', vehicleId)

  if (error) {
    console.error('Error saving car.info to vehicle:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/playground')
  revalidatePath('/leads')
  revalidatePath('/vehicles')

  return { success: true }
}

// Activate lead - move from pending_review to active status
export async function activateLead(leadId: string, targetStatus: 'new' | 'to_call' = 'new') {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({
      status: targetStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId)

  if (error) {
    console.error('Error activating lead:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/playground')
  revalidatePath('/leads')
  revalidatePath('/to-call')
  revalidatePath('/brev')
  revalidatePath('/')

  return { success: true }
}

// Bulk activate leads
export async function bulkActivateLeads(
  leadIds: string[],
  targetStatus: 'new' | 'to_call' = 'new'
) {
  const supabase = await createClient()

  if (leadIds.length === 0) {
    return { success: false, error: 'Inga leads valda' }
  }

  const { error, count } = await supabase
    .from('leads')
    .update({
      status: targetStatus,
      updated_at: new Date().toISOString()
    })
    .in('id', leadIds)

  if (error) {
    console.error('Error bulk activating leads:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/playground')
  revalidatePath('/leads')
  revalidatePath('/to-call')
  revalidatePath('/brev')
  revalidatePath('/')

  return { success: true, activatedCount: count || leadIds.length }
}

// Fetch car.info for multiple vehicles
export async function bulkFetchCarInfo(vehicleIds: string[]) {
  const supabase = await createClient()

  if (vehicleIds.length === 0) {
    return { success: false, error: 'Inga fordon valda' }
  }

  // Validate tokens FIRST before starting bulk operation
  const { data: tokens } = await supabase
    .from('api_tokens')
    .select('refresh_token, bearer_token')
    .eq('service_name', 'car_info')
    .single()

  if (!tokens?.refresh_token || !tokens?.bearer_token) {
    return {
      success: false,
      error: 'Car.info tokens saknas. Gå till Inställningar > Integrationer för att lägga till tokens.'
    }
  }

  // Get vehicles with reg numbers
  const { data: vehicles, error: fetchError } = await supabase
    .from('vehicles')
    .select('id, reg_nr')
    .in('id', vehicleIds)
    .not('reg_nr', 'is', null)

  if (fetchError || !vehicles) {
    return { success: false, error: fetchError?.message || 'Kunde inte hämta fordon' }
  }

  if (vehicles.length === 0) {
    return { success: false, error: 'Inga fordon med registreringsnummer hittades' }
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  }

  // Track if we hit rate limiting - use exponential backoff
  let currentDelay = 2000 // Start with 2 second delay
  let consecutiveFailures = 0
  let isBlocked = false

  // Process each vehicle sequentially to avoid rate limiting
  for (const vehicle of vehicles) {
    if (!vehicle.reg_nr) continue

    // If we're blocked, stop processing remaining vehicles
    if (isBlocked) {
      results.failed++
      results.errors.push(`${vehicle.reg_nr}: Hoppad pga rate limiting`)
      continue
    }

    try {
      // Call the shared fetchCarInfo function directly (no HTTP call)
      const carInfo = await fetchCarInfo(vehicle.reg_nr)

      // Check for rate limiting or blocking errors
      const isRateLimited = carInfo.error?.includes('403') ||
        carInfo.error?.includes('429') ||
        carInfo.error?.includes('HBP210') ||
        carInfo.error?.includes('blockerar') ||
        carInfo.error?.includes('För många')

      if (isRateLimited) {
        consecutiveFailures++
        results.failed++
        results.errors.push(`${vehicle.reg_nr}: ${carInfo.error}`)

        // After 3 consecutive rate limit failures, stop processing
        if (consecutiveFailures >= 3) {
          isBlocked = true
        } else {
          // Exponential backoff: double the delay
          currentDelay = Math.min(currentDelay * 2, 10000) // Max 10 seconds
          await new Promise(resolve => setTimeout(resolve, currentDelay))
        }
        continue
      }

      if (carInfo.error) {
        results.failed++
        results.errors.push(`${vehicle.reg_nr}: ${carInfo.error}`)
        consecutiveFailures = 0 // Reset on non-rate-limit error
        continue
      }

      // Save to database
      const saveResult = await saveCarInfoToVehicle(vehicle.id, carInfo)

      if (saveResult.success) {
        results.success++
        // Reset on success and reduce delay slightly
        consecutiveFailures = 0
        currentDelay = Math.max(2000, currentDelay - 500) // Min 2 seconds
      } else {
        results.failed++
        results.errors.push(`${vehicle.reg_nr}: ${saveResult.error}`)
      }

      // Delay between requests with some jitter (randomness to appear more human-like)
      const jitter = Math.floor(Math.random() * 500) // 0-500ms random
      await new Promise(resolve => setTimeout(resolve, currentDelay + jitter))
    } catch (err) {
      results.failed++
      results.errors.push(`${vehicle.reg_nr}: ${err instanceof Error ? err.message : 'Okänt fel'}`)
      consecutiveFailures++
    }
  }

  revalidatePath('/playground')
  revalidatePath('/leads')
  revalidatePath('/vehicles')

  // Return success: false if ALL fetches failed, or if there were any failures
  const allFailed = results.success === 0 && results.failed > 0
  const hasFailures = results.failed > 0

  return {
    success: !allFailed,  // Only false if ALL failed
    partial: hasFailures && results.success > 0,  // Some succeeded, some failed
    results,
    error: allFailed ? 'Alla hämtningar misslyckades' : undefined
  }
}

// Reset car.info data for multiple vehicles (set all car.info fields to null)
export async function bulkResetCarInfo(vehicleIds: string[]) {
  const supabase = await createClient()

  if (vehicleIds.length === 0) {
    return { success: false, error: 'Inga fordon valda' }
  }

  const resetData = {
    carinfo_fetched_at: null,
    color: null,
    horsepower: null,
    fuel_type: null,
    transmission: null,
    skatt: null,
    co2_gkm: null,
    antal_agare: null,
    valuation_company: null,
    valuation_private: null,
    total_in_sweden: null,
    vehicle_history: null,
    senaste_avställning: null,
    senaste_påställning: null,
    första_registrering: null,
    besiktning_till: null,
    in_traffic: null,
    updated_at: new Date().toISOString()
  }

  const { error, count } = await supabase
    .from('vehicles')
    .update(resetData)
    .in('id', vehicleIds)

  if (error) {
    console.error('Error resetting car.info data:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/playground')
  revalidatePath('/leads')
  revalidatePath('/vehicles')

  return { success: true, resetCount: count || vehicleIds.length }
}
