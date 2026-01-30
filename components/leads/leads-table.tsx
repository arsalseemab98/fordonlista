'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { LeadDetailModal } from '@/components/shared/lead-detail-modal'
import { DynamicTable } from '@/components/shared/dynamic-table'
import { LEAD_COLUMNS, LEAD_COLUMN_GROUPS, STORAGE_KEYS } from '@/lib/table-columns'
import {
  renderLeadCell,
  type LeadData,
  type LeadVehicle,
} from '@/components/shared/lead-cell-renderers'
import {
  type MileageHistoryEntry,
  type OwnerHistoryEntry,
  type AddressVehicle,
} from '@/components/shared/vehicle-popovers'
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { deleteLead, bulkDeleteLeads, restoreLeads } from '@/app/actions/leads'

interface Vehicle {
  id: string
  reg_nr?: string | null
  chassis_nr?: string
  make?: string | null
  model?: string | null
  mileage?: number | null
  year?: number | null
  fuel_type?: string | null
  color?: string | null
  transmission?: string | null
  horsepower?: number | null
  in_traffic?: boolean
  four_wheel_drive?: boolean
  engine_cc?: number | null
  is_interesting?: boolean
  ai_score?: number
  antal_agare?: number | null
  skatt?: number | null
  besiktning_till?: string | null
  mileage_history?: MileageHistoryEntry[] | null
  owner_history?: OwnerHistoryEntry[] | null
  owner_vehicles?: AddressVehicle[] | null
  address_vehicles?: AddressVehicle[] | null
  owner_gender?: string | null
  owner_type?: string | null
  biluppgifter_fetched_at?: string | null
}

interface CallLog {
  id: string
  called_at: string
  result: string
  notes?: string
}

interface Lead {
  id: string
  phone?: string | null
  owner_info?: string | null
  location?: string | null
  status: string
  source?: string | null
  county?: string | null
  owner_age?: number | null
  owner_gender?: string | null
  owner_type?: string | null
  created_at: string
  updated_at: string
  bilprospekt_date?: string | null
  vehicles: Vehicle[]
  call_logs: CallLog[]
}

interface LeadsTableProps {
  leads: Lead[]
  totalPages: number
  currentPage: number
}

export function LeadsTable({ leads, totalPages, currentPage }: LeadsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`/leads?${params.toString()}`)
  }

  const copyPhone = async (phone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(phone)
      setCopiedPhone(phone)
      toast.success('Telefonnummer kopierat!')
      setTimeout(() => setCopiedPhone(null), 2000)
    } catch {
      toast.error('Kunde inte kopiera')
    }
  }

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead)
    setIsModalOpen(true)
  }

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

  // Convert Lead to LeadData for renderLeadCell
  const toLeadData = (lead: Lead): LeadData => ({
    id: lead.id,
    phone: lead.phone,
    owner_info: lead.owner_info,
    location: lead.location,
    status: lead.status,
    source: lead.source,
    county: lead.county,
    owner_age: lead.owner_age,
    owner_gender: lead.owner_gender,
    owner_type: lead.owner_type,
    created_at: lead.created_at,
    bilprospekt_date: lead.bilprospekt_date,
    vehicles: lead.vehicles as LeadVehicle[],
    call_logs: lead.call_logs,
  })

  return (
    <div className="space-y-4">
      <DynamicTable
        data={leads}
        columns={LEAD_COLUMNS}
        columnGroups={LEAD_COLUMN_GROUPS}
        storageKey={STORAGE_KEYS.leads}
        getItemId={(lead) => lead.id}
        onRowClick={handleRowClick}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        renderCell={(columnId, lead) => {
          const vehicle = lead.vehicles?.[0]
          return renderLeadCell({
            columnId,
            lead: toLeadData(lead),
            vehicle: vehicle as LeadVehicle | undefined,
            onRowClick: () => handleRowClick(lead),
            onCopyPhone: copyPhone,
            onDelete: (e) => {
              e.stopPropagation()
              setDeleteLeadId(lead.id)
            },
            copiedPhone,
          })
        }}
        renderSelectionBar={(count, clearSelection) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              Avmarkera
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Radera {count}
            </Button>
          </div>
        )}
        emptyState={
          <div className="py-12 text-center text-muted-foreground">
            Inga leads hittades
          </div>
        }
      />

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

      {/* Detail Modal */}
      <LeadDetailModal
        lead={selectedLead ? {
          id: selectedLead.id,
          phone: selectedLead.phone || null,
          owner_info: selectedLead.owner_info || null,
          location: selectedLead.location || null,
          status: selectedLead.status,
          source: selectedLead.source || null,
          county: selectedLead.county || null,
          owner_age: selectedLead.owner_age || null,
          owner_gender: selectedLead.owner_gender || null,
          owner_type: selectedLead.owner_type || null,
          created_at: selectedLead.created_at,
          vehicles: selectedLead.vehicles.map(v => ({
            id: v.id,
            reg_nr: v.reg_nr || null,
            make: v.make || null,
            model: v.model || null,
            year: v.year || null,
            fuel_type: v.fuel_type || null,
            mileage: v.mileage || null,
            color: v.color || null,
            transmission: v.transmission || null,
            horsepower: v.horsepower || null,
            in_traffic: v.in_traffic ?? true,
            four_wheel_drive: v.four_wheel_drive ?? false,
            engine_cc: v.engine_cc ?? null,
            antal_agare: v.antal_agare || null,
            skatt: v.skatt || null,
            besiktning_till: v.besiktning_till || null,
            mileage_history: v.mileage_history as { date: string; mileage_km: number; mileage_mil?: number; type?: string }[] | null,
            owner_history: v.owner_history as { date: string; name?: string; type: string; owner_class?: string; details?: string }[] | null,
            owner_vehicles: v.owner_vehicles as { regnr: string; description?: string; model?: string; color?: string; status?: string; mileage?: number; year?: number; ownership_time?: string }[] | null,
            address_vehicles: v.address_vehicles as { regnr: string; description?: string; model?: string; color?: string; status?: string; mileage?: number; year?: number; ownership_time?: string }[] | null,
            owner_gender: v.owner_gender || null,
            owner_type: v.owner_type || null,
            biluppgifter_fetched_at: v.biluppgifter_fetched_at || null,
          }))
        } : null}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onUpdate={() => router.refresh()}
        actions={selectedLead && (
          <Link href={`/leads/${selectedLead.id}`}>
            <Button className="gap-2">
              <Phone className="h-4 w-4" />
              Gå till lead
            </Button>
          </Link>
        )}
      />

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
