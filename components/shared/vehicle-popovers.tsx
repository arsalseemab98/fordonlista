'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Car,
  MapPin,
  Users,
  History,
  Calendar,
  TrendingDown,
  Info,
  Phone,
  Building2,
  User,
  Gauge,
  Palette,
  Settings2,
  Fuel,
} from 'lucide-react'

// ============ Types ============

export interface MileageHistoryEntry {
  date: string
  mileage_km: number
  mileage_mil?: number
  type?: string
}

export interface OwnerHistoryEntry {
  date: string
  name?: string
  type: string
  owner_class?: string
  details?: string
}

export interface AddressVehicle {
  regnr: string
  description?: string
  model?: string
  color?: string
  status?: string
  mileage?: number
  year?: number
  ownership_time?: string
}

export interface VehicleInfo {
  id: string
  reg_nr?: string | null
  make?: string | null
  model?: string | null
  year?: number | null
  mileage?: number | null
  fuel_type?: string | null
  color?: string | null
  transmission?: string | null
  horsepower?: number | null
  in_traffic?: boolean
  four_wheel_drive?: boolean
  engine_cc?: number | null
  antal_agare?: number | null
  skatt?: number | null
  besiktning_till?: string | null
  mileage_history?: MileageHistoryEntry[] | null
  owner_history?: OwnerHistoryEntry[] | null
  address_vehicles?: AddressVehicle[] | null
  owner_gender?: string | null
  owner_type?: string | null
}

export interface OwnerInfo {
  owner_info?: string | null
  location?: string | null
  county?: string | null
  owner_age?: number | null
}

// ============ Helper Functions ============

/**
 * Convert mileage_km to mileage_mil (Swedish "mil" = 10 km)
 */
function getMileageMil(entry: MileageHistoryEntry): number {
  if (entry.mileage_mil !== undefined) return entry.mileage_mil
  return Math.round(entry.mileage_km / 10)
}

/**
 * Format mileage from km to Swedish "mil"
 */
export function formatMileageInMil(mileageKm: number | null | undefined): string {
  if (!mileageKm) return '-'
  return Math.round(mileageKm / 10).toLocaleString()
}

// ============ Components ============

/**
 * Besiktning Tooltip - Shows inspection date with mileage history on hover
 */
