'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Phone,
  Mail,
  Search,
  X,
  Loader2,
  Car,
  Copy,
  Check,
  MessageSquare,
  Calendar,
  Clock,
  ExternalLink,
  Filter,
  PhoneCall,
  MailCheck,
  Trash2,
  AlertTriangle,
  Database,
  MapPin,
  ChevronDown,
  Send,
  FileText,
  MoreHorizontal,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'
import { deleteLead, bulkDeleteLeads } from '@/app/actions/leads'
import { bulkActivateLeads } from '@/app/actions/vehicles'
import { FilterPresets } from '@/components/ui/filter-presets'

interface Vehicle {
  id: string
  reg_nr?: string
  make?: string
  model?: string
  year?: number
  mileage?: number
  in_traffic?: boolean
  is_interesting?: boolean
  ai_score?: number
  carinfo_fetched_at?: string
  antal_agare?: number
  valuation_company?: number
  valuation_private?: number
  besiktning_till?: string
  senaste_avställning?: string
  senaste_påställning?: string
  senaste_agarbyte?: string
  antal_foretagsannonser?: number
  antal_privatannonser?: number
}

interface CallLog {
  id: string
  called_at: string
  result: string
  notes?: string
  follow_up_date?: string
}

interface Lead {
  id: string
  phone?: string
  owner_info?: string
  location?: string
  status: string
  county?: string
  prospect_type?: string
  letter_sent?: boolean | null
  letter_sent_date?: string | null
  sent_to_call_at?: string | null
  sent_to_brev_at?: string | null
  data_period_start?: string | null
  extra_data?: Record<string, unknown>
  created_at: string
  vehicles: Vehicle[]
  call_logs: CallLog[]
}

interface HistorikViewProps {
  leads: Lead[]
  totalCount: number
  filteredCount: number
  calledCount: number
  letterSentCount: number
  pendingCount: number
  sentToCallCount: number
  sentToBrevCount: number
  currentFilter: string
  currentSearch?: string
  currentLimit: string
  currentSort: string
  availableCounties: string[]
  currentCounty?: string
  availableExtraColumns?: string[]
}

const ROW_LIMITS = [
  { value: '50', label: '50 rader' },
  { value: '100', label: '100 rader' },
  { value: 'all', label: 'Alla' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Senaste först' },
  { value: 'oldest', label: 'Äldsta först' },
  { value: 'name_asc', label: 'Namn A-Ö' },
  { value: 'name_desc', label: 'Namn Ö-A' },
]

const FILTER_TABS = [
  { value: 'all', label: 'Alla', icon: Database },
  { value: 'ring', label: 'Ring', icon: PhoneCall },
  { value: 'brev', label: 'Brev', icon: FileText },
  { value: 'pending', label: 'Pending', icon: Filter },
]

function formatMileage(mileage?: number): string {
  if (!mileage) return '-'
  return `${mileage.toLocaleString('sv-SE')} km`
}

function formatValuation(value?: number): string {
  if (!value) return '-'
  return `${(value / 1000).toFixed(0)}k`
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    return format(new Date(dateStr), 'yy-MM-dd')
  } catch {
    return '-'
  }
}

