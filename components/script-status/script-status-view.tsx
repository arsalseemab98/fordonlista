'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity,
  Database,
  Zap,
  Calendar,
} from 'lucide-react'

interface ScriptStatus {
  id: string
  name: string
  description: string
  schedule: string
  logTable: string
  type: string
  status: 'running' | 'ok' | 'error' | 'unknown'
  lastRun?: string | null
  lastRunDuration?: number | null
  runsToday?: number
  errorsToday?: number
  stats: Record<string, any>
  logs: any[]
}

interface Summary {
  totalScripts: number
  running: number
  ok: number
  errors: number
  unknown: number
}

interface ScriptStatusViewProps {
  scripts: ScriptStatus[]
  summary: Summary
  blocketLogs: any[]
  biluppgifterLogs: any[]
  bilprospektLogs: any[]
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('sv-SE')
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

function timeAgo(dateStr: string | null | undefined) {
  if (!dateStr) return '-'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just nu'
  if (mins < 60) return `${mins}m sedan`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h sedan`
  const days = Math.floor(hours / 24)
  return `${days}d sedan`
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <Play className="h-3 w-3 mr-1 animate-pulse" />
          Kör
        </Badge>
      )
    case 'ok':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          OK
        </Badge>
      )
    case 'error':
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Fel
        </Badge>
      )
    default:
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Okänd
        </Badge>
      )
  }
}

function TypeBadge({ type }: { type: string }) {
  switch (type) {
    case 'cron':
      return (
        <Badge variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Cron
        </Badge>
      )
    case 'background':
      return (
        <Badge variant="outline" className="text-xs">
          <Zap className="h-3 w-3 mr-1" />
          Background
        </Badge>
      )
    case 'manual':
      return (
        <Badge variant="outline" className="text-xs">
          <Calendar className="h-3 w-3 mr-1" />
          Manuell
        </Badge>
      )
    case 'external':
      return (
        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
          <Activity className="h-3 w-3 mr-1" />
          Extern
        </Badge>
      )
    default:
      return <Badge variant="outline" className="text-xs">{type}</Badge>
  }
}

function ScriptCard({ script }: { script: ScriptStatus }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className={`transition-all ${
      script.status === 'error' ? 'border-red-300 bg-red-50/30' :
      script.status === 'running' ? 'border-blue-300 bg-blue-50/30' :
      script.status === 'ok' ? 'border-green-200' : ''
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{script.name}</CardTitle>
              <StatusBadge status={script.status} />
              <TypeBadge type={script.type} />
            </div>
            <p className="text-sm text-gray-500">{script.description}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Senast körd</p>
            <p className="font-medium">{timeAgo(script.lastRun)}</p>
          </div>
          <div>
            <p className="text-gray-500">Varaktighet</p>
            <p className="font-medium">{formatDuration(script.lastRunDuration)}</p>
          </div>
          <div>
            <p className="text-gray-500">Schema</p>
            <p className="font-medium text-xs">{script.schedule}</p>
          </div>
          {script.errorsToday !== undefined && (
            <div>
              <p className="text-gray-500">Fel idag</p>
              <p className={`font-medium ${script.errorsToday > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {script.errorsToday}
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        {Object.keys(script.stats).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Statistik</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {Object.entries(script.stats).map(([key, value]) => (
                <div key={key}>
                  <p className="text-gray-500 text-xs">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</p>
                  <p className="font-medium">{typeof value === 'number' ? value.toLocaleString() : value || '-'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs */}
        {expanded && script.logs.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Senaste loggar</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {script.logs.map((log, i) => (
                <div
                  key={i}
                  className={`text-xs p-2 rounded ${
                    log.type === 'error' || log.status === 'failed' ? 'bg-red-50 text-red-800' :
                    log.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                    log.status === 'running' ? 'bg-blue-50 text-blue-800' :
                    'bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {log.message || log.status || '-'}
                    </span>
                    <span className="text-gray-400">
                      {formatDate(log.created_at || log.started_at)}
                    </span>
                  </div>
                  {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
                    <pre className="mt-1 text-xs overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                  {log.error_message && (
                    <p className="mt-1 text-red-600">{log.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LogTable({ title, logs, columns }: { title: string; logs: any[]; columns: { key: string; label: string }[] }) {
  const [showAll, setShowAll] = useState(false)
  const displayLogs = showAll ? logs : logs.slice(0, 10)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          {title}
          <Badge variant="outline" className="ml-2">{logs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="px-2 py-1.5 text-left text-xs font-medium text-gray-500">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayLogs.map((log, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  {columns.map(col => (
                    <td key={col.key} className="px-2 py-1.5 text-xs">
                      {col.key === 'status' || col.key === 'type' ? (
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            log[col.key] === 'error' || log[col.key] === 'failed' ? 'bg-red-50 text-red-700' :
                            log[col.key] === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                            log[col.key] === 'running' ? 'bg-blue-50 text-blue-700' :
                            log[col.key] === 'completed' || log[col.key] === 'success' ? 'bg-green-50 text-green-700' :
                            ''
                          }`}
                        >
                          {log[col.key]}
                        </Badge>
                      ) : col.key.includes('_at') || col.key === 'created_at' ? (
                        formatDate(log[col.key])
                      ) : typeof log[col.key] === 'object' ? (
                        <span className="truncate max-w-xs block">{JSON.stringify(log[col.key])}</span>
                      ) : (
                        log[col.key] ?? '-'
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length > 10 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="mt-2"
          >
            {showAll ? 'Visa färre' : `Visa alla (${logs.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function ScriptStatusView({
  scripts,
  summary,
  blocketLogs,
  biluppgifterLogs,
  bilprospektLogs,
}: ScriptStatusViewProps) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gray-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Totalt</p>
                <p className="text-2xl font-bold">{summary.totalScripts}</p>
              </div>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className={`${summary.running > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600">Kör nu</p>
                <p className="text-2xl font-bold text-blue-800">{summary.running}</p>
              </div>
              <Play className={`h-5 w-5 text-blue-400 ${summary.running > 0 ? 'animate-pulse' : ''}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600">OK</p>
                <p className="text-2xl font-bold text-green-800">{summary.ok}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className={`${summary.errors > 0 ? 'bg-red-50 border-red-300' : 'bg-gray-50'}`}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600">Fel</p>
                <p className="text-2xl font-bold text-red-800">{summary.errors}</p>
              </div>
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Okänd</p>
                <p className="text-2xl font-bold text-gray-800">{summary.unknown}</p>
              </div>
              <AlertCircle className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Script Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Scripts
        </h2>
        <div className="grid gap-4">
          {scripts.map(script => (
            <ScriptCard key={script.id} script={script} />
          ))}
        </div>
      </div>

      {/* Log Tables */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Database className="h-5 w-5" />
          Detaljerade loggar
        </h2>

        <div className="grid gap-4 lg:grid-cols-2">
          <LogTable
            title="Blocket Scraper"
            logs={blocketLogs}
            columns={[
              { key: 'status', label: 'Status' },
              { key: 'nya_annonser', label: 'Nya' },
              { key: 'borttagna', label: 'Borttagna' },
              { key: 'duration_seconds', label: 'Tid (s)' },
              { key: 'started_at', label: 'Start' },
            ]}
          />

          <LogTable
            title="Biluppgifter"
            logs={biluppgifterLogs}
            columns={[
              { key: 'type', label: 'Typ' },
              { key: 'message', label: 'Meddelande' },
              { key: 'created_at', label: 'Tid' },
            ]}
          />
        </div>

        <LogTable
          title="Bilprospekt Sync"
          logs={bilprospektLogs}
          columns={[
            { key: 'status', label: 'Status' },
            { key: 'bilprospekt_date', label: 'Datakälla' },
            { key: 'records_fetched', label: 'Hämtade' },
            { key: 'records_upserted', label: 'Uppdaterade' },
            { key: 'trigger_type', label: 'Trigger' },
            { key: 'started_at', label: 'Start' },
            { key: 'error_message', label: 'Fel' },
          ]}
        />
      </div>
    </div>
  )
}
