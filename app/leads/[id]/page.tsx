import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LeadDetail } from '@/components/leads/lead-detail'

interface LeadPageProps {
  params: Promise<{ id: string }>
}

async function getLead(id: string) {
  const supabase = await createClient()

  const { data: lead, error } = await supabase
    .from('leads')
    .select(`
      *,
      vehicles (*),
      call_logs (*)
    `)
    .eq('id', id)
    .single()

  if (error || !lead) {
    return null
  }

  return lead
}

export default async function LeadPage({ params }: LeadPageProps) {
  const { id } = await params
  const lead = await getLead(id)

  if (!lead) {
    notFound()
  }

  const primaryVehicle = lead.vehicles?.[0]
  const title = primaryVehicle?.reg_nr
    ? `${primaryVehicle.reg_nr} - ${primaryVehicle.make || ''} ${primaryVehicle.model || ''}`
    : lead.phone || 'Lead'

  return (
    <div className="flex flex-col">
      <Header
        title={title}
        description={lead.owner_info || lead.location || 'Lead detaljer'}
      />

      <div className="flex-1 p-6">
        <LeadDetail lead={lead} />
      </div>
    </div>
  )
}
