'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Database,
  User,
  Building2,
  Gauge,
  Loader2,
  Phone,
  MapPin,
  Car,
  Info,
  CheckCircle2,
  Settings2,
  Download,
  Eye,
  EyeOff,
  History,
  Users,
  TrendingDown,
  Calendar,
} from 'lucide-react'
import { fetchMileageForProspects, checkBiluppgifterStatus } from '@/app/bilprospekt/actions'
import { toast } from 'sonner'
import { ProspectDetailModal } from './prospect-detail-modal'

interface AddressVehicle {
  regnr: string
  description?: string
  model?: string
  color?: string
  status?: string
  mileage?: number
  year?: number
  date_acquired?: string
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
  leasing: boolean
  credit: boolean
  seller_name: string | null
  chassis: string | null
  in_service: string | null
  cylinder_volume: number | null
  fwd: string | null
  new_or_old: string | null
  // Biluppgifter data
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
  sent_to_call_at: string | null
  sent_to_brev_at: string | null
}

interface BilprospektViewProps {
  prospects: Prospect[]
  totalCount: number
  currentPage: number
  pageSize: number
  currentFilters: {
    region?: string
    brand?: string
    model?: string
    fuel?: string
    kaross?: string
    municipality?: string
    ownerType?: string
    fwd?: string
    color?: string
    yearFrom?: number
    yearTo?: number
    possessionFrom?: number
    possessionTo?: number
    search?: string
    sort?: string
  }
  availableBrands: string[]
  availableModels: string[]
  availableFuels: string[]
  availableMunicipalities: string[]
  availableKarossTypes: string[]
  availableColors: string[]
}

// Column definitions
const ALL_COLUMNS = [
  { id: 'reg_number', label: 'Reg.nr', group: 'basic', default: true },
  { id: 'brand', label: 'Märke', group: 'basic', default: true },
  { id: 'model', label: 'Modell', group: 'basic', default: true },
  { id: 'car_year', label: 'År', group: 'basic', default: true },
  { id: 'fuel', label: 'Bränsle', group: 'basic', default: true },
  { id: 'mileage', label: 'Mil', group: 'basic', default: true },
  { id: 'color', label: 'Färg', group: 'vehicle', default: false },
  { id: 'kaross', label: 'Kaross', group: 'vehicle', default: false },
  { id: 'transmission', label: 'Växel', group: 'vehicle', default: false },
  { id: 'engine_power', label: 'HK', group: 'vehicle', default: false },
  { id: 'cylinder_volume', label: 'CC', group: 'vehicle', default: false },
  { id: 'fwd', label: '4WD', group: 'vehicle', default: false },
  { id: 'in_service', label: 'I trafik', group: 'vehicle', default: false },
  { id: 'chassis', label: 'Chassi', group: 'vehicle', default: false },
  { id: 'owner_name', label: 'Ägare', group: 'owner', default: false },
  { id: 'bu_owner_age', label: 'Ålder', group: 'biluppgifter', default: true },
  { id: 'bu_owner_phone', label: 'Telefon', group: 'biluppgifter', default: true },
  { id: 'bu_owner_address', label: 'Adress', group: 'biluppgifter', default: true },
  { id: 'municipality', label: 'Ort', group: 'owner', default: true },
  { id: 'bu_num_owners', label: 'Ägare #', group: 'biluppgifter', default: true },
  { id: 'bu_annual_tax', label: 'Skatt/år', group: 'biluppgifter', default: true },
  { id: 'bu_inspection_until', label: 'Besiktning', group: 'biluppgifter', default: true },
  { id: 'bu_address_vehicles', label: 'Fordon', group: 'biluppgifter', default: true },
  { id: 'bu_mileage_history', label: 'Milhistorik', group: 'biluppgifter', default: false },
  { id: 'bu_owner_history', label: 'Ägarhistorik', group: 'biluppgifter', default: false },
  { id: 'date_acquired', label: 'Köpt', group: 'owner', default: false },
  { id: 'possession', label: 'Innehav', group: 'owner', default: true },
  { id: 'seller_name', label: 'Inköpsplats', group: 'owner', default: false },
  { id: 'new_or_old', label: 'Ny/Begagnad', group: 'owner', default: false },
  { id: 'financing', label: 'Finansiering', group: 'owner', default: false },
]

const COLUMN_GROUPS = [
  { id: 'basic', label: 'Grundläggande' },
  { id: 'vehicle', label: 'Fordon' },
  { id: 'owner', label: 'Ägare' },
  { id: 'biluppgifter', label: 'Biluppgifter' },
]

const REGIONS = [
  { value: '25', label: 'Norrbotten' },
  { value: '24', label: 'Västerbotten' },
  { value: '22', label: 'Västernorrland' },
  { value: '23', label: 'Jämtland' },
  { value: '21', label: 'Gävleborg' },
  { value: '20', label: 'Dalarna' },
  { value: '01', label: 'Stockholm' },
  { value: '14', label: 'Västra Götaland' },
  { value: '12', label: 'Skåne' },
]

