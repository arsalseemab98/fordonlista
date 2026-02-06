'use server'

import { createClient } from '@/lib/supabase/server'
import {
  fetchBiluppgifterComplete,
  fetchBiluppgifterBatch,
  checkBiluppgifterHealth,
  type BiluppgifterResult,
} from '@/lib/biluppgifter/fetch-biluppgifter'
import { revalidatePath } from 'next/cache'

interface BiluppgifterUpdateResult {
  bp_id: number
  success: boolean
  mileage?: number | null
  num_owners?: number
  annual_tax?: number
  inspection_until?: string
  owner_phone?: string
  owner_age?: number
  address_vehicles_count?: number
  error?: string
}

/**
 * Fetch complete biluppgifter data for a single prospect
 */
export async function fetchBiluppgifterForProspect(bpId: number, regNumber: string) {
  const supabase = await createClient()

  // Fetch complete data from biluppgifter API
  const result = await fetchBiluppgifterComplete(regNumber)

  if (!result.success) {
    return { success: false, error: result.error }
  }

  // Update database with all biluppgifter data
  const { error } = await supabase
    .from('bilprospekt_prospects')
    .update({
      mileage: result.mileage ? Math.round(result.mileage / 10) : null, // Store in Swedish mil
      bu_owner_name: result.owner_name,
      bu_num_owners: result.num_owners,
      bu_annual_tax: result.annual_tax,
      bu_inspection_until: result.inspection_until,
      bu_owner_age: result.owner_age,
      bu_owner_address: result.owner_address,
      bu_owner_postal_code: result.owner_postal_code,
      bu_owner_postal_city: result.owner_postal_city,
      bu_owner_phone: result.owner_phone,
      bu_owner_vehicles: result.owner_vehicles || null,
      bu_address_vehicles: result.address_vehicles || null,
      bu_mileage_history: result.mileage_history || null,
      bu_owner_history: result.owner_history || null,
      bu_fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('bp_id', bpId)

  if (error) {
    console.error('Error updating biluppgifter data:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/bilprospekt')

  return {
    success: true,
    mileage: result.mileage ? Math.round(result.mileage / 10) : null,
    num_owners: result.num_owners,
    annual_tax: result.annual_tax,
    inspection_until: result.inspection_until,
    owner_phone: result.owner_phone,
    owner_age: result.owner_age,
    address_vehicles_count: result.address_vehicles?.length || 0,
  }
}

/**
 * Fetch complete biluppgifter data for multiple prospects
 */
export async function fetchBiluppgifterForProspects(
  prospects: Array<{ bp_id: number; reg_number: string }>
) {
  const supabase = await createClient()
  const regNumbers = prospects.map((p) => p.reg_number)

  // Fetch complete data from biluppgifter API in batch
  const results = await fetchBiluppgifterBatch(regNumbers, true) // true = fetch complete data

  // Update database for each result
  const updates: BiluppgifterUpdateResult[] = []

  for (const result of results) {
    const prospect = prospects.find((p) => p.reg_number === result.regnr)
    if (!prospect) continue

    if (result.success) {
      const updateData: Record<string, unknown> = {
        bu_fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Only update fields that have values
      if (result.mileage !== undefined && result.mileage > 0) {
        updateData.mileage = Math.round(result.mileage / 10)
      } else {
        updateData.mileage = null
      }
      if (result.owner_name) {
        updateData.bu_owner_name = result.owner_name
      }
      if (result.num_owners !== undefined) {
        updateData.bu_num_owners = result.num_owners
      }
      if (result.annual_tax !== undefined) {
        updateData.bu_annual_tax = result.annual_tax
      }
      if (result.inspection_until) {
        updateData.bu_inspection_until = result.inspection_until
      }
      if (result.owner_age !== undefined) {
        updateData.bu_owner_age = result.owner_age
      }
      if (result.owner_address) {
        updateData.bu_owner_address = result.owner_address
      }
      if (result.owner_postal_code) {
        updateData.bu_owner_postal_code = result.owner_postal_code
      }
      if (result.owner_postal_city) {
        updateData.bu_owner_postal_city = result.owner_postal_city
      }
      if (result.owner_phone) {
        updateData.bu_owner_phone = result.owner_phone
      }
      if (result.owner_vehicles) {
        updateData.bu_owner_vehicles = result.owner_vehicles
      }
      if (result.address_vehicles) {
        updateData.bu_address_vehicles = result.address_vehicles
      }
      if (result.mileage_history) {
        updateData.bu_mileage_history = result.mileage_history
      }
      if (result.owner_history) {
        updateData.bu_owner_history = result.owner_history
      }

      const { error } = await supabase
        .from('bilprospekt_prospects')
        .update(updateData)
        .eq('bp_id', prospect.bp_id)

      updates.push({
        bp_id: prospect.bp_id,
        success: !error,
        mileage: result.mileage ? Math.round(result.mileage / 10) : null,
        num_owners: result.num_owners,
        annual_tax: result.annual_tax,
        inspection_until: result.inspection_until,
        owner_phone: result.owner_phone,
        owner_age: result.owner_age,
        address_vehicles_count: result.address_vehicles?.length || 0,
        error: error?.message,
      })
    } else {
      updates.push({
        bp_id: prospect.bp_id,
        success: false,
        error: result.error,
      })
    }
  }

  revalidatePath('/bilprospekt')

  const successCount = updates.filter((u) => u.success).length
  return {
    success: true,
    total: prospects.length,
    updated: successCount,
    failed: prospects.length - successCount,
    results: updates,
  }
}

/**
 * Legacy function for backwards compatibility - just fetches mileage
 */
export async function fetchMileageForProspect(bpId: number, regNumber: string) {
  return fetchBiluppgifterForProspect(bpId, regNumber)
}

/**
 * Legacy function for backwards compatibility
 */
export async function fetchMileageForProspects(
  prospects: Array<{ bp_id: number; reg_number: string }>
) {
  return fetchBiluppgifterForProspects(prospects)
}

export async function checkBiluppgifterStatus() {
  return await checkBiluppgifterHealth()
}

/**
 * Import a bilprospekt prospect to the leads system and send to call list
 * Transfers ALL biluppgifter data to leads and vehicles tables
 */
export async function sendProspectToCall(bpId: number) {
  const supabase = await createClient()

  // Get the prospect data
  const { data: prospect, error: fetchError } = await supabase
    .from('bilprospekt_prospects')
    .select('*')
    .eq('bp_id', bpId)
    .single()

  if (fetchError || !prospect) {
    return { success: false, error: 'Kunde inte hitta prospektet' }
  }

  // Check if already sent
  if (prospect.sent_to_call_at) {
    return { success: false, error: 'Redan skickad till ringlistan' }
  }

  // Create lead with ALL owner data
  const ownerName = prospect.bu_owner_name || prospect.owner_name || 'Okänd'
  const address = prospect.bu_owner_address || ''
  const postalCode = prospect.bu_owner_postal_code || ''
  const city = prospect.bu_owner_postal_city || prospect.municipality || ''
  const phone = prospect.bu_owner_phone || ''

  const ownerInfo = [ownerName, address, `${postalCode} ${city}`.trim()]
    .filter(Boolean)
    .join(', ')

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      phone: phone || null,
      owner_info: ownerInfo,
      location: city || prospect.municipality,
      status: 'to_call',
      source: 'bilprospekt',
      county: prospect.region || null,
      sent_to_call_at: new Date().toISOString(),
      owner_age: prospect.bu_owner_age || null,
      owner_gender: prospect.owner_gender || null,
      owner_type: prospect.owner_type || null,
    })
    .select('id')
    .single()

  if (leadError || !lead) {
    console.error('Error creating lead:', leadError)
    return { success: false, error: leadError?.message || 'Kunde inte skapa lead' }
  }

  // Create vehicle linked to lead with ALL biluppgifter data
  const { error: vehicleError } = await supabase
    .from('vehicles')
    .insert({
      lead_id: lead.id,
      reg_nr: prospect.reg_number,
      make: prospect.brand,
      model: prospect.model,
      year: prospect.car_year,
      fuel_type: prospect.fuel,
      mileage: prospect.mileage ? prospect.mileage * 10 : null, // Convert mil to km
      in_traffic: prospect.in_service === 'Ja',
      color: prospect.color,
      horsepower: prospect.engine_power,
      transmission: prospect.transmission,
      four_wheel_drive: prospect.fwd === 'Ja',
      engine_cc: prospect.cylinder_volume,
      // Biluppgifter data
      antal_agare: prospect.bu_num_owners,
      skatt: prospect.bu_annual_tax,
      besiktning_till: prospect.bu_inspection_until,
      mileage_history: prospect.bu_mileage_history || null,
      owner_history: prospect.bu_owner_history || null,
      owner_vehicles: prospect.bu_owner_vehicles || null,
      address_vehicles: prospect.bu_address_vehicles || null,
      owner_gender: prospect.owner_gender || null,
      owner_type: prospect.owner_type || null,
      biluppgifter_fetched_at: prospect.bu_fetched_at || null,
    })

  if (vehicleError) {
    console.error('Error creating vehicle:', vehicleError)
    // Rollback lead
    await supabase.from('leads').delete().eq('id', lead.id)
    return { success: false, error: vehicleError.message }
  }

  // Mark prospect as sent
  await supabase
    .from('bilprospekt_prospects')
    .update({
      sent_to_call_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('bp_id', bpId)

  revalidatePath('/bilprospekt')
  revalidatePath('/to-call')
  return { success: true }
}

/**
 * Import a bilprospekt prospect to the leads system and send to letter list
 * Transfers ALL biluppgifter data to leads and vehicles tables
 */
export async function sendProspectToBrev(bpId: number) {
  const supabase = await createClient()

  // Get the prospect data
  const { data: prospect, error: fetchError } = await supabase
    .from('bilprospekt_prospects')
    .select('*')
    .eq('bp_id', bpId)
    .single()

  if (fetchError || !prospect) {
    return { success: false, error: 'Kunde inte hitta prospektet' }
  }

  // Check if already sent
  if (prospect.sent_to_brev_at) {
    return { success: false, error: 'Redan skickad till brevlistan' }
  }

  // Create lead with ALL owner data
  const ownerName = prospect.bu_owner_name || prospect.owner_name || 'Okänd'
  const address = prospect.bu_owner_address || ''
  const postalCode = prospect.bu_owner_postal_code || ''
  const city = prospect.bu_owner_postal_city || prospect.municipality || ''
  const phone = prospect.bu_owner_phone || ''

  const ownerInfo = [ownerName, address, `${postalCode} ${city}`.trim()]
    .filter(Boolean)
    .join(', ')

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      phone: phone || null,
      owner_info: ownerInfo,
      location: city || prospect.municipality,
      status: 'new',
      source: 'bilprospekt',
      county: prospect.region || null,
      sent_to_brev_at: new Date().toISOString(),
      letter_sent: false,
      owner_age: prospect.bu_owner_age || null,
      owner_gender: prospect.owner_gender || null,
      owner_type: prospect.owner_type || null,
    })
    .select('id')
    .single()

  if (leadError || !lead) {
    console.error('Error creating lead:', leadError)
    return { success: false, error: leadError?.message || 'Kunde inte skapa lead' }
  }

  // Create vehicle linked to lead with ALL biluppgifter data
  const { error: vehicleError } = await supabase
    .from('vehicles')
    .insert({
      lead_id: lead.id,
      reg_nr: prospect.reg_number,
      make: prospect.brand,
      model: prospect.model,
      year: prospect.car_year,
      fuel_type: prospect.fuel,
      mileage: prospect.mileage ? prospect.mileage * 10 : null, // Convert mil to km
      in_traffic: prospect.in_service === 'Ja',
      color: prospect.color,
      horsepower: prospect.engine_power,
      transmission: prospect.transmission,
      four_wheel_drive: prospect.fwd === 'Ja',
      engine_cc: prospect.cylinder_volume,
      // Biluppgifter data
      antal_agare: prospect.bu_num_owners,
      skatt: prospect.bu_annual_tax,
      besiktning_till: prospect.bu_inspection_until,
      mileage_history: prospect.bu_mileage_history || null,
      owner_history: prospect.bu_owner_history || null,
      owner_vehicles: prospect.bu_owner_vehicles || null,
      address_vehicles: prospect.bu_address_vehicles || null,
      owner_gender: prospect.owner_gender || null,
      owner_type: prospect.owner_type || null,
      biluppgifter_fetched_at: prospect.bu_fetched_at || null,
    })

  if (vehicleError) {
    console.error('Error creating vehicle:', vehicleError)
    // Rollback lead
    await supabase.from('leads').delete().eq('id', lead.id)
    return { success: false, error: vehicleError.message }
  }

  // Mark prospect as sent
  await supabase
    .from('bilprospekt_prospects')
    .update({
      sent_to_brev_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('bp_id', bpId)

  revalidatePath('/bilprospekt')
  revalidatePath('/brev')
  return { success: true, leadId: lead.id }
}

/**
 * Send multiple prospects to call list
 */
export async function sendProspectsToCall(bpIds: number[]) {
  let successCount = 0
  let errorCount = 0

  for (const bpId of bpIds) {
    const result = await sendProspectToCall(bpId)
    if (result.success) {
      successCount++
    } else {
      errorCount++
    }
  }

  revalidatePath('/bilprospekt')
  revalidatePath('/to-call')
  return { success: true, count: successCount, errors: errorCount }
}

/**
 * Send multiple prospects to letter list
 */
export async function sendProspectsToBrev(bpIds: number[]) {
  let successCount = 0
  let errorCount = 0

  for (const bpId of bpIds) {
    const result = await sendProspectToBrev(bpId)
    if (result.success) {
      successCount++
    } else {
      errorCount++
    }
  }

  revalidatePath('/bilprospekt')
  revalidatePath('/brev')
  return { success: true, count: successCount, errors: errorCount }
}

/**
 * Trigger manual Bilprospekt data sync
 */
export async function triggerBilprospektSync() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    const resp = await fetch(`${baseUrl}/api/cron/bilprospekt-sync?trigger=manual`, {
      method: 'GET',
      cache: 'no-store',
    })

    const result = await resp.json()
    revalidatePath('/bilprospekt')
    return result
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
