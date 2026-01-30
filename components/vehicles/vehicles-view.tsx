'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Car,
  Phone,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface LeadInfo {
  id: string
  phone?: string | null
  owner_info?: string | null
  location?: string | null
  status: string
  county?: string | null
  owner_age?: number | null
  owner_gender?: string | null
  owner_type?: string | null
  created_at?: string
}

interface Vehicle {
  id: string
  lead_id: string
  reg_nr?: string | null
  chassis_nr?: string | null
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
  leads?: LeadInfo | LeadInfo[]
}

interface VehiclesViewProps {
  vehicles: Vehicle[]
  count: number
}

export function VehiclesView({ vehicles, count }: VehiclesViewProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  const handleRowClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setIsModalOpen(true)
  }

  // Convert Vehicle to LeadData for renderLeadCell
  const vehicleToLeadData = (vehicle: Vehicle): LeadData => {
    const lead = Array.isArray(vehicle.leads) ? vehicle.leads[0] : vehicle.leads
    return {
      id: lead?.id || vehicle.id,
      phone: lead?.phone || null,
      owner_info: lead?.owner_info || null,
      location: lead?.location || null,
      status: lead?.status || 'new',
      county: lead?.county || null,
      owner_age: lead?.owner_age || null,
      owner_gender: lead?.owner_gender || vehicle.owner_gender || null,
      owner_type: lead?.owner_type || vehicle.owner_type || null,
      created_at: lead?.created_at || new Date().toISOString(),
      vehicles: [{
        id: vehicle.id,
        reg_nr: vehicle.reg_nr,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        fuel_type: vehicle.fuel_type,
        mileage: vehicle.mileage,
        color: vehicle.color,
        transmission: vehicle.transmission,
        horsepower: vehicle.horsepower,
        in_traffic: vehicle.in_traffic,
        four_wheel_drive: vehicle.four_wheel_drive,
        engine_cc: vehicle.engine_cc,
        is_interesting: vehicle.is_interesting,
        antal_agare: vehicle.antal_agare,
        skatt: vehicle.skatt,
        besiktning_till: vehicle.besiktning_till,
        mileage_history: vehicle.mileage_history,
        owner_history: vehicle.owner_history,
        owner_vehicles: vehicle.owner_vehicles,
        address_vehicles: vehicle.address_vehicles,
        owner_gender: vehicle.owner_gender,
        owner_type: vehicle.owner_type,
        biluppgifter_fetched_at: vehicle.biluppgifter_fetched_at,
      }] as LeadVehicle[],
    }
  }

  if (vehicles.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <Car className="h-7 w-7 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">Inga fordon ännu</p>
              <p className="text-sm text-gray-500 mt-1">
                Importera en Excel-fil för att lägga till fordon
              </p>
            </div>
            <Link href="/import">
              <Button>Importera Excel</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <DynamicTable
        data={vehicles}
        columns={LEAD_COLUMNS}
        columnGroups={LEAD_COLUMN_GROUPS}
        storageKey={STORAGE_KEYS.vehicles}
        getItemId={(vehicle) => vehicle.id}
        onRowClick={handleRowClick}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        renderCell={(columnId, vehicle) => {
          const lead = Array.isArray(vehicle.leads) ? vehicle.leads[0] : vehicle.leads
          const vehicleData = vehicleToLeadData(vehicle)

          // Custom status for vehicles page
          if (columnId === 'status') {
            return vehicle.in_traffic ? (
              <Badge className="bg-green-100 text-green-700 text-xs">I trafik</Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs">
                Avställd
              </Badge>
            )
          }

          // Custom actions for vehicles page
          if (columnId === 'actions') {
            return (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Link href={`/leads/${vehicle.lead_id}`}>
                  <Button size="sm">Visa</Button>
                </Link>
              </div>
            )
          }

          return renderLeadCell({
            columnId,
            lead: vehicleData,
            vehicle: vehicleData.vehicles?.[0],
            onRowClick: () => handleRowClick(vehicle),
            onCopyPhone: copyPhone,
            copiedPhone,
          })
        }}
        renderSelectionBar={(count, clearSelection) => (
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Avmarkera
          </Button>
        )}
      />

      {/* Detail Modal */}
      <LeadDetailModal
        lead={(() => {
          if (!selectedVehicle) return null
          const selectedLead = Array.isArray(selectedVehicle.leads) ? selectedVehicle.leads[0] : selectedVehicle.leads
          if (!selectedLead) return null
          return {
          id: selectedLead.id,
          phone: selectedLead.phone || null,
          owner_info: selectedLead.owner_info || null,
          location: selectedLead.location || null,
          status: selectedLead.status,
          source: null,
          county: selectedLead.county || null,
          owner_age: selectedLead.owner_age || null,
          owner_gender: selectedLead.owner_gender || null,
          owner_type: selectedLead.owner_type || null,
          created_at: selectedLead.created_at || new Date().toISOString(),
          vehicles: [{
            id: selectedVehicle.id,
            reg_nr: selectedVehicle.reg_nr || null,
            make: selectedVehicle.make || null,
            model: selectedVehicle.model || null,
            year: selectedVehicle.year || null,
            fuel_type: selectedVehicle.fuel_type || null,
            mileage: selectedVehicle.mileage || null,
            color: selectedVehicle.color || null,
            transmission: selectedVehicle.transmission || null,
            horsepower: selectedVehicle.horsepower || null,
            in_traffic: selectedVehicle.in_traffic ?? true,
            four_wheel_drive: selectedVehicle.four_wheel_drive ?? false,
            engine_cc: selectedVehicle.engine_cc ?? null,
            antal_agare: selectedVehicle.antal_agare || null,
            skatt: selectedVehicle.skatt || null,
            besiktning_till: selectedVehicle.besiktning_till || null,
            mileage_history: selectedVehicle.mileage_history as { date: string; mileage_km: number; mileage_mil?: number; type?: string }[] | null,
            owner_history: selectedVehicle.owner_history as { date: string; name?: string; type: string; owner_class?: string; details?: string }[] | null,
            owner_vehicles: selectedVehicle.owner_vehicles as { regnr: string; description?: string; model?: string; color?: string; status?: string; mileage?: number; year?: number; ownership_time?: string }[] | null,
            address_vehicles: selectedVehicle.address_vehicles as { regnr: string; description?: string; model?: string; color?: string; status?: string; mileage?: number; year?: number; ownership_time?: string }[] | null,
            owner_gender: selectedVehicle.owner_gender || null,
            owner_type: selectedVehicle.owner_type || null,
            biluppgifter_fetched_at: selectedVehicle.biluppgifter_fetched_at || null,
          }]
        }
        })()}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onUpdate={() => router.refresh()}
        actions={selectedVehicle && (
          <Link href={`/leads/${selectedVehicle.lead_id}`}>
            <Button className="gap-2">
              <Phone className="h-4 w-4" />
              Gå till lead
            </Button>
          </Link>
        )}
      />
    </div>
  )
}
