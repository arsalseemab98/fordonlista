'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useTransition, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Users,
  Calendar,
  Filter,
  X,
  TrendingUp,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  Eye,
  Coins,
  Archive,
  Plus,
  Trash2,
  Settings,
  Layers,
  ListCollapse,
  Send,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { type PeriodGap } from '@/lib/time-period-utils'
import { RegNrSearch } from './reg-nr-search'
import { createProspectType, deleteProspectType, type ProspectType } from '@/app/prospekt-typer/actions'

interface ProspektStats {
  prospect_type: string | null
  data_period_start: string | null
  data_period_end: string | null
  county: string | null
  count: number
  daysDuration: number | null
  sentToCallCount: number
  sentToBrevCount: number
  latestSentToBrevAt: string | null
}

interface LeadDetail {
  id: string
  owner_info: string | null
  phone: string | null
  prospect_type: string | null
  data_period_start: string | null
  sent_to_call_at: string | null
  sent_to_brev_at: string | null
  county: string | null
  created_at: string | null
}

interface CostByPeriod {
  period: string
  brevCount: number
  cost: number
}

interface CostByYear {
  year: string
  brevCount: number
  cost: number
}

interface CostByMonth {
  month: string
  brevCount: number
  cost: number
}

interface CostByDate {
  date: string
  brevCount: number
  cost: number
}

interface ProspektTyperViewProps {
  stats: ProspektStats[]
  prospectTypeSummary: { type: string; count: number; sentToCallCount: number; sentToBrevCount: number }[]
  periodSummary: { period: string; count: number; sentToCallCount: number; sentToBrevCount: number }[]
  totalLeads: number
  totalSentToCall: number
  totalSentToBrev: number
  leadDetails: LeadDetail[]
  availableProspectTypes: string[]
  availableTimePeriods: string[]
  periodGaps: PeriodGap[]
  currentFilters: {
    prospectType?: string
    dateFrom?: string
    dateTo?: string
    includeArchive?: boolean
  }
  // Cost analysis props
  letterCost: number
  totalBrevCount: number
  totalBrevCost: number
  costByPeriod: CostByPeriod[]
  costByYear: CostByYear[]
  costByMonth: CostByMonth[]
  costByDate: CostByDate[]
  // Prospect type management
  savedProspectTypes: ProspectType[]
}

// Helper function to create label from prospect types
function createProspectTypeLabels(types: ProspectType[]): Record<string, string> {
  const labels: Record<string, string> = {}
  types.forEach(type => {
    labels[type.name] = type.description || type.name
  })
  return labels
}

function formatPeriod(period: string | null): string {
  if (!period) return 'Ingen period'
  try {
    return new Date(period).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return period
  }
}

function formatPeriodRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'Ingen period'
  if (!end) return formatPeriod(start)
  if (!start) return formatPeriod(end)
  return `${formatPeriod(start)} — ${formatPeriod(end)}`
}

