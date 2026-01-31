'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteScraperLog(logId: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('blocket_scraper_log')
    .delete()
    .eq('id', logId)

  if (error) {
    console.error('Error deleting log:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/blocket-logs')
  return { success: true }
}

export async function deleteAllLogs() {
  const supabase = await createClient()

  const { error } = await supabase
    .from('blocket_scraper_log')
    .delete()
    .neq('id', 0) // Delete all

  if (error) {
    console.error('Error deleting all logs:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/blocket-logs')
  return { success: true }
}
