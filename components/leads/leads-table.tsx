'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { DeleteIconButton } from '@/components/ui/delete-icon-button'
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Car,
  MapPin,
  Clock,
  AlertCircle,
  Star,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'
import { toast } from 'sonner'
import { deleteLead, bulkDeleteLeads, restoreLeads } from '@/app/actions/leads'

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

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`/leads?${params.toString()}`)
  }

  const toggleSelection = useCallback((leadId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(leadId)) {
        newSet.delete(leadId)
      } else {
        newSet.add(leadId)
      }
      return newSet
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)))
    }
  }, [leads, selectedIds.size])

  const handleDeleteSingle = useCallback(async () => {
    if (!deleteLeadId) return

    const deletedId = deleteLeadId
    setIsDeleting(true)
    try {
      const result = await deleteLead(deletedId)
      if (result.success) {
        setDeleteLeadId(null)
        setSelectedIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(deletedId)
          return newSet
        })
        router.refresh()
        toast.success('Flyttad till papperskorgen', {
          action: {
            label: 'Ångra',
            onClick: async () => {
              const res = await restoreLeads([deletedId])
              if (res.success) {
                toast.success('Lead återställd')
                router.refresh()
              } else {
                toast.error('Kunde inte återställa')
              }
            }
          }
        })
      } else {
        toast.error(result.error || 'Kunde inte radera lead')
      }
    } catch {
      toast.error('Ett fel uppstod')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteLeadId, router])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return

    const deletedIds = Array.from(selectedIds)
    setIsDeleting(true)
    try {
      const result = await bulkDeleteLeads(deletedIds)
      if (result.success) {
        setShowBulkDeleteDialog(false)
        setSelectedIds(new Set())
        router.refresh()
        toast.success(`${result.deletedCount} leads flyttade till papperskorgen`, {
          action: {
            label: 'Ångra',
            onClick: async () => {
              const res = await restoreLeads(deletedIds)
              if (res.success) {
                toast.success(`${res.restoredCount} leads återställda`)
                router.refresh()
              } else {
                toast.error('Kunde inte återställa')
              }
            }
          }
        })
      } else {
        toast.error(result.error || 'Kunde inte radera leads')
      }
    } catch {
      toast.error('Ett fel uppstod')
    } finally {
      setIsDeleting(false)
    }
  }, [selectedIds, router])

  return (
    <div className="space-y-4">
      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="text-sm text-blue-700">
            {selectedIds.size} lead{selectedIds.size > 1 ? 's' : ''} markerade
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Avmarkera
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Radera {selectedIds.size}
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={leads.length > 0 && selectedIds.size === leads.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Välj alla"
                  />
                </TableHead>
                <TableHead className="w-[200px]">Kontakt</TableHead>
                <TableHead>Fordon</TableHead>
                <TableHead className="w-[120px]">Miltal</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[140px]">Senaste kontakt</TableHead>
                <TableHead className="w-[100px]"></TableHead>
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
                    className={cn(
                      "hover:bg-gray-50 cursor-pointer",
                      selectedIds.has(lead.id) && "bg-blue-50"
                    )}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                  >
                    {/* Checkbox */}
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleSelection(lead.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Välj ${lead.owner_info || 'lead'}`}
                      />
                    </TableCell>

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
                      <div className="flex items-center gap-1">
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
                        <DeleteIconButton
                          onClick={() => setDeleteLeadId(lead.id)}
                        />
                      </div>
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

      {/* Single Delete Dialog */}
      <DeleteConfirmDialog
        open={!!deleteLeadId}
        onOpenChange={(open) => !open && setDeleteLeadId(null)}
        count={1}
        onConfirm={handleDeleteSingle}
        isDeleting={isDeleting}
      />

      {/* Bulk Delete Dialog */}
      <DeleteConfirmDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        count={selectedIds.size}
        onConfirm={handleBulkDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}
