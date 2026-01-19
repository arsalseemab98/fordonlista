'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Phone,
  Car,
  MapPin,
  Clock,
  Star,
  ArrowRight,
  Upload,
  Trash2,
  AlertTriangle,
  Inbox
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FilterPresets } from '@/components/ui/filter-presets'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'
import { deleteLead, bulkDeleteLeads } from '@/app/actions/leads'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Vehicle {
  id: string
  reg_nr?: string
  make?: string
  model?: string
  mileage?: number
  year?: number
  in_traffic?: boolean
  is_interesting?: boolean
  ai_score?: number
}

interface CallLog {
  id: string
  called_at: string
  result: string
}

interface Lead {
  id: string
  phone?: string
  owner_info?: string
  location?: string
  status: string
  created_at: string
  vehicles: Vehicle[]
  call_logs: CallLog[]
}

interface ToCallListProps {
  leads: Lead[]
  newCount: number
  callbackCount: number
  noAnswerCount: number
  currentFilter: string
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  new: { label: 'Ny', className: 'bg-blue-100 text-blue-700' },
  callback: { label: 'Ring tillbaka', className: 'bg-purple-100 text-purple-700' },
  no_answer: { label: 'Inget svar', className: 'bg-yellow-100 text-yellow-700' },
}

function formatMileage(mileage?: number): string {
  if (!mileage) return '-'
  return `${mileage.toLocaleString('sv-SE')} km`
}

export function ToCallList({ leads, newCount, callbackCount, noAnswerCount, currentFilter }: ToCallListProps) {
  const router = useRouter()
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)

  const filters = [
    { key: 'all', label: 'Alla', count: newCount + callbackCount + noAnswerCount, icon: Inbox },
    { key: 'new', label: 'Nya', count: newCount, icon: Star },
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

  // Current filters object for FilterPresets
  const currentFilters = {
    status: currentFilter
  }

  const toggleSelect = (leadId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    setSelectedLeads(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)))
    }
  }

  const handleDeleteClick = (lead: Lead, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLeadToDelete(lead)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return

    setIsDeleting(true)
    const result = await deleteLead(leadToDelete.id)
    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setLeadToDelete(null)

    if (result.success) {
      toast.success('Lead borttagen')
      router.refresh()
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
    setIsDeleting(true)
    const result = await bulkDeleteLeads(Array.from(selectedLeads))
    setIsDeleting(false)
    setBulkDeleteDialogOpen(false)

    if (result.success) {
      toast.success(`${selectedLeads.size} leads borttagna`)
      setSelectedLeads(new Set())
      setSelectionMode(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Kunde inte ta bort leads')
    }
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedLeads(new Set())
  }

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

        {/* Filter presets */}
        <FilterPresets
          page="to-call"
          currentFilters={currentFilters as { [key: string]: string | string[] | boolean | number | null | undefined }}
          onLoadPreset={loadPresetFilters}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-700">{newCount}</p>
                <p className="text-sm text-gray-500">Nya leads</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Star className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-700">{callbackCount}</p>
                <p className="text-sm text-gray-500">Ring tillbaka</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Phone className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-700">{noAnswerCount}</p>
                <p className="text-sm text-gray-500">Inget svar</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selection Actions Bar */}
      {leads.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectionMode ? (
                  <>
                    <Checkbox
                      checked={selectedLeads.size === leads.length && leads.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm text-gray-500">
                      {selectedLeads.size > 0 ? `${selectedLeads.size} valda` : 'Välj leads'}
                    </span>
                    <Button variant="ghost" size="sm" onClick={exitSelectionMode}>
                      Avbryt
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectionMode(true)}
                    className="gap-2"
                  >
                    Välj flera
                  </Button>
                )}
              </div>

              {selectedLeads.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDeleteClick}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Ta bort ({selectedLeads.size})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lead list */}
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
        <div className="space-y-3">
          {leads.map((lead, index) => {
            const primaryVehicle = lead.vehicles?.[0]
            const lastCall = lead.call_logs?.[0]
            const status = STATUS_STYLES[lead.status] || STATUS_STYLES.new
            const isInteresting = lead.vehicles?.some((v: Vehicle) => v.is_interesting)
            const isSelected = selectedLeads.has(lead.id)

            return (
              <div key={lead.id} className="relative">
                <Link href={selectionMode ? '#' : `/leads/${lead.id}`}>
                  <Card
                    className={cn(
                      "hover:shadow-md transition-all cursor-pointer",
                      index === 0 && !selectionMode && "ring-2 ring-blue-500 ring-offset-2",
                      isInteresting && "border-yellow-300 bg-yellow-50/50",
                      isSelected && "ring-2 ring-blue-500 bg-blue-50"
                    )}
                    onClick={(e) => {
                      if (selectionMode) {
                        toggleSelect(lead.id, e)
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Selection checkbox or Priority number */}
                        {selectionMode ? (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {}}
                            className="shrink-0"
                          />
                        ) : (
                          <div className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold",
                            index === 0
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-600"
                          )}>
                            {index + 1}
                          </div>
                        )}

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {lead.phone ? (
                              <span className="font-medium text-lg">{lead.phone}</span>
                            ) : (
                              <span className="text-gray-400">Ingen telefon</span>
                            )}
                            <Badge className={status.className}>{status.label}</Badge>
                            {isInteresting && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {primaryVehicle && (
                              <span className="flex items-center gap-1">
                                <Car className="h-4 w-4" />
                                <span className="font-mono">{primaryVehicle.reg_nr}</span>
                                {primaryVehicle.make && ` - ${primaryVehicle.make}`}
                                {primaryVehicle.model && ` ${primaryVehicle.model}`}
                              </span>
                            )}
                            {lead.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {lead.location}
                              </span>
                            )}
                          </div>

                          {lastCall && (
                            <div className="mt-1 text-xs text-gray-400">
                              Senast ringd: {formatDistanceToNow(new Date(lastCall.called_at), {
                                addSuffix: true,
                                locale: sv
                              })} - {lastCall.result}
                            </div>
                          )}
                        </div>

                        {/* Vehicle stats */}
                        {primaryVehicle && (
                          <div className="hidden md:flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <p className="text-gray-400">Miltal</p>
                              <p className={cn(
                                "font-medium",
                                primaryVehicle.mileage && primaryVehicle.mileage > 200000
                                  ? "text-orange-600"
                                  : ""
                              )}>
                                {formatMileage(primaryVehicle.mileage)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-gray-400">År</p>
                              <p className="font-medium">{primaryVehicle.year || '-'}</p>
                            </div>
                            {!primaryVehicle.in_traffic && (
                              <Badge variant="outline" className="text-orange-600 border-orange-200">
                                Avställd
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {!selectionMode && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDeleteClick(lead, e)}
                              className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {!selectionMode && (
                            <Button size="sm" className="gap-1">
                              Öppna
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Single Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Ta bort lead
            </AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort denna lead? Detta tar även bort alla
              tillhörande fordon och samtalsloggar. Åtgärden kan inte ångras.
              {leadToDelete && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{leadToDelete.phone || 'Ingen telefon'}</p>
                  <p className="text-sm text-gray-600">{leadToDelete.owner_info || 'Okänd ägare'}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Tar bort...' : 'Ta bort'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Ta bort {selectedLeads.size} leads
            </AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort {selectedLeads.size} leads? Detta tar även bort alla
              tillhörande fordon och samtalsloggar. Åtgärden kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Tar bort...' : `Ta bort ${selectedLeads.size} leads`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
