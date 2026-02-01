'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchBiluppgifterComplete, BiluppgifterResult } from '@/lib/biluppgifter/fetch-biluppgifter'

export interface BlocketBiluppgifterData {
  // Blocket data
  id: number
  regnummer: string
  marke: string
  modell: string
  arsmodell: number
  miltal: number
  pris: number
  stad: string | null
  saljare_typ: string
  // Biluppgifter data
  bu_mileage: number | null
  bu_mileage_verified: boolean | null
  bu_inspection_until: string | null
  bu_annual_tax: number | null
  bu_num_owners: number | null
  bu_owner_name: string | null
  bu_owner_age: number | null
  bu_owner_city: string | null
  bu_owned_since: string | null
  bu_owner_vehicles: Array<{ regnr: string; description: string }> | null
  bu_address_vehicles: Array<{ regnr: string; description: string; status?: string }> | null
  bu_fetched_at: string | null
}

/**
 * Hämta biluppgifter för en specifik Blocket-annons och spara i databasen
 */
export async function fetchAndSaveBiluppgifter(blocketId: number): Promise<{
  success: boolean
  data?: BlocketBiluppgifterData
  error?: string
}> {
  const supabase = await createClient()

  // Hämta annonsen
  const { data: annons, error: fetchError } = await supabase
    .from('blocket_annonser')
    .select('id, regnummer, marke, modell, arsmodell, miltal, pris, stad, saljare_typ')
    .eq('id', blocketId)
    .single()

  if (fetchError || !annons) {
    return { success: false, error: 'Kunde inte hitta annonsen' }
  }

  if (!annons.regnummer) {
    return { success: false, error: 'Annonsen saknar regnummer' }
  }

  // Hämta biluppgifter
  const buResult: BiluppgifterResult = await fetchBiluppgifterComplete(annons.regnummer)

  if (!buResult.success) {
    return { success: false, error: buResult.error || 'Kunde inte hämta biluppgifter' }
  }

  // Beräkna om mätarställning stämmer (inom 2000 mil)
  const mileageVerified = buResult.mileage && annons.miltal
    ? Math.abs((buResult.mileage / 10) - annons.miltal) < 2000
    : null

  // Hitta när ägaren köpte bilen från owner_history
  let ownedSince: string | null = null
  if (buResult.owner_history && buResult.owner_history.length > 0) {
    // Senaste "Ägarbyte" eller "Nyregistrering"
    const ownerChange = buResult.owner_history.find(h =>
      h.type.toLowerCase().includes('ägarbyte') ||
      h.type.toLowerCase().includes('nyregistrering')
    )
    if (ownerChange) {
      ownedSince = ownerChange.date
    }
  }

  // Spara i databasen
  const { error: updateError } = await supabase
    .from('blocket_annonser')
    .update({
      bu_mileage: buResult.mileage ? Math.round(buResult.mileage / 10) : null, // Konvertera km till mil
      bu_mileage_verified: mileageVerified,
      bu_inspection_until: buResult.inspection_until || null,
      bu_annual_tax: buResult.annual_tax || null,
      bu_num_owners: buResult.num_owners || null,
      bu_owner_name: buResult.owner_name || null,
      bu_owner_age: buResult.owner_age || null,
      bu_owner_city: buResult.owner_city || null,
      bu_owned_since: ownedSince,
      bu_owner_vehicles: buResult.owner_vehicles || null,
      bu_address_vehicles: buResult.address_vehicles || null,
      bu_fetched_at: new Date().toISOString(),
    })
    .eq('id', blocketId)

  if (updateError) {
    return { success: false, error: 'Kunde inte spara biluppgifter' }
  }

  // Hämta uppdaterad data
  const { data: updated } = await supabase
    .from('blocket_annonser')
    .select('*')
    .eq('id', blocketId)
    .single()

  return {
    success: true,
    data: updated as BlocketBiluppgifterData
  }
}

/**
 * Sök Blocket-annons med regnummer och hämta biluppgifter
 */
export async function lookupByRegnummer(regnummer: string): Promise<{
  success: boolean
  blocketData?: {
    id: number
    marke: string
    modell: string
    arsmodell: number
    miltal: number
    pris: number
    stad: string | null
    saljare_typ: string
  }
  biluppgifterData?: BiluppgifterResult
  error?: string
}> {
  const supabase = await createClient()
  const regnr = regnummer.toUpperCase().replace(/\s/g, '')

  // Sök i Blocket-databasen
  const { data: blocketAd } = await supabase
    .from('blocket_annonser')
    .select('id, marke, modell, arsmodell, miltal, pris, stad, saljare_typ')
    .eq('regnummer', regnr)
    .is('borttagen', null)
    .single()

  // Hämta biluppgifter oavsett om bilen finns på Blocket
  const buResult = await fetchBiluppgifterComplete(regnr)

  if (!buResult.success) {
    return {
      success: false,
      blocketData: blocketAd || undefined,
      error: buResult.error
    }
  }

  return {
    success: true,
    blocketData: blocketAd || undefined,
    biluppgifterData: buResult
  }
}
