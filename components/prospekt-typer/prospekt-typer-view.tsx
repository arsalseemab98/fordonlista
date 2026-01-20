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
  Clock
} from 'lucide-react'
import { type PeriodGap } from '@/lib/time-period-utils'

interface ProspektStats {
  prospect_type: string | null
  data_period_start: string | null
  data_period_end: string | null
  count: number
  daysDuration: number | null
}

interface ProspektTyperViewProps {
  stats: ProspektStats[]
  prospectTypeSummary: { type: string; count: number }[]
  periodSummary: { period: string; count: number }[]
  totalLeads: number
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
      <div className="grid gap-4 md:grid-cols-3">
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
                prospectTypeSummary.map(({ type, count }) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getProspectTypeLabel(type)}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{count.toLocaleString('sv-SE')}</span>
                      <span className="text-xs text-muted-foreground">
                        ({((count / totalLeads) * 100).toFixed(1)}%)
                      </span>
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
                periodSummary.map(({ period, count }) => (
                  <div key={period} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{formatPeriod(period)}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{count.toLocaleString('sv-SE')}</span>
                      <span className="text-xs text-muted-foreground">
                        ({((count / totalLeads) * 100).toFixed(1)}%)
                      </span>
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
                <TableHead className="text-right">Antal leads</TableHead>
                <TableHead className="text-right">Andel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Ingen data att visa
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((stat, index) => (
                  <TableRow key={index}>
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
                    <TableCell className="text-right text-muted-foreground">
                      {((stat.count / totalLeads) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
