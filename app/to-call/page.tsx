import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { ToCallList } from '@/components/to-call/to-call-list'
import { getBilprospektDate } from '@/app/actions/settings'

// Revalidate every 30 seconds for better performance
export const revalidate = 30

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

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
  four_wheel_drive?: boolean
  engine_cc?: number | null
  is_interesting?: boolean
  ai_score?: number
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

interface CallLog {
  id: string
  called_at: string
  result: string
}

interface Lead {
  id: string
  phone: string | null
  owner_info: string | null
  location: string | null
  status: string
  source: string | null
  county: string | null
  owner_age: number | null
  owner_gender: string | null
  owner_type: string | null
  created_at: string
  vehicles: Vehicle[]
  call_logs: CallLog[]
}

async function getLeadsToCall(statusFilter?: string) {
  const supabase = await createClient()

  // Determine which statuses to filter by
  const validStatuses = ['new', 'to_call', 'callback', 'no_answer']
  const statusesToFetch = statusFilter && validStatuses.includes(statusFilter)
    ? [statusFilter]
    : validStatuses

  // Get leads that need to be called
  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      id,
      phone,
      owner_info,
      location,
      status,
      source,
      county,
      owner_age,
      owner_gender,
      owner_type,
      created_at,
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
        is_interesting,
        ai_score,
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
      ),
      call_logs (
        id,
        called_at,
        result
      )
    `)
    .in('status', statusesToFetch)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('Error fetching leads to call:', error)
    return []
  }

  // Sort by priority:
  // 1. Interesting vehicles first
  // 2. Callback status
  // 3. New leads
  // 4. No answer (oldest first)
  const sorted = (leads || []).sort((a, b) => {
    const aInteresting = a.vehicles?.some((v: Vehicle) => v.is_interesting) ? 1 : 0
    const bInteresting = b.vehicles?.some((v: Vehicle) => v.is_interesting) ? 1 : 0

    if (aInteresting !== bInteresting) return bInteresting - aInteresting

    const statusPriority: Record<string, number> = { callback: 4, to_call: 3, new: 2, no_answer: 1 }
    const aPriority = statusPriority[a.status] || 0
    const bPriority = statusPriority[b.status] || 0

    if (aPriority !== bPriority) return bPriority - aPriority

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  return sorted as Lead[]
}

export default async function ToCallPage({ searchParams }: PageProps) {
  const params = await searchParams
  const statusFilter = params.status || 'all'
  const [leads, bilprospektDate] = await Promise.all([
    getLeadsToCall(statusFilter === 'all' ? undefined : statusFilter),
    getBilprospektDate()
  ])

  const newCount = leads.filter(l => l.status === 'new').length
  const toCallCount = leads.filter(l => l.status === 'to_call').length
  const callbackCount = leads.filter(l => l.status === 'callback').length
  const noAnswerCount = leads.filter(l => l.status === 'no_answer').length

  return (
    <div className="flex flex-col">
      <Header
        title="Att ringa"
        description={`${leads.length} leads väntar på samtal`}
        bilprospektDate={bilprospektDate}
      />

      <div className="flex-1 p-6">
        <ToCallList
          leads={leads}
          newCount={newCount}
          toCallCount={toCallCount}
          callbackCount={callbackCount}
          noAnswerCount={noAnswerCount}
          currentFilter={statusFilter}
        />
      </div>
    </div>
  )
}
