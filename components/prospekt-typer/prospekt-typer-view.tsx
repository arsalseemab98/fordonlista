'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Eye
} from 'lucide-react'
import { type PeriodGap } from '@/lib/time-period-utils'

interface ProspektStats {
  prospect_type: string | null
  data_period_start: string | null
  data_period_end: string | null
  count: number
  daysDuration: number | null
  sentToCallCount: number
  sentToBrevCount: number
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
  }
}

// Prospect type labels in Swedish
const PROSPECT_TYPE_LABELS: Record<string, string> = {
  'avställda': 'Avställda fordon',
  'nyköpt_bil': 'Nyköpt bil',
  'låg_miltal': 'Låg miltal',
  'alla': 'Alla typer',
}

function getProspectTypeLabel(type: string | null): string {
  if (!type) return 'Okänd typ'
  return PROSPECT_TYPE_LABELS[type] || type
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
  currentFilters
}: ProspektTyperViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Filter state
  const [selectedProspectType, setSelectedProspectType] = useState<string>(currentFilters.prospectType || 'all')
  const [dateFrom, setDateFrom] = useState(currentFilters.dateFrom || '')
  const [dateTo, setDateTo] = useState(currentFilters.dateTo || '')

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailModalTitle, setDetailModalTitle] = useState('')
  const [detailModalType, setDetailModalType] = useState<'ring' | 'brev' | 'all'>('all')
  const [detailModalFilter, setDetailModalFilter] = useState<{
    prospectType?: string
    period?: string
  }>({})

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

    startTransition(() => {
      router.push(`/prospekt-typer?${params.toString()}`)
    })
  }, [selectedProspectType, dateFrom, dateTo, searchParams, router])

  const clearFilters = useCallback(() => {
    setSelectedProspectType('all')
    setDateFrom('')
    setDateTo('')
    startTransition(() => {
      router.push('/prospekt-typer')
    })
  }, [router])

  const hasActiveFilters = selectedProspectType !== 'all' || dateFrom || dateTo

  return (
    <div className="space-y-6">
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

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detaljerad översikt</CardTitle>
          <CardDescription>
            Alla kombinationer av prospekttyp och tidsperiod
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prospekttyp</TableHead>
                <TableHead>Period start</TableHead>
                <TableHead>Period slut</TableHead>
                <TableHead className="text-center">Dagar</TableHead>
                <TableHead className="text-right">Antal</TableHead>
                <TableHead className="text-center">Ring</TableHead>
                <TableHead className="text-center">Brev</TableHead>
                <TableHead className="text-center">Detaljer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Ingen data att visa
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((stat, index) => (
                  <TableRow
                    key={index}
                    className="cursor-pointer hover:bg-muted/50"
                    onDoubleClick={() => openDetailModal(
                      `${getProspectTypeLabel(stat.prospect_type)} (${formatPeriod(stat.data_period_start)})`,
                      'all',
                      { prospectType: stat.prospect_type || undefined, period: stat.data_period_start || undefined }
                    )}
                  >
                    <TableCell>
                      <Badge variant="outline">
                        {getProspectTypeLabel(stat.prospect_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatPeriod(stat.data_period_start)}</TableCell>
                    <TableCell>{formatPeriod(stat.data_period_end)}</TableCell>
                    <TableCell className="text-center">
                      {stat.daysDuration !== null ? (
                        <Badge variant="secondary" className="font-mono">
                          {stat.daysDuration} d
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {stat.count.toLocaleString('sv-SE')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => openDetailModal(
                          `Ring - ${getProspectTypeLabel(stat.prospect_type)} (${formatPeriod(stat.data_period_start)})`,
                          'ring',
                          { prospectType: stat.prospect_type || undefined, period: stat.data_period_start || undefined }
                        )}
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        {stat.sentToCallCount}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => openDetailModal(
                          `Brev - ${getProspectTypeLabel(stat.prospect_type)} (${formatPeriod(stat.data_period_start)})`,
                          'brev',
                          { prospectType: stat.prospect_type || undefined, period: stat.data_period_start || undefined }
                        )}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        {stat.sentToBrevCount}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => openDetailModal(
                          `${getProspectTypeLabel(stat.prospect_type)} (${formatPeriod(stat.data_period_start)})`,
                          'all',
                          { prospectType: stat.prospect_type || undefined, period: stat.data_period_start || undefined }
                        )}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
                  <TableHead className="text-center">Ring</TableHead>
                  <TableHead className="text-center">Brev</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredLeads().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
