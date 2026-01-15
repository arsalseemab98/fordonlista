import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { LetterList } from '@/components/letters/letter-list'

interface Lead {
  id: string
  owner_info: string | null
  location: string | null
  phone: string | null
  letter_sent: boolean | null
  letter_sent_date: string | null
  vehicles: Array<{
    id: string
    reg_nr: string | null
    make: string | null
    model: string | null
    year: number | null
  }>
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
      vehicles (
        id,
        reg_nr,
        make,
        model,
        year
      )
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filter === 'no_phone') {
    query = query.or('phone.is.null,phone.eq.')
  } else if (filter === 'not_sent') {
    query = query.or('letter_sent.is.null,letter_sent.eq.false')
  } else if (filter === 'sent') {
    query = query.eq('letter_sent', true)
  }

  const { data, error, count } = await query.limit(200)

  if (error) {
    console.error('Error fetching leads for letters:', error)
    return { leads: [], counts: { total: 0, noPhone: 0, notSent: 0, sent: 0 } }
  }

  // Get counts
  const [
    { count: totalCount },
    { count: noPhoneCount },
    { count: notSentCount },
    { count: sentCount }
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).or('phone.is.null,phone.eq.'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).or('letter_sent.is.null,letter_sent.eq.false'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('letter_sent', true)
  ])

  return {
    leads: (data || []) as Lead[],
    counts: {
      total: totalCount || 0,
      noPhone: noPhoneCount || 0,
      notSent: notSentCount || 0,
      sent: sentCount || 0
    }
  }
}

export default async function BrevPage({ searchParams }: BrevPageProps) {
  const params = await searchParams
  const filter = params.filter || 'not_sent'
  const { leads, counts } = await getLeadsForLetters(filter)

  return (
    <div className="flex flex-col">
      <Header
        title="Brevutskick"
        description="Hantera och exportera leads för brevutskick"
      />

      <div className="flex-1 p-6">
        <LetterList
          leads={leads}
          counts={counts}
          currentFilter={filter}
        />
      </div>
    </div>
  )
}
