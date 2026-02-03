import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchBiluppgifterComplete } from '@/lib/biluppgifter/fetch-biluppgifter'

// Vercel Cron: runs every 30 minutes between 09:00-19:00 Swedish time
// Configured in vercel.json

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max

// Random delay between min and max seconds
function randomDelay(minSec: number, maxSec: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000
  return new Promise(resolve => setTimeout(resolve, delay))
}

// Check if we're within operating hours (09:00-19:00 Swedish time)
function isWithinOperatingHours(): boolean {
  const now = new Date()
  // Convert to Swedish time (CET/CEST)
  const swedishTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }))
  const hour = swedishTime.getHours()
  return hour >= 9 && hour < 19
}

export async function GET() {
  // Vercel Cron jobs are automatically authenticated
  // No need for manual secret verification

  // Check operating hours
  if (!isWithinOperatingHours()) {
    return NextResponse.json({
      success: true,
      message: 'Utanför arbetstid (09:00-19:00)',
      fetched: 0
    })
  }

  const supabase = await createClient()

  try {
    // Randomize batch size (5-10 at a time)
    const batchSize = Math.floor(Math.random() * 6) + 5

    // Step 1: Get all regnummers that already have biluppgifter
    const { data: existingBu } = await supabase
      .from('biluppgifter_data')
      .select('blocket_id')

    const existingBlocketIds = new Set(existingBu?.map(e => e.blocket_id) || [])

    // Step 2: Get active ads with regnummer
    const { data: allAds } = await supabase
      .from('blocket_annonser')
      .select('id, regnummer')
      .is('borttagen', null)
      .not('regnummer', 'is', null)
      .order('id', { ascending: false })
      .limit(200) // Get more to filter

    if (!allAds || allAds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Inga aktiva annonser med regnummer',
        fetched: 0
      })
    }

    // Step 3: Filter out those that already have biluppgifter
    const adsToFetch = allAds
      .filter(a => !existingBlocketIds.has(a.id))
      .slice(0, batchSize)

    if (adsToFetch.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Alla aktiva annonser har redan biluppgifter',
        fetched: 0,
        checked: allAds.length,
        existingCount: existingBlocketIds.size
      })
    }

    let success = 0
    let failed = 0
    const errors: string[] = []

    // Initial random delay (0-30 seconds)
    await randomDelay(0, 30)

    for (const ad of adsToFetch) {
      try {
        const regnr = ad.regnummer.toUpperCase().replace(/\s/g, '')
        const result = await fetchBiluppgifterComplete(regnr)

        if (result.success) {
          // Save to database
          const dbData = {
            regnummer: regnr,
            blocket_id: ad.id,
            mileage_km: result.mileage || null,
            mileage_mil: result.mileage ? Math.round(result.mileage / 10) : null,
            num_owners: result.num_owners || null,
            annual_tax: result.annual_tax || null,
            inspection_until: result.inspection_until || null,
            owner_name: result.owner_name || null,
            owner_age: result.owner_age || null,
            owner_city: result.owner_city || null,
            owner_address: result.owner_address || null,
            owner_postal_code: result.owner_postal_code || null,
            owner_postal_city: result.owner_postal_city || null,
            owner_phone: result.owner_phone || null,
            owner_vehicles: result.owner_vehicles || [],
            address_vehicles: result.address_vehicles || [],
            mileage_history: result.mileage_history || [],
            owner_history: result.owner_history || [],
            is_dealer: result.is_dealer || false,
            previous_owner: result.previous_owner || null,
            fetched_at: new Date().toISOString(),
          }

          await supabase
            .from('biluppgifter_data')
            .upsert(dbData, { onConflict: 'regnummer' })

          success++
        } else {
          failed++
          errors.push(`${regnr}: ${result.error}`)
        }
      } catch (error) {
        failed++
        errors.push(`${ad.regnummer}: ${String(error)}`)
      }

      // Random delay between requests (2-8 seconds)
      // Varied pattern to avoid detection
      const patterns = [
        () => randomDelay(2, 5),   // Quick
        () => randomDelay(4, 8),   // Medium
        () => randomDelay(6, 12),  // Slow
        () => randomDelay(1, 3),   // Very quick
      ]
      const randomPattern = patterns[Math.floor(Math.random() * patterns.length)]
      await randomPattern()
    }

    // Log the cron run
    await supabase
      .from('blocket_scraper_log')
      .insert({
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        status: 'completed',
        scrape_type: 'biluppgifter',
        nya_annonser: success,
        error_message: errors.length > 0 ? errors.join(', ').slice(0, 500) : null,
      })

    return NextResponse.json({
      success: true,
      fetched: success,
      failed,
      errors: errors.slice(0, 5),
      batchSize,
    })
  } catch (error) {
    console.error('Cron biluppgifter error:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}
