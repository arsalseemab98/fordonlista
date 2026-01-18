'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Phone,
  MapPin,
  Copy,
  Check,
  Search,
  X,
  Filter,
  Loader2,
  Star,
  Car,
  ExternalLink,
  Save,
  CheckSquare,
  Mail,
  MailX,
  PhoneCall,
  PhoneMissed,
  Clock,
  MoreHorizontal,
  MessageSquare,
  CalendarPlus,
  Eye,
  EyeOff,
  Info,
  Send,
  Database,
  RefreshCw,
  Trash2,
  History,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { bulkUpdateLeadsMetadata, addCallLog, markLeadForLetter, removeLeadFromLetterList, updateLeadProspectType, deleteExtraDataColumn, bulkDeleteLeads, checkLeadsHistory, HistoryCheckResult } from '@/app/actions/leads'
import { saveCarInfoToVehicle, activateLead, bulkActivateLeads, bulkResetCarInfo, CarInfoData } from '@/app/actions/vehicles'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import { Settings2 } from 'lucide-react'

// Mapping from Swedish display values to database values
const CALL_RESULT_MAP: Record<string, string> = {
  'Inget svar': 'no_answer',
  'Upptaget': 'busy',
  'Intresserad': 'interested',
  'Ej intresserad': 'not_interested',
  'Ring tillbaka': 'call_back',
  'Bokad visning': 'booked',
  'Fel nummer': 'wrong_number',
  'Redan såld': 'not_interested', // Map to not_interested since there's no "sold" status
}

// Call result options for UI display
const CALL_RESULT_OPTIONS = [
  { value: 'no_answer', label: 'Inget svar' },
  { value: 'busy', label: 'Upptaget' },
  { value: 'interested', label: 'Intresserad' },
  { value: 'not_interested', label: 'Ej intresserad' },
  { value: 'call_back', label: 'Ring tillbaka' },
  { value: 'booked', label: 'Bokad visning' },
  { value: 'wrong_number', label: 'Fel nummer' },
]

// Completion reason options (when lead is marked as not interested/completed)
const COMPLETION_REASON_OPTIONS = [
  { value: 'sold_to_us', label: 'Vi köpte bilen', icon: '✅' },
  { value: 'sold_to_others', label: 'Sålde till annan', icon: '🚗' },
  { value: 'not_interested', label: 'Ej intresserad', icon: '❌' },
  { value: 'wrong_number', label: 'Fel nummer', icon: '📵' },
  { value: 'no_car', label: 'Har inte bilen längre', icon: '🚫' },
  { value: 'too_expensive', label: 'För dyrt för dem', icon: '💰' },
  { value: 'changed_mind', label: 'Ångrat sig', icon: '🔄' },
]

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
  // Car.info fields
  antal_agare?: number | null
  valuation_company?: number | null
  valuation_private?: number | null
  besiktning_till?: string | null
  senaste_avställning?: string | null
  senaste_påställning?: string | null
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
  county?: string
  prospect_type?: string
  data_period_start?: string
  data_period_end?: string
  letter_sent?: boolean | null
  extra_data?: Record<string, string | number | boolean | null> | null
  created_at: string
  vehicles: Vehicle[]
  call_logs: CallLog[]
}

