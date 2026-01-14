'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateLeadStatus(leadId: string, status: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId)

  if (error) {
    console.error('Error updating lead status:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/to-call')
  revalidatePath('/')

  return { success: true }
}

export async function addCallLog({
  leadId,
  vehicleId,
  result,
  notes,
  followUpDate,
  bookingDate
}: {
  leadId: string
  vehicleId?: string
  result: string
  notes?: string
  followUpDate?: string
  bookingDate?: string
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
  let newStatus = undefined
  if (result.includes('Intresserad')) {
    newStatus = 'interested'
  } else if (result.includes('Ej intresserad') || result.includes('Såld')) {
    newStatus = 'not_interested'
  } else if (result.includes('Ring tillbaka')) {
    newStatus = 'callback'
  } else if (result.includes('Bokad')) {
    newStatus = 'booked'
  } else if (result.includes('Inget svar') || result.includes('Upptaget')) {
    newStatus = 'no_answer'
  } else if (result.includes('Fel nummer')) {
    newStatus = 'completed'
  }

  const updateData: { updated_at: string; status?: string } = {
    updated_at: new Date().toISOString()
  }

  if (newStatus) {
    updateData.status = newStatus
  }

  await supabase
    .from('leads')
    .update(updateData)
    .eq('id', leadId)

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/to-call')
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
