'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Car,
  MapPin,
  Clock,
  AlertCircle,
  Star,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'

interface Vehicle {
  id: string
  reg_nr?: string
  chassis_nr?: string
  make?: string
  model?: string
  mileage?: number
  year?: number
  fuel_type?: string
  in_traffic?: boolean
  is_interesting?: boolean
  ai_score?: number
}

interface CallLog {
  id: string
  called_at: string
  result: string
  notes?: string
}

interface Lead {
  id: string
  phone?: string
  owner_info?: string
  location?: string
  status: string
  source?: string
  created_at: string
  updated_at: string
  vehicles: Vehicle[]
  call_logs: CallLog[]
}

interface LeadsTableProps {
  leads: Lead[]
  totalPages: number
  currentPage: number
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  new: { label: 'Ny', className: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'Kontaktad', className: 'bg-gray-100 text-gray-700' },
  interested: { label: 'Intresserad', className: 'bg-green-100 text-green-700' },
  not_interested: { label: 'Ej intresserad', className: 'bg-red-100 text-red-700' },
  no_answer: { label: 'Inget svar', className: 'bg-yellow-100 text-yellow-700' },
  callback: { label: 'Ring tillbaka', className: 'bg-purple-100 text-purple-700' },
  booked: { label: 'Bokad', className: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Avslutad', className: 'bg-gray-100 text-gray-600' },
}

function formatMileage(mileage?: number): string {
  if (!mileage) return '-'
  return `${mileage.toLocaleString('sv-SE')} km`
}

export function LeadsTable({ leads, totalPages, currentPage }: LeadsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`/leads?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[200px]">Kontakt</TableHead>
                <TableHead>Fordon</TableHead>
                <TableHead className="w-[120px]">Miltal</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[140px]">Senaste kontakt</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const primaryVehicle = lead.vehicles?.[0]
                const lastCall = lead.call_logs?.[0]
                const status = STATUS_STYLES[lead.status] || STATUS_STYLES.new

                return (
                  <TableRow
                    key={lead.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    {/* Contact info */}
                    <TableCell>
                      <div className="space-y-1">
                        {lead.phone ? (
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            {lead.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Ingen telefon</span>
                        )}
                        {lead.owner_info && (
                          <p className="text-xs text-gray-500 truncate max-w-[180px]">
                            {lead.owner_info}
                          </p>
                        )}
                        {lead.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin className="h-3 w-3" />
                            {lead.location}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Vehicle info */}
                    <TableCell>
                      {primaryVehicle ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium bg-gray-100 px-2 py-0.5 rounded">
                              {primaryVehicle.reg_nr || 'Saknar reg.nr'}
                            </span>
                            {primaryVehicle.is_interesting && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                            {!primaryVehicle.in_traffic && (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                                Avställd
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {[primaryVehicle.make, primaryVehicle.model, primaryVehicle.year]
                              .filter(Boolean)
                              .join(' ') || '-'}
                          </p>
                          {lead.vehicles.length > 1 && (
                            <span className="text-xs text-blue-600">
                              +{lead.vehicles.length - 1} fler fordon
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Inget fordon</span>
                      )}
                    </TableCell>

                    {/* Mileage */}
                    <TableCell>
                      <span className={cn(
                        "text-sm",
                        primaryVehicle?.mileage && primaryVehicle.mileage > 200000
                          ? "text-orange-600"
                          : "text-gray-700"
                      )}>
                        {formatMileage(primaryVehicle?.mileage)}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge className={cn("font-medium", status.className)}>
                        {status.label}
                      </Badge>
                    </TableCell>

                    {/* Last contact */}
                    <TableCell>
                      {lastCall ? (
                        <div className="text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(lastCall.called_at), {
                              addSuffix: true,
                              locale: sv
                            })}
                          </div>
                          <span className="text-gray-400">{lastCall.result}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Aldrig kontaktad</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/leads/${lead.id}`)
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Sida {currentPage} av {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Föregående
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Nästa
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
