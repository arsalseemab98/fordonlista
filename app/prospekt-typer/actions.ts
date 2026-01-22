'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ProspectType {
  id: string
  name: string
  description: string | null
  color: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export async function getProspectTypes(): Promise<ProspectType[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('prospect_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching prospect types:', error)
    return []
  }

  return data || []
}

export async function createProspectType(
  data: { name: string; description?: string | null; color?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { name, description, color = '#6366f1' } = data

  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Namn krävs' }
  }

  // Normalize name (lowercase, replace spaces with underscore)
  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '_')

  // Get max sort order
  const { data: maxOrder } = await supabase
    .from('prospect_types')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const newSortOrder = (maxOrder?.sort_order || 0) + 1

  const { error } = await supabase
    .from('prospect_types')
    .insert({
      name: normalizedName,
      description: description?.trim() || null,
      color,
      sort_order: newSortOrder
    })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Prospekttyp med detta namn finns redan' }
    }
    console.error('Error creating prospect type:', error)
    return { success: false, error: 'Kunde inte skapa prospekttyp' }
  }

  revalidatePath('/prospekt-typer')
  return { success: true }
}

export async function deleteProspectType(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Check if any leads use this prospect type
  const { data: typeData } = await supabase
    .from('prospect_types')
    .select('name')
    .eq('id', id)
    .single()

  if (typeData) {
    const { count } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('prospect_type', typeData.name)

    if (count && count > 0) {
      return { success: false, error: `Kan inte ta bort - ${count} leads använder denna typ` }
    }
  }

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('prospect_types')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('Error deleting prospect type:', error)
    return { success: false, error: 'Kunde inte ta bort prospekttyp' }
  }

  revalidatePath('/prospekt-typer')
  return { success: true }
}

export async function updateProspectType(
  id: string,
  data: { name?: string; description?: string; color?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const updateData: Record<string, string> = {}

  if (data.name) {
    updateData.name = data.name.trim().toLowerCase().replace(/\s+/g, '_')
  }
  if (data.description !== undefined) {
    updateData.description = data.description.trim()
  }
  if (data.color) {
    updateData.color = data.color
  }

  const { error } = await supabase
    .from('prospect_types')
    .update(updateData)
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Prospekttyp med detta namn finns redan' }
    }
    console.error('Error updating prospect type:', error)
    return { success: false, error: 'Kunde inte uppdatera prospekttyp' }
  }

  revalidatePath('/prospekt-typer')
  return { success: true }
}
