import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { HistorikView } from '@/components/historik/historik-view'
import { getProspectTypes } from '@/app/prospekt-typer/actions'

// Force dynamic rendering - always fetch fresh data
export const dynamic = 'force-dynamic'

export default async function HistorikPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Get filter params
  const filter = typeof params.filter === 'string' ? params.filter : 'all' // all, called, letter_sent, pending
  const search = typeof params.search === 'string' ? params.search : undefined
  const limitParam = typeof params.limit === 'string' ? params.limit : '100' // Default to 100
  const limit = limitParam === 'all' ? null : parseInt(limitParam, 10)

  // County filter - supports comma-separated values for multi-select
  const countyParam = typeof params.county === 'string' ? params.county : undefined
  const selectedCounties = countyParam ? countyParam.split(',').filter(c => c.trim()) : []

  // Sort parameter - default to newest first
  const sortParam = typeof params.sort === 'string' ? params.sort : 'newest'

  // First, get accurate counts from database (bypasses 1000 row limit)
  const [
    { count: totalCount },
    { count: calledCount },
    { count: letterSentCount },
    { count: pendingCount },
    { count: sentToCallCount },
    { count: sentToBrevCount }
  ] = await Promise.all([
    // Total leads count (exclude soft-deleted)
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    // Leads with call logs (using inner join)
    supabase
      .from('call_logs')
      .select('lead_id', { count: 'exact', head: true })
      .not('lead_id', 'is', null),
    // Leads with letter_sent = true
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('letter_sent', true)
      .is('deleted_at', null),
    // Leads with pending_review status
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review')
      .is('deleted_at', null),
    // Leads sent to call list (has sent_to_call_at timestamp) - exclude prospekt_archive
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .not('sent_to_call_at', 'is', null)
      .neq('status', 'prospekt_archive')
      .is('deleted_at', null),
    // Leads sent to brev list (has sent_to_brev_at timestamp) - exclude prospekt_archive
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .not('sent_to_brev_at', 'is', null)
      .neq('status', 'prospekt_archive')
      .is('deleted_at', null)
  ])

  // Get unique called lead count (since call_logs can have multiple entries per lead)
  const { data: uniqueCalledLeads } = await supabase
    .from('call_logs')
    .select('lead_id')
  const uniqueCalledCount = new Set(uniqueCalledLeads?.map(c => c.lead_id) || []).size

  // Fetch leads data for display (Supabase default limit is 1000)
  // Run queries in parallel - leads + available counties for filter + prospect types
  const [leadsResult, countiesResult, savedProspectTypes] = await Promise.all([
    (async () => {
      let query = supabase
        .from('leads')
        .select(`
          id,
          phone,
          owner_info,
          location,
          status,
          county,
          prospect_type,
          letter_sent,
          letter_sent_date,
          sent_to_call_at,
          sent_to_brev_at,
          data_period_start,
          bilprospekt_date,
          extra_data,
          created_at,
          vehicles (
            id,
            reg_nr,
            make,
            model,
            year,
            mileage,
            chassis_nr,
            in_traffic,
            is_interesting,
            ai_score,
            carinfo_fetched_at,
            antal_agare,
            valuation_company,
            valuation_private,
            besiktning_till,
            "senaste_avställning",
            "senaste_påställning",
            senaste_agarbyte,
            antal_foretagsannonser,
            antal_privatannonser
          ),
          call_logs (
            id,
            called_at,
            result,
            notes,
            follow_up_date
          )
        `)
        .order('created_at', { ascending: false })
        .neq('status', 'prospekt_archive') // Exclude prospekt archive leads
        .is('deleted_at', null)

      // Apply county filter if selected
      if (selectedCounties.length > 0) {
        query = query.in('county', selectedCounties)
      }

      return query
    })(),
    // Get available counties for filter dropdown
    supabase
      .from('leads')
      .select('county')
      .is('deleted_at', null),
    // Get saved prospect types
    getProspectTypes()
  ])

  const { data: allLeads, error } = leadsResult
  const availableCounties = [...new Set(countiesResult.data?.map(c => c.county).filter(Boolean))] as string[]

  if (error) {
    console.error('Error fetching historik:', error)
  }

  // Filter based on selected filter
  let leads = allLeads || []

  if (filter === 'ring') {
    leads = leads.filter(lead => !!lead.sent_to_call_at)
  } else if (filter === 'brev') {
    leads = leads.filter(lead => !!lead.sent_to_brev_at)
  } else if (filter === 'pending') {
    leads = leads.filter(lead => lead.status === 'pending_review')
  }
  // 'all' shows everything

  // Apply search filter
  if (search && leads.length > 0) {
    const searchLower = search.toLowerCase()
    leads = leads.filter(lead => {
      const matchesOwner = lead.owner_info?.toLowerCase().includes(searchLower)
      const matchesPhone = lead.phone?.toLowerCase().includes(searchLower)
      const matchesVehicle = lead.vehicles?.some((v: { reg_nr?: string; make?: string; model?: string; chassis_nr?: string }) =>
        v.reg_nr?.toLowerCase().includes(searchLower) ||
        v.make?.toLowerCase().includes(searchLower) ||
        v.model?.toLowerCase().includes(searchLower) ||
        v.chassis_nr?.toLowerCase().includes(searchLower)
      )
      const matchesNotes = lead.call_logs?.some((c: { notes?: string; result?: string }) =>
        c.notes?.toLowerCase().includes(searchLower) ||
        c.result?.toLowerCase().includes(searchLower)
      )
      return matchesOwner || matchesPhone || matchesVehicle || matchesNotes
    })
  }

  // Apply sorting based on sortParam
  if (sortParam === 'oldest') {
    leads = leads.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  } else if (sortParam === 'name_asc') {
    leads = leads.sort((a, b) => (a.owner_info || '').localeCompare(b.owner_info || '', 'sv'))
  } else if (sortParam === 'name_desc') {
    leads = leads.sort((a, b) => (b.owner_info || '').localeCompare(a.owner_info || '', 'sv'))
  }
  // 'newest' is default - already sorted by DB query

  // Store filtered count before applying limit
  const filteredCount = leads.length

  // Apply row limit
  if (limit && limit > 0) {
    leads = leads.slice(0, limit)
  }

  // Extract all unique extra_data column names across all leads (like playground)
  const extraColumns = new Set<string>()
  leads.forEach(lead => {
    if (lead.extra_data && typeof lead.extra_data === 'object') {
      Object.keys(lead.extra_data).forEach(key => extraColumns.add(key))
    }
  })

  // Stats are already fetched from database with accurate counts above
  // totalCount, uniqueCalledCount, letterSentCount, pendingCount are available

  return (
    <div className="flex flex-col">
      <Header
        title="Alla Leads"
        description="Visa och hantera alla leads i databasen. Radera enskilda eller flera samtidigt."
      />

      <div className="flex-1 p-6">
        <HistorikView
          leads={leads}
          totalCount={totalCount || 0}
          filteredCount={filteredCount}
          calledCount={uniqueCalledCount}
          letterSentCount={letterSentCount || 0}
          pendingCount={pendingCount || 0}
          sentToCallCount={sentToCallCount || 0}
          sentToBrevCount={sentToBrevCount || 0}
          currentFilter={filter}
          currentSearch={search}
          currentLimit={limitParam}
          currentSort={sortParam}
          availableCounties={availableCounties}
          currentCounty={countyParam}
          availableExtraColumns={Array.from(extraColumns)}
          savedProspectTypes={savedProspectTypes}
        />
      </div>
    </div>
  )
}
