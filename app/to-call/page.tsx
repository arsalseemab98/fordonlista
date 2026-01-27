import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { ToCallList } from '@/components/to-call/to-call-list'

// Revalidate every 30 seconds for better performance
export const revalidate = 30

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

interface Vehicle {
  id: string
  reg_nr?: string
  make?: string
  model?: string
  mileage?: number
  year?: number
  in_traffic?: boolean
  is_interesting?: boolean
  ai_score?: number
}

interface CallLog {
  id: string
  called_at: string
  result: string
}

interface Lead {
  id: string
  phone?: string
  owner_info?: string
  location?: string
  status: string
  created_at: string
  vehicles: Vehicle[]
  call_logs: CallLog[]
}

async function getLeadsToCall(statusFilter?: string) {
  const supabase = await createClient()

  // Determine which statuses to filter by
  const validStatuses = ['new', 'callback', 'no_answer']
  const statusesToFetch = statusFilter && validStatuses.includes(statusFilter)
    ? [statusFilter]
    : validStatuses

  // Get leads that need to be called
  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      *,
      vehicles (
        id,
        reg_nr,
        make,
        model,
        mileage,
        year,
        in_traffic,
        is_interesting,
        ai_score
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

    const statusPriority: Record<string, number> = { callback: 3, new: 2, no_answer: 1 }
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
  const leads = await getLeadsToCall(statusFilter === 'all' ? undefined : statusFilter)

  const newCount = leads.filter(l => l.status === 'new').length
  const callbackCount = leads.filter(l => l.status === 'callback').length
  const noAnswerCount = leads.filter(l => l.status === 'no_answer').length

  return (
    <div className="flex flex-col">
      <Header
        title="Att ringa"
        description={`${leads.length} leads väntar på samtal`}
      />

      <div className="flex-1 p-6">
        <ToCallList
          leads={leads}
          newCount={newCount}
          callbackCount={callbackCount}
          noAnswerCount={noAnswerCount}
          currentFilter={statusFilter}
        />
      </div>
    </div>
  )
}
