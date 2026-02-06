import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchSegment } from '@/lib/bilprospekt/api-client'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

/**
 * Backfill bp_aprox_mileage for existing bilprospekt_prospects.
 * Processes one year segment at a time.
 *
 * Usage: GET /api/backfill-mileage?yearFrom=2010&yearTo=2013
 * Or: GET /api/backfill-mileage?all=true (processes all segments sequentially)
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const yearFrom = url.searchParams.get('yearFrom')
  const yearTo = url.searchParams.get('yearTo')
  const brand = url.searchParams.get('brand') || undefined
  const runAll = url.searchParams.get('all') === 'true'

  if (!process.env.BILPROSPEKT_EMAIL || !process.env.BILPROSPEKT_PASSWORD) {
    return NextResponse.json({ error: 'Missing Bilprospekt credentials' }, { status: 500 })
  }

  const supabase = await createClient()

  const YEAR_SEGMENTS = [
    { from: 2023, to: 2026, label: '2023-2026' },
    { from: 2020, to: 2022, label: '2020-2022' },
    { from: 2017, to: 2019, label: '2017-2019' },
    { from: 2014, to: 2016, label: '2014-2016' },
    { from: 2010, to: 2013, label: '2010-2013' },
    { from: 2005, to: 2009, label: '2005-2009' },
    { from: 2000, to: 2004, label: '2000-2004' },
    { from: 1950, to: 1999, label: '<2000' },
  ]

  const segments = runAll
    ? YEAR_SEGMENTS
    : yearFrom && yearTo
      ? [{ from: parseInt(yearFrom), to: parseInt(yearTo), label: `${yearFrom}-${yearTo}` }]
      : []

  if (segments.length === 0) {
    return NextResponse.json({
      error: 'Provide ?yearFrom=X&yearTo=Y or ?all=true',
      available_segments: YEAR_SEGMENTS.map(s => s.label),
    }, { status: 400 })
  }

  const results: Array<{ segment: string; fetched: number; withMileage: number; updated: number; errors: string[] }> = []
  let totalUpdated = 0

  for (const seg of segments) {
    const segErrors: string[] = []
    const label = seg.label

    try {
      const { prospects, errors } = await fetchSegment({
        region: '25',
        yearFrom: seg.from,
        yearTo: seg.to,
        brand: brand,
      })

      if (errors.length > 0) {
        segErrors.push(...errors.slice(0, 3))
      }

      // Filter to only those with mileage
      const withMileage = prospects.filter(p => p.bp_aprox_mileage !== null && p.bp_aprox_mileage > 0)

      // Batch update
      let segUpdated = 0
      const batchSize = 100

      for (let i = 0; i < withMileage.length; i += batchSize) {
        const batch = withMileage.slice(i, i + batchSize)

        // Build a bulk update using individual updates (Supabase doesn't support CASE WHEN via client)
        for (const p of batch) {
          const { error } = await supabase
            .from('bilprospekt_prospects')
            .update({ bp_aprox_mileage: p.bp_aprox_mileage })
            .eq('bp_id', p.bp_id)

          if (!error) {
            segUpdated++
          } else {
            // Try by reg_number as fallback
            const { error: err2 } = await supabase
              .from('bilprospekt_prospects')
              .update({ bp_aprox_mileage: p.bp_aprox_mileage })
              .eq('reg_number', p.reg_number)

            if (!err2) segUpdated++
          }
        }
      }

      totalUpdated += segUpdated

      results.push({
        segment: label,
        fetched: prospects.length,
        withMileage: withMileage.length,
        updated: segUpdated,
        errors: segErrors,
      })
    } catch (error) {
      results.push({
        segment: label,
        fetched: 0,
        withMileage: 0,
        updated: 0,
        errors: [String(error)],
      })
    }
  }

  return NextResponse.json({
    success: true,
    total_updated: totalUpdated,
    segments: results,
  })
}
