'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveColumnMapping(data: {
  id?: string
  target_field: string
  source_patterns: string[]
  description?: string
  is_active: boolean
}) {
  const supabase = await createClient()

  if (data.id && data.id !== 'new') {
    const { error } = await supabase
      .from('column_mappings')
      .update({
        target_field: data.target_field,
        source_patterns: data.source_patterns,
        description: data.description,
        is_active: data.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id)

    if (error) {
      console.error('Error updating column mapping:', error)
      return { success: false, error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('column_mappings')
      .insert({
        target_field: data.target_field,
        source_patterns: data.source_patterns,
        description: data.description,
        is_active: data.is_active
      })

    if (error) {
      console.error('Error creating column mapping:', error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function deleteColumnMapping(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('column_mappings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting column mapping:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function saveValuePattern(data: {
  id?: string
  field_name: string
  pattern: string
  description?: string
  transformation?: string
  is_active: boolean
}) {
  const supabase = await createClient()

  if (data.id && data.id !== 'new') {
    const { error } = await supabase
      .from('value_patterns')
      .update({
        field_name: data.field_name,
        pattern: data.pattern,
        description: data.description,
        transformation: data.transformation,
        is_active: data.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id)

    if (error) {
      console.error('Error updating value pattern:', error)
      return { success: false, error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('value_patterns')
      .insert({
        field_name: data.field_name,
        pattern: data.pattern,
        description: data.description,
        transformation: data.transformation,
        is_active: data.is_active
      })

    if (error) {
      console.error('Error creating value pattern:', error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function deleteValuePattern(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('value_patterns')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting value pattern:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function savePreferences(data: {
  preferred_makes: string[]
  excluded_makes: string[]
  max_mileage: number
  min_year: number
  prefer_deregistered: boolean
  ai_enabled: boolean
}) {
  const supabase = await createClient()

  // Check if preferences exist
  const { data: existing } = await supabase
    .from('preferences')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('preferences')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating preferences:', error)
      return { success: false, error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('preferences')
      .insert(data)

    if (error) {
      console.error('Error creating preferences:', error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/settings')
  revalidatePath('/')
  revalidatePath('/leads')
  revalidatePath('/to-call')

  return { success: true }
}
