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
  const phoneFilter = typeof params.phone === 'string' ? params.phone : undefined
  const viewFilter = typeof params.view === 'string' ? params.view : 'fetched' // fetched, not_fetched, no_data
  const currentPage = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1)

  const supabase = await createClient()

  // --- Stats ---
  // Hämta alla privat-annonser regnummer
  const { data: allPrivatAds } = await supabase
    .from('blocket_annonser')
    .select('regnummer')
    .eq('saljare_typ', 'privat')
    .is('borttagen', null)
    .not('regnummer', 'is', null)

  const allPrivatRegnr = new Set((allPrivatAds || []).map(a => a.regnummer?.toUpperCase()).filter(Boolean))

  // Hämta alla biluppgifter för privat
  const { data: allBiluppgifter } = await supabase
    .from('biluppgifter_data')
    .select('regnummer, owner_type, owner_phone')
    .in('owner_type', ['privat', 'no_data'])

  const biluppgifterMap = new Map<string, { owner_type: string; owner_phone: string | null }>()
  for (const b of allBiluppgifter || []) {
    if (b.regnummer) biluppgifterMap.set(b.regnummer.toUpperCase(), b)
  }

  // Beräkna stats
  let withPhone = 0
  let withoutPhone = 0
  let noData = 0
  let fetched = 0
  const notFetchedRegnr: string[] = []

  for (const regnr of allPrivatRegnr) {
    const bu = biluppgifterMap.get(regnr)
    if (!bu) {
      notFetchedRegnr.push(regnr)
    } else if (bu.owner_type === 'no_data') {
      noData++
    } else {
      fetched++
      if (bu.owner_phone) withPhone++
      else withoutPhone++
    }
  }

  const stats = {
    totalPrivatAds: allPrivatRegnr.size,
    fetched,
    withPhone,
    withoutPhone,
    noData,
    notFetched: notFetchedRegnr.length,
  }

  // --- Data based on view ---
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  let privatData: any[] = []
  let totalCount = 0
  let blocketMap: Record<string, any> = {}

  if (viewFilter === 'not_fetched') {
    // Visa Blocket-annonser som inte har biluppgifter
    const pageRegnr = notFetchedRegnr.slice(from, to + 1)
    totalCount = notFetchedRegnr.length

    if (pageRegnr.length > 0) {
      const { data: ads } = await supabase
        .from('blocket_annonser')
        .select('id, regnummer, marke, modell, arsmodell, pris, saljare_namn, publicerad, region, stad, url')
        .in('regnummer', pageRegnr)

      privatData = (ads || []).map(ad => ({
        id: ad.id,
        regnummer: ad.regnummer,
        _isBlocketOnly: true,
        _blocket: ad,
      }))

      for (const ad of ads || []) {
        if (ad.regnummer) blocketMap[ad.regnummer.toUpperCase()] = ad
      }
    }
  } else if (viewFilter === 'no_data') {
    // Visa bilar där biluppgifter inte har data
    let query = supabase
      .from('biluppgifter_data')
      .select('id, regnummer, fetched_at', { count: 'exact' })
      .eq('owner_type', 'no_data')

    if (searchFilter) {
      query = query.ilike('regnummer', `%${searchFilter}%`)
    }

    const { data, count } = await query
      .order('fetched_at', { ascending: false })
      .range(from, to)

    privatData = (data || []).map(d => ({
      ...d,
      _isNoData: true,
    }))
    totalCount = count || 0

    // Hämta Blocket-data
    const regnrs = privatData.map(f => f.regnummer).filter(Boolean)
    if (regnrs.length > 0) {
      const { data: blocketAds } = await supabase
        .from('blocket_annonser')
        .select('regnummer, marke, modell, arsmodell, pris, saljare_namn, publicerad, region, stad, url')
        .in('regnummer', regnrs)

      for (const ad of blocketAds || []) {
        if (ad.regnummer) blocketMap[ad.regnummer.toUpperCase()] = ad
      }
    }
  } else {
    // Vanlig vy: hämtade med biluppgifter
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

    if (phoneFilter === 'with') {
      query = query.not('owner_phone', 'is', null)
    } else if (phoneFilter === 'without') {
      query = query.is('owner_phone', null)
    }

    const { data, count } = await query
      .order('fetched_at', { ascending: false })
      .range(from, to)

    privatData = data || []
    totalCount = count || 0

    // Hämta Blocket-data
    const regnrs = privatData.map(f => f.regnummer).filter(Boolean)
    if (regnrs.length > 0) {
      const { data: blocketAds } = await supabase
        .from('blocket_annonser')
        .select('regnummer, marke, modell, arsmodell, pris, saljare_namn, publicerad, region, stad, url')
        .in('regnummer', regnrs)

      for (const ad of blocketAds || []) {
        if (ad.regnummer) blocketMap[ad.regnummer.toUpperCase()] = ad
      }
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Hämta unika städer för filter
  const { data: cities } = await supabase
    .from('biluppgifter_data')
    .select('owner_postal_city')
    .eq('owner_type', 'privat')
    .not('owner_postal_city', 'is', null)
    .limit(500)

  const uniqueCities = [...new Set((cities || []).map(c => c.owner_postal_city).filter(Boolean))].sort()

  const currentFilters = {
    search: searchFilter,
    lan: lanFilter,
    phone: phoneFilter,
    view: viewFilter,
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
          privatData={privatData}
          blocketMap={blocketMap}
          cities={uniqueCities}
          currentFilters={currentFilters}
          totalCount={totalCount}
          totalPages={totalPages}
          currentPage={currentPage}
        />
      </div>
    </div>
  )
}
