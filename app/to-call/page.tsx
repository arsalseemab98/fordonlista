import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Phone,
  Car,
  MapPin,
  Clock,
  AlertTriangle,
  Star,
  ArrowRight,
  Upload
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'

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

async function getLeadsToCall() {
  const supabase = await createClient()

  // Get leads that need to be called:
  // 1. Status = 'new' (never contacted)
  // 2. Status = 'callback' (scheduled callback)
  // 3. Status = 'no_answer' (try again)
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
    .in('status', ['new', 'callback', 'no_answer'])
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

  return sorted
}

function formatMileage(mileage?: number): string {
  if (!mileage) return '-'
  return `${mileage.toLocaleString('sv-SE')} km`
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  new: { label: 'Ny', className: 'bg-blue-100 text-blue-700' },
  callback: { label: 'Ring tillbaka', className: 'bg-purple-100 text-purple-700' },
  no_answer: { label: 'Inget svar', className: 'bg-yellow-100 text-yellow-700' },
}

export default async function ToCallPage() {
  const leads = await getLeadsToCall()

  const newCount = leads.filter(l => l.status === 'new').length
  const callbackCount = leads.filter(l => l.status === 'callback').length
  const noAnswerCount = leads.filter(l => l.status === 'no_answer').length

  return (
    <div className="flex flex-col">
      <Header
        title="Att ringa"
        description={`${leads.length} leads väntar på samtal`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-700">{newCount}</p>
                  <p className="text-sm text-gray-500">Nya leads</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Star className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-purple-700">{callbackCount}</p>
                  <p className="text-sm text-gray-500">Ring tillbaka</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-yellow-700">{noAnswerCount}</p>
                  <p className="text-sm text-gray-500">Inget svar</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lead list */}
        {leads.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Phone className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-900">
                    Inga leads att ringa just nu!
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Importera fler leads eller vänta på nya att dyka upp
                  </p>
                </div>
                <Link href="/import">
                  <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Importera Excel
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {leads.map((lead, index) => {
              const primaryVehicle = lead.vehicles?.[0]
              const lastCall = lead.call_logs?.[0]
              const status = STATUS_STYLES[lead.status] || STATUS_STYLES.new
              const isInteresting = lead.vehicles?.some((v: Vehicle) => v.is_interesting)

              return (
                <Link key={lead.id} href={`/leads/${lead.id}`}>
                  <Card className={cn(
                    "hover:shadow-md transition-all cursor-pointer",
                    index === 0 && "ring-2 ring-blue-500 ring-offset-2",
                    isInteresting && "border-yellow-300 bg-yellow-50/50"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Priority number */}
                        <div className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold",
                          index === 0
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600"
                        )}>
                          {index + 1}
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {lead.phone ? (
                              <span className="font-medium text-lg">{lead.phone}</span>
                            ) : (
                              <span className="text-gray-400">Ingen telefon</span>
                            )}
                            <Badge className={status.className}>{status.label}</Badge>
                            {isInteresting && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {primaryVehicle && (
                              <span className="flex items-center gap-1">
                                <Car className="h-4 w-4" />
                                <span className="font-mono">{primaryVehicle.reg_nr}</span>
                                {primaryVehicle.make && ` - ${primaryVehicle.make}`}
                                {primaryVehicle.model && ` ${primaryVehicle.model}`}
                              </span>
                            )}
                            {lead.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {lead.location}
                              </span>
                            )}
                          </div>

                          {lastCall && (
                            <div className="mt-1 text-xs text-gray-400">
                              Senast ringd: {formatDistanceToNow(new Date(lastCall.called_at), {
                                addSuffix: true,
                                locale: sv
                              })} - {lastCall.result}
                            </div>
                          )}
                        </div>

                        {/* Vehicle stats */}
                        {primaryVehicle && (
                          <div className="hidden md:flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <p className="text-gray-400">Miltal</p>
                              <p className={cn(
                                "font-medium",
                                primaryVehicle.mileage && primaryVehicle.mileage > 200000
                                  ? "text-orange-600"
                                  : ""
                              )}>
                                {formatMileage(primaryVehicle.mileage)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-400">År</p>
                              <p className="font-medium">{primaryVehicle.year || '-'}</p>
                            </div>
                            {!primaryVehicle.in_traffic && (
                              <Badge variant="outline" className="text-orange-600 border-orange-200">
                                Avställd
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Action */}
                        <Button size="sm" className="shrink-0 gap-1">
                          Öppna
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
