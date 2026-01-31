'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  TrendingUp,
  AlertTriangle,
  Store,
  User,
  Database,
  ShoppingCart,
  Zap,
  MapPin,
  Calendar,
  RefreshCw,
  ExternalLink,
  Tag,
  Trash2
} from 'lucide-react'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteScraperLog, deleteAllLogs } from '@/app/blocket-logs/actions'

interface ScraperLog {
  id: number
  started_at: string
  finished_at: string | null
  status: string
  annonser_hittade: number | null
  nya_annonser: number | null
  uppdaterade_annonser: number | null
  prisandringar: number | null
  error_message: string | null
  regioner_sokta: string[] | null
  marken_sokta: string[] | null
  scrape_type: string | null
}

interface RecentCar {
  id: number
  marke: string
  modell: string
  arsmodell: number | null
  pris: number | null
  miltal: number | null
  region: string | null
  stad: string | null
  saljare_typ: string | null
  forst_sedd: string
  url: string | null
  bild_url: string | null
  kaross: string | null
  farg: string | null
  vaxellada: string | null
  momsbil: boolean | null
}

interface SoldCar {
  id: number
  marke: string
  modell: string
  arsmodell: number | null
  pris: number | null
  miltal: number | null
  region: string | null
  stad: string | null
  saljare_typ: string | null
  borttagen: string
  borttagen_anledning: string | null
  url: string | null
  forst_sedd: string
}

interface Stats {
  totalRuns: number
  successfulRuns: number
  failedRuns: number
  totalNewAds: number
  totalAdsScanned: number
  totalAdsInDb: number
  dealerAds: number
  privateAds: number
  activeAds: number
  soldAds: number
  newAdsToday: number
  soldAdsToday: number
}

interface BlocketLogsViewProps {
  logs: ScraperLog[]
  stats: Stats
  recentNewCars: RecentCar[]
  recentSoldCars: SoldCar[]
  regionBreakdown: Record<string, number>
}

