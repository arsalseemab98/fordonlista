'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Mail,
  Download,
  Check,
  PhoneOff,
  Send,
  Clock,
  FileSpreadsheet,
  Trash2,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { markLetterSent } from '@/app/actions/letters'
import { deleteLead, bulkDeleteLeads, restoreLeads } from '@/app/actions/leads'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'

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
  owner_history: OwnerHistoryEntry[] | unknown[] | null
  owner_vehicles: AddressVehicle[] | unknown[] | null
  address_vehicles: AddressVehicle[] | unknown[] | null
  owner_gender: string | null
  owner_type: string | null
  biluppgifter_fetched_at: string | null
}

interface Lead {
  id: string
  owner_info: string | null
  location: string | null
  phone: string | null
  letter_sent: boolean | null
  letter_sent_date: string | null
  bilprospekt_date?: string | null
  source: string | null
  county: string | null
  sent_to_brev_at?: string | null
  created_at: string
  status: string
  owner_age: number | null
  owner_gender: string | null
  owner_type: string | null
  vehicles: Vehicle[]
}

interface BrevMonthlyStats {
  month: string
  lettersSent: number
  cost: number
  conversions: number
  conversionRate: number
}

interface LetterListProps {
  leads: Lead[]
  counts: {
    total: number
    pending: number
    noPhone: number
    notSent: number
    sent: number
  }
  currentFilter: string
  letterCost: number
  monthlyStats: BrevMonthlyStats[]
}

