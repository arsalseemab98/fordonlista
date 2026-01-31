'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Building2,
  CheckCircle2,
  Phone,
  MapPin,
  Copy,
  Check,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { LeadDetailModal } from './lead-detail-modal'

interface MileageHistoryEntry {
  date: string
  mileage_km: number
  mileage_mil?: number
}

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
  antal_agare: number | null
  skatt: number | null
  besiktning_till: string | null
  mileage_history: MileageHistoryEntry[] | null
  owner_history: unknown[] | null
  owner_vehicles: unknown[] | null
  address_vehicles: unknown[] | null
  owner_gender: string | null
  owner_type: string | null
  biluppgifter_fetched_at: string | null
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
  letter_sent?: boolean | null
  sent_to_brev_at?: string | null
  sent_to_call_at?: string | null
  vehicles: Vehicle[]
}

interface Column {
  key: string
  label: string
  visible: boolean
}

interface LeadTableProps {
  leads: Lead[]
  selectedLeads: Set<string>
  onSelectionChange: (selected: Set<string>) => void
  columns?: Column[]
  onLeadClick?: (lead: Lead) => void
  renderActions?: (lead: Lead) => React.ReactNode
  emptyMessage?: string
}

const DEFAULT_COLUMNS: Column[] = [
  { key: 'reg_number', label: 'Reg.nr', visible: true },
  { key: 'vehicle', label: 'Fordon', visible: true },
  { key: 'owner', label: 'Ägare', visible: true },
  { key: 'location', label: 'Ort', visible: true },
  { key: 'phone', label: 'Telefon', visible: true },
  { key: 'mileage', label: 'Mil', visible: true },
  { key: 'year', label: 'År', visible: true },
  { key: 'status', label: 'Status', visible: true },
]

