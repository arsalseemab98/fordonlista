import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { LetterList } from '@/components/letters/letter-list'
import { getBilprospektDate } from '@/app/actions/settings'

// Revalidate every 30 seconds for better performance
export const revalidate = 30

interface MileageHistoryEntry {
  date: string
  mileage_km: number
  mileage_mil?: number
}

interface Vehicle {
  id: string
  reg_nr: string | null
  make: string | null
  model: string | null
  year: number | null
  fuel_type: string | null
  mileage: number | null
  color: string | null
  transmission: string | null
  horsepower: number | null
  in_traffic: boolean
  four_wheel_drive: boolean
  engine_cc: number | null
  antal_agare: number | null
  skatt: number | null
  besiktning_till: string | null
  mileage_history: MileageHistoryEntry[] | null
  owner_history: unknown[] | null
  owner_vehicles: unknown[] | null
  address_vehicles: unknown[] | null
  owner_gender: string | null
  owner_type: string | null
  biluppgifter_fetched_at: string | null
}

interface Lead {
  id: string
  owner_info: string | null
  location: string | null
  phone: string | null
  letter_sent: boolean | null
  letter_sent_date: string | null
  bilprospekt_date?: string | null
  source: string | null
  county: string | null
  sent_to_brev_at?: string | null
  created_at: string
  status: string
  owner_age: number | null
  owner_gender: string | null
  owner_type: string | null
  vehicles: Vehicle[]
}

export interface BrevMonthlyStats {
  month: string
  lettersSent: number
  cost: number
  conversions: number
  conversionRate: number
}

interface BrevPageProps {
  searchParams: Promise<{
    filter?: string
  }>
}

async function getLeadsForLetters(filter: string) {
  const supabase = await createClient()

  let query = supabase
    .from('leads')
    .select(`
      id,
      owner_info,
      location,
      phone,
      letter_sent,
      letter_sent_date,
      bilprospekt_date,
      source,
      county,
      sent_to_brev_at,
      created_at,
      status,
      owner_age,
      owner_gender,
      owner_type,
      vehicles (
        id,
        reg_nr,
        make,
        model,
        year,
        fuel_type,
        mileage,
        color,
        transmission,
        horsepower,
        in_traffic,
        four_wheel_drive,
        engine_cc,
        antal_agare,
        skatt,
        besiktning_till,
        mileage_history,
        owner_history,
        owner_vehicles,
        address_vehicles,
        owner_gender,
        owner_type,
        biluppgifter_fetched_at
      )
    `)
    .is('deleted_at', null)
    .order('sent_to_brev_at', { ascending: false, nullsFirst: false })

  // Apply filters
  if (filter === 'pending') {
    query = query.eq('status', 'pending_review')
  } else if (filter === 'no_phone') {
    query = query.neq('status', 'pending_review').or('phone.is.null,phone.eq.')
  } else if (filter === 'not_sent') {
    query = query.neq('status', 'pending_review').or('letter_sent.is.null,letter_sent.eq.false')
  } else if (filter === 'sent') {
    query = query.neq('status', 'pending_review').eq('letter_sent', true)
  } else if (filter === 'all') {
    // Show all including pending
  } else {
    // Default: exclude pending_review
    query = query.neq('status', 'pending_review')
  }

  const { data, error, count } = await query.limit(200)

  if (error) {
    console.error('Error fetching leads for letters:', error)
    return { leads: [], counts: { total: 0, pending: 0, noPhone: 0, notSent: 0, sent: 0 }, letterCost: 12.00, monthlyStats: [] }
  }

  // Get counts, preferences, and analytics data in parallel
  const [
    { count: totalCount },
    { count: pendingCount },
    { count: noPhoneCount },
    { count: notSentCount },
    { count: sentCount },
    { data: preferences },
    { data: analyticsLeads }
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'pending_review').is('deleted_at', null),
    supabase.from('leads').select('*', { count: 'exact', head: true }).neq('status', 'pending_review').is('deleted_at', null).or('phone.is.null,phone.eq.'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).neq('status', 'pending_review').is('deleted_at', null).or('letter_sent.is.null,letter_sent.eq.false'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).neq('status', 'pending_review').is('deleted_at', null).eq('letter_sent', true),
    supabase.from('preferences').select('letter_cost').limit(1).maybeSingle(),
    supabase.from('leads').select('id, letter_sent_date, status').eq('letter_sent', true).is('deleted_at', null)
  ])

  const letterCost = preferences?.letter_cost || 12.00

  // Aggregate analytics by month
  const monthMap = new Map<string, { sent: number; conversions: number }>()

  analyticsLeads?.forEach((lead: { id: string; letter_sent_date: string | null; status: string }) => {
    if (!lead.letter_sent_date) return
    const month = lead.letter_sent_date.substring(0, 7) // "2025-01"
    const entry = monthMap.get(month) || { sent: 0, conversions: 0 }
    entry.sent++
    if (['booked', 'interested', 'bought'].includes(lead.status)) {
      entry.conversions++
    }
    monthMap.set(month, entry)
  })

  const monthlyStats: BrevMonthlyStats[] = Array.from(monthMap.entries())
    .map(([month, d]) => ({
      month,
      lettersSent: d.sent,
      cost: d.sent * letterCost,
      conversions: d.conversions,
      conversionRate: d.sent > 0 ? (d.conversions / d.sent) * 100 : 0,
    }))
    .sort((a, b) => b.month.localeCompare(a.month))

  return {
    leads: (data || []) as Lead[],
    counts: {
      total: totalCount || 0,
      pending: pendingCount || 0,
      noPhone: noPhoneCount || 0,
      notSent: notSentCount || 0,
      sent: sentCount || 0
    },
    letterCost,
    monthlyStats,
  }
}

export default async function BrevPage({ searchParams }: BrevPageProps) {
  const params = await searchParams
  const filter = params.filter || 'not_sent'
  const [{ leads, counts, letterCost, monthlyStats }, bilprospektDate] = await Promise.all([
    getLeadsForLetters(filter),
    getBilprospektDate()
  ])

  return (
    <div className="flex flex-col">
      <Header
        title="Brevutskick"
        description="Hantera och exportera leads för brevutskick"
        bilprospektDate={bilprospektDate}
      />

      <div className="flex-1 p-6">
        <LetterList
          leads={leads}
          counts={counts}
          currentFilter={filter}
          letterCost={letterCost}
          monthlyStats={monthlyStats}
        />
      </div>
    </div>
  )
}
