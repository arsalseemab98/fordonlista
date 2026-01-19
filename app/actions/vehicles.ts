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
  senaste_agarbyte?: string
  första_registrering?: string
  besiktning_till?: string
  vehicle_history?: Array<{ date: string; event: string; details?: string }>
  antal_foretagsannonser?: number
  antal_privatannonser?: number
  // Debug info from fetch-carinfo.ts
  _debug_agarbyte?: {
    histitem_count: number
    latestAgarbyte_from_loop: string | null
    fallback_ran: boolean
    fallback_found: string | null
    events_with_garbyte: Array<{ date: string; event: string; eventLower: string }>
    debug_timestamp: number
  }
}

export async function saveCarInfoToVehicle(vehicleId: string, carInfo: CarInfoData) {
  const supabase = await createClient()

  // Log the attempt with sample event texts for debugging
  const sampleEvents = carInfo.vehicle_history?.slice(0, 10).map(h => {
    const eventLower = h.event.normalize('NFC').toLowerCase()
    const checksAgarbyte = eventLower.includes('ägarbyte')
    const checksGarbyte = h.event.toLowerCase().includes('garbyte')
    return {
      date: h.date,
      event: h.event,
      eventLower,
      eventHex: Buffer.from(h.event).toString('hex'),
      checksAgarbyte,
      checksGarbyte,
      wouldMatch: checksAgarbyte || checksGarbyte
    }
  }) || []

  // Also check for any event that contains "garbyte" in the full history
  const agarbyteMatches = carInfo.vehicle_history?.filter(h => {
    const eventLower = h.event.normalize('NFC').toLowerCase()
    return eventLower.includes('ägarbyte') ||
           eventLower.includes('garbyte') ||
           h.event.toLowerCase().includes('garbyte')
  }).map(h => ({ date: h.date, event: h.event })) || []

  // FIX: If senaste_agarbyte is not set but we found ägarbyte events in history,
  // use the first match (most recent) as the senaste_agarbyte value
  if (!carInfo.senaste_agarbyte && agarbyteMatches.length > 0) {
    carInfo.senaste_agarbyte = agarbyteMatches[0].date
    console.log(`[VEHICLES] Fixed senaste_agarbyte for ${carInfo.reg_number}: ${agarbyteMatches[0].date} (from ${agarbyteMatches.length} matches)`)
  }

  await supabase.from('activity_logs').insert({
    action: 'carinfo_save_attempt',
    entity_type: 'vehicle',
    entity_id: vehicleId,
    entity_ref: carInfo.reg_number,
    details: {
      has_agarbyte: !!carInfo.senaste_agarbyte,
      senaste_agarbyte: carInfo.senaste_agarbyte,
      history_count: carInfo.vehicle_history?.length || 0,
      sample_events: sampleEvents,
      agarbyte_matches: agarbyteMatches,
      // Debug info from fetch-carinfo.ts parsing
      fetch_debug: carInfo._debug_agarbyte
    }
  })

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
  if (carInfo.antal_foretagsannonser) updateData.antal_foretagsannonser = carInfo.antal_foretagsannonser
  if (carInfo.antal_privatannonser) updateData.antal_privatannonser = carInfo.antal_privatannonser

  // Handle dates
  if (carInfo.senaste_avställning) {
    updateData.senaste_avställning = carInfo.senaste_avställning
  }
  if (carInfo.senaste_påställning) {
    updateData.senaste_påställning = carInfo.senaste_påställning
  }
  if (carInfo.senaste_agarbyte) {
    updateData.senaste_agarbyte = carInfo.senaste_agarbyte
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
    await supabase.from('activity_logs').insert({
      action: 'carinfo_save_error',
      entity_type: 'vehicle',
      entity_id: vehicleId,
      entity_ref: carInfo.reg_number,
      details: { error: error.message }
    })
    return { success: false, error: error.message }
  }

  // Log success
  await supabase.from('activity_logs').insert({
    action: 'carinfo_save_success',
    entity_type: 'vehicle',
    entity_id: vehicleId,
    entity_ref: carInfo.reg_number,
    details: {
      senaste_agarbyte: carInfo.senaste_agarbyte,
      fields_saved: Object.keys(updateData).length
    }
  })

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
  targetStatus: 'new' | 'to_call' = 'new',
  actionType?: 'call' | 'brev'
) {
  const supabase = await createClient()

  if (leadIds.length === 0) {
    return { success: false, error: 'Inga leads valda' }
  }

  const now = new Date().toISOString()

  // Build update object with optional timestamp based on action type
  const updateData: Record<string, string | null> = {
    status: targetStatus,
    updated_at: now
  }

  // Add timestamp for tracking when lead was sent to call or brev
  if (actionType === 'call') {
    updateData.sent_to_call_at = now
  } else if (actionType === 'brev') {
    updateData.sent_to_brev_at = now
  }

  const { error, count } = await supabase
    .from('leads')
    .update(updateData)
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
    senaste_agarbyte: null,
    första_registrering: null,
    besiktning_till: null,
    antal_foretagsannonser: null,
    antal_privatannonser: null,
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

// Manually add a vehicle with registration number
export async function addManualVehicle(data: {
  reg_nr: string
  make?: string
  model?: string
  year?: number
  mileage?: number
  owner_info?: string
  county?: string
  prospect_type?: string
}) {
  const supabase = await createClient()

  // Clean registration number
  const cleanRegNr = data.reg_nr.toUpperCase().replace(/\s/g, '')

  if (!cleanRegNr || cleanRegNr.length < 2) {
    return { success: false, error: 'Ogiltigt registreringsnummer' }
  }

  // Create lead first
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      owner_info: data.owner_info || null,
      status: 'pending_review',
      source: 'manual_entry',
      county: data.county || null,
      prospect_type: data.prospect_type || null
    })
    .select('id')
    .single()

  if (leadError || !lead) {
    console.error('Error creating manual lead:', leadError)
    return { success: false, error: leadError?.message || 'Kunde inte skapa lead' }
  }

  // Create vehicle
  const { error: vehicleError } = await supabase
    .from('vehicles')
    .insert({
      lead_id: lead.id,
      reg_nr: cleanRegNr,
      make: data.make || null,
      model: data.model || null,
      year: data.year || null,
      mileage: data.mileage || null
    })

  if (vehicleError) {
    console.error('Error creating manual vehicle:', vehicleError)
    // Try to clean up the lead
    await supabase.from('leads').delete().eq('id', lead.id)
    return { success: false, error: vehicleError.message }
  }

  revalidatePath('/playground')
  revalidatePath('/leads')
  revalidatePath('/vehicles')

  return { success: true, leadId: lead.id }
}