export function LeadTable({
  leads,
  selectedLeads,
  onSelectionChange,
  columns = DEFAULT_COLUMNS,
  onLeadClick,
  renderActions,
  emptyMessage = 'Inga leads att visa',
}: LeadTableProps) {
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const visibleColumns = columns.filter(c => c.visible)

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(leads.map(l => l.id)))
    }
  }

  const toggleSelect = (leadId: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    onSelectionChange(newSelected)
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
    if (onLeadClick) {
      onLeadClick(lead)
    } else {
      setSelectedLead(lead)
      setIsModalOpen(true)
    }
  }

  // Parse owner info to get name
  const parseOwnerName = (ownerInfo: string | null) => {
    if (!ownerInfo) return 'Okänd'
    return ownerInfo.split(', ')[0] || 'Okänd'
  }

  // Format mileage from km to mil
  const formatMileage = (mileageKm: number | null) => {
    if (!mileageKm) return '-'
    return Math.round(mileageKm / 10).toLocaleString()
  }

  // Check if vehicle has biluppgifter data
  const hasBiluppgifterData = (vehicle: Vehicle | undefined) => {
    if (!vehicle) return false
    return !!(vehicle.biluppgifter_fetched_at || vehicle.mileage_history || vehicle.owner_history)
  }

  // Get source badge
  const getSourceBadge = (source: string | null) => {
    switch (source) {
      case 'bilprospekt':
        return <Badge className="bg-purple-100 text-purple-700 text-xs">BP</Badge>
      case 'excel_import':
        return <Badge className="bg-blue-100 text-blue-700 text-xs">Excel</Badge>
      default:
        return null
    }
  }

  const renderCell = (lead: Lead, columnKey: string) => {
    const vehicle = lead.vehicles?.[0]
    const ownerGender = vehicle?.owner_gender || lead.owner_gender
    const ownerType = vehicle?.owner_type || lead.owner_type

    switch (columnKey) {
      case 'reg_number':
        return (
          <div className="flex items-center gap-1.5">
            {/* Gender/Type Icon with Tooltip */}
            <div className="relative group/gender">
              {ownerType === 'company' ? (
                <Building2 className="w-4 h-4 text-purple-500 cursor-help" />
              ) : ownerGender === 'M' ? (
                <span className="text-blue-500 font-bold text-sm cursor-help">♂</span>
              ) : ownerGender === 'K' ? (
                <span className="text-pink-500 font-bold text-sm cursor-help">♀</span>
              ) : (
                <span className="text-muted-foreground text-sm cursor-help">○</span>
              )}
              <div className="absolute left-0 top-full mt-1 hidden group-hover/gender:block z-50 bg-popover border rounded-md shadow-md px-2 py-1 text-xs whitespace-nowrap">
                <span className="font-medium">
                  {ownerType === 'company' ? 'Företag' : ownerGender === 'M' ? 'Man' : ownerGender === 'K' ? 'Kvinna' : 'Okänd'}:
                </span>{' '}
                {parseOwnerName(lead.owner_info)}
              </div>
            </div>
            {/* Reg Number */}
            <button
              className="font-mono text-sm font-medium text-blue-600 hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                handleRowClick(lead)
              }}
            >
              {vehicle?.reg_nr || '-'}
            </button>
            {/* Biluppgifter indicator */}
            {hasBiluppgifterData(vehicle) && (
              <CheckCircle2 className="w-3 h-3 text-green-600" />
            )}
          </div>
        )

      case 'vehicle':
        return vehicle ? (
          <span className="text-sm">
            {vehicle.make} {vehicle.model}
          </span>
        ) : '-'

      case 'owner':
        return (
          <span className="text-sm truncate max-w-[150px] block" title={lead.owner_info || ''}>
            {parseOwnerName(lead.owner_info)}
          </span>
        )

      case 'location':
        return lead.location ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-3 h-3" />
            {lead.location}
          </div>
        ) : '-'

      case 'phone':
        return lead.phone ? (
          <div className="flex items-center gap-1">
            <a
              href={`tel:${lead.phone}`}
              className="text-sm text-green-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {lead.phone}
            </a>
            <button
              onClick={(e) => copyPhone(lead.phone!, e)}
              className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              {copiedPhone === lead.phone ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )

      case 'mileage':
        // Show mileage with hover for history
        if (!vehicle?.mileage) return '-'
        const mileageHistory = vehicle.mileage_history
        return (
          <div className="relative group/mileage">
            <span className="text-sm cursor-help">{formatMileage(vehicle.mileage)}</span>
            {mileageHistory && mileageHistory.length > 0 && (
              <div className="absolute left-0 top-full mt-1 hidden group-hover/mileage:block z-50 bg-popover border rounded-md shadow-md p-2 text-xs min-w-[180px]">
                <div className="font-medium mb-1">Mätarhistorik</div>
                {mileageHistory.slice(0, 5).map((m, i) => {
                  const mil = m.mileage_mil || Math.round(m.mileage_km / 10)
                  return (
                    <div key={i} className="flex justify-between py-0.5">
                      <span className="text-muted-foreground">{m.date}</span>
                      <span>{mil.toLocaleString()} mil</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )

      case 'year':
        return vehicle?.year ? (
          <span className="text-sm">{vehicle.year}</span>
        ) : '-'

      case 'status':
        return (
          <div className="flex items-center gap-1">
            {getSourceBadge(lead.source)}
            {lead.letter_sent && (
              <Badge className="bg-green-100 text-green-700 text-xs">Brev</Badge>
            )}
          </div>
        )

      default:
        return null
    }
  }

  if (leads.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-10">
              <Checkbox
                checked={selectedLeads.size === leads.length && leads.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            {visibleColumns.map(col => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
            {renderActions && <TableHead className="w-20">Åtgärd</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map(lead => (
            <TableRow
              key={lead.id}
              className={cn(
                'cursor-pointer hover:bg-muted/50 transition-colors',
                selectedLeads.has(lead.id) && 'bg-blue-50'
              )}
              onClick={() => handleRowClick(lead)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedLeads.has(lead.id)}
                  onCheckedChange={() => toggleSelect(lead.id)}
                />
              </TableCell>
              {visibleColumns.map(col => (
                <TableCell key={col.key}>
                  {renderCell(lead, col.key)}
                </TableCell>
              ))}
              {renderActions && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {renderActions(lead)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
      />
    </>
  )
}
