'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Phone,
  Car,
  MapPin,
  Clock,
  User,
  Calendar,
  Fuel,
  Gauge,
  FileText,
  Plus,
  ArrowLeft,
  Check,
  X,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'
import { toast } from 'sonner'
import { updateLeadStatus, addCallLog } from '@/app/actions/leads'
import Link from 'next/link'

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
  ai_reasoning?: string
}

interface CallLog {
  id: string
  called_at: string
  result: string
  notes?: string
  follow_up_date?: string
  booking_date?: string
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

interface LeadDetailProps {
  lead: Lead
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Ny', color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'Kontaktad', color: 'bg-gray-100 text-gray-700' },
  { value: 'interested', label: 'Intresserad', color: 'bg-green-100 text-green-700' },
  { value: 'not_interested', label: 'Ej intresserad', color: 'bg-red-100 text-red-700' },
  { value: 'no_answer', label: 'Inget svar', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'callback', label: 'Ring tillbaka', color: 'bg-purple-100 text-purple-700' },
  { value: 'booked', label: 'Bokad', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'completed', label: 'Avslutad', color: 'bg-gray-100 text-gray-600' },
]

const CALL_RESULTS = [
  'Inget svar',
  'Upptaget',
  'Svarade - Intresserad',
  'Svarade - Ej intresserad',
  'Svarade - Ring tillbaka',
  'Svarade - Bokad visning',
  'Svarade - Såld',
  'Fel nummer',
]

function formatMileage(mileage?: number): string {
  if (!mileage) return '-'
  return `${mileage.toLocaleString('sv-SE')} km`
}

export function LeadDetail({ lead }: LeadDetailProps) {
  const router = useRouter()
  const [status, setStatus] = useState(lead.status)
  const [isAddingCall, setIsAddingCall] = useState(false)
  const [callResult, setCallResult] = useState('')
  const [callNotes, setCallNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentStatus = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus)
    const result = await updateLeadStatus(lead.id, newStatus)
    if (result.success) {
      toast.success('Status uppdaterad')
    } else {
      toast.error('Kunde inte uppdatera status')
      setStatus(lead.status)
    }
  }

  const handleAddCall = async () => {
    if (!callResult) {
      toast.error('Välj ett samtalsresultat')
      return
    }

    setIsSubmitting(true)
    const result = await addCallLog({
      leadId: lead.id,
      vehicleId: lead.vehicles?.[0]?.id,
      result: callResult,
      notes: callNotes || undefined
    })

    setIsSubmitting(false)

    if (result.success) {
      toast.success('Samtal loggat')
      setIsAddingCall(false)
      setCallResult('')
      setCallNotes('')
      router.refresh()
    } else {
      toast.error('Kunde inte logga samtalet')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back button */}
      <Link href="/leads">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till leads
        </Button>
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-500" />
                Kontaktuppgifter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.phone && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span className="text-lg font-medium">{lead.phone}</span>
                  </div>
                  <a href={`tel:${lead.phone}`}>
                    <Button size="sm" className="gap-2">
                      <Phone className="h-4 w-4" />
                      Ring
                    </Button>
                  </a>
                </div>
              )}
              {lead.owner_info && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <span>{lead.owner_info}</span>
                </div>
              )}
              {lead.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <span>{lead.location}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicles Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-gray-500" />
                Fordon ({lead.vehicles?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.vehicles?.length > 0 ? (
                <div className="space-y-4">
                  {lead.vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="rounded-lg border border-gray-200 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-lg font-bold bg-gray-100 px-3 py-1 rounded">
                            {vehicle.reg_nr || 'Saknar reg.nr'}
                          </span>
                          {!vehicle.in_traffic && (
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                              Avställd
                            </Badge>
                          )}
                        </div>
                        {vehicle.ai_score && (
                          <Badge className={cn(
                            vehicle.ai_score >= 70
                              ? "bg-green-100 text-green-700"
                              : vehicle.ai_score >= 40
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          )}>
                            AI Score: {vehicle.ai_score}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Märke/Modell</span>
                          <p className="font-medium">
                            {vehicle.make} {vehicle.model}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Årsmodell</span>
                          <p className="font-medium">{vehicle.year || '-'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Miltal</span>
                          <p className={cn(
                            "font-medium",
                            vehicle.mileage && vehicle.mileage > 200000
                              ? "text-orange-600"
                              : ""
                          )}>
                            {formatMileage(vehicle.mileage)}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Drivmedel</span>
                          <p className="font-medium">{vehicle.fuel_type || '-'}</p>
                        </div>
                      </div>

                      {vehicle.chassis_nr && (
                        <div className="text-xs text-gray-400">
                          Chassi: {vehicle.chassis_nr}
                        </div>
                      )}

                      {vehicle.ai_reasoning && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                          <AlertCircle className="h-4 w-4 inline mr-1" />
                          {vehicle.ai_reasoning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Inga fordon kopplade till denna lead
                </p>
              )}
            </CardContent>
          </Card>

          {/* Call History Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-gray-500" />
                  Samtalshistorik
                </CardTitle>
                <CardDescription>
                  {lead.call_logs?.length || 0} registrerade samtal
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsAddingCall(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Logga samtal
              </Button>
            </CardHeader>
            <CardContent>
              {isAddingCall && (
                <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50 space-y-4">
                  <h4 className="font-medium text-blue-900">Nytt samtal</h4>
                  <Select value={callResult} onValueChange={setCallResult}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj resultat..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CALL_RESULTS.map((result) => (
                        <SelectItem key={result} value={result}>
                          {result}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Anteckningar (valfritt)..."
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddCall}
                      disabled={isSubmitting}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Spara
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingCall(false)
                        setCallResult('')
                        setCallNotes('')
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Avbryt
                    </Button>
                  </div>
                </div>
              )}

              {lead.call_logs?.length > 0 ? (
                <div className="space-y-3">
                  {lead.call_logs.map((call) => (
                    <div
                      key={call.id}
                      className="flex gap-4 p-3 rounded-lg bg-gray-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200">
                        <Phone className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{call.result}</span>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(call.called_at), {
                              addSuffix: true,
                              locale: sv
                            })}
                          </span>
                        </div>
                        {call.notes && (
                          <p className="text-sm text-gray-600 mt-1">{call.notes}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(call.called_at), 'PPp', { locale: sv })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Inga samtal registrerade ännu
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue>
                    <Badge className={currentStatus.color}>
                      {currentStatus.label}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <Badge className={option.color}>{option.label}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Skapad</span>
                <span>
                  {format(new Date(lead.created_at), 'PP', { locale: sv })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Uppdaterad</span>
                <span>
                  {formatDistanceToNow(new Date(lead.updated_at), {
                    addSuffix: true,
                    locale: sv
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Källa</span>
                <span>{lead.source || 'Okänd'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Antal samtal</span>
                <span>{lead.call_logs?.length || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">
                Snabbåtgärder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="block">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Phone className="h-4 w-4" />
                    Ring {lead.phone}
                  </Button>
                </a>
              )}
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setIsAddingCall(true)}
              >
                <FileText className="h-4 w-4" />
                Logga samtal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
