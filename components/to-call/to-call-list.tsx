'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { FilterPresets } from '@/components/ui/filter-presets'
import {
  Phone,
  Star,
  Upload,
  Trash2,
  Inbox,
  PhoneCall,
  Clock,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteLead, bulkDeleteLeads, restoreLeads } from '@/app/actions/leads'
import { toast } from 'sonner'

interface Vehicle {
  id: string
  reg_nr: string | null
  make: string | null
  model: string | null
  year: number | null
  fuel_type: string | null
  mileage: number | null
  color: string | null
  transmission: string | null
  horsepower: number | null
  in_traffic: boolean
  four_wheel_drive?: boolean
  engine_cc?: number | null
  is_interesting?: boolean
  ai_score?: number
  antal_agare: number | null
  skatt: number | null
  besiktning_till: string | null
  mileage_history: MileageHistoryEntry[] | null
  owner_history: OwnerHistoryEntry[] | unknown[] | null
  owner_vehicles: AddressVehicle[] | unknown[] | null
  address_vehicles: AddressVehicle[] | unknown[] | null
  owner_gender: string | null
  owner_type: string | null
  biluppgifter_fetched_at: string | null
}

interface CallLog {
  id: string
  called_at: string
  result: string
}

interface Lead {
  id: string
  phone: string | null
  owner_info: string | null
  location: string | null
  status: string
  source: string | null
  county: string | null
  owner_age: number | null
  owner_gender: string | null
  owner_type: string | null
  created_at: string
  vehicles: Vehicle[]
  call_logs: CallLog[]
}

interface ToCallListProps {
  leads: Lead[]
  newCount: number
  toCallCount: number
  callbackCount: number
  noAnswerCount: number
  currentFilter: string
}

