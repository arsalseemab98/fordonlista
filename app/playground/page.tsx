import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { PlaygroundView } from '@/components/playground/playground-view'

// Revalidate every 30 seconds for better performance
export const revalidate = 30

export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Get filter params - county and prospect_type support comma-separated values for multi-select
  const countyParam = typeof params.county === 'string' ? params.county : undefined
  const selectedCounties = countyParam ? countyParam.split(',').filter(c => c.trim()) : []
  const prospectTypeParam = typeof params.prospect_type === 'string' ? params.prospect_type : undefined
  const selectedProspectTypes = prospectTypeParam ? prospectTypeParam.split(',').filter(t => t.trim()) : []
  const dateFrom = typeof params.date_from === 'string' ? params.date_from : undefined
  const dateTo = typeof params.date_to === 'string' ? params.date_to : undefined
  const search = typeof params.search === 'string' ? params.search : undefined
  const showHidden = params.show_hidden === 'true'

  // Run queries in parallel for better performance
  const [leadsResult, filterOptionsResult] = await Promise.all([
    // Main leads query - only select needed columns
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
          extra_data,
          created_at,
          vehicles (
            id,
            reg_nr,
            make,
            model,
            year,
            mileage,
            in_traffic,
            is_interesting,
            ai_score,
            carinfo_fetched_at,
            antal_agare,
            valuation_company,
            valuation_private,
            besiktning_till,
            "senaste_avställning",
            "senaste_påställning"
          ),
          call_logs (
            id,
            called_at,
            result
          )
        `)
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false })
        .limit(200)

      if (selectedCounties.length > 0) query = query.in('county', selectedCounties)
      if (selectedProspectTypes.length > 0) query = query.in('prospect_type', selectedProspectTypes)
      if (dateFrom) query = query.gte('data_period_start', dateFrom)
      if (dateTo) query = query.lte('data_period_end', dateTo)

      return query
    })(),
    // Get filter options in one query
    supabase
      .from('leads')
      .select('county, prospect_type')
      .eq('status', 'pending_review')
  ])

  const leads = leadsResult.data || []
  const filterOptions = filterOptionsResult.data || []

  if (leadsResult.error) {
    console.error('Error fetching leads:', leadsResult.error)
  }

  // Extract unique counties and prospect types from the same query
  const counties = [...new Set(filterOptions.map(c => c.county).filter(Boolean))] as string[]
  const prospectTypes = [...new Set(filterOptions.map(p => p.prospect_type).filter(Boolean))] as string[]

  // Extract all unique extra_data column names across all leads
  const extraColumns = new Set<string>()
  leads.forEach(lead => {
    if (lead.extra_data && typeof lead.extra_data === 'object') {
      Object.keys(lead.extra_data).forEach(key => extraColumns.add(key))
    }
  })

  // Filter by search if provided
  let filteredLeads = leads
  if (search && filteredLeads.length > 0) {
    const searchLower = search.toLowerCase()
    filteredLeads = filteredLeads.filter(lead => {
      const matchesOwner = lead.owner_info?.toLowerCase().includes(searchLower)
      const matchesLocation = lead.location?.toLowerCase().includes(searchLower)
      const matchesVehicle = lead.vehicles?.some((v: { reg_nr?: string; make?: string; model?: string }) =>
        v.reg_nr?.toLowerCase().includes(searchLower) ||
        v.make?.toLowerCase().includes(searchLower) ||
        v.model?.toLowerCase().includes(searchLower)
      )
      return matchesOwner || matchesLocation || matchesVehicle
    })
  }

  // Separate leads: hidden = marked for letter (letter_sent === false)
  const hiddenLeads = filteredLeads.filter(lead => lead.letter_sent === false)
  const visibleLeads = filteredLeads.filter(lead => lead.letter_sent !== false)

  // Show either hidden or visible leads based on toggle
  const displayLeads = showHidden ? hiddenLeads : visibleLeads

  return (
    <div className="flex flex-col">
      <Header
        title="Playground"
        description="Utforska och filtrera importerade leads. Ring, kopiera reg.nr, och hantera prospekt."
      />

      <div className="flex-1 p-6">
        <PlaygroundView
          leads={displayLeads}
          totalCount={leads.length}
          hiddenCount={hiddenLeads.length}
          visibleCount={visibleLeads.length}
          showHidden={showHidden}
          availableCounties={counties}
          availableProspectTypes={prospectTypes}
          availableExtraColumns={Array.from(extraColumns)}
          currentFilters={{
            county: countyParam,
            prospectType: prospectTypeParam,
            dateFrom,
            dateTo,
            search
          }}
        />
      </div>
    </div>
  )
}
