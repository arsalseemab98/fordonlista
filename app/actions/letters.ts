'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markLetterSent(leadIds: string[]) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({
      letter_sent: true,
      letter_sent_date: new Date().toISOString()
    })
    .in('id', leadIds)

  if (error) {
    console.error('Error marking letters sent:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/brev')
  revalidatePath('/leads')
  return { success: true }
}

export async function resetLetterStatus(leadId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({
      letter_sent: false,
      letter_sent_date: null
    })
    .eq('id', leadId)

  if (error) {
    console.error('Error resetting letter status:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/brev')
  revalidatePath('/leads')
  return { success: true }
}

export async function bulkRemoveFromLetterList(leadIds: string[]) {
  const supabase = await createClient()

  if (leadIds.length === 0) {
    return { success: false, error: 'Inga leads valda' }
  }

  const { error, count } = await supabase
    .from('leads')
    .update({
      letter_sent: null,
      letter_sent_date: null
    })
    .in('id', leadIds)

  if (error) {
    console.error('Error bulk removing from letter list:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/brev')
  revalidatePath('/leads')
  revalidatePath('/playground')
  return { success: true, removedCount: count || leadIds.length }
}

export interface LetterExportData {
  reg_nr: string
  owner_info: string | null
  location: string | null
  make: string | null
  model: string | null
  year: number | null
}

export async function getLetterExportData(filter: 'all' | 'no_phone' | 'not_sent'): Promise<LetterExportData[]> {
  const supabase = await createClient()

  let query = supabase
    .from('leads')
    .select(`
      id,
      owner_info,
      location,
      phone,
      letter_sent,
      vehicles (
        reg_nr,
        make,
        model,
        year
      )
    `)

  // Apply filters
  if (filter === 'no_phone') {
    query = query.or('phone.is.null,phone.eq.')
  } else if (filter === 'not_sent') {
    query = query.or('letter_sent.is.null,letter_sent.eq.false')
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching export data:', error)
    return []
  }

  // Flatten data - one row per vehicle
  const exportData: LetterExportData[] = []

  data?.forEach(lead => {
    const vehicles = lead.vehicles as Array<{
      reg_nr: string | null
      make: string | null
      model: string | null
      year: number | null
    }> | null

    if (vehicles && vehicles.length > 0) {
      vehicles.forEach(vehicle => {
        if (vehicle.reg_nr) {
          exportData.push({
            reg_nr: vehicle.reg_nr,
            owner_info: lead.owner_info,
            location: lead.location,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year
          })
        }
      })
    }
  })

  return exportData
}