interface CurrentFilters {
  county?: string
  prospectType?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

interface PlaygroundViewProps {
  leads: Lead[]
  totalCount: number
  hiddenCount: number
  visibleCount: number
  showHidden: boolean
  availableCounties: string[]
  availableProspectTypes: string[]
  availableExtraColumns: string[]
  currentFilters: CurrentFilters
}

const SWEDISH_COUNTIES = [
  { value: 'blekinge', label: 'Blekinge' },
  { value: 'dalarna', label: 'Dalarna' },
  { value: 'gotland', label: 'Gotland' },
  { value: 'gävleborg', label: 'Gävleborg' },
  { value: 'halland', label: 'Halland' },
  { value: 'jämtland', label: 'Jämtland' },
  { value: 'jönköping', label: 'Jönköping' },
  { value: 'kalmar', label: 'Kalmar' },
  { value: 'kronoberg', label: 'Kronoberg' },
  { value: 'norrbotten', label: 'Norrbotten' },
  { value: 'skåne', label: 'Skåne' },
  { value: 'stockholm', label: 'Stockholm' },
  { value: 'södermanland', label: 'Södermanland' },
  { value: 'uppsala', label: 'Uppsala' },
  { value: 'värmland', label: 'Värmland' },
  { value: 'västerbotten', label: 'Västerbotten' },
  { value: 'västernorrland', label: 'Västernorrland' },
  { value: 'västmanland', label: 'Västmanland' },
  { value: 'västra_götaland', label: 'Västra Götaland' },
  { value: 'örebro', label: 'Örebro' },
  { value: 'östergötland', label: 'Östergötland' },
]

const PROSPECT_TYPES = [
  { value: 'avställda', label: 'Avställda fordon' },
  { value: 'nyköpt_bil', label: 'Nyköpt bil' },
  { value: 'låg_miltal', label: 'Låg körsträcka' },
  { value: 'alla', label: 'Alla typer' },
]

// Lead status types for filtering
const LEAD_STATUS_TYPES = [
  { value: 'all', label: 'Alla' },
  { value: 'new', label: '🟢 Ny' },
  { value: 'called', label: '🟡 Ringd' },
  { value: 'letter_sent', label: '🔴 Brev skickat' },
]

// Helper function to determine lead status based on call history and letter status
function getLeadStatus(lead: Lead): { status: 'new' | 'called' | 'letter_sent'; label: string; color: 'green' | 'amber' | 'red' } {
  if (lead.letter_sent === true) {
    return { status: 'letter_sent', label: 'Brev skickat', color: 'red' }
  } else if (lead.call_logs && lead.call_logs.length > 0) {
    const callCount = lead.call_logs.length
    return {
      status: 'called',
      label: `Ringd ${callCount} ggr`,
      color: 'amber'
    }
  } else {
    return { status: 'new', label: 'Ny', color: 'green' }
  }
}

function formatMileage(mileage?: number): string {
  if (!mileage) return '-'
  return `${mileage.toLocaleString('sv-SE')} km`
}

export function PlaygroundView({
  leads: initialLeads,
  totalCount,
  hiddenCount,
  visibleCount,
  showHidden,
  availableCounties,
  availableProspectTypes,
  availableExtraColumns,
  currentFilters
}: PlaygroundViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(currentFilters.search || '')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Local state for optimistic updates - hide leads immediately when status changes
  const [hiddenLeadIds, setHiddenLeadIds] = useState<Set<string>>(new Set())

  const leads = initialLeads.filter(lead => !hiddenLeadIds.has(lead.id))

  // Bulk selection state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  // Clear selected leads when initialLeads changes (e.g., when filters change)
  // Note: Use initialLeads (from props) not leads (derived), to avoid infinite loop
  useEffect(() => {
    setSelectedLeads(new Set())
  }, [initialLeads])

  // Bulk edit values
  const [bulkCounties, setBulkCounties] = useState<string[]>([])
  const [bulkProspectTypes, setBulkProspectTypes] = useState<string[]>([])
  const [bulkDateFrom, setBulkDateFrom] = useState<string>('')
  const [bulkDateTo, setBulkDateTo] = useState<string>('')

  // County search
  const [countySearch, setCountySearch] = useState('')

  // Call log dialog state
  const [callDialogOpen, setCallDialogOpen] = useState(false)
  const [callDialogLead, setCallDialogLead] = useState<Lead | null>(null)
  const [callResult, setCallResult] = useState('')
  const [callNotes, setCallNotes] = useState('')
  const [callFollowUp, setCallFollowUp] = useState('')
  const [completionReason, setCompletionReason] = useState('')
  const [isLoggingCall, setIsLoggingCall] = useState(false)

  // Car.info fetch state
  const [fetchingCarInfoId, setFetchingCarInfoId] = useState<string | null>(null)
  const [isBulkFetchingCarInfo, setIsBulkFetchingCarInfo] = useState(false)
  const [isResettingCarInfo, setIsResettingCarInfo] = useState(false)
  const [isActivating, setIsActivating] = useState(false)

  // Column visibility state - localStorage persistence
  const [visibleExtraColumns, setVisibleExtraColumns] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('playgroundVisibleColumns')
      if (saved) {
        try {
          return new Set(JSON.parse(saved))
        } catch {
          return new Set(availableExtraColumns)
        }
      }
    }
    return new Set(availableExtraColumns)
  })

  // Delete column confirmation dialog
  const [deleteColumnDialogOpen, setDeleteColumnDialogOpen] = useState(false)
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null)
  const [isDeletingColumn, setIsDeletingColumn] = useState(false)

  // Inline prospect type editing
  const [editingProspectTypeId, setEditingProspectTypeId] = useState<string | null>(null)
  const [isUpdatingProspectType, setIsUpdatingProspectType] = useState(false)

  // Status filter for bulk actions
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Bulk delete state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // History check state
  const [historyCheckDialogOpen, setHistoryCheckDialogOpen] = useState(false)
  const [isCheckingHistory, setIsCheckingHistory] = useState(false)
  const [historyCheckResult, setHistoryCheckResult] = useState<HistoryCheckResult | null>(null)
  const [historyMatchRegNr, setHistoryMatchRegNr] = useState(true)
  const [historyMatchChassis, setHistoryMatchChassis] = useState(true)
  const [historyMatchName, setHistoryMatchName] = useState(false)
  const [historyMatchPhone, setHistoryMatchPhone] = useState(false)

  // Smart county ordering - most used first
  const sortedCounties = useMemo(() => {
    // Count counties from loaded leads
    const countyCounts: Record<string, number> = {}
    leads.forEach(lead => {
      if (lead.county) {
        countyCounts[lead.county] = (countyCounts[lead.county] || 0) + 1
      }
    })

    // Sort SWEDISH_COUNTIES by usage count
    return [...SWEDISH_COUNTIES].sort((a, b) => {
      const countA = countyCounts[a.value] || 0
      const countB = countyCounts[b.value] || 0
      if (countA !== countB) return countB - countA // Most used first
      return a.label.localeCompare(b.label, 'sv') // Then alphabetically
    })
  }, [leads])

  // Filtered counties based on search
  const filteredCounties = useMemo(() => {
    if (!countySearch) return sortedCounties
    const searchLower = countySearch.toLowerCase()
    return sortedCounties.filter(c =>
      c.label.toLowerCase().includes(searchLower) ||
      c.value.toLowerCase().includes(searchLower)
    )
  }, [sortedCounties, countySearch])

  const updateFilter = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    startTransition(() => {
      router.push(`/playground?${params.toString()}`)
    })
  }, [router, searchParams])

  // Multi-select county handler
  const toggleCounty = useCallback((countyValue: string) => {
    const currentCounties = currentFilters.county ? currentFilters.county.split(',') : []
    let newCounties: string[]

    if (currentCounties.includes(countyValue)) {
      newCounties = currentCounties.filter(c => c !== countyValue)
    } else {
      newCounties = [...currentCounties, countyValue]
    }

    updateFilter('county', newCounties.length > 0 ? newCounties.join(',') : null)
  }, [currentFilters.county, updateFilter])

  const clearCountyFilter = useCallback(() => {
    updateFilter('county', null)
  }, [updateFilter])

  // Get selected counties as array
  const selectedCounties = currentFilters.county ? currentFilters.county.split(',') : []

  // Multi-select prospect type handler
  const toggleProspectType = useCallback((typeValue: string) => {
    const currentTypes = currentFilters.prospectType ? currentFilters.prospectType.split(',') : []
    let newTypes: string[]

    if (currentTypes.includes(typeValue)) {
      newTypes = currentTypes.filter(t => t !== typeValue)
    } else {
      newTypes = [...currentTypes, typeValue]
    }

    updateFilter('prospect_type', newTypes.length > 0 ? newTypes.join(',') : null)
  }, [currentFilters.prospectType, updateFilter])

  const clearProspectTypeFilter = useCallback(() => {
    updateFilter('prospect_type', null)
  }, [updateFilter])

  // Get selected prospect types as array
  const selectedProspectTypes = currentFilters.prospectType ? currentFilters.prospectType.split(',') : []

  const handleSearch = useCallback(() => {
    updateFilter('search', searchValue || null)
  }, [searchValue, updateFilter])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  const clearAllFilters = useCallback(() => {
    setSearchValue('')
    startTransition(() => {
      router.push('/playground')
    })
  }, [router])

  const copyRegNr = useCallback((regNr: string, vehicleId: string) => {
    navigator.clipboard.writeText(regNr)
    setCopiedId(vehicleId)
    toast.success(`Kopierade ${regNr}`)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleCall = useCallback((phone: string, leadId: string) => {
    window.location.href = `tel:${phone}`
    router.push(`/leads/${leadId}`)
  }, [router])

  // Bulk selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)))
    }
  }, [leads, selectedLeads.size])

  const toggleSelectLead = useCallback((leadId: string) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev)
      if (newSet.has(leadId)) {
        newSet.delete(leadId)
      } else {
        newSet.add(leadId)
      }
      return newSet
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedLeads(new Set())
    setBulkCounties([])
    setBulkProspectTypes([])
    setBulkDateFrom('')
    setBulkDateTo('')
  }, [])

  // Toggle functions for bulk edit multi-select
  const toggleBulkCounty = useCallback((countyValue: string) => {
    setBulkCounties(prev => {
      if (prev.includes(countyValue)) {
        return prev.filter(c => c !== countyValue)
      } else {
        return [...prev, countyValue]
      }
    })
  }, [])

  const toggleBulkProspectType = useCallback((typeValue: string) => {
    setBulkProspectTypes(prev => {
      if (prev.includes(typeValue)) {
        return prev.filter(t => t !== typeValue)
      } else {
        return [...prev, typeValue]
      }
    })
  }, [])

  const handleBulkSave = useCallback(async () => {
    if (selectedLeads.size === 0) {
      toast.error('Inga leads valda')
      return
    }

    // Check if at least one value is set
    if (bulkCounties.length === 0 && bulkProspectTypes.length === 0 && !bulkDateFrom && !bulkDateTo) {
      toast.error('Välj minst ett fält att uppdatera')
      return
    }

    setIsSaving(true)

    const metadata: {
      county?: string | null
      prospect_type?: string | null
      data_period_start?: string | null
      data_period_end?: string | null
    } = {}

    if (bulkCounties.length > 0) {
      metadata.county = bulkCounties.join(',')
    }
    if (bulkProspectTypes.length > 0) {
      metadata.prospect_type = bulkProspectTypes.join(',')
    }
    if (bulkDateFrom) {
      metadata.data_period_start = bulkDateFrom === 'clear' ? null : bulkDateFrom
    }
    if (bulkDateTo) {
      metadata.data_period_end = bulkDateTo === 'clear' ? null : bulkDateTo
    }

    const result = await bulkUpdateLeadsMetadata(Array.from(selectedLeads), metadata)

    setIsSaving(false)

    if (result.success) {
      toast.success(`${result.updatedCount} leads uppdaterade`)
      clearSelection()
      router.refresh()
    } else {
      toast.error(result.error || 'Kunde inte uppdatera')
    }
  }, [selectedLeads, bulkCounties, bulkProspectTypes, bulkDateFrom, bulkDateTo, clearSelection, router])

  // Send selected leads to Brev page
  const handleSendToBrev = useCallback(() => {
    if (selectedLeads.size === 0) {
      toast.error('Inga leads valda')
      return
    }
    // Store selected leads in localStorage for brev page
    localStorage.setItem('brevLeadIds', JSON.stringify(Array.from(selectedLeads)))
    toast.success(`${selectedLeads.size} leads markerade för brevutskick`)
    router.push('/brev?filter=not_sent')
  }, [selectedLeads, router])

  // Open call log dialog
  const openCallDialog = useCallback((lead: Lead, quickResult?: string) => {
    setCallDialogLead(lead)
    // Map Swedish display value to database value if provided
    const dbResult = quickResult ? (CALL_RESULT_MAP[quickResult] || quickResult) : ''
    setCallResult(dbResult)
    setCallNotes('')
    setCallFollowUp('')
    setCompletionReason('')
    setCallDialogOpen(true)
  }, [])

  // Submit call log
  const handleSubmitCallLog = useCallback(async () => {
    if (!callDialogLead || !callResult) {
      toast.error('Välj ett resultat')
      return
    }

    // Require completion reason for not_interested
    if (callResult === 'not_interested' && !completionReason) {
      toast.error('Välj en anledning till avslut')
      return
    }

    setIsLoggingCall(true)

    // Hide lead immediately (optimistic update)
    const leadId = callDialogLead.id
    setHiddenLeadIds(prev => new Set([...prev, leadId]))

    const result = await addCallLog({
      leadId: leadId,
      vehicleId: callDialogLead.vehicles?.[0]?.id,
      result: callResult,
      notes: callNotes || undefined,
      followUpDate: callFollowUp || undefined,
      completionReason: completionReason || undefined
    })

    setIsLoggingCall(false)

    if (result.success) {
      toast.success('Samtal loggat')
      setCallDialogOpen(false)
      setCallDialogLead(null)
      setCallResult('')
      setCallNotes('')
      setCallFollowUp('')
      setCompletionReason('')
      // Note: Don't call router.refresh() - revalidatePath in server action handles it
      // This preserves the optimistic update so lead stays hidden
    } else {
      // Revert optimistic update on error
      setHiddenLeadIds(prev => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
      toast.error(result.error || 'Kunde inte logga samtal')
    }
  }, [callDialogLead, callResult, callNotes, callFollowUp, completionReason])

  // Quick call log without dialog
  const handleQuickCallLog = useCallback(async (lead: Lead, displayResult: string) => {
    // Map Swedish display value to database value
    const dbResult = CALL_RESULT_MAP[displayResult] || displayResult

    // Hide lead immediately (optimistic update)
    const leadId = lead.id
    setHiddenLeadIds(prev => new Set([...prev, leadId]))

    const logResult = await addCallLog({
      leadId: lead.id,
      vehicleId: lead.vehicles?.[0]?.id,
      result: dbResult
    })

    if (logResult.success) {
      toast.success(`Loggat: ${displayResult}`)
      // Note: Don't call router.refresh() here - revalidatePath in server action handles it
      // This preserves the optimistic update so lead stays hidden
    } else {
      // Revert optimistic update on error
      setHiddenLeadIds(prev => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
      toast.error(logResult.error || 'Kunde inte logga')
    }
  }, [])

  // Mark lead for letter
  const handleMarkForLetter = useCallback(async (lead: Lead) => {
    const result = await markLeadForLetter(lead.id)
    if (result.success) {
      toast.success('Markerad för brev')
      router.refresh()
    } else {
      toast.error(result.error || 'Kunde inte markera')
    }
  }, [router])

  // Remove lead from letter list
  const handleRemoveFromLetter = useCallback(async (lead: Lead) => {
    const result = await removeLeadFromLetterList(lead.id)
    if (result.success) {
      toast.success('Borttagen från brevlistan')
      router.refresh()
    } else {
      toast.error(result.error || 'Kunde inte ta bort')
    }
  }, [router])

  // Fetch car info from car.info and save to database
  const handleFetchCarInfo = useCallback(async (lead: Lead, saveToDb: boolean = true) => {
    const vehicle = lead.vehicles?.[0]
    const regNr = vehicle?.reg_nr
    if (!regNr || !vehicle) {
      toast.error('Inget registreringsnummer att söka på')
      return
    }

    setFetchingCarInfoId(lead.id)

    try {
      const response = await fetch('/api/carinfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg_number: regNr })
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        // Save to database if requested
        if (saveToDb) {
          const saveResult = await saveCarInfoToVehicle(vehicle.id, data as CarInfoData)
          if (!saveResult.success) {
            toast.error(`Kunde inte spara: ${saveResult.error}`)
            return
          }
        }

        // Show fetched info in toast
        const infoLines: string[] = []
        if (data.make_model) infoLines.push(`Bil: ${data.make_model}`)
        if (data.year) infoLines.push(`År: ${data.year}`)
        if (data.mileage_km) infoLines.push(`Miltal: ${data.mileage_km.toLocaleString('sv-SE')} km`)
        if (data.status) infoLines.push(`Status: ${data.status}`)
        if (data.skatt_formatted) infoLines.push(`Skatt: ${data.skatt_formatted}`)
        if (data.antal_agare) infoLines.push(`Ägare: ${data.antal_agare}`)
        if (data.color) infoLines.push(`Färg: ${data.color}`)
        if (data.valuation_private) infoLines.push(`Värdering: ${data.valuation_private.toLocaleString('sv-SE')} kr`)

        if (infoLines.length > 0) {
          toast.success(
            <div className="space-y-1">
              <p className="font-medium">{regNr} {saveToDb ? '(Sparat!)' : ''}</p>
              {infoLines.map((line, i) => (
                <p key={i} className="text-sm text-gray-600">{line}</p>
              ))}
            </div>,
            { duration: 8000 }
          )
          if (saveToDb) {
            router.refresh()
          }
        } else {
          toast.info('Ingen extra information hittades')
        }
      }
    } catch (error) {
      console.error('Car.info fetch error:', error)
      toast.error('Kunde inte hämta information')
    } finally {
      setFetchingCarInfoId(null)
    }
  }, [router])

  // Bulk fetch car.info for selected leads - calls Edge API directly
  const handleBulkFetchCarInfo = useCallback(async () => {
    if (selectedLeads.size === 0) {
      toast.error('Inga leads valda')
      return
    }

    // Get vehicles with reg numbers from selected leads
    const vehiclesToFetch = leads
      .filter(l => selectedLeads.has(l.id))
      .map(l => ({
        id: l.vehicles?.[0]?.id,
        reg_nr: l.vehicles?.[0]?.reg_nr
      }))
      .filter(v => v.id && v.reg_nr) as { id: string; reg_nr: string }[]

    if (vehiclesToFetch.length === 0) {
      toast.error('Inga fordon med reg.nr hittades')
      return
    }

    setIsBulkFetchingCarInfo(true)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Track if we hit rate limiting - use exponential backoff
    let currentDelay = 2000 // Start with 2 second delay
    let consecutiveFailures = 0
    let isBlocked = false

    try {
      // Process each vehicle sequentially via Edge API
      for (let i = 0; i < vehiclesToFetch.length; i++) {
        const vehicle = vehiclesToFetch[i]

        // If we're blocked, stop processing
        if (isBlocked) {
          results.failed++
          results.errors.push(`${vehicle.reg_nr}: Hoppad pga rate limiting`)
          continue
        }

        try {
          // Call Edge API endpoint
          const response = await fetch('/api/carinfo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reg_number: vehicle.reg_nr })
          })

          const carInfo = await response.json()

          // Check for rate limiting or blocking
          const isRateLimited = response.status === 429 || response.status === 403 ||
            carInfo.error?.includes('403') ||
            carInfo.error?.includes('429') ||
            carInfo.error?.includes('HBP210') ||
            carInfo.error?.includes('blockerar')

          if (isRateLimited) {
            consecutiveFailures++
            results.failed++
            results.errors.push(`${vehicle.reg_nr}: ${carInfo.error || 'Rate limited'}`)

            // After 3 consecutive failures, mark as blocked and stop
            if (consecutiveFailures >= 3) {
              isBlocked = true
              toast.warning(`Car.info rate limit nådd efter ${results.success} lyckade. Väntar...`)
            } else {
              // Exponential backoff: double the delay
              currentDelay = Math.min(currentDelay * 2, 10000) // Max 10 seconds
              await new Promise(resolve => setTimeout(resolve, currentDelay))
            }
            continue
          }

          if (carInfo.error) {
            results.failed++
            results.errors.push(`${vehicle.reg_nr}: ${carInfo.error}`)
            // Reset consecutive failures on non-rate-limit error
            consecutiveFailures = 0
            continue
          }

          // Save to database via server action
          const saveResult = await saveCarInfoToVehicle(vehicle.id, carInfo)

          if (saveResult.success) {
            results.success++
            // Reset on success - and reduce delay slightly
            consecutiveFailures = 0
            currentDelay = Math.max(2000, currentDelay - 500) // Min 2 seconds
          } else {
            results.failed++
            results.errors.push(`${vehicle.reg_nr}: ${saveResult.error}`)
          }

          // Delay between requests with some jitter (randomness to appear more human-like)
          const jitter = Math.floor(Math.random() * 500) // 0-500ms random
          await new Promise(resolve => setTimeout(resolve, currentDelay + jitter))
        } catch (err) {
          results.failed++
          results.errors.push(`${vehicle.reg_nr}: ${err instanceof Error ? err.message : 'Okänt fel'}`)
          consecutiveFailures++
        }
      }

      // Show results
      const allFailed = results.success === 0 && results.failed > 0
      const hasFailures = results.failed > 0

      if (allFailed) {
        toast.error(
          <div className="space-y-1">
            <p className="font-medium">Car.info misslyckades!</p>
            <p className="text-sm">Alla hämtningar misslyckades</p>
            {results.errors.length > 0 && (
              <p className="text-xs text-red-200 mt-1">
                {results.errors.slice(0, 3).join(', ')}
                {results.errors.length > 3 && ` +${results.errors.length - 3} fler...`}
              </p>
            )}
          </div>,
          { duration: 8000 }
        )
      } else if (hasFailures && results.success > 0) {
        toast.warning(
          <div className="space-y-1">
            <p className="font-medium">Car.info delvis hämtat</p>
            <p className="text-sm">Lyckades: {results.success}</p>
            <p className="text-sm">Misslyckades: {results.failed}</p>
            {results.errors.length > 0 && (
              <p className="text-xs opacity-80 mt-1">
                {results.errors.slice(0, 2).join(', ')}
                {results.errors.length > 2 && ` +${results.errors.length - 2} fler...`}
              </p>
            )}
          </div>,
          { duration: 6000 }
        )
        router.refresh()
      } else {
        toast.success(
          <div className="space-y-1">
            <p className="font-medium">Car.info hämtat!</p>
            <p className="text-sm text-gray-600">Lyckades: {results.success}</p>
          </div>,
          { duration: 5000 }
        )
        router.refresh()
      }
    } catch (error) {
      console.error('Bulk car.info error:', error)
      toast.error('Kunde inte hämta information')
    } finally {
      setIsBulkFetchingCarInfo(false)
    }
  }, [selectedLeads, leads, router])

  // Reset car.info data for selected vehicles (set all car.info fields to null)
  const handleBulkResetCarInfo = useCallback(async () => {
    if (selectedLeads.size === 0) {
      toast.error('Inga leads valda')
      return
    }

    // Get vehicle IDs from selected leads
    const vehicleIds = leads
      .filter(l => selectedLeads.has(l.id))
      .map(l => l.vehicles?.[0]?.id)
      .filter(Boolean) as string[]

    if (vehicleIds.length === 0) {
      toast.error('Inga fordon hittades')
      return
    }

    setIsResettingCarInfo(true)

    try {
      const result = await bulkResetCarInfo(vehicleIds)

      if (result.success) {
        toast.success(`${result.resetCount} fordon återställda`)
        router.refresh()
      } else {
        toast.error(result.error || 'Kunde inte återställa')
      }
    } catch (error) {
      console.error('Bulk reset error:', error)
      toast.error('Kunde inte återställa data')
    } finally {
      setIsResettingCarInfo(false)
    }
  }, [selectedLeads, leads, router])

  // Activate selected leads (move from pending_review to new/to_call)
  const handleBulkActivate = useCallback(async (targetStatus: 'new' | 'to_call' = 'new') => {
    if (selectedLeads.size === 0) {
      toast.error('Inga leads valda')
      return
    }

    setIsActivating(true)

    try {
      const result = await bulkActivateLeads(Array.from(selectedLeads), targetStatus)

      if (result.success) {
        toast.success(`${result.activatedCount} leads aktiverade!`)
        clearSelection()
        router.refresh()
      } else {
        toast.error(result.error || 'Kunde inte aktivera')
      }
    } catch (error) {
      console.error('Activate error:', error)
      toast.error('Något gick fel')
    } finally {
      setIsActivating(false)
    }
  }, [selectedLeads, clearSelection, router])

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedLeads.size === 0) {
      toast.error('Inga leads valda')
      return
    }

    setIsBulkDeleting(true)

    try {
      // Filter by status if a filter is selected
      let leadsToDelete = Array.from(selectedLeads)

      if (statusFilter !== 'all') {
        leadsToDelete = leadsToDelete.filter(leadId => {
          const lead = leads.find(l => l.id === leadId)
          if (!lead) return false
          const { status } = getLeadStatus(lead)
          return status === statusFilter
        })
      }

      if (leadsToDelete.length === 0) {
        toast.error('Inga leads matchar filtret')
        setIsBulkDeleting(false)
        setBulkDeleteDialogOpen(false)
        return
      }

      const result = await bulkDeleteLeads(leadsToDelete)

      if (result.success) {
        toast.success(`${result.deletedCount} leads borttagna!`)
        clearSelection()
        setStatusFilter('all')
        router.refresh()
      } else {
        toast.error(result.error || 'Kunde inte ta bort')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Något gick fel')
    } finally {
      setIsBulkDeleting(false)
      setBulkDeleteDialogOpen(false)
    }
  }, [selectedLeads, statusFilter, leads, clearSelection, router])

  // Get count of selected leads by status
  const getSelectedCountByStatus = useCallback((filterStatus: string) => {
    if (filterStatus === 'all') return selectedLeads.size

    return Array.from(selectedLeads).filter(leadId => {
      const lead = leads.find(l => l.id === leadId)
      if (!lead) return false
      const { status } = getLeadStatus(lead)
      return status === filterStatus
    }).length
  }, [selectedLeads, leads])

  // Toggle show hidden leads
  const toggleShowHidden = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (showHidden) {
      params.delete('show_hidden')
    } else {
      params.set('show_hidden', 'true')
    }
    startTransition(() => {
      router.push(`/playground?${params.toString()}`)
    })
  }, [router, searchParams, showHidden])

  // Column visibility toggle
  const toggleColumnVisibility = useCallback((columnName: string) => {
    setVisibleExtraColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(columnName)) {
        newSet.delete(columnName)
      } else {
        newSet.add(columnName)
      }
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('playgroundVisibleColumns', JSON.stringify(Array.from(newSet)))
      }
      return newSet
    })
  }, [])

  // Show all columns
  const showAllColumns = useCallback(() => {
    setVisibleExtraColumns(new Set(availableExtraColumns))
    if (typeof window !== 'undefined') {
      localStorage.setItem('playgroundVisibleColumns', JSON.stringify(availableExtraColumns))
    }
  }, [availableExtraColumns])

  // Hide all extra columns
  const hideAllColumns = useCallback(() => {
    setVisibleExtraColumns(new Set())
    if (typeof window !== 'undefined') {
      localStorage.setItem('playgroundVisibleColumns', JSON.stringify([]))
    }
  }, [])

  // Delete column from database
  const handleDeleteColumn = useCallback(async () => {
    if (!columnToDelete) return

    setIsDeletingColumn(true)

    const result = await deleteExtraDataColumn(columnToDelete)

    setIsDeletingColumn(false)

    if (result.success) {
      toast.success(`Kolumn "${columnToDelete}" borttagen från ${result.updatedCount} leads`)
      // Remove from visible columns
      setVisibleExtraColumns(prev => {
        const newSet = new Set(prev)
        newSet.delete(columnToDelete)
        if (typeof window !== 'undefined') {
          localStorage.setItem('playgroundVisibleColumns', JSON.stringify(Array.from(newSet)))
        }
        return newSet
      })
      setDeleteColumnDialogOpen(false)
      setColumnToDelete(null)
      router.refresh()
    } else {
      toast.error(result.error || 'Kunde inte ta bort kolumnen')
    }
  }, [columnToDelete, router])

  // Open delete column dialog
  const openDeleteColumnDialog = useCallback((columnName: string) => {
    setColumnToDelete(columnName)
    setDeleteColumnDialogOpen(true)
  }, [])

  // Inline prospect type update
  const handleInlineProspectTypeUpdate = useCallback(async (leadId: string, newValue: string | null) => {
    setIsUpdatingProspectType(true)

    const result = await updateLeadProspectType(leadId, newValue === 'none' ? null : newValue)

    setIsUpdatingProspectType(false)
    setEditingProspectTypeId(null)

    if (result.success) {
      toast.success('Prospekt-typ uppdaterad')
      router.refresh()
    } else {
      toast.error(result.error || 'Kunde inte uppdatera')
    }
  }, [router])

  // History check handler
  const handleHistoryCheck = useCallback(async () => {
    if (selectedLeads.size === 0) {
      toast.error('Välj leads att kontrollera')
      return
    }

    // Require at least one match criterion
    if (!historyMatchRegNr && !historyMatchChassis && !historyMatchName && !historyMatchPhone) {
      toast.error('Välj minst ett matchningskriterium')
      return
    }

    setIsCheckingHistory(true)
    setHistoryCheckResult(null)

    try {
      const result = await checkLeadsHistory(
        Array.from(selectedLeads),
        {
          matchRegNr: historyMatchRegNr,
          matchChassis: historyMatchChassis,
          matchName: historyMatchName,
          matchPhone: historyMatchPhone
        }
      )

      setHistoryCheckResult(result)

      if (result.success) {
        if (result.duplicateCount > 0) {
          toast.warning(`Hittade ${result.duplicateCount} dubbletter av ${result.totalChecked} kontrollerade`)
        } else {
          toast.success(`Alla ${result.totalChecked} leads är unika - inga dubbletter hittades!`)
        }
      } else {
        toast.error(result.error || 'Något gick fel')
      }
    } catch (error) {
      console.error('History check error:', error)
      toast.error('Kunde inte kontrollera historik')
    } finally {
      setIsCheckingHistory(false)
    }
  }, [selectedLeads, historyMatchRegNr, historyMatchChassis, historyMatchName, historyMatchPhone])

  // Delete duplicates found in history check
  const handleDeleteHistoryDuplicates = useCallback(async () => {
    if (!historyCheckResult?.duplicateLeadIds || historyCheckResult.duplicateLeadIds.length === 0) {
      toast.error('Inga dubbletter att ta bort')
      return
    }

    setIsBulkDeleting(true)

    try {
      const result = await bulkDeleteLeads(historyCheckResult.duplicateLeadIds)

      if (result.success) {
        toast.success(`${result.deletedCount} dubbletter borttagna!`)
        setHistoryCheckResult(null)
        setHistoryCheckDialogOpen(false)
        clearSelection()
        router.refresh()
      } else {
        toast.error(result.error || 'Kunde inte ta bort')
      }
    } catch (error) {
      console.error('Delete duplicates error:', error)
      toast.error('Något gick fel')
    } finally {
      setIsBulkDeleting(false)
    }
  }, [historyCheckResult, clearSelection, router])

  const activeFilterCount = Object.entries(currentFilters).filter(
    ([_, value]) => value && value !== 'all'
  ).length

  // Get display labels for filter values
  const getCountyLabel = (value?: string) => {
    if (!value) return null
    return SWEDISH_COUNTIES.find(c => c.value === value)?.label || value
  }

  const getProspectLabel = (value?: string) => {
    if (!value) return null
    return PROSPECT_TYPES.find(p => p.value === value)?.label || value
  }

  const isAllSelected = leads.length > 0 && selectedLeads.size === leads.length
  const isSomeSelected = selectedLeads.size > 0 && selectedLeads.size < leads.length

  return (
    <div className="space-y-6">
      {/* Bulk Action Bar */}
      {selectedLeads.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} valda
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="h-4 w-4 mr-1" />
                  Avmarkera alla
                </Button>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                {/* Bulk County - Multi-select with checkboxes */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-blue-800">Län</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[180px] justify-between bg-white",
                          bulkCounties.length > 0 && "border-blue-500 bg-blue-50"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {bulkCounties.length > 0
                              ? `${bulkCounties.length} län valda`
                              : 'Välj län...'}
                          </span>
                        </div>
                        {bulkCounties.length > 0 && (
                          <X
                            className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              setBulkCounties([])
                            }}
                          />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-0" align="start">
                      <div className="max-h-[300px] overflow-y-auto p-2">
                        {bulkCounties.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 mb-2"
                            onClick={() => setBulkCounties([])}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Rensa ({bulkCounties.length})
                          </Button>
                        )}
                        {SWEDISH_COUNTIES.map((county) => (
                          <label
                            key={county.value}
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100",
                              bulkCounties.includes(county.value) && "bg-blue-50"
                            )}
                          >
                            <Checkbox
                              checked={bulkCounties.includes(county.value)}
                              onCheckedChange={() => toggleBulkCounty(county.value)}
                            />
                            <span className="text-sm">{county.label}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Bulk Prospect Type - Multi-select with checkboxes */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-blue-800">Prospekt-typ</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[180px] justify-between bg-white",
                          bulkProspectTypes.length > 0 && "border-blue-500 bg-blue-50"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Filter className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {bulkProspectTypes.length > 0
                              ? `${bulkProspectTypes.length} typ${bulkProspectTypes.length > 1 ? 'er' : ''} valda`
                              : 'Välj typ...'}
                          </span>
                        </div>
                        {bulkProspectTypes.length > 0 && (
                          <X
                            className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              setBulkProspectTypes([])
                            }}
                          />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-0" align="start">
                      <div className="max-h-[300px] overflow-y-auto p-2">
                        {bulkProspectTypes.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 mb-2"
                            onClick={() => setBulkProspectTypes([])}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Rensa ({bulkProspectTypes.length})
                          </Button>
                        )}
                        {PROSPECT_TYPES.filter(t => t.value !== 'alla').map((type) => (
                          <label
                            key={type.value}
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100",
                              bulkProspectTypes.includes(type.value) && "bg-blue-50"
                            )}
                          >
                            <Checkbox
                              checked={bulkProspectTypes.includes(type.value)}
                              onCheckedChange={() => toggleBulkProspectType(type.value)}
                            />
                            <span className="text-sm">{type.label}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Bulk Date From */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-blue-800">Datum från</label>
                  <Input
                    type="date"
                    value={bulkDateFrom}
                    onChange={(e) => setBulkDateFrom(e.target.value)}
                    className="w-[150px] bg-white"
                  />
                </div>

                {/* Bulk Date To */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-blue-800">Datum till</label>
                  <Input
                    type="date"
                    value={bulkDateTo}
                    onChange={(e) => setBulkDateTo(e.target.value)}
                    className="w-[150px] bg-white"
                  />
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleBulkSave}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Spara ändringar
                </Button>

                {/* Separator */}
                <div className="h-8 w-px bg-blue-200" />

                {/* Send to Brev */}
                <Button
                  onClick={handleSendToBrev}
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Skicka till brev
                </Button>

                {/* Separator */}
                <div className="h-8 w-px bg-blue-200" />

                {/* Bulk Car.info */}
                <Button
                  onClick={handleBulkFetchCarInfo}
                  disabled={isBulkFetchingCarInfo}
                  variant="outline"
                  className="border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100"
                >
                  {isBulkFetchingCarInfo ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4 mr-2" />
                  )}
                  Hämta car.info
                </Button>

                {/* Reset Car.info */}
                <Button
                  onClick={handleBulkResetCarInfo}
                  disabled={isResettingCarInfo}
                  variant="outline"
                  className="border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"
                >
                  {isResettingCarInfo ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Återställ car.info
                </Button>

                {/* Activate leads */}
                <Button
                  onClick={() => handleBulkActivate('new')}
                  disabled={isActivating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isActivating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Aktivera leads
                </Button>

                {/* Separator */}
                <div className="h-8 w-px bg-blue-200" />

                {/* Status filter for delete */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-red-800">Filtrera för borttagning</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px] bg-white border-red-200">
                      <SelectValue placeholder="Alla statusar" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUS_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label} ({getSelectedCountByStatus(type.value)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bulk Delete Button */}
                <Button
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  variant="outline"
                  className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Ta bort {statusFilter !== 'all' ? `(${getSelectedCountByStatus(statusFilter)})` : `(${selectedLeads.size})`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Ta bort leads
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Är du säker på att du vill ta bort{' '}
                <strong className="text-red-600">
                  {statusFilter !== 'all'
                    ? `${getSelectedCountByStatus(statusFilter)} leads (${LEAD_STATUS_TYPES.find(t => t.value === statusFilter)?.label})`
                    : `${selectedLeads.size} leads`
                  }
                </strong>
                ?
              </p>
              <p className="text-red-600 font-medium">
                Detta kommer även ta bort alla tillhörande fordon och samtalsloggar. Denna åtgärd kan inte ångras!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Tar bort...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Ja, ta bort
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Sök reg.nr, märke, modell, ägare..."
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

          {/* County filter with multi-select */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-between">
                <span className="truncate">
                  {selectedCounties.length === 0
                    ? 'Alla län'
                    : selectedCounties.length === 1
                      ? SWEDISH_COUNTIES.find(c => c.value === selectedCounties[0])?.label || selectedCounties[0]
                      : `${selectedCounties.length} län valda`}
                </span>
                <MapPin className="h-4 w-4 ml-2 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
              <div className="p-2 border-b">
                <Input
                  placeholder="Sök län..."
                  value={countySearch}
                  onChange={(e) => setCountySearch(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2">
                {selectedCounties.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 mb-2"
                    onClick={clearCountyFilter}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rensa filter ({selectedCounties.length})
                  </Button>
                )}
                {filteredCounties.length > 0 ? (
                  filteredCounties.map((county) => {
                    const count = leads.filter(l => l.county === county.value).length
                    const isSelected = selectedCounties.includes(county.value)
                    return (
                      <label
                        key={county.value}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100",
                          isSelected && "bg-blue-50"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleCounty(county.value)}
                        />
                        <span className="flex-1 text-sm">{county.label}</span>
                        {count > 0 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {count}
                          </Badge>
                        )}
                      </label>
                    )
                  })
                ) : (
                  <div className="px-2 py-4 text-sm text-gray-500 text-center">
                    Inga län matchar &quot;{countySearch}&quot;
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Prospect type filter - multi-select with checkboxes */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[180px] justify-between",
                  selectedProspectTypes.length > 0 && "border-blue-500 bg-blue-50"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <Filter className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {selectedProspectTypes.length > 0
                      ? `${selectedProspectTypes.length} typ${selectedProspectTypes.length > 1 ? 'er' : ''} vald${selectedProspectTypes.length > 1 ? 'a' : ''}`
                      : 'Prospekt-typ'}
                  </span>
                </div>
                <X
                  className={cn(
                    "h-4 w-4 shrink-0 opacity-50 hover:opacity-100",
                    selectedProspectTypes.length === 0 && "hidden"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    clearProspectTypeFilter()
                  }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="start">
              <div className="max-h-[300px] overflow-y-auto p-2">
                {selectedProspectTypes.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 mb-2"
                    onClick={clearProspectTypeFilter}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rensa filter ({selectedProspectTypes.length})
                  </Button>
                )}
                {(availableProspectTypes.length > 0 ? availableProspectTypes : PROSPECT_TYPES.filter(t => t.value !== 'alla').map(t => t.value)).map((type) => {
                  const typeValue = typeof type === 'string' ? type : type
                  const isSelected = selectedProspectTypes.includes(typeValue)
                  const count = leads.filter(l => l.prospect_type === typeValue).length
                  return (
                    <label
                      key={typeValue}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100",
                        isSelected && "bg-blue-50"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleProspectType(typeValue)}
                      />
                      <span className="flex-1 text-sm">{getProspectLabel(typeValue) || typeValue}</span>
                      {count > 0 && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          {count}
                        </Badge>
                      )}
                    </label>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Date from */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Från:</span>
            <Input
              type="date"
              value={currentFilters.dateFrom || ''}
              onChange={(e) => updateFilter('date_from', e.target.value || null)}
              className="w-[150px]"
            />
          </div>

          {/* Date to */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Till:</span>
            <Input
              type="date"
              value={currentFilters.dateTo || ''}
              onChange={(e) => updateFilter('date_to', e.target.value || null)}
              className="w-[150px]"
            />
          </div>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="gap-1.5 text-gray-500"
            >
              <X className="h-4 w-4" />
              Rensa filter
            </Button>
          )}
        </div>

        {/* Active filters badges */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500 flex items-center gap-1.5">
              <Filter className="h-4 w-4" />
              Aktiva filter:
            </span>
            {currentFilters.county && currentFilters.county !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Län: {getCountyLabel(currentFilters.county)}
                <button
                  onClick={() => updateFilter('county', null)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {currentFilters.prospectType && currentFilters.prospectType !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Typ: {getProspectLabel(currentFilters.prospectType)}
                <button
                  onClick={() => updateFilter('prospect_type', null)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {currentFilters.dateFrom && (
              <Badge variant="secondary" className="gap-1">
                Från: {currentFilters.dateFrom}
                <button
                  onClick={() => updateFilter('date_from', null)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {currentFilters.dateTo && (
              <Badge variant="secondary" className="gap-1">
                Till: {currentFilters.dateTo}
                <button
                  onClick={() => updateFilter('date_to', null)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {currentFilters.search && (
              <Badge variant="secondary" className="gap-1">
                Sök: {currentFilters.search}
                <button
                  onClick={() => {
                    setSearchValue('')
                    updateFilter('search', null)
                  }}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span>
            Visar <strong className="text-gray-900">{leads.length}</strong> av{' '}
            <strong className="text-gray-900">{totalCount}</strong> leads
          </span>
          {selectedLeads.size > 0 && (
            <span className="text-blue-600 font-medium">
              {selectedLeads.size} valda
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* History check button - only visible when leads are selected */}
          {selectedLeads.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryCheckDialogOpen(true)}
              className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <History className="h-4 w-4" />
              Kontrollera historik
            </Button>
          )}

          {/* Column visibility settings */}
          {availableExtraColumns.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Kolumner ({visibleExtraColumns.size}/{availableExtraColumns.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Extra kolumner</h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={showAllColumns}
                      >
                        Visa alla
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={hideAllColumns}
                      >
                        Dölj alla
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-1">
                    {availableExtraColumns.map((column) => (
                      <div key={column} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 group">
                        <label className="flex items-center gap-2 flex-1 cursor-pointer">
                          <Checkbox
                            checked={visibleExtraColumns.has(column)}
                            onCheckedChange={() => toggleColumnVisibility(column)}
                          />
                          <span className="text-sm truncate" title={column}>
                            {column}
                          </span>
                        </label>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => openDeleteColumnDialog(column)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Klicka på papperskorgen för att permanent ta bort en kolumn från databasen.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Toggle hidden/visible */}
          <Button
            variant={showHidden ? "default" : "outline"}
            size="sm"
            onClick={toggleShowHidden}
            className={cn(
              "gap-2",
              showHidden && "bg-amber-500 hover:bg-amber-600"
            )}
          >
            {showHidden ? (
              <>
                <Eye className="h-4 w-4" />
                Visar dolda ({hiddenCount})
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" />
                Visa dolda ({hiddenCount})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Hidden mode banner */}
      {showHidden && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Visar brevmarkerade leads</p>
              <p className="text-sm text-amber-600">Dessa leads är dolda i huvudvyn och väntar på brevutskick</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleShowHidden}
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <EyeOff className="h-4 w-4 mr-2" />
            Tillbaka till huvudvy
          </Button>
        </div>
      )}

      {/* Table */}
      <Card className={cn(showHidden && "border-amber-200")}>
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Car className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="font-medium">Inga leads hittades</p>
              <p className="text-sm mt-1">Prova att ändra dina filter</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) {
                          (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = isSomeSelected
                        }
                      }}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Välj alla"
                    />
                  </TableHead>
                  <TableHead className="w-[150px]">Reg.nr</TableHead>
                  <TableHead>Märke / Modell</TableHead>
                  <TableHead className="w-[100px]">År</TableHead>
                  <TableHead className="w-[120px]">Miltal</TableHead>
                  <TableHead>Ägare</TableHead>
                  <TableHead className="w-[120px]">Län</TableHead>
                  <TableHead className="w-[150px]">Prospekt-typ</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  {/* Car.info columns */}
                  <TableHead className="w-[80px] text-center">Ägare</TableHead>
                  <TableHead className="w-[120px] text-right">Värdering F</TableHead>
                  <TableHead className="w-[120px] text-right">Värdering P</TableHead>
                  <TableHead className="w-[90px] text-center">Besiktning</TableHead>
                  <TableHead className="w-[110px]">Avställd</TableHead>
                  <TableHead className="w-[110px]">Påställd</TableHead>
                  <TableHead className="w-[90px] text-center">Trafik</TableHead>
                  {/* Extra columns from import */}
                  {availableExtraColumns.filter(col => visibleExtraColumns.has(col)).map((column) => (
                    <TableHead key={column} className="w-[120px]">
                      <span className="truncate" title={column}>{column}</span>
                    </TableHead>
                  ))}
                  <TableHead className="w-[200px] text-center">Snabbval</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const primaryVehicle = lead.vehicles?.[0]
                  const isSelected = selectedLeads.has(lead.id)

                  return (
                    <TableRow
                      key={lead.id}
                      className={cn(
                        "hover:bg-gray-50",
                        isSelected && "bg-blue-50 hover:bg-blue-100"
                      )}
                    >
                      {/* Checkbox */}
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectLead(lead.id)}
                          aria-label={`Välj lead ${lead.id}`}
                        />
                      </TableCell>

                      {/* Reg.nr with copy button */}
                      <TableCell>
                        {primaryVehicle?.reg_nr ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                              {primaryVehicle.reg_nr}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => copyRegNr(primaryVehicle.reg_nr!, primaryVehicle.id)}
                            >
                              {copiedId === primaryVehicle.id ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>

                      {/* Make / Model */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {[primaryVehicle?.make, primaryVehicle?.model]
                              .filter(Boolean)
                              .join(' ') || '-'}
                          </span>
                          {primaryVehicle?.is_interesting && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                          {primaryVehicle && !primaryVehicle.in_traffic && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                              Avställd
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Year */}
                      <TableCell>
                        <span className="text-sm">{primaryVehicle?.year || '-'}</span>
                      </TableCell>

                      {/* Mileage */}
                      <TableCell>
                        <span className={cn(
                          "text-sm",
                          primaryVehicle?.mileage && primaryVehicle.mileage > 200000
                            ? "text-orange-600"
                            : "text-gray-700"
                        )}>
                          {formatMileage(primaryVehicle?.mileage)}
                        </span>
                      </TableCell>

                      {/* Owner */}
                      <TableCell>
                        <div className="max-w-[200px]">
                          {lead.owner_info ? (
                            <p className="text-sm truncate" title={lead.owner_info}>
                              {lead.owner_info}
                            </p>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                          {lead.location && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {lead.location}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* County */}
                      <TableCell>
                        {lead.county ? (
                          <span className="text-sm text-gray-600">
                            {getCountyLabel(lead.county) || lead.county}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>

                      {/* Prospect type - inline editable */}
                      <TableCell>
                        {editingProspectTypeId === lead.id ? (
                          <Select
                            defaultValue={lead.prospect_type || 'none'}
                            onValueChange={(value) => handleInlineProspectTypeUpdate(lead.id, value)}
                            disabled={isUpdatingProspectType}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-- Ingen --</SelectItem>
                              {PROSPECT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 rounded px-2 py-1 -mx-2 -my-1 group"
                            onClick={() => setEditingProspectTypeId(lead.id)}
                          >
                            {lead.prospect_type ? (
                              <Badge variant="outline" className="text-xs">
                                {getProspectLabel(lead.prospect_type) || lead.prospect_type}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm group-hover:text-gray-600">
                                + Lägg till
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Status column - color coded */}
                      <TableCell>
                        {(() => {
                          const leadStatus = getLeadStatus(lead)
                          return (
                            <Badge
                              variant="outline"
                              className={cn(
                                'gap-1.5 text-xs font-medium',
                                leadStatus.color === 'green' && 'bg-green-50 text-green-700 border-green-200',
                                leadStatus.color === 'amber' && 'bg-amber-50 text-amber-700 border-amber-200',
                                leadStatus.color === 'red' && 'bg-red-50 text-red-700 border-red-200'
                              )}
                            >
                              <span
                                className={cn(
                                  'w-2 h-2 rounded-full',
                                  leadStatus.color === 'green' && 'bg-green-500',
                                  leadStatus.color === 'amber' && 'bg-amber-500',
                                  leadStatus.color === 'red' && 'bg-red-500'
                                )}
                              />
                              {leadStatus.label}
                            </Badge>
                          )
                        })()}
                      </TableCell>

                      {/* Car.info columns */}
                      <TableCell className="text-center">
                        <span className="text-sm text-gray-600">
                          {primaryVehicle?.antal_agare ?? '-'}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        {primaryVehicle?.valuation_company ? (
                          <span className="text-sm font-medium text-gray-700">
                            {primaryVehicle.valuation_company.toLocaleString('sv-SE')} kr
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {primaryVehicle?.valuation_private ? (
                          <span className="text-sm font-medium text-gray-700">
                            {primaryVehicle.valuation_private.toLocaleString('sv-SE')} kr
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        {primaryVehicle?.besiktning_till ? (
                          <span className="text-sm text-gray-600">
                            {primaryVehicle.besiktning_till}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {primaryVehicle?.senaste_avställning ? (
                          <span className="text-sm text-gray-600">
                            {primaryVehicle.senaste_avställning}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {primaryVehicle?.senaste_påställning ? (
                          <span className="text-sm text-gray-600">
                            {primaryVehicle.senaste_påställning}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        {primaryVehicle?.in_traffic === true ? (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            I trafik
                          </Badge>
                        ) : primaryVehicle?.in_traffic === false ? (
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                            Avställd
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>

                      {/* Extra data columns */}
                      {availableExtraColumns.filter(col => visibleExtraColumns.has(col)).map((column) => (
                        <TableCell key={column}>
                          <span className="text-sm text-gray-600 truncate max-w-[120px] block" title={String(lead.extra_data?.[column] ?? '')}>
                            {lead.extra_data?.[column] != null ? String(lead.extra_data[column]) : '-'}
                          </span>
                        </TableCell>
                      ))}

                      {/* Quick Actions */}
                      <TableCell>
                        <TooltipProvider delayDuration={300}>
                          <div className="flex items-center justify-center gap-0.5">
                            {/* Ring */}
                            {lead.phone && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleCall(lead.phone!, lead.id)}
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ring</TooltipContent>
                              </Tooltip>
                            )}

                            {/* Inget svar */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                  onClick={() => handleQuickCallLog(lead, 'Inget svar')}
                                >
                                  <PhoneMissed className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Inget svar</TooltipContent>
                            </Tooltip>

                            {/* Intresserad */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-50"
                                  onClick={() => handleQuickCallLog(lead, 'Intresserad')}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Intresserad</TooltipContent>
                            </Tooltip>

                            {/* Ej intresserad */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-50"
                                  onClick={() => handleQuickCallLog(lead, 'Ej intresserad')}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ej intresserad</TooltipContent>
                            </Tooltip>

                            {/* Ring tillbaka */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-blue-400 hover:text-blue-500 hover:bg-blue-50"
                                  onClick={() => openCallDialog(lead, 'Ring tillbaka')}
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ring tillbaka</TooltipContent>
                            </Tooltip>

                            {/* Skicka brev / Ta bort från brev */}
                            {showHidden ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleRemoveFromLetter(lead)}
                                  >
                                    <MailX className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ta bort från brev</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                    onClick={() => handleMarkForLetter(lead)}
                                  >
                                    <Mail className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Skicka brev</TooltipContent>
                              </Tooltip>
                            )}

                            {/* Mer / Anteckning */}
                            <DropdownMenu>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-gray-400 hover:text-gray-600"
                                    >
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Mer...</TooltipContent>
                              </Tooltip>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => handleFetchCarInfo(lead)}
                                  disabled={fetchingCarInfoId === lead.id}
                                >
                                  {fetchingCarInfoId === lead.id ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Info className="h-4 w-4 mr-2" />
                                  )}
                                  Hämta mer info
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openCallDialog(lead)}>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Med anteckning
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuickCallLog(lead, 'Upptaget')}>
                                  <Phone className="h-4 w-4 mr-2" />
                                  Upptaget
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleQuickCallLog(lead, 'Fel nummer')}>
                                  <PhoneMissed className="h-4 w-4 mr-2" />
                                  Fel nummer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push(`/leads/${lead.id}`)}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Visa detaljer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Call Log Dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Logga samtal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {callDialogLead && (
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="font-medium">{callDialogLead.owner_info || 'Okänd'}</p>
                {callDialogLead.vehicles?.[0]?.reg_nr && (
                  <p className="text-gray-500">{callDialogLead.vehicles[0].reg_nr}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Resultat</Label>
              <Select value={callResult} onValueChange={(value) => {
                setCallResult(value)
                // Reset completion reason when changing result
                if (value !== 'not_interested') {
                  setCompletionReason('')
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj resultat..." />
                </SelectTrigger>
                <SelectContent>
                  {CALL_RESULT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Completion reason when not_interested */}
            {callResult === 'not_interested' && (
              <div className="space-y-2">
                <Label className="text-orange-700">Anledning till avslut *</Label>
                <Select value={completionReason} onValueChange={setCompletionReason}>
                  <SelectTrigger className="border-orange-200">
                    <SelectValue placeholder="Välj anledning..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLETION_REASON_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <span>{option.icon}</span>
                          <span>{option.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Viktigt för analys av leads</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Anteckningar</Label>
              <Textarea
                placeholder="Lägg till anteckningar..."
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                rows={3}
              />
            </div>

            {(callResult === 'call_back' || callResult === 'interested') && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4" />
                  Följ upp datum
                </Label>
                <Input
                  type="date"
                  value={callFollowUp}
                  onChange={(e) => setCallFollowUp(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCallDialogOpen(false)}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSubmitCallLog}
              disabled={isLoggingCall || !callResult}
            >
              {isLoggingCall ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Spara
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Column Confirmation Dialog */}
      <AlertDialog open={deleteColumnDialogOpen} onOpenChange={setDeleteColumnDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort kolumn permanent?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta kommer att ta bort kolumnen <strong>&quot;{columnToDelete}&quot;</strong> och all dess data från alla leads i databasen.
              <br /><br />
              <span className="text-red-600 font-medium">Denna åtgärd går inte att ångra.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingColumn}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteColumn}
              disabled={isDeletingColumn}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingColumn ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Tar bort...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Ta bort permanent
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* History Check Dialog */}
      <Dialog open={historyCheckDialogOpen} onOpenChange={(open) => {
        setHistoryCheckDialogOpen(open)
        if (!open) {
          setHistoryCheckResult(null)
        }
      }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              Kontrollera historik
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Match criteria */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Matcha på:</Label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={historyMatchRegNr}
                    onCheckedChange={(checked) => setHistoryMatchRegNr(checked === true)}
                  />
                  <span className="text-sm">Registreringsnummer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={historyMatchChassis}
                    onCheckedChange={(checked) => setHistoryMatchChassis(checked === true)}
                  />
                  <span className="text-sm">Chassinummer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={historyMatchName}
                    onCheckedChange={(checked) => setHistoryMatchName(checked === true)}
                  />
                  <span className="text-sm">Ägarnamn</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={historyMatchPhone}
                    onCheckedChange={(checked) => setHistoryMatchPhone(checked === true)}
                  />
                  <span className="text-sm">Telefonnummer</span>
                </label>
              </div>
            </div>

            {/* Info about what will be checked */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="text-sm text-indigo-700">
                <strong>{selectedLeads.size} leads</strong> kommer att kontrolleras mot alla andra leads i databasen
                för att hitta dubbletter baserat på valda kriterier.
              </p>
            </div>

            {/* Results */}
            {historyCheckResult && (
              <div className="space-y-4">
                <div className="h-px bg-gray-200" />

                {historyCheckResult.success ? (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="text-2xl font-bold text-green-700">{historyCheckResult.uniqueCount}</span>
                        </div>
                        <p className="text-sm text-green-600">Unika leads</p>
                      </div>
                      <div className={cn(
                        "border rounded-lg p-4 text-center",
                        historyCheckResult.duplicateCount > 0
                          ? "bg-red-50 border-red-200"
                          : "bg-gray-50 border-gray-200"
                      )}>
                        <div className="flex items-center justify-center gap-2 mb-1">
                          {historyCheckResult.duplicateCount > 0 && (
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                          )}
                          <span className={cn(
                            "text-2xl font-bold",
                            historyCheckResult.duplicateCount > 0 ? "text-red-700" : "text-gray-700"
                          )}>
                            {historyCheckResult.duplicateCount}
                          </span>
                        </div>
                        <p className={cn(
                          "text-sm",
                          historyCheckResult.duplicateCount > 0 ? "text-red-600" : "text-gray-600"
                        )}>
                          Dubbletter hittade
                        </p>
                      </div>
                    </div>

                    {/* Match breakdown */}
                    {historyCheckResult.matches && historyCheckResult.matches.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Matchningar per typ:</Label>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                          {(() => {
                            const matchCounts: Record<string, number> = {}
                            historyCheckResult.matches.forEach(m => {
                              matchCounts[m.matchType] = (matchCounts[m.matchType] || 0) + 1
                            })
                            return Object.entries(matchCounts).map(([type, count]) => (
                              <div key={type} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  {type === 'reg_nr' && 'Registreringsnummer'}
                                  {type === 'chassis' && 'Chassinummer'}
                                  {type === 'name' && 'Ägarnamn'}
                                  {type === 'phone' && 'Telefonnummer'}
                                </span>
                                <Badge variant="secondary">{count} st</Badge>
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Delete duplicates button */}
                    {historyCheckResult.duplicateCount > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-700 mb-3">
                          <strong>{historyCheckResult.duplicateCount} dubbletter</strong> hittades bland de valda leads.
                          Du kan ta bort dessa för att rensa upp i databasen.
                        </p>
                        <Button
                          onClick={handleDeleteHistoryDuplicates}
                          disabled={isBulkDeleting}
                          variant="destructive"
                          className="w-full"
                        >
                          {isBulkDeleting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Tar bort...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Ta bort {historyCheckResult.duplicateCount} dubbletter
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700">
                      <strong>Fel:</strong> {historyCheckResult.error}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setHistoryCheckDialogOpen(false)
                setHistoryCheckResult(null)
              }}
            >
              Stäng
            </Button>
            {!historyCheckResult && (
              <Button
                onClick={handleHistoryCheck}
                disabled={isCheckingHistory || (!historyMatchRegNr && !historyMatchChassis && !historyMatchName && !historyMatchPhone)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isCheckingHistory ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Kontrollerar...
                  </>
                ) : (
                  <>
                    <History className="h-4 w-4 mr-2" />
                    Kontrollera
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