const STORAGE_KEY = 'bilprospektVisibleColumns'
const STORAGE_VERSION_KEY = 'bilprospektColumnsVersion'
const CURRENT_VERSION = 3 // Increment when changing default columns

// Helper to merge saved columns with new defaults (for new columns added after user saved)
function getMergedColumns(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.id))
  }

  const savedVersion = localStorage.getItem(STORAGE_VERSION_KEY)
  const saved = localStorage.getItem(STORAGE_KEY)

  // If no saved version or old version, add any new default columns
  if (!savedVersion || parseInt(savedVersion) < CURRENT_VERSION) {
    const savedArray: string[] = saved ? JSON.parse(saved) : []
    const savedSet = new Set<string>(savedArray)

    // Add any new default columns that weren't in the old saved set
    const newDefaults = ALL_COLUMNS.filter(c => c.default && !savedSet.has(c.id))
    newDefaults.forEach(c => savedSet.add(c.id))

    // Update storage with merged columns and new version
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(savedSet)))
    localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_VERSION))

    return savedSet
  }

  // Current version - use saved as-is
  if (saved) {
    try {
      const savedArray: string[] = JSON.parse(saved)
      return new Set<string>(savedArray)
    } catch {
      // Fall back to defaults
    }
  }

  return new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.id))
}

