import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getUpdateDate,
  fetchSegment,
  planSegments,
  SYNC_REGIONS,
} from '@/lib/bilprospekt/api-client'
import { revalidatePath } from 'next/cache'

// Vercel Cron: Mon-Thu at 15:00 Swedish time (14:00 UTC)
// Plus worker runs every 5 min 14:05-17:55 to process pending segments
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max

export async function GET(request: Request) {
  const supabase = await createClient()
  const url = new URL(request.url)
  const triggerType = url.searchParams.get('trigger') === 'manual' ? 'manual' : 'cron'

  // Check credentials
  if (!process.env.BILPROSPEKT_EMAIL || !process.env.BILPROSPEKT_PASSWORD) {
    return NextResponse.json({
      success: false,
      error: 'BILPROSPEKT_EMAIL/PASSWORD not configured',
    }, { status: 500 })
  }

  // Step 1: Check if there are pending segments to process
  const { data: pendingSegment } = await supabase
    .from('bilprospekt_sync_segments')
    .select('*, sync:bilprospekt_sync_log(bilprospekt_date)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (pendingSegment) {
    // WORKER MODE: Process one pending segment
    return processSegment(supabase, pendingSegment)
  }

  // Step 2: Check if there's a running sync (has processing segments)
  const { data: processingSegment } = await supabase
    .from('bilprospekt_sync_segments')
    .select('id')
    .eq('status', 'processing')
    .limit(1)
    .maybeSingle()

  if (processingSegment) {
    // A segment is stuck in processing — skip this run
    return NextResponse.json({
      success: true,
      status: 'waiting',
      message: 'A segment is currently being processed',
    })
  }

  // Step 3: ORCHESTRATOR MODE — check for new data and create segments
  let bilprospektDate: string | null
  try {
    bilprospektDate = await getUpdateDate()
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Failed to get update date: ${String(error)}`,
    }, { status: 500 })
  }

  if (!bilprospektDate) {
    return NextResponse.json({
      success: false,
      error: 'Could not determine Bilprospekt data date',
    }, { status: 500 })
  }

  // Compare with our stored date
  const { data: preferences } = await supabase
    .from('preferences')
    .select('bilprospekt_updated_at')
    .limit(1)
    .maybeSingle()

  const ourDate = preferences?.bilprospekt_updated_at || null

  if (ourDate && ourDate >= bilprospektDate) {
    return NextResponse.json({
      success: true,
      status: 'skipped',
      message: `Data already up to date (${ourDate})`,
      bilprospekt_date: bilprospektDate,
      our_date: ourDate,
    })
  }

  // NEW DATA! Create sync log entry
  const { data: syncLog, error: logError } = await supabase
    .from('bilprospekt_sync_log')
    .insert({
      started_at: new Date().toISOString(),
      status: 'running',
      trigger_type: triggerType,
      bilprospekt_date: bilprospektDate,
      our_previous_date: ourDate,
    })
    .select('id')
    .single()

  if (logError || !syncLog) {
    return NextResponse.json({
      success: false,
      error: `Failed to create sync log: ${logError?.message}`,
    }, { status: 500 })
  }

  // Plan segments (count each region × year range, subdivide if > 9000)
  try {
    const { segments, errors: planErrors } = await planSegments()

    if (segments.length === 0) {
      await supabase
        .from('bilprospekt_sync_log')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: planErrors.length > 0
            ? `No segments created. Errors: ${planErrors.join('; ').substring(0, 500)}`
            : 'No segments found',
        })
        .eq('id', syncLog.id)

      return NextResponse.json({
        success: false,
        error: 'No segments to process',
        plan_errors: planErrors,
      }, { status: 500 })
    }

    // Insert all segments as pending
    const segmentRows = segments.map(seg => ({
      sync_id: syncLog.id,
      region_code: seg.region_code,
      region_name: seg.region_name,
      year_from: seg.year_from,
      year_to: seg.year_to,
      brand: seg.brand,
      prospect_count: seg.prospect_count,
      status: 'pending',
    }))

    const { error: insertError } = await supabase
      .from('bilprospekt_sync_segments')
      .insert(segmentRows)

    if (insertError) {
      await supabase
        .from('bilprospekt_sync_log')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: `Failed to insert segments: ${insertError.message}`,
        })
        .eq('id', syncLog.id)

      return NextResponse.json({
        success: false,
        error: `Failed to create segments: ${insertError.message}`,
      }, { status: 500 })
    }

    const totalProspects = segments.reduce((sum, s) => sum + s.prospect_count, 0)
    const regionSummary = SYNC_REGIONS.map(r => {
      const regionSegments = segments.filter(s => s.region_code === r.code)
      const regionTotal = regionSegments.reduce((sum, s) => sum + s.prospect_count, 0)
      return `${r.name}: ${regionTotal.toLocaleString()} (${regionSegments.length} segment)`
    }).join(', ')

    return NextResponse.json({
      success: true,
      status: 'planned',
      bilprospekt_date: bilprospektDate,
      previous_date: ourDate,
      total_segments: segments.length,
      total_prospects: totalProspects,
      regions: regionSummary,
      plan_errors: planErrors.length > 0 ? planErrors : undefined,
      message: `Created ${segments.length} segments with ~${totalProspects.toLocaleString()} prospects. Processing will start on next cron tick.`,
    })
  } catch (error) {
    await supabase
      .from('bilprospekt_sync_log')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: String(error).substring(0, 500),
      })
      .eq('id', syncLog.id)

    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 })
  }
}

/**
 * Process a single pending segment: fetch data from Bilprospekt and upsert to DB.
 */
async function processSegment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  segment: Record<string, unknown>
) {
  const segmentId = segment.id as string
  const syncId = segment.sync_id as string

  // Mark as processing
  await supabase
    .from('bilprospekt_sync_segments')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', segmentId)

  const label = `${segment.region_name} ${segment.year_from}-${segment.year_to}${segment.brand ? ` ${segment.brand}` : ''}`

  try {
    // Fetch prospects for this segment
    const { prospects, errors } = await fetchSegment({
      region: segment.region_code as string,
      yearFrom: segment.year_from as number | undefined,
      yearTo: segment.year_to as number | undefined,
      brand: segment.brand as string | undefined,
    })

    // Upsert to database in batches
    let upsertedCount = 0
    const batchSize = 100
    const upsertErrors: string[] = []

    for (let i = 0; i < prospects.length; i += batchSize) {
      const batch = prospects.slice(i, i + batchSize).map(p => ({
        ...p,
        imported_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      const { error: upsertError, count } = await supabase
        .from('bilprospekt_prospects')
        .upsert(batch, { onConflict: 'bp_id', count: 'exact' })

      if (upsertError) {
        upsertErrors.push(`Batch ${Math.floor(i / batchSize)}: ${upsertError.message}`)
      } else {
        upsertedCount += count || batch.length
      }
    }

    const allErrors = [...errors, ...upsertErrors]

    // Mark segment as completed
    await supabase
      .from('bilprospekt_sync_segments')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        records_fetched: prospects.length,
        records_upserted: upsertedCount,
        error_message: allErrors.length > 0 ? allErrors.join('; ').substring(0, 500) : null,
      })
      .eq('id', segmentId)

    // Check if all segments for this sync are done
    await checkSyncCompletion(supabase, syncId)

    return NextResponse.json({
      success: true,
      status: 'segment_completed',
      segment: label,
      records_fetched: prospects.length,
      records_upserted: upsertedCount,
      errors: allErrors.length > 0 ? allErrors.slice(0, 5) : undefined,
    })
  } catch (error) {
    // Mark segment as failed
    await supabase
      .from('bilprospekt_sync_segments')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: String(error).substring(0, 500),
      })
      .eq('id', segmentId)

    // Check completion even on failure
    await checkSyncCompletion(supabase, syncId)

    return NextResponse.json({
      success: false,
      segment: label,
      error: String(error),
    }, { status: 500 })
  }
}

/**
 * Check if all segments for a sync are done. If so, finalize the sync log.
 */
async function checkSyncCompletion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  syncId: string
) {
  const { data: remaining } = await supabase
    .from('bilprospekt_sync_segments')
    .select('id')
    .eq('sync_id', syncId)
    .in('status', ['pending', 'processing'])

  if (remaining && remaining.length > 0) return // Still work to do

  // All segments done — finalize
  const { data: allSegments } = await supabase
    .from('bilprospekt_sync_segments')
    .select('status, records_fetched, records_upserted, error_message')
    .eq('sync_id', syncId)

  const totalFetched = allSegments?.reduce((sum, s) => sum + (s.records_fetched || 0), 0) || 0
  const totalUpserted = allSegments?.reduce((sum, s) => sum + (s.records_upserted || 0), 0) || 0
  const failedSegments = allSegments?.filter(s => s.status === 'failed') || []
  const hasErrors = failedSegments.length > 0

  const finalStatus = failedSegments.length === allSegments?.length
    ? 'failed'
    : hasErrors
      ? 'partial'
      : 'success'

  // Get the bilprospekt_date from the sync log
  const { data: syncLog } = await supabase
    .from('bilprospekt_sync_log')
    .select('bilprospekt_date')
    .eq('id', syncId)
    .single()

  // Update sync log
  await supabase
    .from('bilprospekt_sync_log')
    .update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      records_fetched: totalFetched,
      records_upserted: totalUpserted,
      error_message: hasErrors
        ? `${failedSegments.length} segments failed. ${failedSegments.map(s => s.error_message).filter(Boolean).join('; ').substring(0, 500)}`
        : null,
    })
    .eq('id', syncId)

  // Update the bilprospekt date in preferences (only on success/partial)
  if (finalStatus !== 'failed' && syncLog?.bilprospekt_date) {
    const { data: existingPref } = await supabase
      .from('preferences')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (existingPref) {
      await supabase
        .from('preferences')
        .update({ bilprospekt_updated_at: syncLog.bilprospekt_date })
        .eq('id', existingPref.id)
    } else {
      await supabase
        .from('preferences')
        .insert({ bilprospekt_updated_at: syncLog.bilprospekt_date })
    }
  }

  // Revalidate pages
  revalidatePath('/bilprospekt')
  revalidatePath('/playground')
  revalidatePath('/prospekt-typer')
}
