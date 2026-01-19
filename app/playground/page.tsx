import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { PlaygroundView } from '@/components/playground/playground-view'
import { getPreferences } from '@/app/actions/settings'

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
  const [leadsResult, filterOptionsResult, preferences] = await Promise.all([
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
          letter_sent_date,
          sent_to_call_at,
          sent_to_brev_at,
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
            "senaste_påställning",
            senaste_agarbyte,
            antal_foretagsannonser,
            antal_privatannonser
          ),
          call_logs (
            id,
            called_at,
            result
          )
        `)
        .in('status', ['pending_review', 'new'])
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
      .in('status', ['pending_review', 'new']),
    // Get user preferences for filtering
    getPreferences()
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

  // Check if filters are enabled
  const filtersEnabled = preferences.filters_enabled ?? true

  // Apply preferred/excluded makes filtering from settings (only if filters are enabled)
  const preferredMakes = filtersEnabled ? (preferences.preferred_makes || []) : []
  const excludedMakes = filtersEnabled ? (preferences.excluded_makes || []) : []
  const preferredModels = filtersEnabled ? (preferences.preferred_models || []) : []
  const excludedModels = filtersEnabled ? (preferences.excluded_models || []) : []
  const minMileage = filtersEnabled ? (preferences.min_mileage || 0) : 0
  const maxMileage = filtersEnabled ? (preferences.max_mileage || 999999) : 999999
  const minYear = filtersEnabled ? (preferences.min_year || 0) : 0
  const maxYear = filtersEnabled ? (preferences.max_year || new Date().getFullYear()) : new Date().getFullYear()

  // Filter by preferred makes (if any are specified and filters are enabled)
  if (filtersEnabled && preferredMakes.length > 0) {
    const preferredLower = preferredMakes.map((m: string) => m.toLowerCase())
    filteredLeads = filteredLeads.filter(lead => {
      // Lead must have at least one vehicle with a preferred make
      return lead.vehicles?.some((v: { make?: string }) =>
        v.make && preferredLower.includes(v.make.toLowerCase())
      )
    })
  }

  // Filter out excluded makes
  if (filtersEnabled && excludedMakes.length > 0) {
    const excludedLower = excludedMakes.map((m: string) => m.toLowerCase())
    filteredLeads = filteredLeads.filter(lead => {
      // Lead must NOT have any vehicle with an excluded make
      return !lead.vehicles?.some((v: { make?: string }) =>
        v.make && excludedLower.includes(v.make.toLowerCase())
      )
    })
  }

  // Filter by preferred models (if any are specified)
  if (filtersEnabled && preferredModels.length > 0) {
    const preferredLower = preferredModels.map((m: string) => m.toLowerCase())
    filteredLeads = filteredLeads.filter(lead => {
      return lead.vehicles?.some((v: { model?: string }) =>
        v.model && preferredLower.some((pm: string) => v.model!.toLowerCase().includes(pm))
      )
    })
  }

  // Filter out excluded models
  if (filtersEnabled && excludedModels.length > 0) {
    const excludedLower = excludedModels.map((m: string) => m.toLowerCase())
    filteredLeads = filteredLeads.filter(lead => {
      return !lead.vehicles?.some((v: { model?: string }) =>
        v.model && excludedLower.some((em: string) => v.model!.toLowerCase().includes(em))
      )
    })
  }

  // Filter by mileage range
  if (filtersEnabled && (minMileage > 0 || maxMileage < 999999)) {
    filteredLeads = filteredLeads.filter(lead => {
      return lead.vehicles?.some((v: { mileage?: number }) => {
        if (v.mileage === undefined || v.mileage === null) return true // Keep vehicles without mileage data
        return v.mileage >= minMileage && v.mileage <= maxMileage
      })
    })
  }

  // Filter by year range (min and max year)
  if (filtersEnabled && (minYear > 0 || maxYear < new Date().getFullYear())) {
    filteredLeads = filteredLeads.filter(lead => {
      return lead.vehicles?.some((v: { year?: number }) => {
        if (v.year === undefined || v.year === null) return true // Keep vehicles without year data
        return v.year >= minYear && v.year <= maxYear
      })
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
          activePreferences={{
            preferredMakes,
            excludedMakes,
            preferredModels,
            excludedModels,
            minMileage,
            maxMileage,
            minYear,
            maxYear,
            filtersEnabled
          }}
        />
      </div>
    </div>
  )
}
