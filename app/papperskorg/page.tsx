import { createClient } from '@/lib/supabase/server'
import { TrashView } from '@/components/trash/trash-view'
import { cleanupOldDeletedLeads } from '@/app/actions/leads'

export const dynamic = 'force-dynamic'

export default async function PapperskorgPage() {
  const supabase = await createClient()

  // Auto-cleanup leads deleted more than 30 days ago
  await cleanupOldDeletedLeads()

  // Fetch soft-deleted leads
  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      id,
      owner_info,
      phone,
      county,
      status,
      deleted_at,
      vehicles (
        id,
        reg_nr,
        make,
        model,
        year
      )
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) {
    console.error('Error fetching deleted leads:', error)
  }

  const validLeads = (leads || []).filter(l => l.deleted_at !== null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Papperskorg</h1>
        <p className="text-sm text-gray-500 mt-1">
          Raderade leads lagras i 30 dagar innan de tas bort permanent
        </p>
      </div>

      <TrashView
        leads={validLeads}
        totalCount={validLeads.length}
      />
    </div>
  )
}
