'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { DynamicTable } from '@/components/shared/dynamic-table'
import { LEAD_COLUMNS, LEAD_COLUMN_GROUPS, STORAGE_KEYS } from '@/lib/table-columns'
import {
  renderLeadCell,
  type LeadData,
  type LeadVehicle,
} from '@/components/shared/lead-cell-renderers'
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
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { DeleteIconButton } from '@/components/ui/delete-icon-button'
import { LeadDetailModal } from '@/components/shared/lead-detail-modal'
import {
  type MileageHistoryEntry,
  type OwnerHistoryEntry,
  type AddressVehicle,
} from '@/components/shared/vehicle-popovers'
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
  Search,
  X,
  Loader2,
  Car,
  MessageSquare,
  Calendar,
  ExternalLink,
  Filter,
  PhoneCall,
  MailCheck,
  Trash2,
  Database,
  MapPin,
  ChevronDown,
  Send,
  FileText,
  MoreHorizontal,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'
import { deleteLead, bulkDeleteLeads, restoreLeads } from '@/app/actions/leads'
import { bulkActivateLeads } from '@/app/actions/vehicles'
import { FilterPresets } from '@/components/ui/filter-presets'

interface Vehicle {
  id: string
  reg_nr?: string
  make?: string
  model?: string
  year?: number
  mileage?: number
  color?: string
  transmission?: string
  horsepower?: number
  fuel_type?: string
  in_traffic?: boolean
  four_wheel_drive?: boolean
  engine_cc?: number
  is_interesting?: boolean
  ai_score?: number
  carinfo_fetched_at?: string
  antal_agare?: number
  skatt?: number
  valuation_company?: number
  valuation_private?: number
  besiktning_till?: string
  mileage_history?: MileageHistoryEntry[] | null
  owner_history?: OwnerHistoryEntry[] | null
  owner_vehicles?: AddressVehicle[] | null
  address_vehicles?: AddressVehicle[] | null
  owner_gender?: string
  owner_type?: string
  biluppgifter_fetched_at?: string
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
  bilprospekt_date?: string | null
  extra_data?: Record<string, unknown>
  created_at: string
  owner_age?: number
  owner_gender?: string
  owner_type?: string
  vehicles: Vehicle[]
  call_logs: CallLog[]
}

interface ProspectTypeOption {
  id: string
  name: string
  description: string | null
  color: string
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
  savedProspectTypes: ProspectTypeOption[]
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
  availableExtraColumns = [],
  savedProspectTypes
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

