'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  GenderTypeIcon,
  MileageWithHistory,
  OwnerHistoryPopover,
  AddressVehiclesPopover,
  VehicleInfoPopover,
  type MileageHistoryEntry,
  type OwnerHistoryEntry,
  type AddressVehicle,
} from '@/components/shared/vehicle-popovers'
import {
  Phone,
  MapPin,
  Clock,
  Star,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  Trash2,
  Send,
  PhoneCall,
  FileText,
  MailCheck,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'

// Types for leads and vehicles
export interface LeadVehicle {
  id: string
  reg_nr?: string | null
  make?: string | null
  model?: string | null
  year?: number | null
  fuel_type?: string | null
  mileage?: number | null
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
  // Extended biluppgifter fields
  valuation_company?: number | null
  valuation_private?: number | null
  senaste_avstallning?: string | null
  senaste_pastallning?: string | null
  senaste_agarbyte?: string | null
  antal_foretagsannonser?: number | null
  antal_privatannonser?: number | null
}

export interface LeadData {
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
  bilprospekt_date?: string | null
  vehicles?: LeadVehicle[]
  call_logs?: { id: string; called_at: string; result: string }[]
  // Extended historik fields
  prospect_type?: string | null
  letter_sent?: boolean | null
  letter_sent_date?: string | null
  sent_to_call_at?: string | null
  sent_to_brev_at?: string | null
  data_period_start?: string | null
}

// Status styles mapping
export const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  new: { label: 'Ny', className: 'bg-blue-100 text-blue-700' },
  pending_review: { label: 'Granskas', className: 'bg-yellow-100 text-yellow-700' },
  to_call: { label: 'Att ringa', className: 'bg-green-100 text-green-700' },
  contacted: { label: 'Kontaktad', className: 'bg-gray-100 text-gray-700' },
  interested: { label: 'Intresserad', className: 'bg-green-100 text-green-700' },
  not_interested: { label: 'Ej intresserad', className: 'bg-red-100 text-red-700' },
  no_answer: { label: 'Inget svar', className: 'bg-yellow-100 text-yellow-700' },
  callback: { label: 'Ring tillbaka', className: 'bg-purple-100 text-purple-700' },
  booked: { label: 'Bokad', className: 'bg-emerald-100 text-emerald-700' },
  bought: { label: 'Köpt', className: 'bg-cyan-100 text-cyan-700' },
  do_not_call: { label: 'Ring ej', className: 'bg-red-100 text-red-700' },
  called: { label: 'Ringd', className: 'bg-green-100 text-green-700' },
  completed: { label: 'Avslutad', className: 'bg-gray-100 text-gray-600' },
}

// Helper functions
export function parseOwnerName(ownerInfo: string | null | undefined): string {
  if (!ownerInfo) return 'Okänd'
  return ownerInfo.split(', ')[0] || 'Okänd'
}

export function hasBiluppgifterData(vehicle: LeadVehicle | undefined): boolean {
  if (!vehicle) return false
  return !!(vehicle.biluppgifter_fetched_at || vehicle.mileage_history || vehicle.owner_history)
}

export function getSourceBadge(source: string | null | undefined) {
  switch (source) {
    case 'bilprospekt':
      return <Badge className="bg-purple-100 text-purple-700 text-xs">BP</Badge>
    case 'excel_import':
      return <Badge className="bg-blue-100 text-blue-700 text-xs">Excel</Badge>
    default:
      return null
  }
}

export function getFuelBadgeColor(fuel: string | null | undefined): string {
  if (!fuel) return 'bg-gray-100 text-gray-600'
  const fuelUpper = fuel.toUpperCase()
  if (fuelUpper.includes('EL') && !fuelUpper.includes('HYBRID')) return 'bg-green-100 text-green-800'
  if (fuelUpper.includes('DIESEL')) return 'bg-gray-200 text-gray-800'
  if (fuelUpper.includes('BENSIN')) return 'bg-amber-100 text-amber-800'
  if (fuelUpper.includes('HYBRID')) return 'bg-blue-100 text-blue-800'
  return 'bg-gray-100 text-gray-600'
}

export function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('sv-SE', { year: '2-digit', month: '2-digit', day: '2-digit' })
  } catch {
    return '-'
  }
}

export function formatValuation(value: number | null | undefined): string {
  if (!value) return '-'
  return `${(value / 1000).toFixed(0)}k`
}

interface RenderLeadCellProps {
  columnId: string
  lead: LeadData
  vehicle?: LeadVehicle
  // Optional callbacks
  onRowClick?: () => void
  onCopyPhone?: (phone: string, e: React.MouseEvent) => void
  onDelete?: (e: React.MouseEvent) => void
  copiedPhone?: string | null
}

