'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Car,
  User,
  Building2,
  Phone,
  MapPin,
  Calendar,
  History,
  Users,
  Mail,
  PhoneCall,
  CreditCard,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  Fuel,
  Gauge,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface MileageHistoryEntry {
  date: string
  mileage_km: number
  mileage_mil?: number
  type?: string
}

interface OwnerHistoryEntry {
  date: string
  name?: string
  type: string
  owner_class?: string
  details?: string
}

interface AddressVehicle {
  regnr: string
  description?: string
  model?: string
  color?: string
  status?: string
  mileage?: number
  year?: number
  ownership_time?: string
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
  four_wheel_drive: boolean
  engine_cc: number | null
  antal_agare: number | null
  skatt: number | null
  besiktning_till: string | null
  mileage_history: MileageHistoryEntry[] | null
  owner_history: OwnerHistoryEntry[] | null
  owner_vehicles: AddressVehicle[] | null
  address_vehicles: AddressVehicle[] | null
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
  vehicles: Vehicle[]
}

interface LeadDetailModalProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
  actions?: React.ReactNode
}

export function LeadDetailModal({
  lead,
  open,
  onOpenChange,
  onUpdate,
  actions,
}: LeadDetailModalProps) {
  const [copiedPhone, setCopiedPhone] = useState(false)

  if (!lead) return null

  const vehicle = lead.vehicles?.[0]

  // Parse owner info
  const parseOwnerInfo = (ownerInfo: string | null) => {
    if (!ownerInfo) return { name: 'Okänd', address: '', postalCode: '', city: '' }
    const parts = ownerInfo.split(', ')
    return {
      name: parts[0] || 'Okänd',
      address: parts[1] || '',
      postalCode: parts[2]?.split(' ')[0] || '',
      city: parts[2]?.split(' ').slice(1).join(' ') || parts[2] || '',
    }
  }

  const ownerParts = parseOwnerInfo(lead.owner_info)
  const ownerGender = vehicle?.owner_gender || lead.owner_gender
  const ownerType = vehicle?.owner_type || lead.owner_type

  const genderIcon = ownerType === 'company' ? (
    <Building2 className="w-5 h-5 text-purple-500" />
  ) : ownerGender === 'M' ? (
    <span className="text-blue-500 font-bold text-lg">♂</span>
  ) : ownerGender === 'K' ? (
    <span className="text-pink-500 font-bold text-lg">♀</span>
  ) : (
    <User className="w-5 h-5 text-muted-foreground" />
  )

  const copyPhone = async () => {
    if (!lead.phone) return
    try {
      await navigator.clipboard.writeText(lead.phone)
      setCopiedPhone(true)
      toast.success('Telefonnummer kopierat!')
      setTimeout(() => setCopiedPhone(false), 2000)
    } catch {
      toast.error('Kunde inte kopiera')
    }
  }

  const getSourceBadge = (source: string | null) => {
    switch (source) {
      case 'bilprospekt':
        return <Badge className="bg-purple-100 text-purple-700">Bilprospekt</Badge>
      case 'excel_import':
        return <Badge className="bg-blue-100 text-blue-700">Excel</Badge>
      default:
        return <Badge variant="outline">{source || 'Okänd'}</Badge>
    }
  }

  // Convert km to mil for display
  const formatMileage = (mileageKm: number | null) => {
    if (!mileageKm) return null
    return Math.round(mileageKm / 10)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {vehicle && (
              <>
                <span className="font-mono text-xl text-blue-600">{vehicle.reg_nr}</span>
                <span className="text-muted-foreground">•</span>
                <span>{vehicle.make} {vehicle.model}</span>
                {vehicle.year && (
                  <Badge variant="outline">{vehicle.year}</Badge>
                )}
              </>
            )}
            {vehicle?.biluppgifter_fetched_at && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Quick Actions */}
            {actions && (
              <div className="flex gap-3 p-4 bg-muted/50 rounded-lg">
                {actions}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* Owner Info */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  {genderIcon}
                  Ägare
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Namn:</span>
                    <span className="font-medium">{ownerParts.name}</span>
                  </div>
                  {lead.owner_age && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ålder:</span>
                      <span>{lead.owner_age} år</span>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Telefon:</span>
                      <div className="flex items-center gap-2">
                        <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </a>
                        <button
                          onClick={copyPhone}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Kopiera telefonnummer"
                        >
                          {copiedPhone ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  {ownerParts.address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Adress:</span>
                      <span className="text-right">{ownerParts.address}</span>
                    </div>
                  )}
                  {(ownerParts.postalCode || ownerParts.city || lead.location) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ort:</span>
                      <span>{ownerParts.postalCode} {ownerParts.city || lead.location}</span>
                    </div>
                  )}
                  {lead.county && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Län:</span>
                      <span>{lead.county}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Info */}
              {vehicle && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Fordon
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Märke/Modell:</span>
                      <span className="font-medium">{vehicle.make} {vehicle.model}</span>
                    </div>
                    {vehicle.year && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Årsmodell:</span>
                        <span>{vehicle.year}</span>
                      </div>
                    )}
                    {vehicle.fuel_type && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bränsle:</span>
                        <Badge variant="secondary" className="text-xs">{vehicle.fuel_type}</Badge>
                      </div>
                    )}
                    {vehicle.mileage && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mätarställning:</span>
                        <span className="font-medium">{formatMileage(vehicle.mileage)?.toLocaleString()} mil</span>
                      </div>
                    )}
                    {vehicle.color && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Färg:</span>
                        <span>{vehicle.color}</span>
                      </div>
                    )}
                    {vehicle.transmission && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Växellåda:</span>
                        <span>{vehicle.transmission}</span>
                      </div>
                    )}
                    {vehicle.horsepower && vehicle.horsepower > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Effekt:</span>
                        <span>{vehicle.horsepower} HK</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">I trafik:</span>
                      <Badge variant="outline" className={vehicle.in_traffic ? 'bg-green-50' : 'bg-red-50'}>
                        {vehicle.in_traffic ? 'Ja' : 'Nej'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-6">
              {/* Economy & Timing */}
              {vehicle && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Ekonomi & Status
                  </h3>
                  <div className="space-y-2 text-sm">
                    {vehicle.skatt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Årsskatt:</span>
                        <span>{vehicle.skatt.toLocaleString()} kr</span>
                      </div>
                    )}
                    {vehicle.besiktning_till && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Besiktning:</span>
                        <Badge variant="outline" className={
                          new Date(vehicle.besiktning_till) < new Date() ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
                        }>
                          {vehicle.besiktning_till}
                        </Badge>
                      </div>
                    )}
                    {vehicle.antal_agare && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Antal ägare:</span>
                        <Badge variant="outline">{vehicle.antal_agare}</Badge>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Källa:</span>
                      {getSourceBadge(lead.source)}
                    </div>
                  </div>
                </div>
              )}

              {/* Mileage History */}
              {vehicle?.mileage_history && vehicle.mileage_history.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Mätarhistorik
                  </h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {vehicle.mileage_history.map((m, i) => {
                      const mileageMil = m.mileage_mil || Math.round(m.mileage_km / 10)
                      const prevMileage = vehicle.mileage_history?.[i + 1]
                      const prevMil = prevMileage ? (prevMileage.mileage_mil || Math.round(prevMileage.mileage_km / 10)) : null
                      const diff = prevMil ? mileageMil - prevMil : null
                      return (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                          <span className="text-muted-foreground">{m.date}</span>
                          <div>
                            <span className="font-medium">{mileageMil.toLocaleString()} mil</span>
                            {diff !== null && (
                              <span className="text-xs text-muted-foreground ml-2">(+{diff.toLocaleString()})</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Owner's Vehicles */}
            {vehicle?.owner_vehicles && vehicle.owner_vehicles.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Ägarens fordon ({vehicle.owner_vehicles.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {vehicle.owner_vehicles.map((v, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <div>
                          <span className="font-mono font-medium">{v.regnr}</span>
                          <span className="text-muted-foreground ml-2">{v.model || v.description}</span>
                        </div>
                        {v.status && (
                          <Badge variant="outline" className={
                            v.status === 'I Trafik' ? 'bg-green-50' : 'bg-yellow-50'
                          }>
                            {v.status}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Address Vehicles */}
            {vehicle?.address_vehicles && vehicle.address_vehicles.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Fordon på adressen ({vehicle.address_vehicles.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {vehicle.address_vehicles.map((v, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <div>
                          <span className="font-mono font-medium">{v.regnr}</span>
                          <span className="text-muted-foreground ml-2">{v.model || v.description}</span>
                          {v.year && <span className="text-muted-foreground ml-1">({v.year})</span>}
                        </div>
                        {v.status && (
                          <Badge variant="outline" className={
                            v.status === 'I Trafik' ? 'bg-green-50' : 'bg-yellow-50'
                          }>
                            {v.status}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Owner History */}
            {vehicle?.owner_history && vehicle.owner_history.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Ägarhistorik
                  </h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {vehicle.owner_history.map((h, i) => (
                      <div key={i} className="p-2 bg-muted/50 rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{h.name || h.type}</span>
                          <span className="text-muted-foreground text-xs">{h.date}</span>
                        </div>
                        <Badge variant="outline" className={
                          h.owner_class === 'person' ? 'bg-blue-50' :
                          h.owner_class === 'company' ? 'bg-purple-50' : 'bg-gray-50'
                        }>
                          {h.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Biluppgifter Status */}
            {vehicle?.biluppgifter_fetched_at && (
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                Biluppgifter uppdaterades: {format(new Date(vehicle.biluppgifter_fetched_at), 'd MMMM yyyy HH:mm', { locale: sv })}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