export function BlocketLogsView({ logs, stats, recentNewCars, recentSoldCars, regionBreakdown }: BlocketLogsViewProps) {
  const [showAllNewCars, setShowAllNewCars] = useState(false)
  const [showAllSoldCars, setShowAllSoldCars] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDeleteLog = async (logId: number) => {
    if (!confirm('Vill du ta bort denna logg?')) return
    setDeletingId(logId)
    startTransition(async () => {
      await deleteScraperLog(logId)
      setDeletingId(null)
    })
  }

  const handleDeleteAllLogs = async () => {
    if (!confirm('Vill du ta bort ALLA loggar? Detta kan inte ångras.')) return
    startTransition(async () => {
      await deleteAllLogs()
    })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMin / 60)

    if (diffMin < 60) return `${diffMin} min sedan`
    if (diffHour < 24) return `${diffHour} tim sedan`
    return formatDate(dateStr)
  }

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return '-'
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffMs = endDate.getTime() - startDate.getTime()
    const diffSec = Math.round(diffMs / 1000)
    if (diffSec < 60) return `${diffSec}s`
    const diffMin = Math.floor(diffSec / 60)
    const remainingSec = diffSec % 60
    return `${diffMin}m ${remainingSec}s`
  }

  const formatPrice = (pris: number | null) => {
    if (!pris) return '-'
    return `${pris.toLocaleString()} kr`
  }

  const formatMileage = (miltal: number | null) => {
    if (!miltal) return '-'
    return `${(miltal / 10).toLocaleString()} mil`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Klar
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Fel
          </Badge>
        )
      case 'running':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="w-3 h-3 mr-1" />
            Kör...
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getSellerBadge = (type: string | null) => {
    if (type === 'handlare') {
      return <Badge className="bg-blue-100 text-blue-700 text-xs"><Store className="w-3 h-3 mr-1" />Handlare</Badge>
    }
    return <Badge className="bg-teal-100 text-teal-700 text-xs"><User className="w-3 h-3 mr-1" />Privat</Badge>
  }

  const getScrapeTypeBadge = (type: string | null) => {
    if (type === 'light') {
      return <Badge className="bg-purple-100 text-purple-700 text-xs"><Zap className="w-3 h-3 mr-1" />Light</Badge>
    }
    return <Badge className="bg-indigo-100 text-indigo-700 text-xs"><Clock className="w-3 h-3 mr-1" />Full</Badge>
  }

  const getSoldReasonBadge = (reason: string | null) => {
    if (reason === 'SÅLD') {
      return <Badge className="bg-green-100 text-green-700 text-xs"><Tag className="w-3 h-3 mr-1" />Såld</Badge>
    }
    if (reason === '404') {
      return <Badge className="bg-gray-100 text-gray-700 text-xs"><XCircle className="w-3 h-3 mr-1" />Borttagen</Badge>
    }
    return <Badge variant="outline" className="text-xs">{reason || 'Okänd'}</Badge>
  }

  const successRate = stats.totalRuns > 0
    ? Math.round((stats.successfulRuns / stats.totalRuns) * 100)
    : 0

  // Check if scraper is currently running
  const isRunning = logs.some(l => l.status === 'running')
  const lastRun = logs[0]
  const timeSinceLastRun = lastRun ? Math.floor((new Date().getTime() - new Date(lastRun.finished_at || lastRun.started_at).getTime()) / 60000) : null

  const displayedNewCars = showAllNewCars ? recentNewCars : recentNewCars.slice(0, 5)
  const displayedSoldCars = showAllSoldCars ? recentSoldCars : recentSoldCars.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Live Status Banner */}
      <Card className={isRunning ? "bg-blue-50 border-blue-300 animate-pulse" : "bg-green-50 border-green-200"}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isRunning ? (
                <>
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                  <div>
                    <p className="font-medium text-blue-900">Scraper kör just nu...</p>
                    <p className="text-sm text-blue-700">Hämtar nya annonser från Blocket</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Scraper aktiv</p>
                    <p className="text-sm text-green-700">
                      Senaste körning: {timeSinceLastRun !== null ? `${timeSinceLastRun} min sedan` : 'Ingen data'}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">Idag</p>
              <p className="text-lg font-bold text-green-600">+{stats.newAdsToday} nya</p>
              <p className="text-sm text-orange-600">{stats.soldAdsToday} sålda</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Info */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-indigo-900">Full Scrape</p>
                <p className="text-sm text-indigo-700">06:00 & 18:00 varje dag</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-purple-900">Light Scrape</p>
                <p className="text-sm text-purple-700">Var 15:e minut (07:00-22:00)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900">Regioner</p>
                <p className="text-sm text-blue-700">Norrbotten, Västerbotten, Jämtland, Västernorrland</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Nya idag
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">+{stats.newAdsToday}</div>
            <p className="text-xs text-green-600">annonser hittade</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Sålda idag
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700">{stats.soldAdsToday}</div>
            <p className="text-xs text-orange-600">bilar sålda/borttagna</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Car className="w-4 h-4" />
              Aktiva annonser
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{stats.activeAds.toLocaleString()}</div>
            <p className="text-xs text-blue-600">på Blocket nu</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <Database className="w-4 h-4" />
              I databasen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">{stats.totalAdsInDb.toLocaleString()}</div>
            <p className="text-xs text-purple-600">totalt sparade</p>
          </CardContent>
        </Card>
      </div>

      {/* Region Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Aktiva annonser per region
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(regionBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([region, count]) => (
                <div key={region} className="bg-gray-50 rounded-lg p-3 border">
                  <p className="text-sm font-medium text-gray-700 capitalize">{region}</p>
                  <p className="text-2xl font-bold text-gray-900">{count.toLocaleString()}</p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent NEW Cars */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Senaste NYA bilar (24h)
            </span>
            <Badge className="bg-green-100 text-green-800">{recentNewCars.length} st</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentNewCars.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Inga nya bilar senaste 24 timmarna</p>
          ) : (
            <>
              <div className="space-y-3">
                {displayedNewCars.map((car) => (
                  <div key={car.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100 hover:bg-green-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {car.marke} {car.modell}
                        </span>
                        {car.arsmodell && <span className="text-gray-600">{car.arsmodell}</span>}
                        {getSellerBadge(car.saljare_typ)}
                        {car.momsbil && <Badge className="bg-yellow-100 text-yellow-800 text-xs">Moms</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 flex-wrap">
                        <span className="font-medium text-green-700">{formatPrice(car.pris)}</span>
                        <span>{formatMileage(car.miltal)}</span>
                        {car.stad && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{car.stad}</span>}
                        {!car.stad && car.region && <span className="flex items-center gap-1 capitalize"><MapPin className="w-3 h-3" />{car.region}</span>}
                        {car.kaross && <span>{car.kaross}</span>}
                        {car.farg && <span>{car.farg}</span>}
                        {car.vaxellada && <span>{car.vaxellada}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{formatTimeAgo(car.forst_sedd)}</span>
                      {car.url && (
                        <a href={car.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {recentNewCars.length > 5 && (
                <button
                  onClick={() => setShowAllNewCars(!showAllNewCars)}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showAllNewCars ? 'Visa färre' : `Visa alla ${recentNewCars.length} bilar`}
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent SOLD Cars */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
              Senaste SÅLDA bilar (24h)
            </span>
            <Badge className="bg-orange-100 text-orange-800">{recentSoldCars.length} st</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentSoldCars.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Inga sålda bilar senaste 24 timmarna</p>
          ) : (
            <>
              <div className="space-y-3">
                {displayedSoldCars.map((car) => {
                  // Calculate days on market
                  const publishedDate = new Date(car.forst_sedd)
                  const soldDate = new Date(car.borttagen)
                  const daysOnMarket = Math.floor((soldDate.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24))

                  return (
                  <div key={car.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {car.marke} {car.modell}
                        </span>
                        {car.arsmodell && <span className="text-gray-600">{car.arsmodell}</span>}
                        {getSoldReasonBadge(car.borttagen_anledning)}
                        {getSellerBadge(car.saljare_typ)}
                        {daysOnMarket >= 0 && (
                          <Badge variant="outline" className="text-xs bg-white">
                            {daysOnMarket === 0 ? 'Samma dag' : `${daysOnMarket} dagar`}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 flex-wrap">
                        <span className="font-medium text-orange-700">{formatPrice(car.pris)}</span>
                        <span>{formatMileage(car.miltal)}</span>
                        {car.stad && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{car.stad}</span>}
                        {!car.stad && car.region && <span className="flex items-center gap-1 capitalize"><MapPin className="w-3 h-3" />{car.region}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>Publicerad: {formatDate(car.forst_sedd)}</span>
                        <span>•</span>
                        <span>Såld: {formatDate(car.borttagen)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{formatTimeAgo(car.borttagen)}</span>
                      {car.url && (
                        <a href={car.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                )})}
              </div>
              {recentSoldCars.length > 5 && (
                <button
                  onClick={() => setShowAllSoldCars(!showAllSoldCars)}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showAllSoldCars ? 'Visa färre' : `Visa alla ${recentSoldCars.length} bilar`}
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Scraper Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Körningar (100)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRuns}</div>
            <p className="text-xs text-muted-foreground">full scrapes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lyckade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.successfulRuns}
            </div>
            <p className="text-xs text-muted-foreground">{successRate}% success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Misslyckade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.failedRuns}
            </div>
            <p className="text-xs text-muted-foreground">fel</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Store className="w-4 h-4" />
              Bilhandlare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {stats.dealerAds.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600">
              {stats.totalAdsInDb > 0 ? Math.round((stats.dealerAds / stats.totalAdsInDb) * 100) : 0}% av alla
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-teal-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              Privat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-700">
              {stats.privateAds.toLocaleString()}
            </div>
            <p className="text-xs text-teal-600">
              {stats.totalAdsInDb > 0 ? Math.round((stats.privateAds / stats.totalAdsInDb) * 100) : 0}% av alla
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Körningshistorik (Full & Light Scrape)
            </CardTitle>
            {logs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDeleteAllLogs}
                disabled={isPending}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Rensa alla
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tidpunkt</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Varaktighet</TableHead>
                <TableHead className="text-right">Hittade</TableHead>
                <TableHead className="text-right">Nya</TableHead>
                <TableHead className="text-right">Uppdaterade</TableHead>
                <TableHead className="text-right">Prisändringar</TableHead>
                <TableHead>Regioner</TableHead>
                <TableHead>Fel</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    Inga körningar ännu
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {formatDate(log.started_at)}
                    </TableCell>
                    <TableCell>{getScrapeTypeBadge(log.scrape_type)}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>
                      {formatDuration(log.started_at, log.finished_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.annonser_hittade?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.nya_annonser ? (
                        <span className="text-green-600 font-medium">
                          +{log.nya_annonser}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.uppdaterade_annonser || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.prisandringar ? (
                        <span className="text-orange-600">
                          {log.prisandringar}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {log.regioner_sokta?.slice(0, 2).map((region) => (
                          <Badge key={region} variant="outline" className="text-xs">
                            {region}
                          </Badge>
                        ))}
                        {(log.regioner_sokta?.length || 0) > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{(log.regioner_sokta?.length || 0) - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.error_message && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs max-w-[200px] truncate">
                            {log.error_message}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                        onClick={() => handleDeleteLog(log.id)}
                        disabled={isPending && deletingId === log.id}
                      >
                        <Trash2 className={`w-4 h-4 ${deletingId === log.id ? 'animate-spin' : ''}`} />
                      </Button>
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
