import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ProspektTyperView } from '@/components/prospekt-typer/prospekt-typer-view'
import {
  calculateDaysDifference,
  findMissingPeriods,
  isPastOrToday,
  type PeriodGap
} from '@/lib/time-period-utils'
import { getProspectTypes, type ProspectType } from './actions'

// Revalidate every 60 seconds
export const revalidate = 60

interface ProspektStats {
  prospect_type: string | null
  data_period_start: string | null
  data_period_end: string | null
  county: string | null
  count: number
  daysDuration: number | null
  sentToCallCount: number
  sentToBrevCount: number
  latestSentToBrevAt: string | null
}

// Lead data for detail view
export interface LeadDetail {
  id: string
  owner_info: string | null
  phone: string | null
  prospect_type: string | null
  data_period_start: string | null
  sent_to_call_at: string | null
  sent_to_brev_at: string | null
  county: string | null
  created_at: string | null
}

export default async function ProspektTyperPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Get filter params
  const prospectTypeParam = typeof params.prospect_type === 'string' ? params.prospect_type : undefined
  const selectedProspectTypes = prospectTypeParam ? prospectTypeParam.split(',').filter(t => t.trim()) : []
  const dateFrom = typeof params.date_from === 'string' ? params.date_from : undefined
  const dateTo = typeof params.date_to === 'string' ? params.date_to : undefined
  const includeArchive = params.include_archive !== 'false'

  // Fetch letter cost from preferences
  const { data: preferences } = await supabase
    .from('preferences')
    .select('letter_cost')
    .single()

  const letterCost = preferences?.letter_cost ?? 12

  // Fetch saved prospect types from database
  const savedProspectTypes = await getProspectTypes()

  // Fetch all leads with relevant fields for aggregation
  let query = supabase
    .from('leads')
    .select('id, prospect_type, data_period_start, data_period_end, created_at, county, status, sent_to_call_at, sent_to_brev_at, owner_info, phone')
    .order('created_at', { ascending: false })

  // Apply filters
  if (selectedProspectTypes.length > 0) {
    query = query.in('prospect_type', selectedProspectTypes)
  }
  if (dateFrom) {
    query = query.gte('data_period_start', dateFrom)
  }
  if (dateTo) {
    query = query.lte('data_period_end', dateTo)
  }

  const { data: leads, error } = await query

  if (error) {
    console.error('Error fetching leads:', error)
  }

  const allLeads = leads || []

  // Get unique prospect types
  const prospectTypes = [...new Set(allLeads.map(l => l.prospect_type).filter(Boolean))] as string[]

  // Get unique time periods (data_period_start values)
  const timePeriods = [...new Set(allLeads.map(l => l.data_period_start).filter(Boolean))] as string[]
  timePeriods.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  // Aggregate stats by prospect_type, time period, and county
  const statsMap = new Map<string, ProspektStats>()

  allLeads.forEach(lead => {
    const key = `${lead.prospect_type || 'Okänd'}|${lead.data_period_start || 'Ingen period'}|${lead.county || 'Okänt län'}`
    const existing = statsMap.get(key)

    if (existing) {
      existing.count++
      if (lead.sent_to_call_at) existing.sentToCallCount++
      if (lead.sent_to_brev_at) existing.sentToBrevCount++
      // Track the latest sent_to_brev_at
      if (lead.sent_to_brev_at && (!existing.latestSentToBrevAt || lead.sent_to_brev_at > existing.latestSentToBrevAt)) {
        existing.latestSentToBrevAt = lead.sent_to_brev_at
      }
    } else {
      statsMap.set(key, {
        prospect_type: lead.prospect_type,
        data_period_start: lead.data_period_start,
        data_period_end: lead.data_period_end,
        county: lead.county,
        count: 1,
        daysDuration: calculateDaysDifference(lead.data_period_start, lead.data_period_end),
        sentToCallCount: lead.sent_to_call_at ? 1 : 0,
        sentToBrevCount: lead.sent_to_brev_at ? 1 : 0,
        latestSentToBrevAt: lead.sent_to_brev_at
      })
    }
  })

  // Filter to only show past dates (not future)
  const allStats = Array.from(statsMap.values())

  // Also aggregate stats separately for archive and active
  const archiveStatsMap = new Map<string, ProspektStats>()
  const activeStatsMap = new Map<string, ProspektStats>()

  allLeads.forEach(lead => {
    const key = `${lead.prospect_type || 'Okänd'}|${lead.data_period_start || 'Ingen period'}|${lead.county || 'Okänt län'}`
    const targetMap = lead.status === 'prospekt_archive' ? archiveStatsMap : activeStatsMap
    const existing = targetMap.get(key)

    if (existing) {
      existing.count++
      if (lead.sent_to_call_at) existing.sentToCallCount++
      if (lead.sent_to_brev_at) existing.sentToBrevCount++
      if (lead.sent_to_brev_at && (!existing.latestSentToBrevAt || lead.sent_to_brev_at > existing.latestSentToBrevAt)) {
        existing.latestSentToBrevAt = lead.sent_to_brev_at
      }
    } else {
      targetMap.set(key, {
        prospect_type: lead.prospect_type,
        data_period_start: lead.data_period_start,
        data_period_end: lead.data_period_end,
        county: lead.county,
        count: 1,
        daysDuration: calculateDaysDifference(lead.data_period_start, lead.data_period_end),
        sentToCallCount: lead.sent_to_call_at ? 1 : 0,
        sentToBrevCount: lead.sent_to_brev_at ? 1 : 0,
        latestSentToBrevAt: lead.sent_to_brev_at
      })
    }
  })

  // Use archive or active stats based on toggle
  const displayStatsMap = includeArchive ? statsMap : activeStatsMap
  const stats = Array.from(displayStatsMap.values())
    .filter(stat => isPastOrToday(stat.data_period_start))
    .sort((a, b) => {
      // Sort by period first (newest first), then by county, then by count
      const periodCompare = (b.data_period_start || '').localeCompare(a.data_period_start || '')
      if (periodCompare !== 0) return periodCompare
      const countyCompare = (a.county || '').localeCompare(b.county || '')
      if (countyCompare !== 0) return countyCompare
      return b.count - a.count
    })

  // Find gaps between periods (only for past periods)
  const uniquePeriods = [...new Set(
    allLeads
      .filter(l => l.data_period_start && l.data_period_end && isPastOrToday(l.data_period_start))
      .map(l => JSON.stringify({ start: l.data_period_start, end: l.data_period_end }))
  )].map(p => JSON.parse(p) as { start: string; end: string })

  const periodGaps: PeriodGap[] = findMissingPeriods(uniquePeriods)

  // Summary by prospect type only (filter to only past periods)
  const pastLeads = allLeads.filter(l => isPastOrToday(l.data_period_start))

  // Separate archive leads from active leads
  const archiveLeads = pastLeads.filter(l => l.status === 'prospekt_archive')
  const activeLeads = pastLeads.filter(l => l.status !== 'prospekt_archive')

  // Use archive or active leads based on toggle
  const displayLeads = includeArchive ? pastLeads : activeLeads

  // Create lead details for modal view
  const leadDetails: LeadDetail[] = displayLeads.map(l => ({
    id: l.id,
    owner_info: l.owner_info,
    phone: l.phone,
    prospect_type: l.prospect_type,
    data_period_start: l.data_period_start,
    sent_to_call_at: l.sent_to_call_at,
    sent_to_brev_at: l.sent_to_brev_at,
    county: l.county,
    created_at: l.created_at
  }))

  // Global sent counts based on display mode
  const totalSentToCall = displayLeads.filter(l => l.sent_to_call_at).length
  const totalSentToBrev = displayLeads.filter(l => l.sent_to_brev_at).length

  // Get unique prospect types from display leads
  const displayProspectTypes = [...new Set(displayLeads.map(l => l.prospect_type).filter(Boolean))] as string[]

  const prospectTypeSummary = displayProspectTypes.map(type => ({
    type,
    count: displayLeads.filter(l => l.prospect_type === type).length,
    sentToCallCount: displayLeads.filter(l => l.prospect_type === type && l.sent_to_call_at).length,
    sentToBrevCount: displayLeads.filter(l => l.prospect_type === type && l.sent_to_brev_at).length
  })).sort((a, b) => b.count - a.count)

  // Summary by time period only (only past dates)
  const displayTimePeriods = [...new Set(displayLeads.map(l => l.data_period_start).filter(Boolean))] as string[]
  const pastTimePeriods = displayTimePeriods.filter(period => isPastOrToday(period))
  const periodSummary = pastTimePeriods.map(period => ({
    period,
    count: displayLeads.filter(l => l.data_period_start === period).length,
    sentToCallCount: displayLeads.filter(l => l.data_period_start === period && l.sent_to_call_at).length,
    sentToBrevCount: displayLeads.filter(l => l.data_period_start === period && l.sent_to_brev_at).length
  })).sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime())

  // Calculate brev stats for cost analysis based on displayLeads (respects archive toggle)
  const displayBrevLeads = displayLeads.filter(l => l.sent_to_brev_at)
  const totalBrevCount = displayBrevLeads.length
  const totalBrevCost = totalBrevCount * letterCost

  // Cost analysis per data period
  const costDisplayPeriods = [...new Set(displayBrevLeads.map(l => l.data_period_start).filter(Boolean))] as string[]
  const costByPeriod = costDisplayPeriods.map(period => {
    const periodLeads = displayBrevLeads.filter(l => l.data_period_start === period)
    return {
      period,
      brevCount: periodLeads.length,
      cost: periodLeads.length * letterCost
    }
  }).filter(p => p.brevCount > 0).sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime())

  // Cost analysis per year (based on sent_to_brev_at date)
  const costByYear = displayBrevLeads.reduce((acc, lead) => {
    const year = new Date(lead.sent_to_brev_at!).getFullYear().toString()
    if (!acc[year]) acc[year] = { year, brevCount: 0, cost: 0 }
    acc[year].brevCount++
    acc[year].cost = acc[year].brevCount * letterCost
    return acc
  }, {} as Record<string, { year: string; brevCount: number; cost: number }>)
  const costByYearArray = Object.values(costByYear).sort((a, b) => b.year.localeCompare(a.year))

  // Cost analysis per month (based on sent_to_brev_at date)
  const costByMonth = displayBrevLeads.reduce((acc, lead) => {
    const date = new Date(lead.sent_to_brev_at!)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!acc[monthKey]) acc[monthKey] = { month: monthKey, brevCount: 0, cost: 0 }
    acc[monthKey].brevCount++
    acc[monthKey].cost = acc[monthKey].brevCount * letterCost
    return acc
  }, {} as Record<string, { month: string; brevCount: number; cost: number }>)
  const costByMonthArray = Object.values(costByMonth).sort((a, b) => b.month.localeCompare(a.month))

  // Cost analysis per date (based on sent_to_brev_at date)
  const costByDate = displayBrevLeads.reduce((acc, lead) => {
    const dateKey = new Date(lead.sent_to_brev_at!).toISOString().split('T')[0]
    if (!acc[dateKey]) acc[dateKey] = { date: dateKey, brevCount: 0, cost: 0 }
    acc[dateKey].brevCount++
    acc[dateKey].cost = acc[dateKey].brevCount * letterCost
    return acc
  }, {} as Record<string, { date: string; brevCount: number; cost: number }>)
  const costByDateArray = Object.values(costByDate).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="flex flex-col">
      <Header
        title="Prospekttyper & Perioder"
        description="Översikt över prospekttyper och tidsperioder med filtrering"
      />

      <div className="flex-1 p-6">
        <ProspektTyperView
          stats={stats}
          prospectTypeSummary={prospectTypeSummary}
          periodSummary={periodSummary}
          totalLeads={displayLeads.length}
          totalSentToCall={totalSentToCall}
          totalSentToBrev={totalSentToBrev}
          leadDetails={leadDetails}
          availableProspectTypes={displayProspectTypes}
          availableTimePeriods={pastTimePeriods}
          periodGaps={periodGaps}
          currentFilters={{
            prospectType: prospectTypeParam,
            dateFrom,
            dateTo,
            includeArchive
          }}
          // Cost analysis props
          letterCost={letterCost}
          totalBrevCount={totalBrevCount}
          totalBrevCost={totalBrevCost}
          costByPeriod={costByPeriod}
          costByYear={costByYearArray}
          costByMonth={costByMonthArray}
          costByDate={costByDateArray}
          // Prospect type management
          savedProspectTypes={savedProspectTypes}
        />
      </div>
    </div>
  )
}
