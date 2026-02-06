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
  Gauge,
  History,
  Users,
  Mail,
  PhoneCall,
  CreditCard,
  Fuel,
  Settings,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'
import { sendProspectToCall, sendProspectToBrev } from '@/app/bilprospekt/actions'
import { toast } from 'sonner'

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

interface MileageHistoryEntry {
  date: string
  mileage_mil: number
  mileage_km: number
  type: string
}

interface OwnerHistoryEntry {
  date: string
  name?: string
  type: string
  owner_class: string
  details?: string
}

interface Prospect {
  id: number
  bp_id: number
  reg_number: string
  brand: string
  model: string | null
  fuel: string | null
  color: string | null
  car_year: number | null
  date_acquired: string | null
  owner_name: string | null
  owner_type: string | null
  owner_gender: string | null
  municipality: string | null
  region: string | null
  kaross: string | null
  transmission: string | null
  engine_power: number | null
  mileage: number | null
  bp_aprox_mileage: number | null
  leasing: boolean
  credit: boolean
  seller_name: string | null
  chassis: string | null
  in_service: string | null
  cylinder_volume: number | null
  fwd: string | null
  new_or_old: string | null
  bu_num_owners: number | null
  bu_annual_tax: number | null
  bu_inspection_until: string | null
  bu_owner_age: number | null
  bu_owner_address: string | null
  bu_owner_postal_code: string | null
  bu_owner_postal_city: string | null
  bu_owner_phone: string | null
  bu_owner_vehicles: AddressVehicle[] | null
  bu_address_vehicles: AddressVehicle[] | null
  bu_mileage_history: MileageHistoryEntry[] | null
  bu_owner_history: OwnerHistoryEntry[] | null
  bu_owner_name: string | null
  bu_fetched_at: string | null
  sent_to_call_at?: string | null
  sent_to_brev_at?: string | null
}

