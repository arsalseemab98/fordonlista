'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { FilterPreset } from '@/lib/types/database'

export async function getFilterPresets(page: string): Promise<FilterPreset[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('filter_presets')
    .select('*')
    .eq('page', page)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching filter presets:', error)
    return []
  }

  return data as FilterPreset[]
}

export async function saveFilterPreset(data: {
  name: string
  page: string
  filters: Record<string, unknown>
  is_default?: boolean
}): Promise<{ success: boolean; error?: string; preset?: FilterPreset }> {
  const supabase = await createClient()

  // If setting as default, first unset any existing default for this page
  if (data.is_default) {
    await supabase
      .from('filter_presets')
      .update({ is_default: false })
      .eq('page', data.page)
      .eq('is_default', true)
  }

  const { data: preset, error } = await supabase
    .from('filter_presets')
    .insert({
      name: data.name,
      page: data.page,
      filters: data.filters,
      is_default: data.is_default ?? false
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving filter preset:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/${data.page}`)
  return { success: true, preset: preset as FilterPreset }
}

export async function updateFilterPreset(
  id: string,
  data: {
    name?: string
    filters?: Record<string, unknown>
    is_default?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get current preset to know the page
  const { data: currentPreset } = await supabase
    .from('filter_presets')
    .select('page')
    .eq('id', id)
    .single()

  // If setting as default, first unset any existing default for this page
  if (data.is_default && currentPreset) {
    await supabase
      .from('filter_presets')
      .update({ is_default: false })
      .eq('page', currentPreset.page)
      .eq('is_default', true)
  }

  const { error } = await supabase
    .from('filter_presets')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating filter preset:', error)
    return { success: false, error: error.message }
  }

  if (currentPreset) {
    revalidatePath(`/${currentPreset.page}`)
  }
  return { success: true }
}

export async function deleteFilterPreset(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get the preset page for revalidation
  const { data: preset } = await supabase
    .from('filter_presets')
    .select('page')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('filter_presets')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting filter preset:', error)
    return { success: false, error: error.message }
  }

  if (preset) {
    revalidatePath(`/${preset.page}`)
  }
  return { success: true }
}

export async function getDefaultPreset(page: string): Promise<FilterPreset | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('filter_presets')
    .select('*')
    .eq('page', page)
    .eq('is_default', true)
    .single()

  if (error) {
    return null
  }

  return data as FilterPreset
}