export function HistorikView({
  leads,
  totalCount,
  filteredCount,
  calledCount,
  letterSentCount,
  pendingCount,
  sentToCallCount,
  sentToBrevCount,
  currentFilter,
  currentSearch,
  currentLimit,
  currentSort,
  availableCounties,
  currentCounty,
  availableExtraColumns = []
}: HistorikViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(currentSearch || '')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Call logs detail dialog
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Delete dialogs
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const updateFilter = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())

    // For 'filter' key, delete when 'all' (default behavior)
    // For 'limit' key, keep 'all' as a value so it persists
    if (key === 'filter') {
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    } else {
      // For limit and other keys, always set the value
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }

    startTransition(() => {
      router.push(`/historik?${params.toString()}`)
    })
  }, [router, searchParams])

  const handleSearch = useCallback(() => {
    updateFilter('search', searchValue || null)
  }, [searchValue, updateFilter])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  const clearSearch = useCallback(() => {
    setSearchValue('')
    updateFilter('search', null)
  }, [updateFilter])

  // Load preset filters and apply them to URL
  const loadPresetFilters = useCallback((filters: Record<string, string | string[] | boolean | number | null | undefined>) => {
    const params = new URLSearchParams()

    if (filters.filter) params.set('filter', String(filters.filter))
    if (filters.county) params.set('county', String(filters.county))
    if (filters.search) {
      params.set('search', String(filters.search))
      setSearchValue(String(filters.search))
    }
    if (filters.limit) params.set('limit', String(filters.limit))
    if (filters.sort) params.set('sort', String(filters.sort))

    startTransition(() => {
      router.push(`/historik?${params.toString()}`)
    })
  }, [router])

  const copyRegNr = useCallback((regNr: string, vehicleId: string) => {
    navigator.clipboard.writeText(regNr)
    setCopiedId(vehicleId)
    toast.success(`Kopierade ${regNr}`)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const openDetailDialog = useCallback((lead: Lead) => {
    setSelectedLead(lead)
    setDetailDialogOpen(true)
  }, [])

  // Selection handlers
  const toggleSelection = useCallback((leadId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(leadId)) {
        newSet.delete(leadId)
      } else {
        newSet.add(leadId)
      }
      return newSet
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)))
    }
  }, [leads, selectedIds.size])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Multi-select county handler
  const toggleCounty = useCallback((countyValue: string) => {
    const currentCounties = currentCounty ? currentCounty.split(',') : []
    let newCounties: string[]
    if (currentCounties.includes(countyValue)) {
      newCounties = currentCounties.filter(c => c !== countyValue)
    } else {
      newCounties = [...currentCounties, countyValue]
    }
    updateFilter('county', newCounties.length > 0 ? newCounties.join(',') : null)
  }, [currentCounty, updateFilter])

  const selectedCounties = currentCounty ? currentCounty.split(',') : []

  const clearCountyFilter = useCallback(() => {
    updateFilter('county', null)
  }, [updateFilter])

  // Delete handlers
  const handleDeleteSingle = useCallback(async () => {
    if (!deleteLeadId) return

    setIsDeleting(true)
    try {
      const result = await deleteLead(deleteLeadId)
      if (result.success) {
        toast.success('Lead raderad')
        setDeleteLeadId(null)
        setSelectedIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(deleteLeadId)
          return newSet
        })
        router.refresh()
      } else {
        toast.error(result.error || 'Kunde inte radera lead')
      }
    } catch {
      toast.error('Ett fel uppstod')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteLeadId, router])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return

    setIsDeleting(true)
    try {
      const result = await bulkDeleteLeads(Array.from(selectedIds))
      if (result.success) {
        toast.success(`${result.deletedCount} leads raderade`)
        setShowBulkDeleteDialog(false)
        setSelectedIds(new Set())
        router.refresh()
      } else {
        toast.error(result.error || 'Kunde inte radera leads')
      }
    } catch {
      toast.error('Ett fel uppstod')
    } finally {
      setIsDeleting(false)
    }
  }, [selectedIds, router])

  const getResultBadgeColor = (result: string) => {
    switch (result.toLowerCase()) {
      case 'intresserad':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'ej intresserad':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'inget svar':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'ring tillbaka':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'bokad visning':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'upptaget':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'fel nummer':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            currentFilter === 'all' && "ring-2 ring-gray-500"
          )}
          onClick={() => updateFilter('filter', 'all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Alla</p>
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Database className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            currentFilter === 'ring' && "ring-2 ring-blue-500"
          )}
          onClick={() => updateFilter('filter', 'ring')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ring</p>
                <p className="text-2xl font-bold text-blue-600">{sentToCallCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <PhoneCall className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            currentFilter === 'brev' && "ring-2 ring-orange-500"
          )}
          onClick={() => updateFilter('filter', 'brev')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Brev</p>
                <p className="text-2xl font-bold text-orange-600">{sentToBrevCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            currentFilter === 'pending' && "ring-2 ring-purple-500"
          )}
          onClick={() => updateFilter('filter', 'pending')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-purple-600">{pendingCount}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Filter className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Sök på reg.nr, ägare, telefon, anteckningar..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-20"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSearch}
            disabled={isPending}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Sök'
            )}
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={currentFilter === tab.value ? "default" : "ghost"}
              size="sm"
              onClick={() => updateFilter('filter', tab.value)}
              className={cn(
                "gap-2",
                currentFilter === tab.value && "bg-white shadow-sm"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Row Limit Selector */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {ROW_LIMITS.map((limit) => (
            <Button
              key={limit.value}
              variant={currentLimit === limit.value ? "default" : "ghost"}
              size="sm"
              onClick={() => updateFilter('limit', limit.value)}
              className={cn(
                currentLimit === limit.value && "bg-white shadow-sm"
              )}
            >
              {limit.label}
            </Button>
          ))}
        </div>

        {/* Sort Selector */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {SORT_OPTIONS.map((sort) => (
            <Button
              key={sort.value}
              variant={currentSort === sort.value ? "default" : "ghost"}
              size="sm"
              onClick={() => updateFilter('sort', sort.value)}
              className={cn(
                currentSort === sort.value && "bg-white shadow-sm"
              )}
            >
              {sort.label}
            </Button>
          ))}
        </div>

        {/* County Multi-Select Filter */}
        {availableCounties.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-2 min-w-[140px] justify-between",
                  selectedCounties.length > 0 && "border-blue-500 bg-blue-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {selectedCounties.length > 0
                    ? `${selectedCounties.length} län valda`
                    : 'Välj län'
                  }
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {availableCounties.sort().map((county) => (
                  <label
                    key={county}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedCounties.includes(county)}
                      onCheckedChange={() => toggleCounty(county)}
                    />
                    <span className="text-sm">{county}</span>
                  </label>
                ))}
              </div>
              {selectedCounties.length > 0 && (
                <div className="border-t mt-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-gray-500"
                    onClick={clearCountyFilter}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rensa filter
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}

        {/* Clear search */}
        {currentSearch && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="gap-1.5 text-gray-500"
          >
            <X className="h-4 w-4" />
            Rensa sök
          </Button>
        )}

        {/* Filter presets */}
        <FilterPresets
          page="historik"
          currentFilters={{
            filter: currentFilter,
            county: currentCounty,
            search: currentSearch,
            limit: currentLimit,
            sort: currentSort
          }}
          onLoadPreset={loadPresetFilters}
        />
      </div>

      {/* Active filter badges */}
      {(currentSearch || selectedCounties.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {currentSearch && (
            <>
              <span className="text-sm text-gray-500">Söker:</span>
              <Badge variant="secondary" className="gap-1">
                {currentSearch}
                <button
                  onClick={clearSearch}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </>
          )}
          {selectedCounties.length > 0 && (
            <>
              <span className="text-sm text-gray-500">Län:</span>
              {selectedCounties.map(county => (
                <Badge key={county} variant="secondary" className="gap-1 bg-blue-50 text-blue-700">
                  <MapPin className="h-3 w-3" />
                  {county}
                  <button
                    onClick={() => toggleCounty(county)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </>
          )}
        </div>
      )}

      {/* Selection bar and Results count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Visar <strong className="text-gray-900">{leads.length}</strong>
          {filteredCount > leads.length && (
            <> av <strong className="text-gray-900">{filteredCount}</strong></>
          )} leads
          {filteredCount !== totalCount && (
            <span className="text-gray-400 ml-1">
              (totalt {totalCount} i databasen)
            </span>
          )}
          {selectedIds.size > 0 && (
            <span className="ml-2 text-blue-600">
              ({selectedIds.size} markerade)
            </span>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
            >
              Avmarkera alla
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const result = await bulkActivateLeads(Array.from(selectedIds), 'new', 'call')
                if (result.success) {
                  toast.success(`${selectedIds.size} leads skickade till ringlistan`)
                  clearSelection()
                  router.refresh()
                } else {
                  toast.error(result.error || 'Kunde inte skicka till ringlistan')
                }
              }}
              className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Send className="h-4 w-4" />
              Skicka till ring
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const result = await bulkActivateLeads(Array.from(selectedIds), 'new', 'brev')
                if (result.success) {
                  toast.success(`${selectedIds.size} leads skickade till brevlistan`)
                  clearSelection()
                  router.refresh()
                } else {
                  toast.error(result.error || 'Kunde inte skicka till brevlistan')
                }
              }}
              className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <FileText className="h-4 w-4" />
              Skicka till brev
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Radera {selectedIds.size} leads
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {leads.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Car className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="font-medium">Ingen historik hittades</p>
              <p className="text-sm mt-1">
                {currentFilter === 'called'
                  ? 'Inga leads har ringts ännu'
                  : currentFilter === 'letter_sent'
                    ? 'Inga brev har skickats ännu'
                    : 'Ingen aktivitet har registrerats ännu'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={leads.length > 0 && selectedIds.size === leads.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Välj alla"
                    />
                  </TableHead>
                  <TableHead className="w-[100px]">Reg.nr</TableHead>
                  <TableHead>Märke / Modell</TableHead>
                  <TableHead className="w-[60px]">År</TableHead>
                  <TableHead className="w-[90px]">Miltal</TableHead>
                  <TableHead>Ägare</TableHead>
                  <TableHead className="w-[100px]">Län</TableHead>
                  <TableHead className="w-[120px]">Prospekt-typ</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Aktivitet</TableHead>
                  <TableHead className="w-[90px]">Datum</TableHead>
                  <TableHead className="w-[60px] text-center">Ägare</TableHead>
                  <TableHead className="w-[70px] text-center">Värd. F</TableHead>
                  <TableHead className="w-[70px] text-center">Värd. P</TableHead>
                  <TableHead className="w-[80px] text-center">Besikt.</TableHead>
                  <TableHead className="w-[80px] text-center">Avställd</TableHead>
                  <TableHead className="w-[80px] text-center">Påställd</TableHead>
                  <TableHead className="w-[80px] text-center">Ägarbyte</TableHead>
                  <TableHead className="w-[60px] text-center">Företag</TableHead>
                  <TableHead className="w-[60px] text-center">Privat</TableHead>
                  <TableHead className="w-[50px] text-center">Trafik</TableHead>
                  <TableHead className="w-[100px] text-center">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const primaryVehicle = lead.vehicles?.[0]
                  const callCount = lead.call_logs?.length || 0

                  return (
                    <TableRow
                      key={lead.id}
                      className={cn(
                        "hover:bg-gray-50",
                        selectedIds.has(lead.id) && "bg-blue-50"
                      )}
                    >
                      {/* Checkbox */}
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(lead.id)}
                          onCheckedChange={() => toggleSelection(lead.id)}
                          aria-label={`Välj ${lead.owner_info || 'lead'}`}
                        />
                      </TableCell>

                      {/* Reg.nr */}
                      <TableCell>
                        {primaryVehicle?.reg_nr ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                              {primaryVehicle.reg_nr}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyRegNr(primaryVehicle.reg_nr!, primaryVehicle.id)}
                            >
                              {copiedId === primaryVehicle.id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>

                      {/* Make / Model */}
                      <TableCell>
                        <span className="text-sm">
                          {[primaryVehicle?.make, primaryVehicle?.model]
                            .filter(Boolean)
                            .join(' ') || '-'}
                        </span>
                      </TableCell>

                      {/* Year */}
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {primaryVehicle?.year || '-'}
                        </span>
                      </TableCell>

                      {/* Mileage */}
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatMileage(primaryVehicle?.mileage)}
                        </span>
                      </TableCell>

                      {/* Owner */}
                      <TableCell>
                        <div className="max-w-[150px]">
                          <p className="text-sm truncate" title={lead.owner_info || ''}>
                            {lead.owner_info || '-'}
                          </p>
                          {lead.location && (
                            <p className="text-xs text-gray-400 truncate">
                              {lead.location}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* County */}
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {lead.county || '-'}
                        </span>
                      </TableCell>

                      {/* Prospekt-typ */}
                      <TableCell>
                        {lead.prospect_type ? (
                          <Badge variant="outline" className="text-xs">
                            {lead.prospect_type === 'avställda' && 'Avställda'}
                            {lead.prospect_type === 'nyköpt_bil' && 'Nyköpt bil'}
                            {lead.prospect_type === 'låg_miltal' && 'Låg miltal'}
                            {lead.prospect_type === 'alla' && 'Alla'}
                            {!['avställda', 'nyköpt_bil', 'låg_miltal', 'alla'].includes(lead.prospect_type) && lead.prospect_type}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            lead.status === 'new' && "bg-blue-50 text-blue-700 border-blue-200",
                            lead.status === 'pending_review' && "bg-yellow-50 text-yellow-700 border-yellow-200",
                            lead.status === 'to_call' && "bg-purple-50 text-purple-700 border-purple-200",
                            lead.status === 'called' && "bg-green-50 text-green-700 border-green-200",
                            lead.status === 'interested' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            lead.status === 'booked' && "bg-teal-50 text-teal-700 border-teal-200",
                            lead.status === 'bought' && "bg-cyan-50 text-cyan-700 border-cyan-200",
                            lead.status === 'not_interested' && "bg-gray-50 text-gray-700 border-gray-200",
                            lead.status === 'do_not_call' && "bg-red-50 text-red-700 border-red-200",
                            lead.status === 'callback' && "bg-orange-50 text-orange-700 border-orange-200",
                            lead.status === 'no_answer' && "bg-slate-50 text-slate-700 border-slate-200"
                          )}
                        >
                          {lead.status === 'new' && 'Ny'}
                          {lead.status === 'pending_review' && 'Granskas'}
                          {lead.status === 'to_call' && 'Att ringa'}
                          {lead.status === 'called' && 'Ringd'}
                          {lead.status === 'interested' && 'Intresserad'}
                          {lead.status === 'booked' && 'Bokad'}
                          {lead.status === 'bought' && 'Köpt'}
                          {lead.status === 'not_interested' && 'Ej intresserad'}
                          {lead.status === 'do_not_call' && 'Ring ej'}
                          {lead.status === 'callback' && 'Återkom'}
                          {lead.status === 'no_answer' && 'Inget svar'}
                          {!['new', 'pending_review', 'to_call', 'called', 'interested', 'booked', 'bought', 'not_interested', 'do_not_call', 'callback', 'no_answer'].includes(lead.status) && lead.status}
                        </Badge>
                      </TableCell>

                      {/* Activity indicators - moved to match playground */}
                      <TableCell>
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
                                <TooltipContent>Till ringlistan {formatDate(lead.sent_to_call_at)}</TooltipContent>
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
                                <TooltipContent>Till brevlistan {formatDate(lead.sent_to_brev_at)}</TooltipContent>
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
                                <TooltipContent>Brev skickat {lead.letter_sent_date ? formatDate(lead.letter_sent_date) : ''}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>

                      {/* Datum */}
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {lead.data_period_start ? formatDate(lead.data_period_start) : '-'}
                        </span>
                      </TableCell>

                      {/* Antal ägare */}
                      <TableCell className="text-center">
                        <span className="text-sm text-gray-600">
                          {primaryVehicle?.antal_agare ?? '-'}
                        </span>
                      </TableCell>

                      {/* Värdering Företag */}
                      <TableCell className="text-center">
                        <span className="text-sm text-gray-600">
                          {formatValuation(primaryVehicle?.valuation_company)}
                        </span>
                      </TableCell>

                      {/* Värdering Privat */}
                      <TableCell className="text-center">
                        <span className="text-sm text-gray-600">
                          {formatValuation(primaryVehicle?.valuation_private)}
                        </span>
                      </TableCell>

                      {/* Besiktning */}
                      <TableCell className="text-center">
                        <span className="text-sm text-gray-600">
                          {formatDate(primaryVehicle?.besiktning_till)}
                        </span>
                      </TableCell>

                      {/* Avställd */}
                      <TableCell className="text-center">
                        <span className="text-sm text-gray-600">
                          {formatDate(primaryVehicle?.senaste_avställning)}
                        </span>
                      </TableCell>

                      {/* Påställd */}
                      <TableCell className="text-center">
                        <span className="text-sm text-gray-600">
                          {formatDate(primaryVehicle?.senaste_påställning)}
                        </span>
                      </TableCell>

                      {/* Ägarbyte */}
                      <TableCell className="text-center">
                        <span className="text-sm text-gray-600">
                          {formatDate(primaryVehicle?.senaste_agarbyte)}
                        </span>
                      </TableCell>

                      {/* Företag annonser */}
                      <TableCell className="text-center">
                        <span className="text-sm text-gray-600">
                          {primaryVehicle?.antal_foretagsannonser ?? '-'}
                        </span>
                      </TableCell>

                      {/* Privat annonser */}
                      <TableCell className="text-center">
                        <span className="text-sm text-gray-600">
                          {primaryVehicle?.antal_privatannonser ?? '-'}
                        </span>
                      </TableCell>

                      {/* Trafik */}
                      <TableCell className="text-center">
                        {primaryVehicle?.in_traffic !== undefined ? (
                          primaryVehicle.in_traffic ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                              Ja
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                              Nej
                            </Badge>
                          )
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {callCount > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => openDetailDialog(lead)}
                                  >
                                    <MessageSquare className="h-4 w-4 text-gray-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Visa samtalshistorik</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => router.push(`/leads/${lead.id}`)}
                                >
                                  <ExternalLink className="h-4 w-4 text-gray-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Visa lead</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setDeleteLeadId(lead.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Radera lead</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* More actions dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4 text-gray-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={async () => {
                                  const result = await bulkActivateLeads([lead.id], 'new', 'call')
                                  if (result.success) {
                                    toast.success('Skickad till ringlistan')
                                    router.refresh()
                                  } else {
                                    toast.error(result.error || 'Kunde inte skicka')
                                  }
                                }}
                              >
                                <Send className="h-4 w-4 mr-2 text-blue-600" />
                                Skicka till ring
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  const result = await bulkActivateLeads([lead.id], 'new', 'brev')
                                  if (result.success) {
                                    toast.success('Skickad till brevlistan')
                                    router.refresh()
                                  } else {
                                    toast.error(result.error || 'Kunde inte skicka')
                                  }
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2 text-orange-600" />
                                Skicka till brev
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => router.push(`/leads/${lead.id}`)}
                              >
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Gå till leads
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Call History Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-green-600" />
              Samtalshistorik
            </DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-4">
              {/* Lead info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{selectedLead.owner_info || 'Okänd'}</p>
                    {selectedLead.phone && (
                      <a
                        href={`tel:${selectedLead.phone}`}
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        <Phone className="h-3 w-3" />
                        {selectedLead.phone}
                      </a>
                    )}
                  </div>
                  {selectedLead.vehicles?.[0]?.reg_nr && (
                    <Badge variant="outline" className="font-mono">
                      {selectedLead.vehicles[0].reg_nr}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Call logs timeline */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">
                  {selectedLead.call_logs?.length || 0} samtal registrerade
                </h4>

                {selectedLead.call_logs && selectedLead.call_logs.length > 0 ? (
                  <div className="space-y-3">
                    {selectedLead.call_logs.map((call, index) => (
                      <div
                        key={call.id}
                        className={cn(
                          "relative pl-6 pb-4",
                          index !== selectedLead.call_logs.length - 1 && "border-l-2 border-gray-200 ml-2"
                        )}
                      >
                        {/* Timeline dot */}
                        <div className="absolute left-0 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-green-500 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>

                        <div className="bg-white border rounded-lg p-3 shadow-sm ml-2">
                          <div className="flex items-start justify-between mb-2">
                            <Badge
                              variant="outline"
                              className={cn("text-xs", getResultBadgeColor(call.result))}
                            >
                              {call.result}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {format(new Date(call.called_at), 'PPP HH:mm', { locale: sv })}
                            </span>
                          </div>

                          {call.notes && (
                            <p className="text-sm text-gray-700 mt-2">
                              <MessageSquare className="h-3 w-3 inline mr-1 text-gray-400" />
                              {call.notes}
                            </p>
                          )}

                          {call.follow_up_date && (
                            <p className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Uppföljning: {format(new Date(call.follow_up_date), 'PPP', { locale: sv })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Inga samtal registrerade</p>
                )}
              </div>

              {/* Letter status */}
              {selectedLead.letter_sent && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                  <MailCheck className="h-5 w-5 text-amber-600" />
                  <span className="text-sm text-amber-700">Brev har skickats till denna lead</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteLeadId} onOpenChange={(open) => !open && setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Radera lead?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill radera denna lead? Detta kommer också radera alla tillhörande fordon och samtalsloggar. Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteLeadId(null)}
              disabled={isDeleting}
            >
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSingle}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Raderar...
                </>
              ) : (
                'Ja, radera'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Radera {selectedIds.size} leads?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill radera <strong>{selectedIds.size}</strong> leads? Detta kommer också radera alla tillhörande fordon och samtalsloggar. Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={isDeleting}
            >
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Raderar...
                </>
              ) : (
                `Ja, radera ${selectedIds.size} leads`
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