export function ToCallList({ leads, newCount, toCallCount, callbackCount, noAnswerCount, currentFilter }: ToCallListProps) {
  const router = useRouter()
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const copyPhone = async (phone: string, e: React.MouseEvent) => {
    e.preventDefault()
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

  const filters = [
    { key: 'all', label: 'Alla', count: newCount + toCallCount + callbackCount + noAnswerCount, icon: Inbox },
    { key: 'new', label: 'Nya', count: newCount, icon: Star },
    { key: 'to_call', label: 'Att ringa', count: toCallCount, icon: PhoneCall },
    { key: 'callback', label: 'Ring tillbaka', count: callbackCount, icon: Phone },
    { key: 'no_answer', label: 'Inget svar', count: noAnswerCount, icon: Clock },
  ]

  const handleFilterChange = (filter: string) => {
    router.push(`/to-call?status=${filter}`)
  }

  const loadPresetFilters = (presetFilters: { [key: string]: string | string[] | boolean | number | null | undefined }) => {
    const params = new URLSearchParams()
    if (presetFilters.status && presetFilters.status !== 'all') {
      params.set('status', String(presetFilters.status))
    }
    router.push(`/to-call${params.toString() ? '?' + params.toString() : ''}`)
  }

  const currentFilters = {
    status: currentFilter
  }

  const handleDeleteClick = (lead: Lead, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLeadToDelete(lead)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return

    const deletedId = leadToDelete.id
    setIsDeleting(true)
    const result = await deleteLead(deletedId)
    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setLeadToDelete(null)

    if (result.success) {
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
      toast.error(result.error || 'Kunde inte ta bort lead')
    }
  }

  const handleBulkDeleteClick = () => {
    if (selectedLeads.size === 0) {
      toast.error('Välj minst en lead')
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  const handleBulkDeleteConfirm = async () => {
    const deletedIds = Array.from(selectedLeads)
    setIsDeleting(true)
    const result = await bulkDeleteLeads(deletedIds)
    setIsDeleting(false)
    setBulkDeleteDialogOpen(false)

    if (result.success) {
      setSelectedLeads(new Set())
      router.refresh()
      toast.success(`${deletedIds.length} leads flyttade till papperskorgen`, {
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
      toast.error(result.error || 'Kunde inte ta bort leads')
    }
  }

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead)
    setIsModalOpen(true)
  }

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
    vehicles: lead.vehicles as LeadVehicle[],
    call_logs: lead.call_logs,
  })

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map(filter => {
          const Icon = filter.icon
          const isActive = currentFilter === filter.key
          return (
            <Button
              key={filter.key}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange(filter.key)}
              className={cn(
                'gap-2',
                isActive && 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {filter.label}
              <Badge
                variant="secondary"
                className={cn(
                  'ml-1',
                  isActive ? 'bg-blue-500 text-white' : 'bg-gray-100'
                )}
              >
                {filter.count}
              </Badge>
            </Button>
          )
        })}

        <FilterPresets
          page="to-call"
          currentFilters={currentFilters as { [key: string]: string | string[] | boolean | number | null | undefined }}
          onLoadPreset={loadPresetFilters}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{newCount}</p>
                <p className="text-xs text-blue-600">Nya leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <PhoneCall className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{toCallCount}</p>
                <p className="text-xs text-green-600">Att ringa</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700">{callbackCount}</p>
                <p className="text-xs text-purple-600">Ring tillbaka</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-600 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-700">{noAnswerCount}</p>
                <p className="text-xs text-yellow-600">Inget svar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
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
        <DynamicTable
          data={leads}
          columns={LEAD_COLUMNS}
          columnGroups={LEAD_COLUMN_GROUPS}
          storageKey={STORAGE_KEYS.toCall}
          getItemId={(lead) => lead.id}
          onRowClick={handleRowClick}
          selectedIds={selectedLeads}
          onSelectionChange={setSelectedLeads}
          renderCell={(columnId, lead, index) => {
            const vehicle = lead.vehicles?.[0]
            // Custom actions for to-call page
            if (columnId === 'actions') {
              return (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" className="gap-1">
                      Ring
                      <Phone className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              )
            }
            return renderLeadCell({
              columnId,
              lead: toLeadData(lead),
              vehicle: vehicle as LeadVehicle | undefined,
              onRowClick: () => handleRowClick(lead),
              onCopyPhone: copyPhone,
              onDelete: (e) => handleDeleteClick(lead, e),
              copiedPhone,
            })
          }}
          rowClassName={(lead, index) => cn(
            index === 0 && 'bg-blue-50/50',
            lead.vehicles?.some((v: Vehicle) => v.is_interesting) && 'bg-yellow-50/50'
          )}
          renderSelectionBar={(count, clearSelection) => (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-gray-500"
              >
                <X className="h-4 w-4 mr-1" />
                Avmarkera
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDeleteClick}
                disabled={isDeleting}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Ta bort ({count})
              </Button>
            </div>
          )}
        />
      )}

      {/* Detail Modal */}
      <LeadDetailModal
        lead={selectedLead ? {
          id: selectedLead.id,
          phone: selectedLead.phone,
          owner_info: selectedLead.owner_info,
          location: selectedLead.location,
          status: selectedLead.status,
          source: selectedLead.source,
          county: selectedLead.county,
          owner_age: selectedLead.owner_age,
          owner_gender: selectedLead.owner_gender,
          owner_type: selectedLead.owner_type,
          created_at: selectedLead.created_at,
          vehicles: selectedLead.vehicles.map(v => ({
            id: v.id,
            reg_nr: v.reg_nr,
            make: v.make,
            model: v.model,
            year: v.year,
            fuel_type: v.fuel_type,
            mileage: v.mileage,
            color: v.color,
            transmission: v.transmission,
            horsepower: v.horsepower,
            in_traffic: v.in_traffic,
            four_wheel_drive: v.four_wheel_drive ?? false,
            engine_cc: v.engine_cc ?? null,
            antal_agare: v.antal_agare,
            skatt: v.skatt,
            besiktning_till: v.besiktning_till,
            mileage_history: v.mileage_history as { date: string; mileage_km: number; mileage_mil?: number; type?: string }[] | null,
            owner_history: v.owner_history as { date: string; name?: string; type: string; owner_class?: string; details?: string }[] | null,
            owner_vehicles: v.owner_vehicles as { regnr: string; description?: string; model?: string; color?: string; status?: string; mileage?: number; year?: number; ownership_time?: string }[] | null,
            address_vehicles: v.address_vehicles as { regnr: string; description?: string; model?: string; color?: string; status?: string; mileage?: number; year?: number; ownership_time?: string }[] | null,
            owner_gender: v.owner_gender,
            owner_type: v.owner_type,
            biluppgifter_fetched_at: v.biluppgifter_fetched_at,
          }))
        } : null}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onUpdate={() => router.refresh()}
        actions={selectedLead && (
          <Link href={`/leads/${selectedLead.id}`}>
            <Button className="gap-2 bg-green-600 hover:bg-green-700">
              <Phone className="h-4 w-4" />
              Gå till samtalssida
            </Button>
          </Link>
        )}
      />

      {/* Single Delete Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        count={1}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        details={leadToDelete && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{leadToDelete.phone || 'Ingen telefon'}</p>
            <p className="text-sm text-gray-600">{leadToDelete.owner_info || 'Okänd ägare'}</p>
          </div>
        )}
      />

      {/* Bulk Delete Dialog */}
      <DeleteConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        count={selectedLeads.size}
        onConfirm={handleBulkDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  )
}
