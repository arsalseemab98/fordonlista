import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { LeadsTable } from '@/components/leads/leads-table'
import { LeadsFilters } from '@/components/leads/leads-filters'
import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'

interface LeadsPageProps {
  searchParams: Promise<{
    status?: string
    search?: string
    make?: string
    minMileage?: string
    maxMileage?: string
    inTraffic?: string
    page?: string
  }>
}

async function getLeads(filters: {
  status?: string
  search?: string
  make?: string
  minMileage?: string
  maxMileage?: string
  inTraffic?: string
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

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams
  const { leads, totalCount, totalPages, currentPage } = await getLeads(params)
  const { makes } = await getFilterOptions()

  return (
    <div className="flex flex-col">
      <Header
        title="Leads"
        description={`${totalCount} kontakter i systemet`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Filters */}
        <LeadsFilters
          currentFilters={params}
          makes={makes}
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
