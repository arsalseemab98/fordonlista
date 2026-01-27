'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SearchResult {
  lead_id: string
  reg_nr: string
  make: string | null
  model: string | null
  year: number | null
  owner_info: string | null
  phone: string | null
  county: string | null
  status: string
  prospect_type: string | null
  data_period_start: string | null
  data_period_end: string | null
  sent_to_call_at: string | null
  sent_to_brev_at: string | null
  location: string | null
}

export async function searchByRegNr(regNr: string): Promise<{
  success: boolean
  results: SearchResult[]
  error?: string
}> {
  if (!regNr || regNr.trim().length < 2) {
    return { success: false, results: [], error: 'Ange minst 2 tecken' }
  }

  const supabase = await createClient()
  const normalized = regNr.trim().toUpperCase().replace(/\s/g, '')

  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      reg_nr,
      make,
      model,
      year,
      lead_id,
      leads!inner (
        id,
        owner_info,
        phone,
        county,
        status,
        prospect_type,
        data_period_start,
        data_period_end,
        sent_to_call_at,
        sent_to_brev_at,
        location
      )
    `)
    .ilike('reg_nr', `%${normalized}%`)
    .limit(50)

  if (error) {
    console.error('Search error:', error)
    return { success: false, results: [], error: 'Sökningen misslyckades' }
  }

  const results: SearchResult[] = (data || []).map((v: Record<string, unknown>) => {
    const lead = v.leads as Record<string, unknown>
    return {
      lead_id: lead.id as string,
      reg_nr: v.reg_nr as string,
      make: v.make as string | null,
      model: v.model as string | null,
      year: v.year as number | null,
      owner_info: lead.owner_info as string | null,
      phone: lead.phone as string | null,
      county: lead.county as string | null,
      status: lead.status as string,
      prospect_type: lead.prospect_type as string | null,
      data_period_start: lead.data_period_start as string | null,
      data_period_end: lead.data_period_end as string | null,
      sent_to_call_at: lead.sent_to_call_at as string | null,
      sent_to_brev_at: lead.sent_to_brev_at as string | null,
      location: lead.location as string | null,
    }
  })

  return { success: true, results }
}

export async function quickUpdateLeadStatus(
  leadId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (error) {
    console.error('Error updating lead status:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/leads')
  revalidatePath('/playground')
  revalidatePath('/prospekt-typer')
  revalidatePath('/to-call')

  return { success: true }
}
