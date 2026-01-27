'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateLeadStatus(leadId: string, status: string, completionReason?: string) {
  const supabase = await createClient()

  const updateData: { status: string; updated_at: string; completion_reason?: string | null } = {
    status,
    updated_at: new Date().toISOString()
  }

  // Add completion_reason if status is completed
  if (status === 'completed' && completionReason) {
    updateData.completion_reason = completionReason
  } else if (status !== 'completed') {
    // Clear completion_reason if status is not completed
    updateData.completion_reason = null
  }

  const { error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', leadId)

  if (error) {
    console.error('Error updating lead status:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/to-call')
  revalidatePath('/playground')
  revalidatePath('/historik')
  revalidatePath('/')

  return { success: true }
}

export async function addCallLog({
  leadId,
  vehicleId,
  result,
  notes,
  followUpDate,
  bookingDate,
  completionReason
}: {
  leadId: string
  vehicleId?: string
  result: string
  notes?: string
  followUpDate?: string
  bookingDate?: string
  completionReason?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('call_logs')
    .insert({
      lead_id: leadId,
      vehicle_id: vehicleId,
      called_at: new Date().toISOString(),
      result,
      notes,
      follow_up_date: followUpDate,
      booking_date: bookingDate
    })

  if (error) {
    console.error('Error adding call log:', error)
    return { success: false, error: error.message }
  }

  // Update lead's updated_at and potentially status
  // Use database values (English) for comparison
  let newStatus: string | undefined = undefined
  let newCompletionReason: string | null = null

  if (result === 'interested') {
    newStatus = 'interested'
  } else if (result === 'not_interested') {
    newStatus = 'completed'
    newCompletionReason = completionReason || 'not_interested'
  } else if (result === 'call_back') {
    newStatus = 'callback'
  } else if (result === 'booked') {
    newStatus = 'booked'
  } else if (result === 'no_answer' || result === 'busy') {
    newStatus = 'no_answer'
  } else if (result === 'wrong_number') {
    newStatus = 'completed'
    newCompletionReason = 'wrong_number'
  }

  const updateData: { updated_at: string; status?: string; completion_reason?: string | null } = {
    updated_at: new Date().toISOString()
  }

  if (newStatus) {
    updateData.status = newStatus
  }

  if (newCompletionReason) {
    updateData.completion_reason = newCompletionReason
  }

  const { error: updateError } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', leadId)

  if (updateError) {
    console.error('Error updating lead status:', updateError)
    // Still return success since call log was added, but log the error
  } else {
    console.log(`Lead ${leadId} status updated to: ${newStatus || 'unchanged'}`)
  }

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/to-call')
  revalidatePath('/playground')
  revalidatePath('/historik')
  revalidatePath('/')

  return { success: true }
}

export async function deleteCallLog(callLogId: string, leadId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('call_logs')
    .delete()
    .eq('id', callLogId)

  if (error) {
    console.error('Error deleting call log:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)

  return { success: true }
}

export async function toggleVehicleInteresting(vehicleId: string, isInteresting: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('vehicles')
    .update({
      is_interesting: isInteresting,
      updated_at: new Date().toISOString()
    })
    .eq('id', vehicleId)

  if (error) {
    console.error('Error updating vehicle:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/leads')
  revalidatePath('/vehicles')

  return { success: true }
}

export interface BulkUpdateMetadata {
  county?: string | null
  prospect_type?: string | null
  data_period_start?: string | null
  data_period_end?: string | null
}

export async function markLeadForLetter(leadId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({
      letter_sent: false, // Mark as "to be sent"
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId)

  if (error) {
    console.error('Error marking lead for letter:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/leads')
  revalidatePath('/playground')
  revalidatePath('/brev')

  return { success: true }
}

export async function removeLeadFromLetterList(leadId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({
      letter_sent: null, // Remove from letter list entirely
      letter_sent_date: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId)

  if (error) {
    console.error('Error removing lead from letter list:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/leads')
  revalidatePath('/playground')
  revalidatePath('/brev')

  return { success: true }
}

export async function bulkUpdateLeadsMetadata(
  leadIds: string[],
  metadata: BulkUpdateMetadata
): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
  const supabase = await createClient()

  if (leadIds.length === 0) {
    return { success: false, error: 'Inga leads valda' }
  }

  // Build update object only with defined values
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (metadata.county !== undefined) {
    updateData.county = metadata.county
  }
  if (metadata.prospect_type !== undefined) {
    updateData.prospect_type = metadata.prospect_type
  }
  if (metadata.data_period_start !== undefined) {
    updateData.data_period_start = metadata.data_period_start
  }
  if (metadata.data_period_end !== undefined) {
    updateData.data_period_end = metadata.data_period_end
  }

  const { error, count } = await supabase
    .from('leads')
    .update(updateData)
    .in('id', leadIds)

  if (error) {
    console.error('Error bulk updating leads:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/leads')
  revalidatePath('/playground')
  revalidatePath('/')

  return { success: true, updatedCount: count || leadIds.length }
}

export async function deleteLead(leadId: string) {
  // Validate leadId
  if (!leadId || typeof leadId !== 'string' || leadId.trim() === '') {
    return { success: false, error: 'Ogiltigt lead-ID' }
  }

  const supabase = await createClient()

  try {
    // Soft delete: set deleted_at timestamp instead of actually deleting
    const { error } = await supabase
      .from('leads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', leadId)

    if (error) {
      console.error('Error soft-deleting lead:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/leads')
    revalidatePath('/playground')
    revalidatePath('/brev')
    revalidatePath('/to-call')
    revalidatePath('/historik')
    revalidatePath('/papperskorg')
    revalidatePath('/')

    return { success: true }
  } catch (err) {
    console.error('Unexpected error soft-deleting lead:', err)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

export async function updateLeadProspectType(leadId: string, prospectType: string | null) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({
      prospect_type: prospectType,
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId)

  if (error) {
    console.error('Error updating prospect type:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/leads')
  revalidatePath('/playground')

  return { success: true }
}

export async function deleteExtraDataColumn(columnName: string) {
  const supabase = await createClient()

  // Get all leads with extra_data containing this column
  const { data: leads, error: fetchError } = await supabase
    .from('leads')
    .select('id, extra_data')
    .not('extra_data', 'is', null)

  if (fetchError) {
    console.error('Error fetching leads:', fetchError)
    return { success: false, error: fetchError.message }
  }

  let updatedCount = 0

  // Update each lead, removing the column from extra_data
  for (const lead of leads || []) {
    if (lead.extra_data && typeof lead.extra_data === 'object' && columnName in lead.extra_data) {
      const newExtraData = { ...lead.extra_data }
      delete newExtraData[columnName]

      // If extra_data is now empty, set it to null
      const finalExtraData = Object.keys(newExtraData).length > 0 ? newExtraData : null

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          extra_data: finalExtraData,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id)

      if (!updateError) {
        updatedCount++
      }
    }
  }

  revalidatePath('/leads')
  revalidatePath('/playground')

  return { success: true, updatedCount }
}

export async function bulkDeleteLeads(leadIds: string[]) {
  if (!leadIds || leadIds.length === 0) {
    return { success: false, error: 'Inga leads valda' }
  }

  const validIds = leadIds.filter(id => id && typeof id === 'string' && id.trim() !== '')

  if (validIds.length === 0) {
    return { success: false, error: 'Inga giltiga lead-IDs' }
  }

  const supabase = await createClient()

  // Process in chunks of 100 to avoid Supabase limits
  const CHUNK_SIZE = 100
  let totalDeleted = 0

  try {
    for (let i = 0; i < validIds.length; i += CHUNK_SIZE) {
      const chunk = validIds.slice(i, i + CHUNK_SIZE)

      // Soft delete: set deleted_at timestamp
      const { error, count } = await supabase
        .from('leads')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', chunk)

      if (error) {
        console.error('Error soft-deleting leads in chunk:', error)
      } else {
        totalDeleted += count || chunk.length
      }
    }

    revalidatePath('/leads')
    revalidatePath('/playground')
    revalidatePath('/brev')
    revalidatePath('/to-call')
    revalidatePath('/historik')
    revalidatePath('/papperskorg')
    revalidatePath('/')

    return { success: true, deletedCount: totalDeleted }
  } catch (err) {
    console.error('Unexpected error bulk soft-deleting leads:', err)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

export async function restoreLeads(leadIds: string[]) {
  if (!leadIds || leadIds.length === 0) {
    return { success: false, error: 'Inga leads valda' }
  }

  const supabase = await createClient()

  const CHUNK_SIZE = 100
  let totalRestored = 0

  try {
    for (let i = 0; i < leadIds.length; i += CHUNK_SIZE) {
      const chunk = leadIds.slice(i, i + CHUNK_SIZE)

      const { error, count } = await supabase
        .from('leads')
        .update({ deleted_at: null })
        .in('id', chunk)

      if (error) {
        console.error('Error restoring leads in chunk:', error)
      } else {
        totalRestored += count || chunk.length
      }
    }

    revalidatePath('/leads')
    revalidatePath('/playground')
    revalidatePath('/brev')
    revalidatePath('/to-call')
    revalidatePath('/historik')
    revalidatePath('/papperskorg')
    revalidatePath('/')

    return { success: true, restoredCount: totalRestored }
  } catch (err) {
    console.error('Unexpected error restoring leads:', err)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

export async function permanentlyDeleteLeads(leadIds: string[]) {
  if (!leadIds || leadIds.length === 0) {
    return { success: false, error: 'Inga leads valda' }
  }

  const supabase = await createClient()

  const CHUNK_SIZE = 100
  let totalDeleted = 0

  try {
    for (let i = 0; i < leadIds.length; i += CHUNK_SIZE) {
      const chunk = leadIds.slice(i, i + CHUNK_SIZE)

      // Delete associated vehicles first (cascade)
      await supabase.from('vehicles').delete().in('lead_id', chunk)

      // Delete associated call logs
      await supabase.from('call_logs').delete().in('lead_id', chunk)

      // Permanently delete the leads
      const { error, count } = await supabase
        .from('leads')
        .delete()
        .in('id', chunk)

      if (error) {
        console.error('Error permanently deleting leads:', error)
      } else {
        totalDeleted += count || chunk.length
      }
    }

    revalidatePath('/papperskorg')
    revalidatePath('/')

    return { success: true, deletedCount: totalDeleted }
  } catch (err) {
    console.error('Unexpected error permanently deleting leads:', err)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

export async function cleanupOldDeletedLeads() {
  const supabase = await createClient()

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Find leads deleted more than 30 days ago
    const { data: oldLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', thirtyDaysAgo.toISOString())

    if (fetchError || !oldLeads || oldLeads.length === 0) {
      return { success: true, deletedCount: 0 }
    }

    const oldIds = oldLeads.map(l => l.id)
    const result = await permanentlyDeleteLeads(oldIds)

    return result
  } catch (err) {
    console.error('Unexpected error cleaning up old deleted leads:', err)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

export interface HistoryCheckOptions {
  matchRegNr: boolean
  matchChassis: boolean
  matchName: boolean
  matchPhone: boolean
}

export interface HistoryCheckMatch {
  leadId: string
  matchedLeadId: string
  matchType: 'reg_nr' | 'chassis' | 'name' | 'phone'
  matchValue: string
}

export interface HistoryCheckResult {
  success: boolean
  error?: string
  totalChecked: number
  uniqueCount: number
  duplicateCount: number
  matches: HistoryCheckMatch[]
  duplicateLeadIds: string[]
}

export async function checkLeadsHistory(
  leadIdsToCheck: string[],
  options: HistoryCheckOptions
): Promise<HistoryCheckResult> {
  const supabase = await createClient()

  if (leadIdsToCheck.length === 0) {
    return {
      success: false,
      error: 'Inga leads att kontrollera',
      totalChecked: 0,
      uniqueCount: 0,
      duplicateCount: 0,
      matches: [],
      duplicateLeadIds: []
    }
  }

  if (!options.matchRegNr && !options.matchChassis && !options.matchName && !options.matchPhone) {
    return {
      success: false,
      error: 'Välj minst ett matchningsfält',
      totalChecked: 0,
      uniqueCount: 0,
      duplicateCount: 0,
      matches: [],
      duplicateLeadIds: []
    }
  }

  try {
    // Fetch the leads we want to check (the new ones in playground)
    const { data: leadsToCheck, error: fetchError } = await supabase
      .from('leads')
      .select(`
        id,
        phone,
        owner_info,
        vehicles (
          id,
          reg_nr,
          chassis_nr
        )
      `)
      .in('id', leadIdsToCheck)

    if (fetchError) {
      console.error('Error fetching leads to check:', fetchError)
      return {
        success: false,
        error: fetchError.message,
        totalChecked: 0,
        uniqueCount: 0,
        duplicateCount: 0,
        matches: [],
        duplicateLeadIds: []
      }
    }

    // Fetch ALL other leads (not in our check list) to compare against
    // Note: We need to fetch in batches to avoid Supabase's 1000 row limit
    let existingLeads: NonNullable<typeof leadsToCheck> = []
    let existingErrorMessage: string | null = null

    // Fetch all existing leads in batches of 1000
    let offset = 0
    const batchSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data: batch, error: batchError } = await supabase
        .from('leads')
        .select(`
          id,
          phone,
          owner_info,
          vehicles (
            id,
            reg_nr,
            chassis_nr
          )
        `)
        .not('id', 'in', `(${leadIdsToCheck.join(',')})`)
        .range(offset, offset + batchSize - 1)

      if (batchError) {
        existingErrorMessage = batchError.message
        console.error('Error fetching existing leads batch:', batchError)
        break
      }

      if (batch && batch.length > 0) {
        existingLeads = [...existingLeads, ...batch]
        offset += batchSize
        hasMore = batch.length === batchSize
      } else {
        hasMore = false
      }
    }

    if (existingErrorMessage) {
      return {
        success: false,
        error: existingErrorMessage,
        totalChecked: 0,
        uniqueCount: 0,
        duplicateCount: 0,
        matches: [],
        duplicateLeadIds: []
      }
    }

    // Debug logging
    console.log('=== HISTORY CHECK DEBUG ===')
    console.log('Leads to check:', leadsToCheck?.length)
    console.log('Existing leads found:', existingLeads.length)
    console.log('Match options:', options)

    // Log sample of leads to check
    if (leadsToCheck && leadsToCheck.length > 0) {
      const sampleLeadToCheck = leadsToCheck[0]
      console.log('Sample lead to check:', {
        id: sampleLeadToCheck.id,
        phone: sampleLeadToCheck.phone,
        owner_info: sampleLeadToCheck.owner_info,
        vehicles: sampleLeadToCheck.vehicles?.map(v => ({ reg_nr: v.reg_nr, chassis_nr: v.chassis_nr }))
      })
    }

    // Log sample of existing leads
    if (existingLeads.length > 0) {
      const sampleExisting = existingLeads[0]
      console.log('Sample existing lead:', {
        id: sampleExisting.id,
        phone: sampleExisting.phone,
        owner_info: sampleExisting.owner_info,
        vehicles: sampleExisting.vehicles?.map(v => ({ reg_nr: v.reg_nr, chassis_nr: v.chassis_nr }))
      })
    }

    // Build lookup maps for existing leads
    const existingByRegNr = new Map<string, { leadId: string; regNr: string }>()
    const existingByChassis = new Map<string, { leadId: string; chassis: string }>()
    const existingByPhone = new Map<string, { leadId: string; phone: string }>()
    const existingByName = new Map<string, { leadId: string; name: string }>()

    for (const lead of existingLeads || []) {
      // Index by phone
      if (options.matchPhone && lead.phone) {
        const cleanPhone = lead.phone.replace(/\D/g, '')
        if (cleanPhone.length >= 8) {
          existingByPhone.set(cleanPhone, { leadId: lead.id, phone: lead.phone })
        }
      }

      // Index by name (normalized)
      if (options.matchName && lead.owner_info) {
        const normalizedName = lead.owner_info.toLowerCase().trim()
        if (normalizedName.length > 3) {
          existingByName.set(normalizedName, { leadId: lead.id, name: lead.owner_info })
        }
      }

      // Index by vehicles
      for (const vehicle of lead.vehicles || []) {
        if (options.matchRegNr && vehicle.reg_nr) {
          const cleanRegNr = vehicle.reg_nr.toUpperCase().replace(/\s/g, '')
          existingByRegNr.set(cleanRegNr, { leadId: lead.id, regNr: vehicle.reg_nr })
        }
        if (options.matchChassis && vehicle.chassis_nr) {
          const cleanChassis = vehicle.chassis_nr.toUpperCase().replace(/\s/g, '')
          existingByChassis.set(cleanChassis, { leadId: lead.id, chassis: vehicle.chassis_nr })
        }
      }
    }

    // Log lookup map sizes
    console.log('Lookup map sizes:', {
      regNr: existingByRegNr.size,
      chassis: existingByChassis.size,
      phone: existingByPhone.size,
      name: existingByName.size
    })

    // Log sample of reg_nr values in the map
    if (existingByRegNr.size > 0) {
      const regNrSamples = Array.from(existingByRegNr.keys()).slice(0, 5)
      console.log('Sample reg_nr keys in existing map:', regNrSamples)
    }

    // Check each lead against the maps
    const matches: HistoryCheckMatch[] = []
    const duplicateLeadIds = new Set<string>()

    for (const lead of leadsToCheck || []) {
      let foundMatch = false

      // Log what we're checking for this lead
      if (lead.vehicles && lead.vehicles.length > 0) {
        const regNrs = lead.vehicles.map(v => v.reg_nr ? v.reg_nr.toUpperCase().replace(/\s/g, '') : 'null')
        console.log(`Checking lead ${lead.id} with reg_nrs:`, regNrs)
      }

      // Check phone
      if (options.matchPhone && lead.phone) {
        const cleanPhone = lead.phone.replace(/\D/g, '')
        const match = existingByPhone.get(cleanPhone)
        if (match) {
          matches.push({
            leadId: lead.id,
            matchedLeadId: match.leadId,
            matchType: 'phone',
            matchValue: lead.phone
          })
          foundMatch = true
        }
      }

      // Check name
      if (options.matchName && lead.owner_info) {
        const normalizedName = lead.owner_info.toLowerCase().trim()
        const match = existingByName.get(normalizedName)
        if (match) {
          matches.push({
            leadId: lead.id,
            matchedLeadId: match.leadId,
            matchType: 'name',
            matchValue: lead.owner_info
          })
          foundMatch = true
        }
      }

      // Check vehicles
      for (const vehicle of lead.vehicles || []) {
        if (options.matchRegNr && vehicle.reg_nr) {
          const cleanRegNr = vehicle.reg_nr.toUpperCase().replace(/\s/g, '')
          const match = existingByRegNr.get(cleanRegNr)
          if (match) {
            matches.push({
              leadId: lead.id,
              matchedLeadId: match.leadId,
              matchType: 'reg_nr',
              matchValue: vehicle.reg_nr
            })
            foundMatch = true
          }
        }
        if (options.matchChassis && vehicle.chassis_nr) {
          const cleanChassis = vehicle.chassis_nr.toUpperCase().replace(/\s/g, '')
          const match = existingByChassis.get(cleanChassis)
          if (match) {
            matches.push({
              leadId: lead.id,
              matchedLeadId: match.leadId,
              matchType: 'chassis',
              matchValue: vehicle.chassis_nr
            })
            foundMatch = true
          }
        }
      }

      if (foundMatch) {
        duplicateLeadIds.add(lead.id)
      }
    }

    // ALSO check for duplicates WITHIN the selected leads themselves
    // This catches cases where the user selects multiple leads that are duplicates of each other
    console.log('Checking for internal duplicates within selected leads...')

    const internalByRegNr = new Map<string, string[]>() // regNr -> [leadIds]
    const internalByChassis = new Map<string, string[]>()
    const internalByPhone = new Map<string, string[]>()
    const internalByName = new Map<string, string[]>()

    for (const lead of leadsToCheck || []) {
      // Index by phone
      if (options.matchPhone && lead.phone) {
        const cleanPhone = lead.phone.replace(/\D/g, '')
        if (cleanPhone.length >= 8) {
          const existing = internalByPhone.get(cleanPhone) || []
          existing.push(lead.id)
          internalByPhone.set(cleanPhone, existing)
        }
      }

      // Index by name
      if (options.matchName && lead.owner_info) {
        const normalizedName = lead.owner_info.toLowerCase().trim()
        if (normalizedName.length > 3) {
          const existing = internalByName.get(normalizedName) || []
          existing.push(lead.id)
          internalByName.set(normalizedName, existing)
        }
      }

      // Index by vehicles
      for (const vehicle of lead.vehicles || []) {
        if (options.matchRegNr && vehicle.reg_nr) {
          const cleanRegNr = vehicle.reg_nr.toUpperCase().replace(/\s/g, '')
          const existing = internalByRegNr.get(cleanRegNr) || []
          existing.push(lead.id)
          internalByRegNr.set(cleanRegNr, existing)
        }
        if (options.matchChassis && vehicle.chassis_nr) {
          const cleanChassis = vehicle.chassis_nr.toUpperCase().replace(/\s/g, '')
          const existing = internalByChassis.get(cleanChassis) || []
          existing.push(lead.id)
          internalByChassis.set(cleanChassis, existing)
        }
      }
    }

    // Find internal duplicates (entries with more than one lead ID)
    const addInternalDuplicates = (map: Map<string, string[]>, matchType: 'reg_nr' | 'chassis' | 'phone' | 'name') => {
      for (const [value, leadIds] of map.entries()) {
        if (leadIds.length > 1) {
          console.log(`Found internal duplicate: ${matchType} = ${value}, leads: ${leadIds.join(', ')}`)
          // Mark all leads with this value as duplicates (except the first one, which is "original")
          for (let i = 1; i < leadIds.length; i++) {
            duplicateLeadIds.add(leadIds[i])
            matches.push({
              leadId: leadIds[i],
              matchedLeadId: leadIds[0], // First one is the "original"
              matchType,
              matchValue: value
            })
          }
        }
      }
    }

    addInternalDuplicates(internalByRegNr, 'reg_nr')
    addInternalDuplicates(internalByChassis, 'chassis')
    addInternalDuplicates(internalByPhone, 'phone')
    addInternalDuplicates(internalByName, 'name')

    console.log('Internal duplicate check complete. Total duplicates found:', duplicateLeadIds.size)

    const totalChecked = leadsToCheck?.length || 0
    const duplicateCount = duplicateLeadIds.size
    const uniqueCount = totalChecked - duplicateCount

    return {
      success: true,
      totalChecked,
      uniqueCount,
      duplicateCount,
      matches,
      duplicateLeadIds: Array.from(duplicateLeadIds)
    }
  } catch (error) {
    console.error('History check error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Okänt fel',
      totalChecked: 0,
      uniqueCount: 0,
      duplicateCount: 0,
      matches: [],
      duplicateLeadIds: []
    }
  }
}