export function BilprospektView({
  prospects,
  totalCount,
  currentPage,
  pageSize,
  currentFilters,
  availableBrands,
  availableModels,
  availableFuels,
  availableMunicipalities,
  availableKarossTypes,
  availableColors,
}: BilprospektViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '')
  const [yearFrom, setYearFrom] = useState(currentFilters.yearFrom?.toString() || '')
  const [yearTo, setYearTo] = useState(currentFilters.yearTo?.toString() || '')
  const [possessionFrom, setPossessionFrom] = useState(currentFilters.possessionFrom?.toString() || '')
  const [possessionTo, setPossessionTo] = useState(currentFilters.possessionTo?.toString() || '')
  const [isFetchingData, setIsFetchingData] = useState(false)
  const [fetchProgress, setFetchProgress] = useState<{ current: number; total: number } | null>(null)
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Column visibility state - initialize from localStorage with version-aware merging
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => getMergedColumns())

  // Persist column visibility to localStorage with version
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(visibleColumns)))
      localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_VERSION))
    }
  }, [visibleColumns])

  const totalPages = Math.ceil(totalCount / pageSize)

  // Count active filters (excluding region which is always set)
  const activeFilterCount = [
    currentFilters.brand,
    currentFilters.model,
    currentFilters.fuel,
    currentFilters.kaross,
    currentFilters.municipality,
    currentFilters.ownerType,
    currentFilters.fwd,
    currentFilters.color,
    currentFilters.yearFrom,
    currentFilters.yearTo,
    currentFilters.possessionFrom,
    currentFilters.possessionTo,
    currentFilters.search,
  ].filter(Boolean).length

  const toggleColumn = useCallback((columnId: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(columnId)) {
        newSet.delete(columnId)
      } else {
        newSet.add(columnId)
      }
      return newSet
    })
  }, [])

  const showAllColumns = useCallback(() => {
    setVisibleColumns(new Set(ALL_COLUMNS.map(c => c.id)))
  }, [])

  const hideAllColumns = useCallback(() => {
    // Always keep reg_number visible
    setVisibleColumns(new Set(['reg_number']))
  }, [])

  const resetToDefaults = useCallback(() => {
    setVisibleColumns(new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.id)))
  }, [])

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    if (!updates.page) {
      params.set('page', '0')
    }
    router.push(`/bilprospekt?${params.toString()}`)
  }

  const handleSearch = () => {
    updateFilters({ search: searchTerm || undefined })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === prospects.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(prospects.map(p => p.id)))
    }
  }

  const handleSelectOne = (id: number) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleFetchBiluppgifter = async () => {
    if (selectedIds.size === 0) {
      toast.error('Välj prospekt', {
        description: 'Markera minst ett prospekt för att hämta data.',
      })
      return
    }

    const isHealthy = await checkBiluppgifterStatus()
    if (!isHealthy) {
      toast.error('Biluppgifter API är inte tillgänglig', {
        description: 'Klicka för att kopiera startkommando',
        action: {
          label: '📋 Kopiera',
          onClick: () => {
            navigator.clipboard.writeText('cd ~/Desktop/biluppgifter-api && source venv/bin/activate && uvicorn server:app --port 3456')
            toast.success('Kommando kopierat! Klistra in i Terminal.')
          }
        },
        duration: 10000,
      })
      return
    }

    setIsFetchingData(true)
    setFetchProgress({ current: 0, total: selectedIds.size })

    // Show estimated time (5 items per batch, ~1s per item locally)
    const estimatedSeconds = Math.max(1, Math.ceil(selectedIds.size * 1.2))

    const toastId = toast.loading(`Hämtar biluppgifter för ${selectedIds.size} fordon...`, {
      description: selectedIds.size === 1 ? 'Tar ca 1 sekund...' : `Uppskattat ~${estimatedSeconds} sekunder.`,
    })

    try {
      const selectedProspects = prospects
        .filter(p => selectedIds.has(p.id))
        .map(p => ({ bp_id: p.bp_id, reg_number: p.reg_number }))

      const result = await fetchMileageForProspects(selectedProspects)

      toast.dismiss(toastId)

      if (result.success) {
        toast.success('Biluppgifter hämtade!', {
          description: `${result.updated} av ${result.total} prospekt uppdaterade. ${result.failed > 0 ? `(${result.failed} misslyckades)` : ''}`,
        })
        setSelectedIds(new Set())
        router.refresh()
      } else {
        toast.error('Fel', {
          description: 'Kunde inte hämta biluppgifter.',
        })
      }
    } catch (error) {
      toast.dismiss(toastId)
      console.error('Error fetching biluppgifter:', error)
      toast.error('Fel', {
        description: 'Ett oväntat fel uppstod.',
      })
    } finally {
      setIsFetchingData(false)
      setFetchProgress(null)
    }
  }

  const handleFetchAllBiluppgifter = async (unfetchedProspects: Prospect[]) => {
    if (unfetchedProspects.length === 0) {
      toast.info('Alla prospekt har redan biluppgifter')
      return
    }

    const isHealthy = await checkBiluppgifterStatus()
    if (!isHealthy) {
      toast.error('Biluppgifter API är inte tillgänglig', {
        description: 'Klicka för att kopiera startkommando',
        action: {
          label: '📋 Kopiera',
          onClick: () => {
            navigator.clipboard.writeText('cd ~/Desktop/biluppgifter-api && source venv/bin/activate && uvicorn server:app --port 3456')
            toast.success('Kommando kopierat! Klistra in i Terminal.')
          }
        },
        duration: 10000,
      })
      return
    }

    setIsFetchingData(true)
    setFetchProgress({ current: 0, total: unfetchedProspects.length })

    const estimatedSeconds = Math.max(1, Math.ceil(unfetchedProspects.length * 1.2))

    const toastId = toast.loading(`Hämtar biluppgifter för ${unfetchedProspects.length} fordon...`, {
      description: unfetchedProspects.length === 1 ? 'Tar ca 1 sekund...' : `Uppskattat ~${estimatedSeconds} sekunder.`,
    })

    try {
      const prospectsToFetch = unfetchedProspects.map(p => ({
        bp_id: p.bp_id,
        reg_number: p.reg_number
      }))

      const result = await fetchMileageForProspects(prospectsToFetch)

      toast.dismiss(toastId)

      if (result.success) {
        toast.success('Biluppgifter hämtade!', {
          description: `${result.updated} av ${result.total} prospekt uppdaterade. ${result.failed > 0 ? `(${result.failed} misslyckades)` : ''}`,
        })
        router.refresh()
      } else {
        toast.error('Fel', {
          description: 'Kunde inte hämta biluppgifter.',
        })
      }
    } catch (error) {
      toast.dismiss(toastId)
      console.error('Error fetching biluppgifter:', error)
      toast.error('Fel', {
        description: 'Ett oväntat fel uppstod.',
      })
    } finally {
      setIsFetchingData(false)
      setFetchProgress(null)
    }
  }

  const getFuelBadgeColor = (fuel: string | null) => {
    if (!fuel) return 'bg-gray-100 text-gray-600'
    if (fuel.includes('EL') && !fuel.includes('HYBRID')) return 'bg-green-100 text-green-800'
    if (fuel.includes('DIESEL')) return 'bg-gray-200 text-gray-800'
    if (fuel.includes('BENSIN')) return 'bg-amber-100 text-amber-800'
    if (fuel.includes('HYBRID')) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-600'
  }

  const calculatePossession = (dateAcquired: string | null) => {
    if (!dateAcquired) return '-'
    const acquired = new Date(dateAcquired)
    const now = new Date()
    const months = Math.floor((now.getTime() - acquired.getTime()) / (1000 * 60 * 60 * 24 * 30))
    if (months < 12) return `${months} mån`
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    return remainingMonths > 0 ? `${years}å ${remainingMonths}m` : `${years} år`
  }

  const hasBiluppgifterData = (prospect: Prospect) => {
    return prospect.bu_fetched_at !== null
  }

  const isColumnVisible = (columnId: string) => visibleColumns.has(columnId)

  // Render cell content based on column id
  const renderCell = (prospect: Prospect, columnId: string) => {
    switch (columnId) {
      case 'reg_number':
        const ownerDisplay = prospect.bu_owner_name || prospect.owner_name || 'Okänd ägare'
        const genderType = prospect.owner_type === 'company' ? 'Företag' : prospect.owner_gender === 'M' ? 'Man' : prospect.owner_gender === 'K' ? 'Kvinna' : 'Okänd'
        return (
          <div className="flex items-center gap-1.5">
            <div className="relative group/gender">
              {prospect.owner_type === 'company' ? (
                <Building2 className="w-4 h-4 text-purple-500 cursor-help" />
              ) : prospect.owner_gender === 'M' ? (
                <span className="text-blue-500 font-bold text-sm cursor-help">♂</span>
              ) : prospect.owner_gender === 'K' ? (
                <span className="text-pink-500 font-bold text-sm cursor-help">♀</span>
              ) : (
                <span className="text-muted-foreground text-sm cursor-help">○</span>
              )}
              <div className="absolute left-0 top-full mt-1 hidden group-hover/gender:block z-50 bg-popover border rounded-md shadow-md px-2 py-1 text-xs whitespace-nowrap">
                <span className="font-medium">{genderType}:</span> {ownerDisplay}
              </div>
            </div>
            <button
              className="font-mono text-sm font-medium text-blue-600 hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedProspect(prospect)
                setIsModalOpen(true)
              }}
            >
              {prospect.reg_number}
            </button>
            {hasBiluppgifterData(prospect) && (
              <CheckCircle2 className="w-3 h-3 text-green-600" />
            )}
          </div>
        )
      case 'brand':
        return <span className="font-medium">{prospect.brand}</span>
      case 'model':
        return prospect.model || '-'
      case 'car_year':
        return prospect.car_year || '-'
      case 'fuel':
        return (
          <Badge variant="secondary" className={getFuelBadgeColor(prospect.fuel)}>
            {prospect.fuel || '-'}
          </Badge>
        )
      case 'mileage':
        // No biluppgifter data fetched yet
        if (!prospect.bu_fetched_at) {
          return <span className="text-muted-foreground text-xs">Ej hämtad</span>
        }

        // Fetched but no mileage data available
        if (prospect.mileage === null || prospect.mileage === undefined || prospect.mileage === 0) {
          return <span className="text-muted-foreground">-</span>
        }

        // If we have mileage history, show tooltip on hover
        if (prospect.bu_mileage_history && prospect.bu_mileage_history.length > 0) {
          return (
            <div className="relative group/mil">
              <span className="font-medium cursor-help underline decoration-dotted">
                {prospect.mileage.toLocaleString()} mil
              </span>
              <div className="absolute left-0 top-full mt-1 hidden group-hover/mil:block z-50 bg-popover border rounded-md shadow-md p-3 min-w-[280px]">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <History className="w-4 h-4" />
                  Mätarhistorik
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {prospect.bu_mileage_history.map((m, i) => {
                    const prevMileage = prospect.bu_mileage_history?.[i + 1]?.mileage_mil
                    const diff = prevMileage ? m.mileage_mil - prevMileage : null
                    return (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{m.date}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{m.mileage_mil.toLocaleString()} mil</span>
                          {diff !== null && (
                            <span className="text-xs text-muted-foreground ml-2">(+{diff.toLocaleString()})</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {prospect.bu_mileage_history.length > 1 && (
                  <div className="pt-2 border-t text-xs text-muted-foreground mt-2">
                    Total körning: {(prospect.bu_mileage_history[0].mileage_mil - prospect.bu_mileage_history[prospect.bu_mileage_history.length - 1].mileage_mil).toLocaleString()} mil
                  </div>
                )}
              </div>
            </div>
          )
        }

        return <span className="font-medium">{prospect.mileage.toLocaleString()} mil</span>
      case 'color':
        return prospect.color || '-'
      case 'kaross':
        return prospect.kaross || '-'
      case 'transmission':
        return (
          <Badge variant="outline" className={prospect.transmission === 'Automat' ? 'bg-purple-50' : ''}>
            {prospect.transmission === 'Automat' ? 'A' : 'M'}
          </Badge>
        )
      case 'engine_power':
        return prospect.engine_power && prospect.engine_power > 0 ? prospect.engine_power : '-'
      case 'cylinder_volume':
        return prospect.cylinder_volume || '-'
      case 'fwd':
        return prospect.fwd === 'Ja' ? (
          <Badge variant="outline" className="bg-blue-50 text-blue-800">Ja</Badge>
        ) : 'Nej'
      case 'in_service':
        return prospect.in_service === 'Ja' ? (
          <Badge variant="outline" className="bg-green-50 text-green-800">Ja</Badge>
        ) : prospect.in_service === 'Nej' ? (
          <Badge variant="outline" className="bg-red-50 text-red-800">Nej</Badge>
        ) : '-'
      case 'chassis':
        return (
          <span className="font-mono text-xs max-w-[100px] truncate block" title={prospect.chassis || ''}>
            {prospect.chassis || '-'}
          </span>
        )
      case 'owner_name':
        return (
          <span className="max-w-[120px] truncate block" title={prospect.owner_name || ''}>
            {prospect.owner_name?.split(',')[0] || '-'}
          </span>
        )
      case 'bu_owner_age':
        return prospect.bu_owner_age ? `${prospect.bu_owner_age} år` : '-'
      case 'bu_owner_phone':
        return prospect.bu_owner_phone ? (
          <a
            href={`tel:${prospect.bu_owner_phone}`}
            className="flex items-center gap-1 text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-3 h-3" />
            {prospect.bu_owner_phone}
          </a>
        ) : '-'
      case 'bu_owner_address':
        return (
          <span className="max-w-[120px] truncate block" title={prospect.bu_owner_address || ''}>
            {prospect.bu_owner_address || '-'}
          </span>
        )
      case 'municipality':
        return prospect.bu_owner_postal_city || prospect.municipality || '-'
      case 'bu_num_owners':
        return prospect.bu_num_owners ? (
          <Badge variant="outline">{prospect.bu_num_owners}</Badge>
        ) : '-'
      case 'bu_annual_tax':
        return prospect.bu_annual_tax ? `${prospect.bu_annual_tax.toLocaleString()} kr` : '-'
      case 'bu_inspection_until':
        if (!prospect.bu_inspection_until) return '-'

        const isExpired = new Date(prospect.bu_inspection_until) < new Date()

        // If we have mileage history (besiktning history), show on hover
        if (prospect.bu_mileage_history && prospect.bu_mileage_history.length > 0) {
          return (
            <div className="relative group/besikt">
              <Badge
                variant="outline"
                className={`cursor-help ${isExpired ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}
              >
                {prospect.bu_inspection_until}
              </Badge>
              <div className="absolute left-0 top-full mt-1 hidden group-hover/besikt:block z-50 bg-popover border rounded-md shadow-md p-3 min-w-[280px]">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <History className="w-4 h-4" />
                  Besiktningshistorik
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {prospect.bu_mileage_history.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{m.date}</span>
                      </div>
                      <span className="font-medium">{m.mileage_mil.toLocaleString()} mil</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        }

        return (
          <Badge variant="outline" className={isExpired ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}>
            {prospect.bu_inspection_until}
          </Badge>
        )
      case 'bu_address_vehicles':
        return (prospect.bu_address_vehicles && prospect.bu_address_vehicles.length > 0) ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1" onClick={(e) => e.stopPropagation()}>
                <Car className="w-3 h-3" />
                {prospect.bu_address_vehicles.length}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Fordon på adressen
                </h4>
                <div className="text-sm text-muted-foreground mb-2">
                  {prospect.bu_owner_address}, {prospect.bu_owner_postal_code} {prospect.bu_owner_postal_city}
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {prospect.bu_address_vehicles.map((v, i) => (
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
        ) : '-'
      case 'bu_mileage_history':
        return (prospect.bu_mileage_history && prospect.bu_mileage_history.length > 0) ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1" onClick={(e) => e.stopPropagation()}>
                <TrendingDown className="w-3 h-3" />
                {prospect.bu_mileage_history.length}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Mätarhistorik
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {prospect.bu_mileage_history.map((m, i) => {
                    const prevMileage = prospect.bu_mileage_history?.[i + 1]?.mileage_mil
                    const diff = prevMileage ? m.mileage_mil - prevMileage : null
                    return (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{m.date}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{m.mileage_mil.toLocaleString()} mil</span>
                          {diff !== null && (
                            <span className="text-xs text-muted-foreground ml-2">(+{diff.toLocaleString()})</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {prospect.bu_mileage_history.length > 1 && (
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Total körning: {(prospect.bu_mileage_history[0].mileage_mil - prospect.bu_mileage_history[prospect.bu_mileage_history.length - 1].mileage_mil).toLocaleString()} mil
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        ) : '-'
      case 'bu_owner_history':
        return (prospect.bu_owner_history && prospect.bu_owner_history.length > 0) ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1" onClick={(e) => e.stopPropagation()}>
                <Users className="w-3 h-3" />
                {prospect.bu_owner_history.length}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Ägarhistorik
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {prospect.bu_owner_history.map((h, i) => (
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : '-'
      case 'date_acquired':
        return prospect.date_acquired ? new Date(prospect.date_acquired).toLocaleDateString('sv-SE') : '-'
      case 'possession':
        return calculatePossession(prospect.date_acquired)
      case 'seller_name':
        return (
          <span className="max-w-[120px] truncate block" title={prospect.seller_name || ''}>
            {prospect.seller_name || '-'}
          </span>
        )
      case 'new_or_old':
        return prospect.new_or_old ? (
          <Badge variant="outline" className={prospect.new_or_old === 'Ny' ? 'bg-green-50 text-green-800' : 'bg-gray-50'}>
            {prospect.new_or_old}
          </Badge>
        ) : '-'
      case 'financing':
        return prospect.credit ? (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-800">Kredit</Badge>
        ) : prospect.leasing ? (
          <Badge variant="outline" className="bg-purple-50 text-purple-800">Leasing</Badge>
        ) : 'Kontant'
      default:
        return '-'
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Totalt</p>
            <p className="text-2xl font-bold">{totalCount.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Column visibility dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="w-4 h-4" />
                Kolumner ({visibleColumns.size})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-[400px] overflow-y-auto">
              <DropdownMenuLabel>Visa kolumner</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="flex gap-1 px-2 py-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={showAllColumns}>
                  <Eye className="w-3 h-3 mr-1" /> Alla
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={hideAllColumns}>
                  <EyeOff className="w-3 h-3 mr-1" /> Inga
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetToDefaults}>
                  Standard
                </Button>
              </div>
              <DropdownMenuSeparator />
              {COLUMN_GROUPS.map(group => (
                <div key={group.id}>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">{group.label}</DropdownMenuLabel>
                  {ALL_COLUMNS.filter(c => c.group === group.id).map(column => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={isColumnVisible(column.id)}
                      onCheckedChange={() => toggleColumn(column.id)}
                      disabled={column.id === 'reg_number'} // Always show reg_number
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fetch all biluppgifter for unfetched prospects on page */}
          {(() => {
            const unfetched = prospects.filter(p => !p.bu_fetched_at)
            return unfetched.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleFetchAllBiluppgifter(unfetched)}
                disabled={isFetchingData}
                className="gap-2"
              >
                {isFetchingData ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Hämtar... ({fetchProgress?.current || 0}/{fetchProgress?.total})
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Hämta alla ({unfetched.length})
                    {unfetched.length > 10 && (
                      <span className="text-xs opacity-70">
                        (~{Math.ceil(unfetched.length / 3) * 2}s)
                      </span>
                    )}
                  </>
                )}
              </Button>
            )
          })()}

          {selectedIds.size > 0 && (
            <>
              <Badge variant="secondary">{selectedIds.size} valda</Badge>
              <Button
                size="sm"
                onClick={handleFetchBiluppgifter}
                disabled={isFetchingData}
                className="gap-2"
              >
                {isFetchingData ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Hämtar... ({fetchProgress?.current || 0}/{fetchProgress?.total || selectedIds.size})
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Hämta valda
                    {selectedIds.size > 10 && (
                      <span className="text-xs opacity-70">
                        (~{Math.ceil(selectedIds.size / 3) * 2}s)
                      </span>
                    )}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount} aktiva</Badge>
            )}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:text-foreground ml-auto"
                onClick={() => router.push('/bilprospekt?region=' + (currentFilters.region || '25'))}
              >
                Rensa filter
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          {/* Row 1: Main filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Select
              value={currentFilters.region || '25'}
              onValueChange={(value) => updateFilters({ region: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentFilters.brand || 'all'}
              onValueChange={(value) => updateFilters({ brand: value === 'all' ? undefined : value, model: undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Märke" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla märken</SelectItem>
                {availableBrands.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentFilters.model || 'all'}
              onValueChange={(value) => updateFilters({ model: value === 'all' ? undefined : value })}
              disabled={!currentFilters.brand}
            >
              <SelectTrigger className={!currentFilters.brand ? 'opacity-50' : ''}>
                <SelectValue placeholder={currentFilters.brand ? 'Modell' : 'Välj märke först'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla modeller</SelectItem>
                {availableModels.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentFilters.fuel || 'all'}
              onValueChange={(value) => updateFilters({ fuel: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Bränsle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla bränslen</SelectItem>
                {availableFuels.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentFilters.kaross || 'all'}
              onValueChange={(value) => updateFilters({ kaross: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Karosstyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla karosser</SelectItem>
                {availableKarossTypes.map(k => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentFilters.municipality || 'all'}
              onValueChange={(value) => updateFilters({ municipality: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kommun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla kommuner</SelectItem>
                {availableMunicipalities.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Year, possession, owner, color, 4wd */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <Input
              type="number"
              placeholder="År från"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              onBlur={() => updateFilters({ year_from: yearFrom || undefined })}
              onKeyDown={(e) => e.key === 'Enter' && updateFilters({ year_from: yearFrom || undefined })}
              className="w-full"
            />

            <Input
              type="number"
              placeholder="År till"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              onBlur={() => updateFilters({ year_to: yearTo || undefined })}
              onKeyDown={(e) => e.key === 'Enter' && updateFilters({ year_to: yearTo || undefined })}
              className="w-full"
            />

            <Input
              type="number"
              placeholder="Innehav från (mån)"
              value={possessionFrom}
              onChange={(e) => setPossessionFrom(e.target.value)}
              onBlur={() => updateFilters({ possession_from: possessionFrom || undefined })}
              onKeyDown={(e) => e.key === 'Enter' && updateFilters({ possession_from: possessionFrom || undefined })}
              className="w-full"
            />

            <Input
              type="number"
              placeholder="Innehav till (mån)"
              value={possessionTo}
              onChange={(e) => setPossessionTo(e.target.value)}
              onBlur={() => updateFilters({ possession_to: possessionTo || undefined })}
              onKeyDown={(e) => e.key === 'Enter' && updateFilters({ possession_to: possessionTo || undefined })}
              className="w-full"
            />

            <Select
              value={currentFilters.ownerType || 'all'}
              onValueChange={(value) => updateFilters({ owner_type: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ägartyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla ägare</SelectItem>
                <SelectItem value="private">Privat</SelectItem>
                <SelectItem value="company">Företag</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={currentFilters.fwd || 'all'}
              onValueChange={(value) => updateFilters({ fwd: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Drivning" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla</SelectItem>
                <SelectItem value="Ja">4WD</SelectItem>
                <SelectItem value="Nej">2WD</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={currentFilters.color || 'all'}
              onValueChange={(value) => updateFilters({ color: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Färg" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla färger</SelectItem>
                {availableColors.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Input
                placeholder="Sök reg.nr, namn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button size="icon" onClick={handleSearch}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Row 3: Sorting + active filter badges */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {currentFilters.region && (
                <Badge variant="outline">
                  {REGIONS.find(r => r.value === currentFilters.region)?.label || currentFilters.region}
                </Badge>
              )}
              {currentFilters.brand && (
                <Badge variant="outline" className="bg-green-50 cursor-pointer" onClick={() => updateFilters({ brand: undefined, model: undefined })}>
                  {currentFilters.brand} ×
                </Badge>
              )}
              {currentFilters.model && (
                <Badge variant="outline" className="bg-green-50/70 cursor-pointer" onClick={() => updateFilters({ model: undefined })}>
                  {currentFilters.model} ×
                </Badge>
              )}
              {currentFilters.fuel && (
                <Badge variant="outline" className="bg-amber-50 cursor-pointer" onClick={() => updateFilters({ fuel: undefined })}>
                  {currentFilters.fuel} ×
                </Badge>
              )}
              {currentFilters.kaross && (
                <Badge variant="outline" className="bg-purple-50 cursor-pointer" onClick={() => updateFilters({ kaross: undefined })}>
                  {currentFilters.kaross} ×
                </Badge>
              )}
              {currentFilters.municipality && (
                <Badge variant="outline" className="bg-cyan-50 cursor-pointer" onClick={() => updateFilters({ municipality: undefined })}>
                  {currentFilters.municipality} ×
                </Badge>
              )}
              {currentFilters.ownerType && (
                <Badge variant="outline" className="bg-blue-50 cursor-pointer" onClick={() => updateFilters({ owner_type: undefined })}>
                  {currentFilters.ownerType === 'private' ? 'Privat' : 'Företag'} ×
                </Badge>
              )}
              {currentFilters.fwd && (
                <Badge variant="outline" className="bg-indigo-50 cursor-pointer" onClick={() => updateFilters({ fwd: undefined })}>
                  {currentFilters.fwd === 'Ja' ? '4WD' : '2WD'} ×
                </Badge>
              )}
              {currentFilters.color && (
                <Badge variant="outline" className="bg-pink-50 cursor-pointer" onClick={() => updateFilters({ color: undefined })}>
                  {currentFilters.color} ×
                </Badge>
              )}
              {(currentFilters.possessionFrom || currentFilters.possessionTo) && (
                <Badge variant="outline" className="bg-blue-50 cursor-pointer" onClick={() => updateFilters({ possession_from: undefined, possession_to: undefined })}>
                  Innehav: {currentFilters.possessionFrom || 0}-{currentFilters.possessionTo || '∞'} mån ×
                </Badge>
              )}
              {currentFilters.search && (
                <Badge variant="outline" className="bg-yellow-50 cursor-pointer" onClick={() => { setSearchTerm(''); updateFilters({ search: undefined }) }}>
                  &quot;{currentFilters.search}&quot; ×
                </Badge>
              )}
            </div>

            <Select
              value={currentFilters.sort || 'car_year_desc'}
              onValueChange={(value) => updateFilters({ sort: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sortering" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="car_year_desc">Nyaste först</SelectItem>
                <SelectItem value="car_year_asc">Äldsta först</SelectItem>
                <SelectItem value="date_acquired_desc">Senast köpta</SelectItem>
                <SelectItem value="date_acquired_asc">Längst innehavda</SelectItem>
                <SelectItem value="brand_asc">Märke A-Ö</SelectItem>
                <SelectItem value="owner_name_asc">Ägare A-Ö</SelectItem>
                <SelectItem value="municipality_asc">Kommun A-Ö</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={prospects.length > 0 && selectedIds.size === prospects.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  {ALL_COLUMNS.filter(c => isColumnVisible(c.id)).map(column => (
                    <TableHead key={column.id}>
                      {column.id === 'reg_number' ? (
                        <div className="flex items-center gap-1">
                          {column.label}
                          <div className="relative group">
                            <Info className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-help" />
                            <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-popover border rounded-md shadow-md p-2 text-sm whitespace-nowrap">
                              <div className="flex items-center gap-2 py-0.5">
                                <span className="text-blue-500 font-bold">♂</span>
                                <span>Man</span>
                              </div>
                              <div className="flex items-center gap-2 py-0.5">
                                <span className="text-pink-500 font-bold">♀</span>
                                <span>Kvinna</span>
                              </div>
                              <div className="flex items-center gap-2 py-0.5">
                                <Building2 className="w-4 h-4 text-purple-500" />
                                <span>Företag</span>
                              </div>
                              <div className="flex items-center gap-2 py-0.5">
                                <span className="text-muted-foreground">○</span>
                                <span>Okänd</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : column.label}
                    </TableHead>
                  ))}
                  <TableHead>Info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.size + 2} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Database className="w-10 h-10 opacity-20" />
                        <p>Inga prospekt hittades</p>
                        <p className="text-sm">Justera filter eller importera data</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  prospects.map((prospect) => (
                    <TableRow
                      key={prospect.id}
                      className={`cursor-pointer hover:bg-muted/50 ${hasBiluppgifterData(prospect) ? 'bg-green-50/30' : ''}`}
                      onClick={() => handleSelectOne(prospect.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(prospect.id)}
                          onCheckedChange={() => handleSelectOne(prospect.id)}
                        />
                      </TableCell>
                      {ALL_COLUMNS.filter(c => isColumnVisible(c.id)).map(column => (
                        <TableCell key={column.id} className="text-sm">
                          {renderCell(prospect, column.id)}
                        </TableCell>
                      ))}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Info className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-3">
                              <h4 className="font-medium">Detaljer: {prospect.reg_number}</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-muted-foreground">Märke:</div>
                                <div>{prospect.brand}</div>
                                <div className="text-muted-foreground">Modell:</div>
                                <div>{prospect.model || '-'}</div>
                                <div className="text-muted-foreground">År:</div>
                                <div>{prospect.car_year || '-'}</div>
                                <div className="text-muted-foreground">Bränsle:</div>
                                <div>{prospect.fuel || '-'}</div>
                                <div className="text-muted-foreground">Typ:</div>
                                <div>{prospect.kaross || '-'}</div>
                                <div className="text-muted-foreground">Växellåda:</div>
                                <div>{prospect.transmission || '-'}</div>
                                <div className="text-muted-foreground">HK:</div>
                                <div>{prospect.engine_power || '-'}</div>
                                <div className="text-muted-foreground">CC:</div>
                                <div>{prospect.cylinder_volume || '-'}</div>
                                <div className="text-muted-foreground">Färg:</div>
                                <div>{prospect.color || '-'}</div>
                                <div className="text-muted-foreground">4WD:</div>
                                <div>{prospect.fwd === 'Ja' ? 'Ja' : 'Nej'}</div>
                                <div className="text-muted-foreground">I trafik:</div>
                                <div>{prospect.in_service || '-'}</div>
                                <div className="text-muted-foreground">Chassi:</div>
                                <div className="font-mono text-xs truncate" title={prospect.chassis || ''}>{prospect.chassis || '-'}</div>
                              </div>
                              {hasBiluppgifterData(prospect) && (
                                <div className="pt-2 border-t text-xs text-muted-foreground">
                                  Biluppgifter hämtade: {new Date(prospect.bu_fetched_at!).toLocaleString('sv-SE')}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                Visar {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, totalCount)} av {totalCount.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilters({ page: String(currentPage - 1) })}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm px-3">
                  Sida {currentPage + 1} av {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilters({ page: String(currentPage + 1) })}
                  disabled={currentPage >= totalPages - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prospect Detail Modal */}
      <ProspectDetailModal
        prospect={selectedProspect}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onUpdate={() => router.refresh()}
      />
    </div>
  )
}