export function ProspektTyperView({
  stats,
  prospectTypeSummary,
  periodSummary,
  totalLeads,
  totalSentToCall,
  totalSentToBrev,
  leadDetails,
  availableProspectTypes,
  availableTimePeriods,
  periodGaps,
  currentFilters,
  letterCost,
  totalBrevCount,
  totalBrevCost,
  costByPeriod,
  costByYear,
  costByMonth,
  costByDate,
  savedProspectTypes
}: ProspektTyperViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Filter state
  const [selectedProspectType, setSelectedProspectType] = useState<string>(currentFilters.prospectType || 'all')
  const [dateFrom, setDateFrom] = useState(currentFilters.dateFrom || '')
  const [dateTo, setDateTo] = useState(currentFilters.dateTo || '')
  const [includeArchive, setIncludeArchive] = useState(currentFilters.includeArchive !== false)

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailModalTitle, setDetailModalTitle] = useState('')
  const [detailModalType, setDetailModalType] = useState<'ring' | 'brev' | 'all'>('all')
  const [detailModalFilter, setDetailModalFilter] = useState<{
    prospectType?: string
    period?: string
  }>({})

  // Cost view filter state
  const [costViewType, setCostViewType] = useState<'period' | 'year' | 'month' | 'date'>('period')

  // Prospect type management state
  const [manageTypesOpen, setManageTypesOpen] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeDescription, setNewTypeDescription] = useState('')
  const [newTypeColor, setNewTypeColor] = useState('#6366f1')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Expanded groups state for Kompakt tab
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Create prospect type labels lookup from saved types
  const prospectTypeLabels = useMemo(() => {
    return createProspectTypeLabels(savedProspectTypes)
  }, [savedProspectTypes])

  // Grouped stats: key = "type|period", value = array of county stats
  const groupedStats = useMemo(() => {
    const groups = new Map<string, {
      prospectType: string | null
      periodStart: string | null
      periodEnd: string | null
      daysDuration: number | null
      counties: ProspektStats[]
      totalCount: number
      totalRing: number
      totalBrev: number
      latestSentToBrevAt: string | null
    }>()

    for (const stat of stats) {
      const key = `${stat.prospect_type || ''}|${stat.data_period_start || ''}`
      const existing = groups.get(key)
      if (existing) {
        existing.counties.push(stat)
        existing.totalCount += stat.count
        existing.totalRing += stat.sentToCallCount
        existing.totalBrev += stat.sentToBrevCount
        if (stat.latestSentToBrevAt) {
          if (!existing.latestSentToBrevAt || stat.latestSentToBrevAt > existing.latestSentToBrevAt) {
            existing.latestSentToBrevAt = stat.latestSentToBrevAt
          }
        }
      } else {
        groups.set(key, {
          prospectType: stat.prospect_type,
          periodStart: stat.data_period_start,
          periodEnd: stat.data_period_end,
          daysDuration: stat.daysDuration,
          counties: [stat],
          totalCount: stat.count,
          totalRing: stat.sentToCallCount,
          totalBrev: stat.sentToBrevCount,
          latestSentToBrevAt: stat.latestSentToBrevAt,
        })
      }
    }

    return Array.from(groups.entries()).map(([key, value]) => ({ key, ...value }))
  }, [stats])

  // Mailing timeline: group leadDetails by sent_to_brev_at date
  const mailingTimeline = useMemo(() => {
    // Build period end lookup from stats (leadDetails doesn't have period_end)
    const periodEndLookup = new Map<string, string | null>()
    for (const stat of stats) {
      const key = `${stat.prospect_type || ''}|${stat.data_period_start || ''}`
      if (!periodEndLookup.has(key)) {
        periodEndLookup.set(key, stat.data_period_end)
      }
    }

    const byDate = new Map<string, Map<string, {
      prospectType: string | null
      periodStart: string | null
      periodEnd: string | null
      counties: Map<string, number>
      totalCount: number
    }>>()
    const unsent: Map<string, {
      prospectType: string | null
      periodStart: string | null
      periodEnd: string | null
      counties: Map<string, number>
      totalCount: number
    }> = new Map()

    for (const lead of leadDetails) {
      const dateKey = lead.sent_to_brev_at
        ? new Date(lead.sent_to_brev_at).toISOString().split('T')[0]
        : null
      const groupKey = `${lead.prospect_type || ''}|${lead.data_period_start || ''}`

      const targetMap = dateKey ? (byDate.get(dateKey) || new Map()) : unsent
      if (dateKey && !byDate.has(dateKey)) {
        byDate.set(dateKey, targetMap)
      }

      const existing = targetMap.get(groupKey)
      const county = lead.county || 'Okänt'
      if (existing) {
        existing.counties.set(county, (existing.counties.get(county) || 0) + 1)
        existing.totalCount += 1
      } else {
        const countyMap = new Map<string, number>()
        countyMap.set(county, 1)
        targetMap.set(groupKey, {
          prospectType: lead.prospect_type,
          periodStart: lead.data_period_start,
          periodEnd: periodEndLookup.get(groupKey) || null,
          counties: countyMap,
          totalCount: 1,
        })
      }
    }

    // Sort dates descending
    const sortedDates = Array.from(byDate.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, entries]) => ({
        date,
        entries: Array.from(entries.values()),
      }))

    const unsentEntries = Array.from(unsent.values())

    return { sortedDates, unsentEntries }
  }, [leadDetails])

  // Toggle expanded group
  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  // Get prospect type label from saved types
  const getProspectTypeLabel = useCallback((type: string | null): string => {
    if (!type) return 'Okänd typ'
    return prospectTypeLabels[type] || type
  }, [prospectTypeLabels])

  // Get filtered leads for modal
  const getFilteredLeads = () => {
    let filtered = leadDetails

    // Filter by type (ring/brev)
    if (detailModalType === 'ring') {
      filtered = filtered.filter(l => l.sent_to_call_at)
    } else if (detailModalType === 'brev') {
      filtered = filtered.filter(l => l.sent_to_brev_at)
    }

    // Filter by prospect type
    if (detailModalFilter.prospectType) {
      filtered = filtered.filter(l => l.prospect_type === detailModalFilter.prospectType)
    }

    // Filter by period
    if (detailModalFilter.period) {
      filtered = filtered.filter(l => l.data_period_start === detailModalFilter.period)
    }

    return filtered
  }

  // Open detail modal
  const openDetailModal = (
    title: string,
    type: 'ring' | 'brev' | 'all',
    filter?: { prospectType?: string; period?: string }
  ) => {
    setDetailModalTitle(title)
    setDetailModalType(type)
    setDetailModalFilter(filter || {})
    setDetailModalOpen(true)
  }

  const updateFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (selectedProspectType && selectedProspectType !== 'all') {
      params.set('prospect_type', selectedProspectType)
    } else {
      params.delete('prospect_type')
    }

    if (dateFrom) {
      params.set('date_from', dateFrom)
    } else {
      params.delete('date_from')
    }

    if (dateTo) {
      params.set('date_to', dateTo)
    } else {
      params.delete('date_to')
    }

    if (!includeArchive) {
      params.set('include_archive', 'false')
    } else {
      params.delete('include_archive')
    }

    startTransition(() => {
      router.push(`/prospekt-typer?${params.toString()}`)
    })
  }, [selectedProspectType, dateFrom, dateTo, includeArchive, searchParams, router])

  const clearFilters = useCallback(() => {
    setSelectedProspectType('all')
    setDateFrom('')
    setDateTo('')
    setIncludeArchive(true)
    startTransition(() => {
      router.push('/prospekt-typer')
    })
  }, [router])

  const hasActiveFilters = selectedProspectType !== 'all' || dateFrom || dateTo || !includeArchive

  // Handle create prospect type
  const handleCreateType = async () => {
    if (!newTypeName.trim()) {
      setCreateError('Namn krävs')
      return
    }

    setIsCreating(true)
    setCreateError(null)

    const result = await createProspectType({
      name: newTypeName,
      description: newTypeDescription || null,
      color: newTypeColor
    })

    if (result.success) {
      setNewTypeName('')
      setNewTypeDescription('')
      setNewTypeColor('#6366f1')
      // Refresh the page to get updated data
      router.refresh()
    } else {
      setCreateError(result.error || 'Kunde inte skapa prospekttyp')
    }

    setIsCreating(false)
  }

  // Handle delete prospect type
  const handleDeleteType = async (id: string) => {
    setDeleteError(null)
    const result = await deleteProspectType(id)

    if (result.success) {
      router.refresh()
    } else {
      setDeleteError(result.error || 'Kunde inte ta bort prospekttyp')
    }
  }

  // Toggle archive handler - immediately update URL
  const handleArchiveToggle = useCallback((checked: boolean) => {
    setIncludeArchive(checked)
    const params = new URLSearchParams(searchParams.toString())
    if (!checked) {
      params.set('include_archive', 'false')
    } else {
      params.delete('include_archive')
    }
    startTransition(() => {
      router.push(`/prospekt-typer?${params.toString()}`)
    })
  }, [searchParams, router])

  return (
    <div className="space-y-6">
      {/* Top bar: Search + Archive Toggle */}
      <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-4">
          <RegNrSearch />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-gray-500" />
            <Label htmlFor="archive-toggle" className="text-sm text-muted-foreground">
              Inkl. arkiv
            </Label>
          </div>
          <Switch
            id="archive-toggle"
            checked={includeArchive}
            onCheckedChange={handleArchiveToggle}
            disabled={isPending}
          />
        </div>
      </div>

      {/* Prospect Type Management Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-lg">Prospekttyper</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManageTypesOpen(!manageTypesOpen)}
            >
              {manageTypesOpen ? 'Stäng' : 'Hantera'}
            </Button>
          </div>
          <CardDescription>
            {savedProspectTypes.length} sparade prospekttyper
          </CardDescription>
        </CardHeader>
        {manageTypesOpen && (
          <CardContent className="pt-0">
            {/* Saved Types List */}
            <div className="space-y-2 mb-4">
              {savedProspectTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Inga sparade prospekttyper
                </p>
              ) : (
                savedProspectTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      <div>
                        <p className="font-medium">{type.name}</p>
                        {type.description && (
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteType(type.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {deleteError && (
              <p className="text-sm text-red-500 mb-4">{deleteError}</p>
            )}

            {/* Create New Type Form */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Skapa ny prospekttyp</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="type-name">Namn *</Label>
                  <Input
                    id="type-name"
                    placeholder="T.ex. nyköpt_bil"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="type-description">Beskrivning</Label>
                  <Input
                    id="type-description"
                    placeholder="T.ex. Nyköpta bilar"
                    value={newTypeDescription}
                    onChange={(e) => setNewTypeDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="type-color">Färg</Label>
                  <div className="flex gap-2">
                    <Input
                      id="type-color"
                      type="color"
                      value={newTypeColor}
                      onChange={(e) => setNewTypeColor(e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={newTypeColor}
                      onChange={(e) => setNewTypeColor(e.target.value)}
                      className="flex-1"
                      placeholder="#6366f1"
                    />
                  </div>
                </div>

                {createError && (
                  <p className="text-sm text-red-500">{createError}</p>
                )}

                <Button
                  onClick={handleCreateType}
                  disabled={isCreating || !newTypeName.trim()}
                  className="w-full"
                >
                  {isCreating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Skapa prospekttyp
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt antal leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads.toLocaleString('sv-SE')}</div>
            <p className="text-xs text-muted-foreground">
              {prospectTypeSummary.length} prospekttyper
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-blue-50 transition-colors border-blue-200"
          onClick={() => openDetailModal('Skickade till Ring', 'ring')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skickat till Ring</CardTitle>
            <Phone className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalSentToCall.toLocaleString('sv-SE')}</div>
            <p className="text-xs text-muted-foreground">
              {totalLeads > 0 ? ((totalSentToCall / totalLeads) * 100).toFixed(1) : 0}% av totalt
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-green-50 transition-colors border-green-200"
          onClick={() => openDetailModal('Skickade till Brev', 'brev')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skickat till Brev</CardTitle>
            <Mail className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalSentToBrev.toLocaleString('sv-SE')}</div>
            <p className="text-xs text-muted-foreground">
              {totalLeads > 0 ? ((totalSentToBrev / totalLeads) * 100).toFixed(1) : 0}% av totalt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tidsperioder</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodSummary.length}</div>
            <p className="text-xs text-muted-foreground">
              Unika importperioder
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kombinationer</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.length}</div>
            <p className="text-xs text-muted-foreground">
              Typ + period kombinationer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Analysis Section */}
      {totalBrevCount > 0 && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Coins className="h-5 w-5" />
              Kostnadsanalys - Brev
            </CardTitle>
            <CardDescription className="text-purple-600">
              {includeArchive ? 'Alla leads (inkl. arkiv)' : 'Aktiva leads'} • Brevkostnad: {letterCost} kr/st
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 mb-4">
              <div className="p-4 bg-white rounded-lg border border-purple-200">
                <p className="text-sm text-muted-foreground">Antal brev skickade</p>
                <p className="text-3xl font-bold text-purple-700">{totalBrevCount.toLocaleString('sv-SE')}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-purple-200">
                <p className="text-sm text-muted-foreground">Kostnad per brev</p>
                <p className="text-3xl font-bold text-purple-700">{letterCost} kr</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-purple-200">
                <p className="text-sm text-muted-foreground">Total kostnad</p>
                <p className="text-3xl font-bold text-purple-700">{totalBrevCost.toLocaleString('sv-SE')} kr</p>
              </div>
            </div>

            {/* Cost View Tabs */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={costViewType === 'period' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCostViewType('period')}
                className={costViewType === 'period' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                Per Period
              </Button>
              <Button
                variant={costViewType === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCostViewType('year')}
                className={costViewType === 'year' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                Per År
              </Button>
              <Button
                variant={costViewType === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCostViewType('month')}
                className={costViewType === 'month' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                Per Månad
              </Button>
              <Button
                variant={costViewType === 'date' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCostViewType('date')}
                className={costViewType === 'date' ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                Per Datum
              </Button>
            </div>

            {/* Cost by Period */}
            {costViewType === 'period' && costByPeriod.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-purple-700">Kostnad per dataperiod</p>
                <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                  {costByPeriod.map((item) => (
                    <div key={item.period} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{formatPeriod(item.period)}</Badge>
                        <span className="text-sm text-muted-foreground">{item.brevCount} brev</span>
                      </div>
                      <span className="font-semibold text-purple-700">{item.cost.toLocaleString('sv-SE')} kr</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost by Year */}
            {costViewType === 'year' && costByYear.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-purple-700">Kostnad per år (baserat på skickdatum)</p>
                <div className="grid gap-2">
                  {costByYear.map((item) => (
                    <div key={item.year} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-lg px-3">{item.year}</Badge>
                        <span className="text-sm text-muted-foreground">{item.brevCount} brev</span>
                      </div>
                      <span className="font-semibold text-purple-700 text-lg">{item.cost.toLocaleString('sv-SE')} kr</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost by Month */}
            {costViewType === 'month' && costByMonth.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-purple-700">Kostnad per månad (baserat på skickdatum)</p>
                <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                  {costByMonth.map((item) => {
                    const [year, month] = item.month.split('-')
                    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })
                    return (
                      <div key={item.month} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="capitalize">{monthName}</Badge>
                          <span className="text-sm text-muted-foreground">{item.brevCount} brev</span>
                        </div>
                        <span className="font-semibold text-purple-700">{item.cost.toLocaleString('sv-SE')} kr</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Cost by Date */}
            {costViewType === 'date' && costByDate.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-purple-700">Kostnad per datum (baserat på skickdatum)</p>
                <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                  {costByDate.map((item) => (
                    <div key={item.date} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">
                          {new Date(item.date).toLocaleDateString('sv-SE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{item.brevCount} brev</span>
                      </div>
                      <span className="font-semibold text-purple-700">{item.cost.toLocaleString('sv-SE')} kr</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {costViewType === 'period' && costByPeriod.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Ingen data att visa per period</p>
            )}
            {costViewType === 'year' && costByYear.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Ingen data att visa per år</p>
            )}
            {costViewType === 'month' && costByMonth.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Ingen data att visa per månad</p>
            )}
            {costViewType === 'date' && costByDate.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Ingen data att visa per datum</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Period Gaps Warning */}
      {periodGaps.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Luckor i dataperioder ({periodGaps.length})
            </CardTitle>
            <CardDescription className="text-amber-600">
              Dessa perioder saknar data och kan behöva kompletteras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {periodGaps.map((gap, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="font-medium">
                      {formatPeriod(gap.gapStart)} — {formatPeriod(gap.gapEnd)}
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                    {gap.daysMissing} dagar saknas
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter
          </CardTitle>
          <CardDescription>
            Filtrera data efter prospekttyp och tidsperiod
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Prospekttyp</Label>
              <Select value={selectedProspectType} onValueChange={setSelectedProspectType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Välj typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla typer</SelectItem>
                  {availableProspectTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {getProspectTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period från</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[160px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Period till</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[160px]"
              />
            </div>

            <Button onClick={updateFilters} disabled={isPending}>
              {isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Filter className="h-4 w-4 mr-2" />
              )}
              Filtrera
            </Button>

            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Rensa filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout: Prospect Types & Periods */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Prospect Type Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Per Prospekttyp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {prospectTypeSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">Inga prospekttyper hittades</p>
              ) : (
                prospectTypeSummary.map(({ type, count, sentToCallCount, sentToBrevCount }) => (
                  <div key={type} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getProspectTypeLabel(type)}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{count.toLocaleString('sv-SE')}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => openDetailModal(`Ring - ${getProspectTypeLabel(type)}`, 'ring', { prospectType: type })}
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          {sentToCallCount}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => openDetailModal(`Brev - ${getProspectTypeLabel(type)}`, 'brev', { prospectType: type })}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          {sentToBrevCount}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Period Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Per Tidsperiod
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {periodSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">Inga perioder hittades</p>
              ) : (
                periodSummary.map(({ period, count, sentToCallCount, sentToBrevCount }) => (
                  <div key={period} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{formatPeriod(period)}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{count.toLocaleString('sv-SE')}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => openDetailModal(`Ring - ${formatPeriod(period)}`, 'ring', { period })}
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          {sentToCallCount}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => openDetailModal(`Brev - ${formatPeriod(period)}`, 'brev', { period })}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          {sentToBrevCount}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Overview with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Detaljerad översikt</CardTitle>
          <CardDescription>
            Alla kombinationer av prospekttyp, tidsperiod och län
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="grouped">
            <TabsList className="mb-4">
              <TabsTrigger value="grouped" className="gap-1.5">
                <Layers className="h-4 w-4" />
                Grupperad
              </TabsTrigger>
              <TabsTrigger value="compact" className="gap-1.5">
                <ListCollapse className="h-4 w-4" />
                Kompakt
              </TabsTrigger>
              <TabsTrigger value="mailings" className="gap-1.5">
                <Send className="h-4 w-4" />
                Senaste utskick
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Grupperad */}
            <TabsContent value="grouped">
              {groupedStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Ingen data att visa</p>
              ) : (
                <div className="space-y-0 border rounded-lg overflow-hidden">
                  {groupedStats.map((group, groupIndex) => {
                    const sentStatus = group.totalBrev === group.totalCount && group.totalCount > 0
                      ? 'all'
                      : group.totalBrev > 0
                        ? 'partial'
                        : 'none'
                    return (
                      <div key={group.key} className={groupIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {/* Group header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-100/70">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-semibold">
                              {getProspectTypeLabel(group.prospectType)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatPeriodRange(group.periodStart, group.periodEnd)}
                            </span>
                            {group.daysDuration !== null && (
                              <Badge variant="secondary" className="font-mono text-xs">
                                {group.daysDuration} d
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {group.latestSentToBrevAt && (
                              <span className="text-xs text-muted-foreground">
                                Brev: {new Date(group.latestSentToBrevAt).toLocaleDateString('sv-SE')}
                              </span>
                            )}
                            <span className="text-lg">
                              {sentStatus === 'all' ? '✅' : sentStatus === 'partial' ? '🟡' : '⬜'}
                            </span>
                          </div>
                        </div>
                        {/* County sub-rows */}
                        {group.counties.map((stat, countyIndex) => (
                          <div
                            key={countyIndex}
                            className="flex items-center justify-between px-4 py-2 border-b last:border-b-0 hover:bg-blue-50/30 cursor-pointer"
                            onClick={() => openDetailModal(
                              `${getProspectTypeLabel(stat.prospect_type)} - ${stat.county || 'Okänt län'} (${formatPeriod(stat.data_period_start)})`,
                              'all',
                              { prospectType: stat.prospect_type || undefined, period: stat.data_period_start || undefined }
                            )}
                          >
                            <div className="flex items-center gap-3 pl-4">
                              <Badge variant="secondary" className="text-xs">
                                {stat.county || 'Okänt'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium w-16 text-right">{stat.count.toLocaleString('sv-SE')}</span>
                              <span className="text-blue-600 w-20 text-right">
                                <Phone className="h-3 w-3 inline mr-1" />
                                {stat.sentToCallCount}
                              </span>
                              <span className="text-green-600 w-20 text-right">
                                <Mail className="h-3 w-3 inline mr-1" />
                                {stat.sentToBrevCount}
                              </span>
                            </div>
                          </div>
                        ))}
                        {/* Subtotal row */}
                        {group.counties.length > 1 && (
                          <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50/50 font-semibold">
                            <div className="pl-4 text-sm text-muted-foreground">Totalt:</div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="w-16 text-right">{group.totalCount.toLocaleString('sv-SE')}</span>
                              <span className="text-blue-600 w-20 text-right">
                                <Phone className="h-3 w-3 inline mr-1" />
                                {group.totalRing}
                              </span>
                              <span className="text-green-600 w-20 text-right">
                                <Mail className="h-3 w-3 inline mr-1" />
                                {group.totalBrev}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Kompakt */}
            <TabsContent value="compact">
              {groupedStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Ingen data att visa</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Län</TableHead>
                      <TableHead className="text-right">Antal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ring</TableHead>
                      <TableHead className="text-center">Brev</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedStats.map((group) => {
                      const isExpanded = expandedGroups.has(group.key)
                      const sentStatus = group.totalBrev === group.totalCount && group.totalCount > 0
                        ? 'all'
                        : group.totalBrev > 0
                          ? 'partial'
                          : 'none'
                      return (
                        <React.Fragment key={group.key}>
                          <TableRow
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleGroup(group.key)}
                          >
                            <TableCell className="w-8 px-2">
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              }
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getProspectTypeLabel(group.prospectType)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatPeriodRange(group.periodStart, group.periodEnd)}
                              {group.daysDuration !== null && (
                                <Badge variant="secondary" className="ml-2 font-mono text-xs">
                                  {group.daysDuration} d
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {group.counties.map(c => c.county || 'Okänt').join(', ')}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {group.totalCount.toLocaleString('sv-SE')}
                            </TableCell>
                            <TableCell>
                              {sentStatus === 'all' ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200">
                                  Skickat ({group.totalBrev})
                                </Badge>
                              ) : sentStatus === 'partial' ? (
                                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                                  Delvis ({group.totalBrev})
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Ej skickat
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-blue-600">
                              <Phone className="h-3 w-3 inline mr-1" />
                              {group.totalRing}
                            </TableCell>
                            <TableCell className="text-center text-green-600">
                              <Mail className="h-3 w-3 inline mr-1" />
                              {group.totalBrev}
                            </TableCell>
                          </TableRow>
                          {/* Expanded county rows */}
                          {isExpanded && group.counties.map((stat, i) => (
                            <TableRow
                              key={`${group.key}-${i}`}
                              className="bg-muted/30 hover:bg-muted/50 cursor-pointer"
                              onClick={() => openDetailModal(
                                `${getProspectTypeLabel(stat.prospect_type)} - ${stat.county || 'Okänt län'} (${formatPeriod(stat.data_period_start)})`,
                                'all',
                                { prospectType: stat.prospect_type || undefined, period: stat.data_period_start || undefined }
                              )}
                            >
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {stat.county || 'Okänt'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {stat.count.toLocaleString('sv-SE')}
                              </TableCell>
                              <TableCell>
                                {stat.latestSentToBrevAt ? (
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    {new Date(stat.latestSentToBrevAt).toLocaleDateString('sv-SE')}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openDetailModal(
                                      `Ring - ${getProspectTypeLabel(stat.prospect_type)} (${formatPeriod(stat.data_period_start)})`,
                                      'ring',
                                      { prospectType: stat.prospect_type || undefined, period: stat.data_period_start || undefined }
                                    )
                                  }}
                                >
                                  {stat.sentToCallCount}
                                </Button>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openDetailModal(
                                      `Brev - ${getProspectTypeLabel(stat.prospect_type)} (${formatPeriod(stat.data_period_start)})`,
                                      'brev',
                                      { prospectType: stat.prospect_type || undefined, period: stat.data_period_start || undefined }
                                    )
                                  }}
                                >
                                  {stat.sentToBrevCount}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Tab 3: Senaste utskick */}
            <TabsContent value="mailings">
              {mailingTimeline.sortedDates.length === 0 && mailingTimeline.unsentEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Ingen data att visa</p>
              ) : (
                <div className="space-y-6">
                  {mailingTimeline.sortedDates.map(({ date, entries }) => (
                    <div key={date} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                        <Mail className="h-4 w-4" />
                        {new Date(date).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="space-y-1 pl-6">
                        {entries.map((entry, i) => {
                          const countyList = Array.from(entry.counties.entries())
                          const cost = entry.totalCount * letterCost
                          return (
                            <div
                              key={i}
                              className="flex items-center justify-between p-2 rounded hover:bg-green-50 cursor-pointer text-sm"
                              onClick={() => openDetailModal(
                                `${getProspectTypeLabel(entry.prospectType)} (${formatPeriodRange(entry.periodStart, entry.periodEnd)})`,
                                'brev',
                                { prospectType: entry.prospectType || undefined, period: entry.periodStart || undefined }
                              )}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {getProspectTypeLabel(entry.prospectType)}
                                </Badge>
                                <span className="text-muted-foreground">
                                  ({formatPeriodRange(entry.periodStart, entry.periodEnd)}):
                                </span>
                                <span>
                                  {countyList.map(([county, count], ci) => (
                                    <span key={county}>
                                      {ci > 0 && ' + '}
                                      {county} ({count})
                                    </span>
                                  ))}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-muted-foreground shrink-0 ml-2">
                                <span className="font-medium text-foreground">
                                  = {entry.totalCount} st
                                </span>
                                <span className="text-purple-600 font-medium">
                                  {cost.toLocaleString('sv-SE')} kr
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Unsent section */}
                  {mailingTimeline.unsentEntries.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                        <span className="text-lg">⬜</span>
                        Ej skickade
                      </div>
                      <div className="space-y-1 pl-6">
                        {mailingTimeline.unsentEntries.map((entry, i) => {
                          const countyList = Array.from(entry.counties.entries())
                          return (
                            <div
                              key={i}
                              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer text-sm"
                              onClick={() => openDetailModal(
                                `${getProspectTypeLabel(entry.prospectType)} (${formatPeriodRange(entry.periodStart, entry.periodEnd)})`,
                                'all',
                                { prospectType: entry.prospectType || undefined, period: entry.periodStart || undefined }
                              )}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {getProspectTypeLabel(entry.prospectType)}
                                </Badge>
                                <span className="text-muted-foreground">
                                  ({formatPeriodRange(entry.periodStart, entry.periodEnd)}):
                                </span>
                                <span>
                                  {countyList.map(([county, count], ci) => (
                                    <span key={county}>
                                      {ci > 0 && ', '}
                                      {county} ({count})
                                    </span>
                                  ))}
                                </span>
                              </div>
                              <span className="font-medium shrink-0 ml-2">
                                = {entry.totalCount} st
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailModalType === 'ring' && <Phone className="h-5 w-5 text-blue-500" />}
              {detailModalType === 'brev' && <Mail className="h-5 w-5 text-green-500" />}
              {detailModalType === 'all' && <Users className="h-5 w-5" />}
              {detailModalTitle}
            </DialogTitle>
            <DialogDescription>
              {getFilteredLeads().length} leads
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ägare</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Län</TableHead>
                  <TableHead>Prospekttyp</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-center">Inlagt</TableHead>
                  <TableHead className="text-center">Ring</TableHead>
                  <TableHead className="text-center">Brev</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredLeads().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Inga leads att visa
                    </TableCell>
                  </TableRow>
                ) : (
                  getFilteredLeads().slice(0, 100).map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onDoubleClick={() => router.push(`/leads/${lead.id}`)}
                    >
                      <TableCell className="font-medium">
                        {lead.owner_info || '-'}
                      </TableCell>
                      <TableCell>
                        {lead.phone || '-'}
                      </TableCell>
                      <TableCell>
                        {lead.county || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getProspectTypeLabel(lead.prospect_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatPeriod(lead.data_period_start)}
                      </TableCell>
                      <TableCell className="text-center">
                        {lead.created_at ? (
                          <Badge variant="secondary" className="text-xs">
                            {new Date(lead.created_at).toLocaleDateString('sv-SE')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {lead.sent_to_call_at ? (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            {new Date(lead.sent_to_call_at).toLocaleDateString('sv-SE')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {lead.sent_to_brev_at ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            {new Date(lead.sent_to_brev_at).toLocaleDateString('sv-SE')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {getFilteredLeads().length > 100 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Visar 100 av {getFilteredLeads().length} leads
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
