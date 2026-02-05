import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { BilprospektView } from '@/components/bilprospekt/bilprospekt-view'

// Revalidate every 60 seconds
export const revalidate = 60

export default async function BilprospektPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Get filter params
  const regionParam = typeof params.region === 'string' ? params.region : '25' // Default: Norrbotten
  const brandParam = typeof params.brand === 'string' ? params.brand : undefined
  const modelParam = typeof params.model === 'string' ? params.model : undefined
  const fuelParam = typeof params.fuel === 'string' ? params.fuel : undefined
  const karossParam = typeof params.kaross === 'string' ? params.kaross : undefined
  const municipalityParam = typeof params.municipality === 'string' ? params.municipality : undefined
  const ownerTypeParam = typeof params.owner_type === 'string' ? params.owner_type : undefined
  const fwdParam = typeof params.fwd === 'string' ? params.fwd : undefined
  const colorParam = typeof params.color === 'string' ? params.color : undefined
  const yearFromParam = typeof params.year_from === 'string' ? parseInt(params.year_from) : undefined
  const yearToParam = typeof params.year_to === 'string' ? parseInt(params.year_to) : undefined
  const possessionFromParam = typeof params.possession_from === 'string' ? parseInt(params.possession_from) : undefined
  const possessionToParam = typeof params.possession_to === 'string' ? parseInt(params.possession_to) : undefined
  const search = typeof params.search === 'string' ? params.search : undefined
  const sortBy = typeof params.sort === 'string' ? params.sort : 'car_year_desc'
  const page = typeof params.page === 'string' ? parseInt(params.page) : 0
  const pageSize = 50

  // Sorting
  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    'car_year_desc': { column: 'car_year', ascending: false },
    'car_year_asc': { column: 'car_year', ascending: true },
    'date_acquired_desc': { column: 'date_acquired', ascending: false },
    'date_acquired_asc': { column: 'date_acquired', ascending: true },
    'brand_asc': { column: 'brand', ascending: true },
    'owner_name_asc': { column: 'owner_name', ascending: true },
    'municipality_asc': { column: 'municipality', ascending: true },
  }
  const sort = sortMap[sortBy] || sortMap['car_year_desc']

  // Build query
  let query = supabase
    .from('bilprospekt_prospects')
    .select('*', { count: 'exact' })
    .order(sort.column, { ascending: sort.ascending })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  // Apply filters
  if (regionParam) query = query.eq('region_code', regionParam)
  if (brandParam) query = query.eq('brand', brandParam.toUpperCase())
  if (modelParam) query = query.eq('model', modelParam.toUpperCase())
  if (fuelParam) query = query.ilike('fuel', `%${fuelParam}%`)
  if (karossParam) query = query.eq('kaross', karossParam)
  if (municipalityParam) query = query.eq('municipality', municipalityParam)
  if (ownerTypeParam) query = query.eq('owner_type', ownerTypeParam)
  if (fwdParam) query = query.eq('fwd', fwdParam)
  if (colorParam) query = query.eq('color', colorParam)
  if (yearFromParam) query = query.gte('car_year', yearFromParam)
  if (yearToParam) query = query.lte('car_year', yearToParam)

  // Filter by possession time (months since date_acquired)
  if (possessionFromParam) {
    const dateFrom = new Date()
    dateFrom.setMonth(dateFrom.getMonth() - possessionFromParam)
    query = query.lte('date_acquired', dateFrom.toISOString().split('T')[0])
  }
  if (possessionToParam) {
    const dateTo = new Date()
    dateTo.setMonth(dateTo.getMonth() - possessionToParam)
    query = query.gte('date_acquired', dateTo.toISOString().split('T')[0])
  }

  if (search) {
    query = query.or(`reg_number.ilike.%${search}%,owner_name.ilike.%${search}%,municipality.ilike.%${search}%`)
  }

  const { data: prospects, count, error } = await query

  if (error) {
    console.error('Error fetching bilprospekt data:', error)
  }

  // Get unique filter options via DB function (efficient DISTINCT query)
  const { data: filterResult } = await supabase.rpc('get_bilprospekt_filter_options')

  const brands = (filterResult?.brands || []) as string[]
  const fuels = (filterResult?.fuels || []) as string[]
  const municipalities = (filterResult?.municipalities || []) as string[]
  const karossTypes = (filterResult?.kaross_types || []) as string[]
  const colors = (filterResult?.colors || []) as string[]

  // Get models for selected brand (dynamic)
  let models: string[] = []
  if (brandParam) {
    const { data: modelResult } = await supabase.rpc('get_bilprospekt_models_for_brand', { p_brand: brandParam.toUpperCase() })
    models = (modelResult || []) as string[]
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Bilprospekt"
        description="Sök och filtrera prospekt från Bilprospekt. Data uppdateras varje vecka."
      />

      <div className="flex-1 p-6">
        <BilprospektView
          prospects={prospects || []}
          totalCount={count || 0}
          currentPage={page}
          pageSize={pageSize}
          currentFilters={{
            region: regionParam,
            brand: brandParam,
            model: modelParam,
            fuel: fuelParam,
            kaross: karossParam,
            municipality: municipalityParam,
            ownerType: ownerTypeParam,
            fwd: fwdParam,
            color: colorParam,
            yearFrom: yearFromParam,
            yearTo: yearToParam,
            possessionFrom: possessionFromParam,
            possessionTo: possessionToParam,
            search,
            sort: sortBy,
          }}
          availableBrands={brands.sort()}
          availableModels={models}
          availableFuels={fuels.sort()}
          availableMunicipalities={municipalities.sort()}
          availableKarossTypes={karossTypes}
          availableColors={colors}
        />
      </div>
    </div>
  )
}
