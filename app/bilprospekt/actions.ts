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
      if (result.mileage !== undefined) {
        updateData.mileage = Math.round(result.mileage / 10)
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
