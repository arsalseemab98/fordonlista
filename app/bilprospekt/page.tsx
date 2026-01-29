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
  const fuelParam = typeof params.fuel === 'string' ? params.fuel : undefined
  const yearFromParam = typeof params.year_from === 'string' ? parseInt(params.year_from) : undefined
  const yearToParam = typeof params.year_to === 'string' ? parseInt(params.year_to) : undefined
  const search = typeof params.search === 'string' ? params.search : undefined
  const page = typeof params.page === 'string' ? parseInt(params.page) : 0
  const pageSize = 50

  // Build query
  let query = supabase
    .from('bilprospekt_prospects')
    .select('*', { count: 'exact' })
    .order('car_year', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  // Apply filters
  if (regionParam) query = query.eq('region_code', regionParam)
  if (brandParam) query = query.eq('brand', brandParam.toUpperCase())
  if (fuelParam) query = query.ilike('fuel', `%${fuelParam}%`)
  if (yearFromParam) query = query.gte('car_year', yearFromParam)
  if (yearToParam) query = query.lte('car_year', yearToParam)
  if (search) {
    query = query.or(`reg_number.ilike.%${search}%,owner_name.ilike.%${search}%,municipality.ilike.%${search}%`)
  }

  const { data: prospects, count, error } = await query

  if (error) {
    console.error('Error fetching bilprospekt data:', error)
  }

  // Get unique filter options
  const { data: filterOptions } = await supabase
    .from('bilprospekt_prospects')
    .select('brand, fuel, municipality, region_code')

  const brands = [...new Set(filterOptions?.map(f => f.brand).filter(Boolean))] as string[]
  const fuels = [...new Set(filterOptions?.map(f => f.fuel).filter(Boolean))] as string[]
  const municipalities = [...new Set(filterOptions?.map(f => f.municipality).filter(Boolean))] as string[]

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
            fuel: fuelParam,
            yearFrom: yearFromParam,
            yearTo: yearToParam,
            search,
          }}
          availableBrands={brands.sort()}
          availableFuels={fuels.sort()}
          availableMunicipalities={municipalities.sort()}
        />
      </div>
    </div>
  )
}
