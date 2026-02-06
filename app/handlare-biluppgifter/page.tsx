import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { HandlareBiluppgifterView } from '@/components/handlare-biluppgifter/handlare-biluppgifter-view'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export default async function HandlareBiluppgifterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const ownerTypeFilter = typeof params.owner_type === 'string' ? params.owner_type : undefined
  const searchFilter = typeof params.search === 'string' ? params.search : undefined
  const currentPage = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1)

  const supabase = await createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // --- Stats ---
  const [
    { count: totalDealerAds },
    { count: totalBiluppgifter },
    { count: totalHandlare },
    { count: totalFormedling },
    { count: totalPrivat },
    { count: totalForetag },
    { count: totalSold },
    { count: fetchedToday },
    { count: knownDealersCount },
  ] = await Promise.all([
    supabase.from('blocket_annonser').select('*', { count: 'exact', head: true }).eq('saljare_typ', 'handlare').is('borttagen', null).not('regnummer', 'is', null),
    supabase.from('biluppgifter_data').select('*', { count: 'exact', head: true }),
    supabase.from('biluppgifter_data').select('*', { count: 'exact', head: true }).eq('owner_type', 'handlare'),
    supabase.from('biluppgifter_data').select('*', { count: 'exact', head: true }).eq('owner_type', 'formedling'),
    supabase.from('biluppgifter_data').select('*', { count: 'exact', head: true }).eq('owner_type', 'privat'),
    supabase.from('biluppgifter_data').select('*', { count: 'exact', head: true }).eq('owner_type', 'foretag'),
    supabase.from('biluppgifter_data').select('*', { count: 'exact', head: true }).eq('owner_type', 'sold'),
    supabase.from('biluppgifter_data').select('*', { count: 'exact', head: true }).gte('fetched_at', today.toISOString()),
    supabase.from('known_dealers').select('*', { count: 'exact', head: true }),
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
      is_dealer,
      dealer_since,
      previous_owner,
      mileage_history,
      owner_history,
      fetched_at
    `, { count: 'exact' })

  if (ownerTypeFilter) {
    query = query.eq('owner_type', ownerTypeFilter)
  }

  if (searchFilter) {
    query = query.or(`regnummer.ilike.%${searchFilter}%,owner_name.ilike.%${searchFilter}%`)
  }

  const { data: recentFetches, count: totalCount } = await query
    .order('fetched_at', { ascending: false })
    .range(from, to)

  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE)

  // Hamta Blocket-data for dessa
  const blocketIds = recentFetches?.map(f => f.regnummer).filter(Boolean) || []
  let blocketMap: Record<string, any> = {}
  if (blocketIds.length > 0) {
    const { data: blocketAds } = await supabase
      .from('blocket_annonser')
      .select('regnummer, marke, modell, arsmodell, pris, saljare_namn, saljare_typ, publicerad, region, stad, url')
      .in('regnummer', blocketIds)

    if (blocketAds) {
      for (const ad of blocketAds) {
        if (ad.regnummer) blocketMap[ad.regnummer.toUpperCase()] = ad
      }
    }
  }

  // --- Cron-loggar ---
  const { data: cronLogs } = await supabase
    .from('biluppgifter_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)

  // --- Known dealers (topp 20) ---
  const { data: topDealers } = await supabase
    .from('known_dealers')
    .select('name, biluppgifter_name, ad_count, address, postal_city, phone, vehicle_count, updated_at')
    .order('ad_count', { ascending: false })
    .limit(20)

  const stats = {
    totalDealerAds: totalDealerAds || 0,
    totalBiluppgifter: totalBiluppgifter || 0,
    remaining: (totalDealerAds || 0) - (totalBiluppgifter || 0),
    totalHandlare: totalHandlare || 0,
    totalFormedling: totalFormedling || 0,
    totalPrivat: totalPrivat || 0,
    totalForetag: totalForetag || 0,
    totalSold: totalSold || 0,
    fetchedToday: fetchedToday || 0,
    knownDealers: knownDealersCount || 0,
  }

  const currentFilters = {
    owner_type: ownerTypeFilter,
    search: searchFilter,
    page: String(currentPage),
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Handlare & Biluppgifter"
        description="Biluppgifter-data f&ouml;r handlarbilar fr&aring;n Blocket"
      />
      <div className="flex-1 p-6">
        <HandlareBiluppgifterView
          stats={stats}
          recentFetches={recentFetches || []}
          blocketMap={blocketMap}
          cronLogs={cronLogs || []}
          topDealers={topDealers || []}
          currentFilters={currentFilters}
          totalCount={totalCount || 0}
          totalPages={totalPages}
          currentPage={currentPage}
        />
      </div>
    </div>
  )
}
