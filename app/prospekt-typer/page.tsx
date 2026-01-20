import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ProspektTyperView } from '@/components/prospekt-typer/prospekt-typer-view'

// Revalidate every 60 seconds
export const revalidate = 60

interface ProspektStats {
  prospect_type: string | null
  data_period_start: string | null
  data_period_end: string | null
  count: number
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

  // Fetch all leads with relevant fields for aggregation
  let query = supabase
    .from('leads')
    .select('id, prospect_type, data_period_start, data_period_end, created_at, county, status')
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

  // Aggregate stats by prospect_type and time period
  const statsMap = new Map<string, ProspektStats>()

  allLeads.forEach(lead => {
    const key = `${lead.prospect_type || 'Okänd'}|${lead.data_period_start || 'Ingen period'}`
    const existing = statsMap.get(key)

    if (existing) {
      existing.count++
    } else {
      statsMap.set(key, {
        prospect_type: lead.prospect_type,
        data_period_start: lead.data_period_start,
        data_period_end: lead.data_period_end,
        count: 1
      })
    }
  })

  const stats = Array.from(statsMap.values()).sort((a, b) => {
    // Sort by period first (newest first), then by count
    const periodCompare = (b.data_period_start || '').localeCompare(a.data_period_start || '')
    if (periodCompare !== 0) return periodCompare
    return b.count - a.count
  })

  // Summary by prospect type only
  const prospectTypeSummary = prospectTypes.map(type => ({
    type,
    count: allLeads.filter(l => l.prospect_type === type).length
  })).sort((a, b) => b.count - a.count)

  // Summary by time period only
  const periodSummary = timePeriods.map(period => ({
    period,
    count: allLeads.filter(l => l.data_period_start === period).length
  })).sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime())

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
          totalLeads={allLeads.length}
          availableProspectTypes={prospectTypes}
          availableTimePeriods={timePeriods}
          currentFilters={{
            prospectType: prospectTypeParam,
            dateFrom,
            dateTo
          }}
        />
      </div>
    </div>
  )
}