export function LetterList({ leads, counts, currentFilter, letterCost, monthlyStats }: LetterListProps) {
  const router = useRouter()
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [isMarking, setIsMarking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [fromPlayground, setFromPlayground] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)

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

  // Get current month in YYYY-MM format
  const currentMonth = format(new Date(), 'yyyy-MM')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  // Get stats for selected month
  const selectedMonthStats = monthlyStats.find(s => s.month === selectedMonth) || {
    month: selectedMonth,
    lettersSent: 0,
    cost: 0,
    conversions: 0,
    conversionRate: 0
  }

  // Check for leads sent from playground via localStorage
  useEffect(() => {
    const storedIds = localStorage.getItem('brevLeadIds')
    if (storedIds) {
      try {
        const leadIds: string[] = JSON.parse(storedIds)
        const validIds = leadIds.filter(id => leads.some(l => l.id === id))
        if (validIds.length > 0) {
          setSelectedLeads(new Set(validIds))
          setFromPlayground(true)
          toast.info(`${validIds.length} leads förvalda från playground`)
        }
        localStorage.removeItem('brevLeadIds')
      } catch {
        localStorage.removeItem('brevLeadIds')
      }
    }
  }, [leads])

  const filters = [
    { key: 'not_sent', label: 'Ej skickat', count: counts.notSent, icon: Clock },
    { key: 'pending', label: 'Väntar', count: counts.pending, icon: Clock, color: 'amber' },
    { key: 'no_phone', label: 'Utan telefon', count: counts.noPhone, icon: PhoneOff },
    { key: 'sent', label: 'Skickat', count: counts.sent, icon: Check },
    { key: 'all', label: 'Alla', count: counts.total, icon: Mail },
  ]

  const handleFilterChange = (filter: string) => {
    router.push(`/brev?filter=${filter}`)
  }

  const loadPresetFilters = (presetFilters: { [key: string]: string | string[] | boolean | number | null | undefined }) => {
    const params = new URLSearchParams()
    if (presetFilters.filter && presetFilters.filter !== 'all') {
      params.set('filter', String(presetFilters.filter))
    }
    router.push(`/brev${params.toString() ? '?' + params.toString() : ''}`)
  }

  const currentFilters = {
    filter: currentFilter
  }

  const handleMarkSent = async () => {
    if (selectedLeads.size === 0) {
      toast.error('Välj minst en lead')
      return
    }

    setIsMarking(true)
    const result = await markLetterSent(Array.from(selectedLeads))
    setIsMarking(false)

    if (result.success) {
      toast.success(`${selectedLeads.size} leads markerade som skickade`)
      setSelectedLeads(new Set())
      router.refresh()
    } else {
      toast.error(result.error || 'Kunde inte markera som skickade')
    }
  }

  const handleDeleteClick = (lead: Lead, e: React.MouseEvent) => {
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

  const handleExportCSV = () => {
    setIsExporting(true)

    const leadsToExport = selectedLeads.size > 0
      ? leads.filter(l => selectedLeads.has(l.id))
      : leads

    const csvRows: string[][] = []
    csvRows.push(['REG_NR', 'MÄRKE', 'MODELL', 'ÅR', 'ÄGARE', 'ORT'])

    leadsToExport.forEach(lead => {
      lead.vehicles.forEach(vehicle => {
        if (vehicle.reg_nr) {
          csvRows.push([
            vehicle.reg_nr || '',
            vehicle.make || '',
            vehicle.model || '',
            vehicle.year?.toString() || '',
            lead.owner_info || '',
            lead.location || ''
          ])
        }
      })
    })

    const csvContent = csvRows
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `brevlista_${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setIsExporting(false)
    toast.success(`Exporterade ${csvRows.length - 1} rader`)
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
    bilprospekt_date: lead.bilprospekt_date,
    vehicles: lead.vehicles as LeadVehicle[],
  })

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map(filter => {
          const Icon = filter.icon
          const isActive = currentFilter === filter.key
          const isAmber = 'color' in filter && filter.color === 'amber'
          return (
            <Button
              key={filter.key}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange(filter.key)}
              className={cn(
                'gap-2',
                isActive && isAmber && 'bg-amber-600 hover:bg-amber-700',
                isActive && !isAmber && 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {filter.label}
              <Badge
                variant="secondary"
                className={cn(
                  'ml-1',
                  isActive && isAmber ? 'bg-amber-500 text-white' : '',
                  isActive && !isAmber ? 'bg-blue-500 text-white' : '',
                  !isActive ? 'bg-gray-100' : ''
                )}
              >
                {filter.count}
              </Badge>
            </Button>
          )
        })}

        <FilterPresets
          page="brev"
          currentFilters={currentFilters as { [key: string]: string | string[] | boolean | number | null | undefined }}
          onLoadPreset={loadPresetFilters}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{counts.notSent}</p>
                <p className="text-xs text-blue-600">Att skicka</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-600 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{counts.pending}</p>
                <p className="text-xs text-amber-600">Granskas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <Check className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{counts.sent}</p>
                <p className="text-xs text-green-600">Skickade</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-600 rounded-lg">
                <PhoneOff className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-700">{counts.noPhone}</p>
                <p className="text-xs text-gray-600">Utan telefon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700">{counts.total}</p>
                <p className="text-xs text-purple-600">Totalt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month Stats - Collapsible */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none py-3"
          onClick={() => setAnalyticsOpen(!analyticsOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <div className="flex items-center gap-3">
                <Select
                  value={selectedMonth}
                  onValueChange={setSelectedMonth}
                >
                  <SelectTrigger
                    className="w-[180px] h-9 bg-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={currentMonth}>
                      {format(new Date(), 'MMMM yyyy', { locale: sv })} (nu)
                    </SelectItem>
                    {monthlyStats
                      .filter(s => s.month !== currentMonth)
                      .map(stat => (
                        <SelectItem key={stat.month} value={stat.month}>
                          {format(parseISO(stat.month + '-01'), 'MMMM yyyy', { locale: sv })}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <span className="text-lg font-semibold text-blue-700">
                  {selectedMonthStats.lettersSent} brev
                </span>
                <span className="text-sm text-muted-foreground">
                  · {selectedMonthStats.cost.toLocaleString('sv-SE')} kr
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-600 font-medium">
                  {selectedMonthStats.conversions} konv.
                </span>
                <Badge className={cn(
                  selectedMonthStats.conversionRate >= 5 ? 'bg-green-100 text-green-700' :
                  selectedMonthStats.conversionRate > 0 ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-500'
                )}>
                  {selectedMonthStats.conversionRate.toFixed(1)}%
                </Badge>
              </div>
              {analyticsOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>
        {analyticsOpen && monthlyStats.length > 0 && (
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Månad</TableHead>
                  <TableHead className="text-right">Brev</TableHead>
                  <TableHead className="text-right">Kostnad</TableHead>
                  <TableHead className="text-right">Konv.</TableHead>
                  <TableHead className="text-right">Konv.grad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyStats.map(stat => (
                  <TableRow
                    key={stat.month}
                    className={cn(
                      stat.month === selectedMonth && 'bg-blue-50',
                      'cursor-pointer hover:bg-gray-50'
                    )}
                    onClick={() => setSelectedMonth(stat.month)}
                  >
                    <TableCell className="font-medium">
                      {format(parseISO(stat.month + '-01'), 'MMM yyyy', { locale: sv })}
                      {stat.month === currentMonth && (
                        <Badge variant="outline" className="ml-2 text-xs">nu</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{stat.lettersSent}</TableCell>
                    <TableCell className="text-right">{stat.cost.toLocaleString('sv-SE')} kr</TableCell>
                    <TableCell className="text-right">{stat.conversions}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={cn(
                          stat.conversionRate >= 5 ? 'bg-green-100 text-green-700' :
                          stat.conversionRate > 0 ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-400'
                        )}
                      >
                        {stat.conversionRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedLeads.size > 0
              ? `${selectedLeads.size} valda`
              : `${leads.length} leads`}
          </span>
          {selectedLeads.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedLeads(new Set())}
              className="text-gray-500"
            >
              <X className="h-4 w-4 mr-1" />
              Avmarkera
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={isExporting || leads.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportera CSV
            {selectedLeads.size > 0 && ` (${selectedLeads.size})`}
          </Button>

          {selectedLeads.size > 0 && currentFilter !== 'sent' && (
            <Button
              onClick={handleMarkSent}
              disabled={isMarking}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4" />
              Markera skickat
            </Button>
          )}

          {selectedLeads.size > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDeleteClick}
              disabled={isDeleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Ta bort ({selectedLeads.size})
            </Button>
          )}
        </div>
      </div>

      {/* Leads Table */}
      {leads.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Mail className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Inga leads att visa</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                {currentFilter === 'sent'
                  ? 'Inga brev har markerats som skickade ännu.'
                  : currentFilter === 'no_phone'
                  ? 'Inga leads utan telefonnummer hittades.'
                  : currentFilter === 'pending'
                  ? 'Inga leads väntar på granskning.'
                  : 'Skicka leads till brevlistan från Bilprospekt eller Playground.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DynamicTable
          data={leads}
          columns={LEAD_COLUMNS}
          columnGroups={LEAD_COLUMN_GROUPS}
          storageKey={STORAGE_KEYS.brev}
          getItemId={(lead) => lead.id}
          onRowClick={handleRowClick}
          selectedIds={selectedLeads}
          onSelectionChange={setSelectedLeads}
          renderCell={(columnId, lead) => {
            const vehicle = lead.vehicles?.[0]
            // Custom status for brev page
            if (columnId === 'status') {
              return (
                <div className="flex items-center gap-1">
                  {lead.letter_sent ? (
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      <Check className="h-3 w-3 mr-0.5" />
                      Skickat
                    </Badge>
                  ) : lead.status === 'pending_review' ? (
                    <Badge className="bg-amber-100 text-amber-700 text-xs">
                      <Clock className="h-3 w-3 mr-0.5" />
                      Granskas
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Redo</Badge>
                  )}
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
        />
      )}

      {/* Export Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Export-format (CSV)</p>
              <p className="mt-1">
                Kolumner: <strong>REG_NR</strong>, MÄRKE, MODELL, ÅR, ÄGARE, ORT
              </p>
              <p className="text-blue-600 mt-1">
                Filen kan öppnas direkt i Excel med svensk teckenkodning.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
            four_wheel_drive: v.four_wheel_drive,
            engine_cc: v.engine_cc,
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
        actions={selectedLead && !selectedLead.letter_sent && (
          <Button
            onClick={async () => {
              const result = await markLetterSent([selectedLead.id])
              if (result.success) {
                toast.success('Markerad som skickad')
                setIsModalOpen(false)
                router.refresh()
              }
            }}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4" />
            Markera som skickat
          </Button>
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
            <p className="font-medium text-gray-900">{leadToDelete.owner_info || 'Okänd ägare'}</p>
            <p className="text-sm text-gray-600">{leadToDelete.vehicles.length} fordon</p>
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
