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
  preferred_models?: string[]
  excluded_models?: string[]
  min_mileage?: number
  max_mileage: number
  min_year: number
  max_year?: number
  prefer_deregistered: boolean
  ai_enabled: boolean
  letter_cost?: number
  filters_enabled?: boolean
}) {
  const supabase = await createClient()

  // Check if preferences exist - use maybeSingle() to avoid error when no row exists
  const { data: existing } = await supabase
    .from('preferences')
    .select('id')
    .limit(1)
    .maybeSingle()

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
  revalidatePath('/brev')

  return { success: true }
}

// Data import tracking functions
export async function saveDataImport(data: {
  data_source?: string
  date_range_start?: string
  date_range_end?: string
  filter_type?: string
  record_count?: number
  notes?: string
  county?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('data_imports')
    .insert({
      data_source: data.data_source || 'Bilprospekt',
      date_range_start: data.date_range_start || null,
      date_range_end: data.date_range_end || null,
      filter_type: data.filter_type,
      record_count: data.record_count || 0,
      notes: data.notes,
      county: data.county || 'alla'
    })

  if (error) {
    console.error('Error saving data import:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/import')
  revalidatePath('/settings')
  return { success: true }
}

export async function getDataImports() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('data_imports')
    .select('*')
    .order('import_date', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching data imports:', error)
    return []
  }

  return data || []
}

export async function deleteDataImport(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('data_imports')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting data import:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/import')
  revalidatePath('/settings')
  return { success: true }
}

export async function getPreferences() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('preferences')
    .select('preferred_makes, excluded_makes, preferred_models, excluded_models, min_mileage, max_mileage, min_year, max_year, prefer_deregistered, ai_enabled, letter_cost, filters_enabled, bilprospekt_updated_at')
    .limit(1)
    .maybeSingle()

  return data || {
    preferred_makes: [],
    excluded_makes: [],
    preferred_models: [],
    excluded_models: [],
    min_mileage: 0,
    max_mileage: 200000,
    min_year: 2000,
    max_year: new Date().getFullYear(),
    prefer_deregistered: false,
    ai_enabled: true,
    letter_cost: 12.00,
    filters_enabled: true,
    bilprospekt_updated_at: null as string | null
  }
}

export async function saveBilprospektDate(date: string | null) {
  const supabase = await createClient()

  // Check if preferences row exists
  const { data: existing } = await supabase
    .from('preferences')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('preferences')
      .update({ bilprospekt_updated_at: date })
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('preferences')
      .insert({ bilprospekt_updated_at: date })

    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/playground')
  revalidatePath('/prospekt-typer')
  revalidatePath('/brev')
  revalidatePath('/to-call')
  revalidatePath('/')

  return { success: true }
}

export async function getLetterCost() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('preferences')
    .select('letter_cost')
    .limit(1)
    .maybeSingle()

  return data?.letter_cost || 12.00
}

export async function getBilprospektDate(): Promise<string | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('preferences')
    .select('bilprospekt_updated_at')
    .limit(1)
    .maybeSingle()

  return data?.bilprospekt_updated_at || null
}

// Biluppgifter API settings
export async function getBiluppgifterSettings() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('api_tokens')
    .select('*')
    .eq('service_name', 'biluppgifter')
    .maybeSingle()

  return data
}

export async function saveBiluppgifterSettings(data: {
  api_url: string
}) {
  const supabase = await createClient()

  // Check if settings exist
  const { data: existing } = await supabase
    .from('api_tokens')
    .select('id')
    .eq('service_name', 'biluppgifter')
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('api_tokens')
      .update({
        bearer_token: data.api_url, // Using bearer_token field to store API URL
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating biluppgifter settings:', error)
      return { success: false, error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('api_tokens')
      .insert({
        service_name: 'biluppgifter',
        bearer_token: data.api_url // Using bearer_token field to store API URL
      })

    if (error) {
      console.error('Error creating biluppgifter settings:', error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/settings')
  revalidatePath('/bilprospekt')
  return { success: true }
}

// Save biluppgifter cookies (stored as JSON in refresh_token field)
export async function saveBiluppgifterCookies(cookies: {
  session: string
  cf_clearance: string
  antiforgery?: string
}) {
  const supabase = await createClient()

  const cookieJson = JSON.stringify(cookies)

  // Check if settings exist
  const { data: existing } = await supabase
    .from('api_tokens')
    .select('id')
    .eq('service_name', 'biluppgifter')
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('api_tokens')
      .update({
        refresh_token: cookieJson,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating biluppgifter cookies:', error)
      return { success: false, error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('api_tokens')
      .insert({
        service_name: 'biluppgifter',
        refresh_token: cookieJson
      })

    if (error) {
      console.error('Error creating biluppgifter cookies:', error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/settings')
  revalidatePath('/bilprospekt')
  return { success: true }
}

// API Token management for car.info integration
export async function getCarInfoTokens() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('api_tokens')
    .select('*')
    .eq('service_name', 'car_info')
    .maybeSingle()

  return data
}

export async function saveCarInfoTokens(data: {
  refresh_token: string
  bearer_token: string
}) {
  const supabase = await createClient()

  // Check if tokens exist
  const { data: existing } = await supabase
    .from('api_tokens')
    .select('id')
    .eq('service_name', 'car_info')
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('api_tokens')
      .update({
        refresh_token: data.refresh_token,
        bearer_token: data.bearer_token,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating car.info tokens:', error)
      return { success: false, error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('api_tokens')
      .insert({
        service_name: 'car_info',
        refresh_token: data.refresh_token,
        bearer_token: data.bearer_token
      })

    if (error) {
      console.error('Error creating car.info tokens:', error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/settings')
  return { success: true }
}