  // Lead detail modal
  const [detailModalLead, setDetailModalLead] = useState<Lead | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)

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

    const deletedId = deleteLeadId
    setIsDeleting(true)
    try {
      const result = await deleteLead(deletedId)
      if (result.success) {
        setDeleteLeadId(null)
        setSelectedIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(deletedId)
          return newSet
        })
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

    const deletedIds = Array.from(selectedIds)
    setIsDeleting(true)
    try {
      const result = await bulkDeleteLeads(deletedIds)
      if (result.success) {
        setShowBulkDeleteDialog(false)
        setSelectedIds(new Set())
        router.refresh()
        toast.success(`${result.deletedCount} leads flyttade till papperskorgen`, {
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
        toast.error(result.error || 'Kunde inte radera leads')
      }
    } catch {
      toast.error('Ett fel uppstod')
    } finally {
      setIsDeleting(false)
    }
  }, [selectedIds, router])

  // Copy phone to clipboard
  const handleCopyPhone = async (phone: string, e: React.MouseEvent) => {
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

  // Open detail modal
  const handleOpenDetailModal = (lead: Lead) => {
    setDetailModalLead(lead)
    setDetailModalOpen(true)
  }

  // Convert Lead to LeadData for renderLeadCell
  const toLeadData = (lead: Lead): LeadData => ({
    id: lead.id,
    phone: lead.phone,
    owner_info: lead.owner_info,
    location: lead.location,
    status: lead.status,
    county: lead.county,
    owner_age: lead.owner_age,
    owner_gender: lead.owner_gender,
    owner_type: lead.owner_type,
    created_at: lead.created_at,
    bilprospekt_date: lead.bilprospekt_date,
    prospect_type: lead.prospect_type,
    letter_sent: lead.letter_sent,
    letter_sent_date: lead.letter_sent_date,
    sent_to_call_at: lead.sent_to_call_at,
    sent_to_brev_at: lead.sent_to_brev_at,
    data_period_start: lead.data_period_start,
    vehicles: lead.vehicles.map(v => ({
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
      is_interesting: v.is_interesting,
      ai_score: v.ai_score,
      antal_agare: v.antal_agare,
      skatt: v.skatt,
      besiktning_till: v.besiktning_till,
      mileage_history: v.mileage_history,
      owner_history: v.owner_history,
      owner_vehicles: v.owner_vehicles,
      address_vehicles: v.address_vehicles,
      owner_gender: v.owner_gender,
      owner_type: v.owner_type,
      biluppgifter_fetched_at: v.biluppgifter_fetched_at,
      valuation_company: v.valuation_company,
      valuation_private: v.valuation_private,
      senaste_avstallning: v.senaste_avställning,
      senaste_pastallning: v.senaste_påställning,
      senaste_agarbyte: v.senaste_agarbyte,
      antal_foretagsannonser: v.antal_foretagsannonser,
      antal_privatannonser: v.antal_privatannonser,
    })) as LeadVehicle[],
    call_logs: lead.call_logs,
  })

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
      <DynamicTable
        data={leads}
        columns={LEAD_COLUMNS}
        columnGroups={LEAD_COLUMN_GROUPS}
        storageKey={STORAGE_KEYS.historik}
        defaultColumns={[
          'reg_number', 'brand', 'model', 'car_year', 'mileage',
          'owner_history', 'address_vehicles', 'owner_name', 'county',
          'prospekt_type', 'status', 'activity', 'bp_date', 'data_date',
          'antal_agare', 'valuation_company', 'valuation_private',
          'besiktning_till', 'senaste_avstallning', 'senaste_pastallning',
          'senaste_agarbyte', 'antal_foretagsannonser', 'antal_privatannonser',
          'in_traffic', 'actions'
        ]}
        getItemId={(lead) => lead.id}
        onRowClick={handleOpenDetailModal}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        renderCell={(columnId, lead) => {
          const vehicle = lead.vehicles?.[0]
          const leadData = toLeadData(lead)

          // Custom prospekt_type with saved types color
          if (columnId === 'prospekt_type') {
            if (!lead.prospect_type) return <span className="text-gray-400 text-sm">-</span>
            const savedType = savedProspectTypes.find(t => t.name === lead.prospect_type)
            return (
              <Badge variant="outline" className="text-xs">
                <span className="flex items-center gap-1.5">
                  {savedType && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: savedType.color }}
                    />
                  )}
                  {savedType?.description || lead.prospect_type}
                </span>
              </Badge>
            )
          }

          // Custom actions for historik page
          if (columnId === 'actions') {
            const callCount = lead.call_logs?.length || 0
            return (
              <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleOpenDetailModal(lead)}
                      >
                        <ExternalLink className="h-4 w-4 text-gray-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Visa detaljer</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                        <ArrowRight className="h-4 w-4 text-gray-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Visa lead</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DeleteIconButton
                  onClick={() => setDeleteLeadId(lead.id)}
                  tooltip="Radera lead"
                />
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
                    <DropdownMenuItem onClick={() => router.push(`/leads/${lead.id}`)}>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Gå till leads
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          }

          return renderLeadCell({
            columnId,
            lead: leadData,
            vehicle: vehicle as LeadVehicle | undefined,
            onRowClick: () => handleOpenDetailModal(lead),
            onCopyPhone: handleCopyPhone,
            copiedPhone,
          })
        }}
        renderSelectionBar={(count, clearSel) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSel}
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
                  clearSel()
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
                  clearSel()
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
              Radera {count} leads
            </Button>
          </div>
        )}
        emptyState={
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
        }
      />

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
      <DeleteConfirmDialog
        open={!!deleteLeadId}
        onOpenChange={(open) => !open && setDeleteLeadId(null)}
        count={1}
        onConfirm={handleDeleteSingle}
        isDeleting={isDeleting}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        count={selectedIds.size}
        onConfirm={handleBulkDelete}
        isDeleting={isDeleting}
      />

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={detailModalLead ? {
          id: detailModalLead.id,
          phone: detailModalLead.phone || null,
          owner_info: detailModalLead.owner_info || null,
          location: detailModalLead.location || null,
          status: detailModalLead.status,
          source: null,
          county: detailModalLead.county || null,
          owner_age: detailModalLead.owner_age || null,
          owner_gender: detailModalLead.owner_gender || null,
          owner_type: detailModalLead.owner_type || null,
          created_at: detailModalLead.created_at,
          vehicles: detailModalLead.vehicles.map(v => ({
            id: v.id,
            reg_nr: v.reg_nr || null,
            make: v.make || null,
            model: v.model || null,
            year: v.year || null,
            fuel_type: v.fuel_type || null,
            mileage: v.mileage || null,
            color: v.color || null,
            transmission: v.transmission || null,
            horsepower: v.horsepower || null,
            in_traffic: v.in_traffic ?? true,
            four_wheel_drive: v.four_wheel_drive ?? false,
            engine_cc: v.engine_cc ?? null,
            antal_agare: v.antal_agare || null,
            skatt: v.skatt || null,
            besiktning_till: v.besiktning_till || null,
            mileage_history: v.mileage_history as { date: string; mileage_km: number; mileage_mil?: number; type?: string }[] | null,
            owner_history: v.owner_history as { date: string; name?: string; type: string; owner_class?: string; details?: string }[] | null,
            owner_vehicles: v.owner_vehicles as { regnr: string; description?: string; model?: string; color?: string; status?: string; mileage?: number; year?: number; ownership_time?: string }[] | null,
            address_vehicles: v.address_vehicles as { regnr: string; description?: string; model?: string; color?: string; status?: string; mileage?: number; year?: number; ownership_time?: string }[] | null,
            owner_gender: v.owner_gender || null,
            owner_type: v.owner_type || null,
            biluppgifter_fetched_at: v.biluppgifter_fetched_at || null,
          }))
        } : null}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onUpdate={() => router.refresh()}
      />
    </div>
  )
}
