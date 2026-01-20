import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { LeadsTable } from '@/components/leads/leads-table'
import { LeadsFilters } from '@/components/leads/leads-filters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CheckCircle, XCircle, Car, Phone, TrendingUp } from 'lucide-react'

// Revalidate every 30 seconds for better performance
export const revalidate = 30

interface LeadsPageProps {
  searchParams: Promise<{
    status?: string
    search?: string
    make?: string
    minMileage?: string
    maxMileage?: string
    inTraffic?: string
    completionReason?: string
    page?: string
  }>
}

// Completion reason labels for display
const COMPLETION_REASON_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  sold_to_us: { label: 'Vi köpte', icon: '✅', color: 'text-green-600 bg-green-50' },
  sold_to_others: { label: 'Sålde till annan', icon: '🚗', color: 'text-orange-600 bg-orange-50' },
  not_interested: { label: 'Ej intresserad', icon: '❌', color: 'text-red-600 bg-red-50' },
  wrong_number: { label: 'Fel nummer', icon: '📵', color: 'text-gray-600 bg-gray-50' },
  no_car: { label: 'Har ej bil', icon: '🚫', color: 'text-gray-600 bg-gray-50' },
  too_expensive: { label: 'För dyrt', icon: '💰', color: 'text-yellow-600 bg-yellow-50' },
  changed_mind: { label: 'Ångrat sig', icon: '🔄', color: 'text-purple-600 bg-purple-50' },
}

async function getLeads(filters: {
  status?: string
  search?: string
  make?: string
  minMileage?: string
  maxMileage?: string
  inTraffic?: string
  completionReason?: string
  page?: string
}) {
  const supabase = await createClient()
  const page = parseInt(filters.page || '1')
  const pageSize = 25
  const offset = (page - 1) * pageSize

  // Start building query
  let query = supabase
    .from('leads')
    .select(`
      *,
      vehicles (
        id,
        reg_nr,
        chassis_nr,
        make,
        model,
        mileage,
        year,
        fuel_type,
        in_traffic,
        is_interesting,
        ai_score
      ),
      call_logs (
        id,
        called_at,
        result,
        notes
      )
    `, { count: 'exact' })

  // Apply filters
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  } else {
    // By default, exclude pending_review (playground only) and prospekt_archive
    query = query.neq('status', 'pending_review').neq('status', 'prospekt_archive')
  }

  // Filter by completion reason
  if (filters.completionReason && filters.completionReason !== 'all') {
    query = query.eq('completion_reason', filters.completionReason)
  }

  if (filters.search) {
    query = query.or(`phone.ilike.%${filters.search}%,owner_info.ilike.%${filters.search}%,location.ilike.%${filters.search}%`)
  }

  // Order and paginate
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const { data: leads, count, error } = await query

  if (error) {
    console.error('Error fetching leads:', error)
    return { leads: [], totalCount: 0, totalPages: 0 }
  }

  // Filter by vehicle properties (make, mileage, in_traffic)
  let filteredLeads = leads || []

  if (filters.make) {
    filteredLeads = filteredLeads.filter(lead =>
      lead.vehicles?.some((v: { make?: string }) =>
        v.make?.toLowerCase().includes(filters.make!.toLowerCase())
      )
    )
  }

  if (filters.minMileage) {
    const min = parseInt(filters.minMileage)
    filteredLeads = filteredLeads.filter(lead =>
      lead.vehicles?.some((v: { mileage?: number }) =>
        v.mileage && v.mileage >= min
      )
    )
  }

  if (filters.maxMileage) {
    const max = parseInt(filters.maxMileage)
    filteredLeads = filteredLeads.filter(lead =>
      lead.vehicles?.some((v: { mileage?: number }) =>
        v.mileage && v.mileage <= max
      )
    )
  }

  if (filters.inTraffic === 'true') {
    filteredLeads = filteredLeads.filter(lead =>
      lead.vehicles?.some((v: { in_traffic?: boolean }) => v.in_traffic === true)
    )
  } else if (filters.inTraffic === 'false') {
    filteredLeads = filteredLeads.filter(lead =>
      lead.vehicles?.some((v: { in_traffic?: boolean }) => v.in_traffic === false)
    )
  }

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  return { leads: filteredLeads, totalCount, totalPages, currentPage: page }
}

async function getFilterOptions() {
  const supabase = await createClient()

  // Get unique makes
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('make')
    .not('make', 'is', null)

  const makes = [...new Set(vehicles?.map(v => v.make).filter(Boolean))] as string[]

  return { makes: makes.sort() }
}

// Get completion statistics for completed leads
async function getCompletionStats() {
  const supabase = await createClient()

  const { data: completedLeads } = await supabase
    .from('leads')
    .select('completion_reason')
    .eq('status', 'completed')

  if (!completedLeads) return { total: 0, byReason: {} }

  const byReason: Record<string, number> = {}
  for (const lead of completedLeads) {
    const reason = lead.completion_reason || 'unknown'
    byReason[reason] = (byReason[reason] || 0) + 1
  }

  return {
    total: completedLeads.length,
    byReason
  }
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams
  const { leads, totalCount, totalPages, currentPage } = await getLeads(params)
  const { makes } = await getFilterOptions()

  // Only fetch completion stats if viewing completed leads
  const showCompletionStats = params.status === 'completed'
  const completionStats = showCompletionStats ? await getCompletionStats() : null

  return (
    <div className="flex flex-col">
      <Header
        title="Leads"
        description={`${totalCount} kontakter i systemet`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Completion Stats - shown when viewing completed leads */}
        {showCompletionStats && completionStats && completionStats.total > 0 && (
          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-gray-600" />
                Statistik för avslutade leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {Object.entries(completionStats.byReason).map(([reason, count]) => {
                  const info = COMPLETION_REASON_LABELS[reason] || {
                    label: reason,
                    icon: '❓',
                    color: 'text-gray-600 bg-gray-50'
                  }
                  const percentage = completionStats.total > 0
                    ? Math.round((count / completionStats.total) * 100)
                    : 0

                  return (
                    <div
                      key={reason}
                      className={`p-3 rounded-lg ${info.color} text-center`}
                    >
                      <div className="text-2xl mb-1">{info.icon}</div>
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-xs font-medium">{info.label}</div>
                      <div className="text-xs opacity-75">{percentage}%</div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-sm">
                <span className="text-gray-600">Totalt avslutade: <strong>{completionStats.total}</strong></span>
                {completionStats.byReason['sold_to_us'] && (
                  <span className="text-green-600 font-medium">
                    ✅ Konverteringsgrad: {Math.round((completionStats.byReason['sold_to_us'] / completionStats.total) * 100)}%
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <LeadsFilters
          currentFilters={params}
          makes={makes}
          showCompletionReasonFilter={showCompletionStats}
        />

        {/* Results */}
        {leads.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                  <Users className="h-7 w-7 text-gray-400" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">Inga leads hittades</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {Object.keys(params).length > 0
                      ? 'Prova att ändra dina filter'
                      : 'Importera en Excel-fil för att komma igång'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <LeadsTable
            leads={leads}
            totalPages={totalPages}
            currentPage={currentPage || 1}
          />
        )}
      </div>
    </div>
  )
}