/**
 * Render a cell for lead tables based on column ID
 */
export function renderLeadCell({
  columnId,
  lead,
  vehicle,
  onRowClick,
  onCopyPhone,
  onDelete,
  copiedPhone,
}: RenderLeadCellProps): React.ReactNode {
  const ownerGender = vehicle?.owner_gender || lead.owner_gender
  const ownerType = vehicle?.owner_type || lead.owner_type
  const lastCall = lead.call_logs?.[0]
  const status = STATUS_STYLES[lead.status] || STATUS_STYLES.new

  switch (columnId) {
    case 'reg_number':
      return (
        <div className="flex items-center gap-1.5">
          <GenderTypeIcon
            ownerType={ownerType}
            ownerGender={ownerGender}
            ownerName={parseOwnerName(lead.owner_info)}
          />
          <button
            className="font-mono text-sm font-medium text-blue-600 hover:underline"
            onClick={(e) => {
              e.stopPropagation()
              onRowClick?.()
            }}
          >
            {vehicle?.reg_nr || '-'}
          </button>
          {hasBiluppgifterData(vehicle) && (
            <CheckCircle2 className="w-3 h-3 text-green-600" />
          )}
          {vehicle?.is_interesting && (
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          )}
        </div>
      )

    case 'brand':
      return <span className="font-medium">{vehicle?.make || '-'}</span>

    case 'model':
      return vehicle?.model || '-'

    case 'car_year':
      return vehicle?.year || '-'

    case 'fuel':
      return vehicle?.fuel_type ? (
        <Badge variant="secondary" className={getFuelBadgeColor(vehicle.fuel_type)}>
          {vehicle.fuel_type}
        </Badge>
      ) : '-'

    case 'mileage':
      return (
        <MileageWithHistory
          mileageKm={vehicle?.mileage}
          mileageHistory={vehicle?.mileage_history}
        />
      )

    case 'color':
      return vehicle?.color || '-'

    case 'kaross':
      return '-' // Not typically in lead data

    case 'transmission':
      return vehicle?.transmission ? (
        <Badge variant="outline" className={vehicle.transmission === 'Automat' ? 'bg-purple-50' : ''}>
          {vehicle.transmission === 'Automat' ? 'A' : 'M'}
        </Badge>
      ) : '-'

    case 'horsepower':
      return vehicle?.horsepower || '-'

    case 'engine_cc':
      return vehicle?.engine_cc || '-'

    case 'four_wheel_drive':
      return vehicle?.four_wheel_drive ? (
        <Badge variant="outline" className="bg-blue-50 text-blue-800">Ja</Badge>
      ) : 'Nej'

    case 'in_traffic':
      return vehicle?.in_traffic !== undefined ? (
        vehicle.in_traffic ? (
          <Badge variant="outline" className="bg-green-50 text-green-800 text-xs">Ja</Badge>
        ) : (
          <Badge variant="outline" className="bg-red-50 text-red-800 text-xs">Nej</Badge>
        )
      ) : '-'

    case 'owner_name':
      return (
        <span className="text-sm truncate max-w-[150px] block" title={lead.owner_info || ''}>
          {parseOwnerName(lead.owner_info)}
        </span>
      )

    case 'owner_age':
      return lead.owner_age ? `${lead.owner_age} år` : '-'

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
          {onCopyPhone && (
            <button
              onClick={(e) => onCopyPhone(lead.phone!, e)}
              className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              {copiedPhone === lead.phone ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">-</span>
      )

    case 'location':
      return lead.location ? (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {lead.location}
        </div>
      ) : '-'

    case 'county':
      return lead.county || '-'

    case 'possession':
      // Would need date_acquired to calculate, typically from bilprospekt data
      return '-'

    case 'antal_agare':
      return vehicle?.antal_agare ? (
        <Badge variant="outline">{vehicle.antal_agare}</Badge>
      ) : '-'

    case 'skatt':
      return vehicle?.skatt ? `${vehicle.skatt.toLocaleString()} kr` : '-'

    case 'besiktning_till':
      if (!vehicle?.besiktning_till) return '-'
      const isExpired = new Date(vehicle.besiktning_till) < new Date()
      return (
        <Badge variant="outline" className={isExpired ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}>
          {vehicle.besiktning_till}
        </Badge>
      )

    case 'owner_history':
      return <OwnerHistoryPopover ownerHistory={vehicle?.owner_history} />

    case 'address_vehicles':
      return (
        <AddressVehiclesPopover
          addressVehicles={vehicle?.address_vehicles}
          ownerAddress={lead.location || undefined}
        />
      )

    case 'mileage_history':
      // This is shown as a popover, but mileage column already has hover
      return vehicle?.mileage_history && vehicle.mileage_history.length > 0
        ? `${vehicle.mileage_history.length} poster`
        : '-'

    case 'status':
      return (
        <div className="flex items-center gap-1">
          {getSourceBadge(lead.source)}
          <Badge className={cn("font-medium text-xs", status.className)}>
            {status.label}
          </Badge>
        </div>
      )

    case 'source':
      return getSourceBadge(lead.source) || '-'

    case 'last_contact':
      return lastCall ? (
        <div className="text-xs text-muted-foreground">
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
        <span className="text-xs text-muted-foreground">Aldrig kontaktad</span>
      )

    case 'created_at':
      return (
        <span className="text-xs text-muted-foreground">
          {new Date(lead.created_at).toLocaleDateString('sv-SE')}
        </span>
      )

    case 'valuation_company':
      return <span className="text-sm text-gray-600">{formatValuation(vehicle?.valuation_company)}</span>

    case 'valuation_private':
      return <span className="text-sm text-gray-600">{formatValuation(vehicle?.valuation_private)}</span>

    case 'senaste_avstallning':
      return <span className="text-sm text-gray-600">{formatShortDate(vehicle?.senaste_avstallning)}</span>

    case 'senaste_pastallning':
      return <span className="text-sm text-gray-600">{formatShortDate(vehicle?.senaste_pastallning)}</span>

    case 'senaste_agarbyte':
      return <span className="text-sm text-gray-600">{formatShortDate(vehicle?.senaste_agarbyte)}</span>

    case 'antal_foretagsannonser':
      return <span className="text-sm text-gray-600">{vehicle?.antal_foretagsannonser ?? '-'}</span>

    case 'antal_privatannonser':
      return <span className="text-sm text-gray-600">{vehicle?.antal_privatannonser ?? '-'}</span>

    case 'prospekt_type':
      return lead.prospect_type ? (
        <Badge variant="outline" className="text-xs">
          {lead.prospect_type}
        </Badge>
      ) : <span className="text-gray-400 text-sm">-</span>

    case 'activity':
      const callCount = lead.call_logs?.length || 0
      return (
        <div className="flex flex-wrap items-center gap-1">
          {lead.sent_to_call_at && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    <Send className="h-3 w-3" />
                    Ring
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Till ringlistan {formatShortDate(lead.sent_to_call_at)}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {callCount > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200 text-xs">
                    <PhoneCall className="h-3 w-3" />
                    {callCount}x
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Ringd {callCount} gånger</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {lead.sent_to_brev_at && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-700 border-orange-200 text-xs">
                    <FileText className="h-3 w-3" />
                    Brev
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Till brevlistan {formatShortDate(lead.sent_to_brev_at)}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {lead.letter_sent && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200 text-xs">
                    <MailCheck className="h-3 w-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Brev skickat {lead.letter_sent_date ? formatShortDate(lead.letter_sent_date) : ''}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )

    case 'bp_date':
      return lead.bilprospekt_date ? (
        <span className="text-sm text-green-700 font-medium">
          {new Date(lead.bilprospekt_date).toLocaleDateString('sv-SE')}
        </span>
      ) : <span className="text-sm text-gray-400">-</span>

    case 'data_date':
      return <span className="text-sm text-gray-600">{formatShortDate(lead.data_period_start)}</span>

    case 'actions':
      return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {vehicle && (
            <VehicleInfoPopover
              vehicle={{
                id: vehicle.id,
                reg_nr: vehicle.reg_nr,
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                mileage: vehicle.mileage,
                fuel_type: vehicle.fuel_type,
                color: vehicle.color,
                transmission: vehicle.transmission,
                horsepower: vehicle.horsepower,
                in_traffic: vehicle.in_traffic,
                four_wheel_drive: vehicle.four_wheel_drive,
                engine_cc: vehicle.engine_cc,
                antal_agare: vehicle.antal_agare,
                skatt: vehicle.skatt,
                besiktning_till: vehicle.besiktning_till,
                mileage_history: vehicle.mileage_history,
                owner_history: vehicle.owner_history,
                address_vehicles: vehicle.address_vehicles,
                owner_gender: vehicle.owner_gender,
                owner_type: vehicle.owner_type,
              }}
              owner={{
                owner_info: lead.owner_info,
                location: lead.location,
                county: lead.county,
                owner_age: lead.owner_age,
              }}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onRowClick}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )

    default:
      return '-'
  }
}

// Convenience component for rendering a cell
interface LeadCellProps extends RenderLeadCellProps {
  className?: string
}

export function LeadCell({ className, ...props }: LeadCellProps) {
  return (
    <div className={className}>
      {renderLeadCell(props)}
    </div>
  )
}