interface ProspectDetailModalProps {
  prospect: Prospect | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

export function ProspectDetailModal({
  prospect,
  open,
  onOpenChange,
  onUpdate,
}: ProspectDetailModalProps) {
  const [isSendingCall, setIsSendingCall] = useState(false)
  const [isSendingBrev, setIsSendingBrev] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone)
      setCopiedPhone(true)
      toast.success('Telefonnummer kopierat!')
      setTimeout(() => setCopiedPhone(false), 2000)
    } catch {
      toast.error('Kunde inte kopiera')
    }
  }

  if (!prospect) return null

  const ownerName = prospect.bu_owner_name || prospect.owner_name || 'Okänd'
  const genderIcon = prospect.owner_type === 'company' ? (
    <Building2 className="w-5 h-5 text-purple-500" />
  ) : prospect.owner_gender === 'M' ? (
    <span className="text-blue-500 font-bold text-lg">♂</span>
  ) : prospect.owner_gender === 'K' ? (
    <span className="text-pink-500 font-bold text-lg">♀</span>
  ) : (
    <User className="w-5 h-5 text-muted-foreground" />
  )

  const calculatePossession = (dateAcquired: string | null) => {
    if (!dateAcquired) return null
    const acquired = new Date(dateAcquired)
    const now = new Date()
    const months = Math.floor((now.getTime() - acquired.getTime()) / (1000 * 60 * 60 * 24 * 30))
    if (months < 12) return `${months} månader`
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    return remainingMonths > 0 ? `${years} år ${remainingMonths} mån` : `${years} år`
  }

  const handleSendToCall = async () => {
    setIsSendingCall(true)
    try {
      const result = await sendProspectToCall(prospect.bp_id)
      if (result.success) {
        toast.success('Skickad till ringlistan!')
        onUpdate?.()
      } else {
        toast.error('Kunde inte skicka till ringlistan')
      }
    } catch {
      toast.error('Ett fel uppstod')
    } finally {
      setIsSendingCall(false)
    }
  }

  const handleSendToBrev = async () => {
    setIsSendingBrev(true)
    try {
      const result = await sendProspectToBrev(prospect.bp_id)
      console.log('[Modal] sendProspectToBrev result:', result)
      if (result.success) {
        toast.success('Skickad till brevlistan!')
        onUpdate?.()
      } else {
        toast.error(result.error || 'Kunde inte skicka till brevlistan')
      }
    } catch (err) {
      console.error('[Modal] sendProspectToBrev exception:', err)
      toast.error('Ett fel uppstod')
    } finally {
      setIsSendingBrev(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-xl text-blue-600">{prospect.reg_number}</span>
            <span className="text-muted-foreground">•</span>
            <span>{prospect.brand} {prospect.model}</span>
            {prospect.car_year && (
              <Badge variant="outline">{prospect.car_year}</Badge>
            )}
            {prospect.bu_fetched_at && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="flex gap-3 p-4 bg-muted/50 rounded-lg">
              <Button
                onClick={handleSendToCall}
                disabled={isSendingCall || !!prospect.sent_to_call_at}
                className="flex-1 gap-2"
                variant={prospect.sent_to_call_at ? 'outline' : 'default'}
              >
                {isSendingCall ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PhoneCall className="w-4 h-4" />
                )}
                {prospect.sent_to_call_at ? 'Redan i ringlistan' : 'Skicka till Ring'}
              </Button>
              <Button
                onClick={handleSendToBrev}
                disabled={isSendingBrev || !!prospect.sent_to_brev_at}
                className="flex-1 gap-2"
                variant={prospect.sent_to_brev_at ? 'outline' : 'secondary'}
              >
                {isSendingBrev ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {prospect.sent_to_brev_at ? 'Redan i brevlistan' : 'Skicka till Brev'}
              </Button>
              {prospect.bu_owner_phone && (
                <Button
                  variant="outline"
                  className="gap-2"
                  asChild
                >
                  <a href={`tel:${prospect.bu_owner_phone}`}>
                    <Phone className="w-4 h-4" />
                    Ring nu
                  </a>
                </Button>
              )}
            </div>

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
                    <span className="font-medium">{ownerName}</span>
                  </div>
                  {prospect.bu_owner_age && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ålder:</span>
                      <span>{prospect.bu_owner_age} år</span>
                    </div>
                  )}
                  {prospect.bu_owner_phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Telefon:</span>
                      <div className="flex items-center gap-2">
                        <a href={`tel:${prospect.bu_owner_phone}`} className="text-blue-600 hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {prospect.bu_owner_phone}
                        </a>
                        <button
                          onClick={() => copyPhone(prospect.bu_owner_phone!)}
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
                  {prospect.bu_owner_address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Adress:</span>
                      <span className="text-right">{prospect.bu_owner_address}</span>
                    </div>
                  )}
                  {(prospect.bu_owner_postal_code || prospect.bu_owner_postal_city) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ort:</span>
                      <span>{prospect.bu_owner_postal_code} {prospect.bu_owner_postal_city}</span>
                    </div>
                  )}
                  {prospect.municipality && !prospect.bu_owner_postal_city && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kommun:</span>
                      <span>{prospect.municipality}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Fordon
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Märke/Modell:</span>
                    <span className="font-medium">{prospect.brand} {prospect.model}</span>
                  </div>
                  {prospect.car_year && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Årsmodell:</span>
                      <span>{prospect.car_year}</span>
                    </div>
                  )}
                  {prospect.fuel && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bränsle:</span>
                      <Badge variant="secondary" className="text-xs">{prospect.fuel}</Badge>
                    </div>
                  )}
                  {prospect.bp_aprox_mileage && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ca mil (BP):</span>
                      <span className="text-muted-foreground">~{prospect.bp_aprox_mileage.toLocaleString()} mil</span>
                    </div>
                  )}
                  {prospect.mileage && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mätarställning (BU):</span>
                      <span className="font-medium">{prospect.mileage.toLocaleString()} mil</span>
                    </div>
                  )}
                  {prospect.color && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Färg:</span>
                      <span>{prospect.color}</span>
                    </div>
                  )}
                  {prospect.transmission && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Växellåda:</span>
                      <span>{prospect.transmission}</span>
                    </div>
                  )}
                  {prospect.engine_power && prospect.engine_power > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Effekt:</span>
                      <span>{prospect.engine_power} HK</span>
                    </div>
                  )}
                  {prospect.in_service && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">I trafik:</span>
                      <Badge variant="outline" className={prospect.in_service === 'Ja' ? 'bg-green-50' : 'bg-red-50'}>
                        {prospect.in_service}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-6">
              {/* Economy & Timing */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Ekonomi & Tid
                </h3>
                <div className="space-y-2 text-sm">
                  {prospect.bu_annual_tax && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Årsskatt:</span>
                      <span>{prospect.bu_annual_tax.toLocaleString()} kr</span>
                    </div>
                  )}
                  {prospect.bu_inspection_until && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Besiktning:</span>
                      <Badge variant="outline" className={
                        new Date(prospect.bu_inspection_until) < new Date() ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
                      }>
                        {prospect.bu_inspection_until}
                      </Badge>
                    </div>
                  )}
                  {prospect.date_acquired && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Köpt:</span>
                      <span>{new Date(prospect.date_acquired).toLocaleDateString('sv-SE')}</span>
                    </div>
                  )}
                  {calculatePossession(prospect.date_acquired) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Innehavstid:</span>
                      <span>{calculatePossession(prospect.date_acquired)}</span>
                    </div>
                  )}
                  {prospect.bu_num_owners && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Antal ägare:</span>
                      <Badge variant="outline">{prospect.bu_num_owners}</Badge>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Finansiering:</span>
                    <span>
                      {prospect.credit ? 'Kredit' : prospect.leasing ? 'Leasing' : 'Kontant'}
                    </span>
                  </div>
                  {prospect.new_or_old && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Köpt som:</span>
                      <Badge variant="outline" className={prospect.new_or_old === 'Ny' ? 'bg-green-50' : ''}>
                        {prospect.new_or_old}
                      </Badge>
                    </div>
                  )}
                  {prospect.seller_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Inköpsplats:</span>
                      <span className="text-right max-w-[150px] truncate" title={prospect.seller_name}>
                        {prospect.seller_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mileage History */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Mätarhistorik
                </h3>
                {prospect.bu_mileage_history && prospect.bu_mileage_history.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {prospect.bu_mileage_history.map((m, i) => {
                      const prevMileage = prospect.bu_mileage_history?.[i + 1]?.mileage_mil
                      const diff = prevMileage ? m.mileage_mil - prevMileage : null
                      return (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                          <span className="text-muted-foreground">{m.date}</span>
                          <div>
                            <span className="font-medium">{m.mileage_mil.toLocaleString()} mil</span>
                            {diff !== null && (
                              <span className="text-xs text-muted-foreground ml-2">(+{diff.toLocaleString()})</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Ingen historik tillgänglig</p>
                )}
              </div>
            </div>

            {/* Owner's Vehicles */}
            {prospect.bu_owner_vehicles && prospect.bu_owner_vehicles.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Ägarens fordon ({prospect.bu_owner_vehicles.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {prospect.bu_owner_vehicles.map((v, i) => (
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
            {prospect.bu_address_vehicles && prospect.bu_address_vehicles.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Fordon på adressen ({prospect.bu_address_vehicles.length})
                  </h3>
                  {prospect.bu_owner_address && (
                    <p className="text-sm text-muted-foreground">
                      {prospect.bu_owner_address}, {prospect.bu_owner_postal_code} {prospect.bu_owner_postal_city}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {prospect.bu_address_vehicles.map((v, i) => (
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
            {prospect.bu_owner_history && prospect.bu_owner_history.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Ägarhistorik
                  </h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {prospect.bu_owner_history.map((h, i) => (
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
            {prospect.bu_fetched_at && (
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                Biluppgifter uppdaterades: {new Date(prospect.bu_fetched_at).toLocaleString('sv-SE')}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
