'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const VALID_OWNER_TYPES = ['handlare', 'formedling', 'privat', 'foretag', 'sold'] as const

export async function updateBiluppgifterOwnerType(id: number, ownerType: string) {
  if (!VALID_OWNER_TYPES.includes(ownerType as any)) {
    return { success: false, error: `Invalid owner_type: ${ownerType}` }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('biluppgifter_data')
    .update({ owner_type: ownerType })
    .eq('id', id)

  if (error) {
    console.error('Error updating owner_type:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/handlare-biluppgifter')
  return { success: true }
}