export function BesiktningTooltip({
  besiktningTill,
  mileageHistory,
}: {
  besiktningTill: string | null | undefined
  mileageHistory: MileageHistoryEntry[] | null | undefined
}) {
  if (!besiktningTill) return <span className="text-muted-foreground">-</span>

  const isExpired = new Date(besiktningTill) < new Date()

  // If we have mileage history (besiktning history), show on hover
  if (mileageHistory && mileageHistory.length > 0) {
    return (
      <div className="relative group/besikt">
        <Badge
          variant="outline"
          className={`cursor-help ${isExpired ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}
        >
          {besiktningTill}
        </Badge>
        <div className="absolute left-0 top-full mt-1 hidden group-hover/besikt:block z-50 bg-popover border rounded-md shadow-md p-3 min-w-[280px]">
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <History className="w-4 h-4" />
            Besiktningshistorik
          </h4>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {mileageHistory.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{m.date}</span>
                </div>
                <span className="font-medium">{getMileageMil(m).toLocaleString()} mil</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Badge variant="outline" className={isExpired ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}>
      {besiktningTill}
    </Badge>
  )
}

/**
 * Mileage History Popover - Shows mileage readings with diffs
 */
export function MileageHistoryPopover({
  mileageHistory,
}: {
  mileageHistory: MileageHistoryEntry[] | null | undefined
}) {
  if (!mileageHistory || mileageHistory.length === 0) {
    return <span className="text-muted-foreground">-</span>
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1" onClick={(e) => e.stopPropagation()}>
          <TrendingDown className="w-3 h-3" />
          {mileageHistory.length}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <History className="w-4 h-4" />
            Mätarhistorik
          </h4>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {mileageHistory.map((m, i) => {
              const currentMil = getMileageMil(m)
              const nextEntry = mileageHistory[i + 1]
              const prevMileage = nextEntry ? getMileageMil(nextEntry) : null
              const diff = prevMileage !== null ? currentMil - prevMileage : null
              return (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{m.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{currentMil.toLocaleString()} mil</span>
                    {diff !== null && (
                      <span className="text-xs text-muted-foreground ml-2">(+{diff.toLocaleString()})</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {mileageHistory.length > 1 && (
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Total körning: {(getMileageMil(mileageHistory[0]) - getMileageMil(mileageHistory[mileageHistory.length - 1])).toLocaleString()} mil
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Owner History Popover - Shows owner timeline
 */
export function OwnerHistoryPopover({
  ownerHistory,
}: {
  ownerHistory: OwnerHistoryEntry[] | null | undefined
}) {
  if (!ownerHistory || ownerHistory.length === 0) {
    return <span className="text-muted-foreground">-</span>
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1" onClick={(e) => e.stopPropagation()}>
          <Users className="w-3 h-3" />
          {ownerHistory.length}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Ägarhistorik
          </h4>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {ownerHistory.map((h, i) => (
              <div key={i} className="p-2 bg-muted/50 rounded text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{h.name || h.type}</span>
                  <span className="text-muted-foreground text-xs">{h.date}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  <Badge variant="outline" className={
                    h.owner_class === 'person' ? 'bg-blue-50' :
                    h.owner_class === 'company' ? 'bg-purple-50' : 'bg-gray-50'
                  }>
                    {h.type}
                  </Badge>
                  {h.details && <span className="ml-2">{h.details}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Address Vehicles Popover - Shows vehicles on owner's address
 */
export function AddressVehiclesPopover({
  addressVehicles,
  ownerAddress,
}: {
  addressVehicles: AddressVehicle[] | null | undefined
  ownerAddress?: string
}) {
  if (!addressVehicles || addressVehicles.length === 0) {
    return <span className="text-muted-foreground">-</span>
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1" onClick={(e) => e.stopPropagation()}>
          <Car className="w-3 h-3" />
          {addressVehicles.length}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Fordon på adressen
          </h4>
          {ownerAddress && (
            <div className="text-sm text-muted-foreground mb-2">
              {ownerAddress}
            </div>
          )}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {addressVehicles.map((v, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                <div className="flex-1">
                  <span className="font-mono font-medium">{v.regnr}</span>
                  <span className="text-muted-foreground ml-2">{v.model || v.description}</span>
                  {v.year && (
                    <span className="text-muted-foreground ml-1">({v.year})</span>
                  )}
                  {v.color && (
                    <span className="text-muted-foreground ml-1">• {v.color}</span>
                  )}
                  {v.ownership_time && (
                    <span className="text-muted-foreground ml-1">• {v.ownership_time}</span>
                  )}
                  {v.mileage && (
                    <span className="text-muted-foreground ml-1">• {v.mileage.toLocaleString()} mil</span>
                  )}
                </div>
                {v.status && (
                  <Badge variant="outline" className={
                    v.status === 'I Trafik' ? 'bg-green-50' :
                    v.status === 'Avställd' ? 'bg-yellow-50' : 'bg-red-50'
                  }>
                    {v.status}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Vehicle Info Popover - Shows detailed vehicle information
 */
export function VehicleInfoPopover({
  vehicle,
  owner,
}: {
  vehicle: VehicleInfo
  owner?: OwnerInfo
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2">
              <Car className="w-4 h-4" />
              {vehicle.make} {vehicle.model}
            </h4>
            {vehicle.reg_nr && (
              <Badge variant="outline" className="font-mono">
                {vehicle.reg_nr}
              </Badge>
            )}
          </div>

          {/* Vehicle Details */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {vehicle.year && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span>{vehicle.year}</span>
              </div>
            )}
            {vehicle.mileage && (
              <div className="flex items-center gap-2">
                <Gauge className="w-3 h-3 text-muted-foreground" />
                <span>{formatMileageInMil(vehicle.mileage)} mil</span>
              </div>
            )}
            {vehicle.fuel_type && (
              <div className="flex items-center gap-2">
                <Fuel className="w-3 h-3 text-muted-foreground" />
                <span>{vehicle.fuel_type}</span>
              </div>
            )}
            {vehicle.color && (
              <div className="flex items-center gap-2">
                <Palette className="w-3 h-3 text-muted-foreground" />
                <span>{vehicle.color}</span>
              </div>
            )}
            {vehicle.transmission && (
              <div className="flex items-center gap-2">
                <Settings2 className="w-3 h-3 text-muted-foreground" />
                <span>{vehicle.transmission}</span>
              </div>
            )}
            {vehicle.horsepower && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">HP</span>
                <span>{vehicle.horsepower} hk</span>
              </div>
            )}
          </div>

          {/* Status & Tax */}
          <div className="flex items-center gap-2 flex-wrap">
            {vehicle.in_traffic !== undefined && (
              <Badge variant="outline" className={vehicle.in_traffic ? 'bg-green-50 text-green-800' : 'bg-orange-50 text-orange-800'}>
                {vehicle.in_traffic ? 'I trafik' : 'Avställd'}
              </Badge>
            )}
            {vehicle.four_wheel_drive && (
              <Badge variant="outline" className="bg-blue-50 text-blue-800">
                4WD
              </Badge>
            )}
            {vehicle.antal_agare && (
              <Badge variant="outline">
                {vehicle.antal_agare} ägare
              </Badge>
            )}
          </div>

          {vehicle.skatt && (
            <div className="text-sm text-muted-foreground">
              Årsskatt: {vehicle.skatt.toLocaleString()} kr
            </div>
          )}

          {/* Owner Info */}
          {owner && (
            <div className="border-t pt-2 space-y-1">
              <h5 className="font-medium text-sm flex items-center gap-2">
                {vehicle.owner_type === 'company' ? (
                  <Building2 className="w-3 h-3" />
                ) : (
                  <User className="w-3 h-3" />
                )}
                Ägare
              </h5>
              {owner.owner_info && (
                <div className="text-sm">{owner.owner_info.split(', ')[0]}</div>
              )}
              {owner.location && (
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {owner.location}{owner.county && `, ${owner.county}`}
                </div>
              )}
              {owner.owner_age && (
                <div className="text-sm text-muted-foreground">
                  Ålder: {owner.owner_age} år
                </div>
              )}
            </div>
          )}

          {/* Besiktning */}
          {vehicle.besiktning_till && (
            <div className="border-t pt-2">
              <BesiktningTooltip
                besiktningTill={vehicle.besiktning_till}
                mileageHistory={vehicle.mileage_history}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Inline Mileage with Hover History - For use in table cells
 */
export function MileageWithHistory({
  mileageKm,
  mileageHistory,
}: {
  mileageKm: number | null | undefined
  mileageHistory: MileageHistoryEntry[] | null | undefined
}) {
  if (!mileageKm) return <span className="text-muted-foreground">-</span>

  const formattedMileage = formatMileageInMil(mileageKm)

  if (!mileageHistory || mileageHistory.length === 0) {
    return <span className="text-sm">{formattedMileage}</span>
  }

  return (
    <div className="relative group/mileage">
      <span className="text-sm cursor-help">{formattedMileage}</span>
      <div className="absolute left-0 top-full mt-1 hidden group-hover/mileage:block z-50 bg-popover border rounded-md shadow-md p-2 text-xs min-w-[180px]">
        <div className="font-medium mb-1">Mätarhistorik</div>
        {mileageHistory.slice(0, 5).map((m, i) => {
          const mil = getMileageMil(m)
          return (
            <div key={i} className="flex justify-between py-0.5">
              <span className="text-muted-foreground">{m.date}</span>
              <span>{mil.toLocaleString()} mil</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Gender/Type Icon with Tooltip - For use in table cells
 */
export function GenderTypeIcon({
  ownerType,
  ownerGender,
  ownerName,
}: {
  ownerType?: string | null
  ownerGender?: string | null
  ownerName?: string
}) {
  return (
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
        {ownerName || 'Okänd'}
      </div>
    </div>
  )
}
