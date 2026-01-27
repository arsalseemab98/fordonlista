'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  Trash2,
  RotateCcw,
  Clock,
  Car,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { restoreLeads, permanentlyDeleteLeads } from '@/app/actions/leads'

interface Vehicle {
  id: string
  reg_nr?: string
  make?: string
  model?: string
  year?: number
}

interface Lead {
  id: string
  owner_info?: string
  phone?: string
  county?: string
  status: string
  deleted_at: string
  vehicles: Vehicle[]
}

interface TrashViewProps {
  leads: Lead[]
  totalCount: number
}

function getDaysRemaining(deletedAt: string): number {
  const deleted = new Date(deletedAt)
  const expiry = new Date(deleted)
  expiry.setDate(expiry.getDate() + 30)
  const now = new Date()
  const diff = expiry.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function TrashView({ leads, totalCount }: TrashViewProps) {
  const router = useRouter()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isRestoring, setIsRestoring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false)
  const [permanentDeleteIds, setPermanentDeleteIds] = useState<string[]>([])

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

  const handleRestore = useCallback(async (ids: string[]) => {
    setIsRestoring(true)
    try {
      const result = await restoreLeads(ids)
      if (result.success) {
        toast.success(`${result.restoredCount} lead${result.restoredCount !== 1 ? 's' : ''} återställda`)
        setSelectedIds(new Set())
        router.refresh()
      } else {
        toast.error(result.error || 'Kunde inte återställa')
      }
    } catch {
      toast.error('Ett fel uppstod')
    } finally {
      setIsRestoring(false)
    }
  }, [router])

  const handlePermanentDelete = useCallback(async () => {
    if (permanentDeleteIds.length === 0) return

    setIsDeleting(true)
    try {
      const result = await permanentlyDeleteLeads(permanentDeleteIds)
      if (result.success) {
        toast.success(`${result.deletedCount} lead${result.deletedCount !== 1 ? 's' : ''} permanent raderade`)
        setShowPermanentDeleteDialog(false)
        setPermanentDeleteIds([])
        setSelectedIds(new Set())
        router.refresh()
      } else {
        toast.error(result.error || 'Kunde inte radera')
      }
    } catch {
      toast.error('Ett fel uppstod')
    } finally {
      setIsDeleting(false)
    }
  }, [permanentDeleteIds, router])

  const openPermanentDeleteDialog = useCallback((ids: string[]) => {
    setPermanentDeleteIds(ids)
    setShowPermanentDeleteDialog(true)
  }, [])

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium">{totalCount} leads i papperskorgen</p>
                <p className="text-sm text-gray-500">Raderas automatiskt efter 30 dagar</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              variant="outline"
              size="sm"
              onClick={() => handleRestore(Array.from(selectedIds))}
              disabled={isRestoring}
              className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
            >
              <RotateCcw className="h-4 w-4" />
              {isRestoring ? 'Återställer...' : `Återställ ${selectedIds.size}`}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openPermanentDeleteDialog(Array.from(selectedIds))}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Radera permanent
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {leads.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Trash2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="font-medium">Papperskorgen är tom</p>
              <p className="text-sm mt-1">Raderade leads visas här i 30 dagar</p>
            </div>
          ) : (
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
                  <TableHead className="w-[100px]">Reg.nr</TableHead>
                  <TableHead>Ägare</TableHead>
                  <TableHead className="w-[100px]">Län</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Raderad</TableHead>
                  <TableHead className="w-[100px]">Dagar kvar</TableHead>
                  <TableHead className="w-[180px] text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const primaryVehicle = lead.vehicles?.[0]
                  const daysLeft = getDaysRemaining(lead.deleted_at)

                  return (
                    <TableRow
                      key={lead.id}
                      className={cn(
                        "hover:bg-gray-50",
                        selectedIds.has(lead.id) && "bg-blue-50"
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(lead.id)}
                          onCheckedChange={() => toggleSelection(lead.id)}
                          aria-label={`Välj ${lead.owner_info || 'lead'}`}
                        />
                      </TableCell>

                      <TableCell>
                        {primaryVehicle?.reg_nr ? (
                          <span className="font-mono text-xs font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                            {primaryVehicle.reg_nr}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div>
                          <p className="text-sm">{lead.owner_info || '-'}</p>
                          {primaryVehicle && (
                            <p className="text-xs text-gray-400">
                              {[primaryVehicle.make, primaryVehicle.model, primaryVehicle.year]
                                .filter(Boolean)
                                .join(' ')}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-gray-600">{lead.county || '-'}</span>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {lead.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {format(new Date(lead.deleted_at), 'yyyy-MM-dd', { locale: sv })}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs gap-1",
                            daysLeft <= 7
                              ? "bg-red-50 text-red-700 border-red-200"
                              : daysLeft <= 14
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-gray-50 text-gray-700 border-gray-200"
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {daysLeft} dagar
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore([lead.id])}
                            disabled={isRestoring}
                            className="gap-1 text-green-600 border-green-200 hover:bg-green-50 h-7 text-xs"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Återställ
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPermanentDeleteDialog([lead.id])}
                            className="gap-1 text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
                          >
                            <Trash2 className="h-3 w-3" />
                            Radera
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Permanent Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showPermanentDeleteDialog}
        onOpenChange={(open) => {
          setShowPermanentDeleteDialog(open)
          if (!open) setPermanentDeleteIds([])
        }}
        count={permanentDeleteIds.length}
        onConfirm={handlePermanentDelete}
        isDeleting={isDeleting}
        permanent
      />
    </div>
  )
}
