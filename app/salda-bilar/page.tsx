import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { SaldaBilarView } from '@/components/salda-bilar/salda-bilar-view'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export default async function SaldaBilarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const searchFilter = typeof params.search === 'string' ? params.search : undefined
  const saljareFilter = typeof params.saljare === 'string' ? params.saljare : undefined
  const kopareFilter = typeof params.kopare === 'string' ? params.kopare : undefined
  const viewFilter = typeof params.view === 'string' ? params.view : 'awaiting' // awaiting, confirmed, pending
  const currentPage = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1)

  const supabase = await createClient()

  // --- Stats ---
  const [
    { count: totalConfirmed },
    { count: totalPending },
    { count: totalAwaiting },
    { count: privatSaljare },
    { count: handlareSaljare },
    { count: privatKopare },
    { count: foretagKopare },
    { count: handlareKopare },
    { count: withPhone },
  ] = await Promise.all([
    supabase.from('blocket_salda').select('*', { count: 'exact', head: true }),
    supabase.from('blocket_salda_pending').select('*', { count: 'exact', head: true }),
    supabase.from('blocket_annonser').select('*', { count: 'exact', head: true }).eq('borttagen_anledning', 'SÅLD').not('regnummer', 'is', null),
    supabase.from('blocket_salda').select('*', { count: 'exact', head: true }).eq('saljare_typ', 'privat'),
    supabase.from('blocket_salda').select('*', { count: 'exact', head: true }).eq('saljare_typ', 'handlare'),
    supabase.from('blocket_salda').select('*', { count: 'exact', head: true }).eq('kopare_typ', 'privatperson'),
    supabase.from('blocket_salda').select('*', { count: 'exact', head: true }).eq('kopare_typ', 'företag'),
    supabase.from('blocket_salda').select('*', { count: 'exact', head: true }).eq('kopare_is_dealer', true),
    supabase.from('blocket_salda').select('*', { count: 'exact', head: true }).not('kopare_telefon', 'is', null),
  ])

  const stats = {
    totalConfirmed: totalConfirmed || 0,
    totalPending: totalPending || 0,
    totalAwaiting: totalAwaiting || 0,
    privatSaljare: privatSaljare || 0,
    handlareSaljare: handlareSaljare || 0,
    privatKopare: privatKopare || 0,
    foretagKopare: foretagKopare || 0,
    handlareKopare: handlareKopare || 0,
    withPhone: withPhone || 0,
  }

  // --- Data based on view ---
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  let data: any[] = []
  let totalCount = 0

  if (viewFilter === 'awaiting') {
    // Sold ads from blocket_annonser awaiting buyer verification
    let query = supabase
      .from('blocket_annonser')
      .select(`
        id,
        regnummer,
        marke,
        modell,
        arsmodell,
        miltal,
        pris,
        bransle,
        vaxellada,
        kaross,
        farg,
        effekt,
        saljare_typ,
        saljare_namn,
        borttagen,
        forst_sedd,
        region,
        kommun,
        stad,
        url,
        bu_owner_name,
        bu_owner_age,
        bu_owner_city,
        bu_num_owners,
        bu_annual_tax,
        bu_inspection_until,
        bu_owner_vehicles,
        bu_address_vehicles,
        bu_fetched_at
      `, { count: 'exact' })
      .eq('borttagen_anledning', 'SÅLD')
      .not('regnummer', 'is', null)

    if (searchFilter) {
      query = query.or(`regnummer.ilike.%${searchFilter}%,saljare_namn.ilike.%${searchFilter}%,marke.ilike.%${searchFilter}%`)
    }

    if (saljareFilter && saljareFilter !== 'all') {
      query = query.eq('saljare_typ', saljareFilter)
    }

    const { data: awaitingData, count } = await query
      .order('borttagen', { ascending: false })
      .range(from, to)

    data = (awaitingData || []).map(d => ({
      ...d,
      _status: 'awaiting' as const,
      sold_at: d.borttagen,
    }))
    totalCount = count || 0
  } else if (viewFilter === 'pending') {
    // Pending sales under verification (ownership change check in progress)
    let query = supabase
      .from('blocket_salda_pending')
      .select(`
        id,
        blocket_id,
        regnummer,
        original_owner,
        first_checked_at,
        last_checked_at,
        check_count,
        marke,
        modell,
        arsmodell,
        pris,
        sold_at
      `, { count: 'exact' })

    if (searchFilter) {
      query = query.or(`regnummer.ilike.%${searchFilter}%,original_owner.ilike.%${searchFilter}%,marke.ilike.%${searchFilter}%`)
    }

    const { data: pendingData, count } = await query
      .order('sold_at', { ascending: false })
      .range(from, to)

    data = (pendingData || []).map(d => ({ ...d, _status: 'pending' as const }))
    totalCount = count || 0
  } else {
    // Confirmed sales with buyer data
    let query = supabase
      .from('blocket_salda')
      .select(`
        id,
        blocket_id,
        regnummer,
        slutpris,
        liggtid_dagar,
        saljare_typ,
        saljare_namn,
        sold_at,
        marke,
        modell,
        arsmodell,
        miltal,
        kopare_namn,
        kopare_typ,
        kopare_is_dealer,
        kopare_alder,
        kopare_adress,
        kopare_postnummer,
        kopare_postort,
        kopare_telefon,
        kopare_fordon,
        adress_fordon,
        buyer_fetched_at,
        created_at
      `, { count: 'exact' })

    if (searchFilter) {
      query = query.or(`regnummer.ilike.%${searchFilter}%,kopare_namn.ilike.%${searchFilter}%,saljare_namn.ilike.%${searchFilter}%,marke.ilike.%${searchFilter}%`)
    }

    if (saljareFilter && saljareFilter !== 'all') {
      query = query.eq('saljare_typ', saljareFilter)
    }

    if (kopareFilter && kopareFilter !== 'all') {
      if (kopareFilter === 'handlare') {
        query = query.eq('kopare_is_dealer', true)
      } else {
        query = query.eq('kopare_typ', kopareFilter)
      }
    }

    const { data: confirmedData, count } = await query
      .order('sold_at', { ascending: false })
      .range(from, to)

    data = (confirmedData || []).map(d => ({ ...d, _status: 'confirmed' as const }))
    totalCount = count || 0
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const currentFilters = {
    search: searchFilter,
    saljare: saljareFilter,
    kopare: kopareFilter,
    view: viewFilter,
    page: String(currentPage),
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Sålda Bilar"
        description="Bilar som har sålts på Blocket med köpardata"
      />
      <div className="flex-1 p-6">
        <SaldaBilarView
          stats={stats}
          data={data}
          currentFilters={currentFilters}
          totalCount={totalCount}
          totalPages={totalPages}
          currentPage={currentPage}
        />
      </div>
    </div>
  )
}
