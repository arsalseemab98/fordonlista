import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { PrivatBiluppgifterView } from '@/components/privat-biluppgifter/privat-biluppgifter-view'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export default async function PrivatBiluppgifterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const searchFilter = typeof params.search === 'string' ? params.search : undefined
  const lanFilter = typeof params.lan === 'string' ? params.lan : undefined
  const currentPage = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1)

  const supabase = await createClient()

  // --- Stats ---
  const [
    { count: totalPrivatAds },
    { count: totalPrivatBiluppgifter },
    { count: withPhone },
    { count: withoutPhone },
  ] = await Promise.all([
    supabase.from('blocket_annonser').select('*', { count: 'exact', head: true }).eq('saljare_typ', 'privat').is('borttagen', null).not('regnummer', 'is', null),
    supabase.from('biluppgifter_data').select('*', { count: 'exact', head: true }).eq('owner_type', 'privat'),
    supabase.from('biluppgifter_data').select('*', { count: 'exact', head: true }).eq('owner_type', 'privat').not('owner_phone', 'is', null),
    supabase.from('biluppgifter_data').select('*', { count: 'exact', head: true }).eq('owner_type', 'privat').is('owner_phone', null),
  ])

  // --- Filtered + paginated query ---
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('biluppgifter_data')
    .select(`
      id,
      regnummer,
      owner_name,
      owner_type,
      owner_age,
      owner_city,
      owner_address,
      owner_postal_code,
      owner_postal_city,
      owner_phone,
      owner_vehicles,
      address_vehicles,
      mileage_history,
      fetched_at
    `, { count: 'exact' })
    .eq('owner_type', 'privat')

  if (searchFilter) {
    query = query.or(`regnummer.ilike.%${searchFilter}%,owner_name.ilike.%${searchFilter}%,owner_city.ilike.%${searchFilter}%`)
  }

  if (lanFilter) {
    query = query.ilike('owner_postal_city', `%${lanFilter}%`)
  }

  const { data: privatData, count: totalCount } = await query
    .order('fetched_at', { ascending: false })
    .range(from, to)

  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE)

  // Hämta Blocket-data
  const regnrs = privatData?.map(f => f.regnummer).filter(Boolean) || []
  let blocketMap: Record<string, any> = {}
  if (regnrs.length > 0) {
    const { data: blocketAds } = await supabase
      .from('blocket_annonser')
      .select('regnummer, marke, modell, arsmodell, pris, saljare_namn, publicerad, region, stad, url')
      .in('regnummer', regnrs)

    if (blocketAds) {
      for (const ad of blocketAds) {
        if (ad.regnummer) blocketMap[ad.regnummer.toUpperCase()] = ad
      }
    }
  }

  // Hämta unika städer för filter
  const { data: cities } = await supabase
    .from('biluppgifter_data')
    .select('owner_postal_city')
    .eq('owner_type', 'privat')
    .not('owner_postal_city', 'is', null)
    .limit(500)

  const uniqueCities = [...new Set((cities || []).map(c => c.owner_postal_city).filter(Boolean))].sort()

  const stats = {
    totalPrivatAds: totalPrivatAds || 0,
    totalPrivatBiluppgifter: totalPrivatBiluppgifter || 0,
    withPhone: withPhone || 0,
    withoutPhone: withoutPhone || 0,
  }

  const currentFilters = {
    search: searchFilter,
    lan: lanFilter,
    page: String(currentPage),
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Privat Biluppgifter"
        description="Privatpersoner som s&auml;ljer p&aring; Blocket"
      />
      <div className="flex-1 p-6">
        <PrivatBiluppgifterView
          stats={stats}
          privatData={privatData || []}
          blocketMap={blocketMap}
          cities={uniqueCities}
          currentFilters={currentFilters}
          totalCount={totalCount || 0}
          totalPages={totalPages}
          currentPage={currentPage}
        />
      </div>
    </div>
  )
}
