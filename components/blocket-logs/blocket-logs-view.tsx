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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Trash2,
  FileSearch,
  Users,
  Phone,
  Home
} from 'lucide-react'
import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { deleteScraperLog, deleteAllLogs } from '@/app/blocket-logs/actions'
import { fetchMissingBiluppgifter } from '@/app/blocket-marknad/biluppgifter-actions'
import { useRouter } from 'next/navigation'
import { Download, Loader2 } from 'lucide-react'

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

interface RecentBiluppgifter {
  id: number
  regnummer: string
  blocket_id: number | null
  // Fordonsdata
  mileage_km: number | null
  mileage_mil: number | null
  num_owners: number | null
  annual_tax: number | null
  inspection_until: string | null
  // Ägardata
  owner_name: string | null
  owner_age: number | null
  owner_city: string | null
  owner_address: string | null
  owner_postal_code: string | null
  owner_postal_city: string | null
  owner_phone: string | null
  // Relaterade fordon (JSONB arrays)
  owner_vehicles: Array<{ regnr: string; description: string }> | null
  address_vehicles: Array<{ regnr: string; description: string }> | null
  // Historik (JSONB arrays)
  mileage_history: Array<{ date: string; mileage_km: number; mileage_mil: number }> | null
  owner_history: Array<{ date: string; type: string; name?: string }> | null
  // Metadata
  fetched_at: string | null
}

interface BiluppgifterStats {
  totalWithRegnummer: number
  totalFetched: number
  remaining: number
  fetchedToday: number
  recentFetches: RecentBiluppgifter[]
}

interface BlocketLogsViewProps {
  logs: ScraperLog[]
  stats: Stats
  recentNewCars: RecentCar[]
  recentSoldCars: SoldCar[]
  regionBreakdown: Record<string, number>
  biluppgifterStats: BiluppgifterStats
}

export function BlocketLogsView({ logs, stats, recentNewCars, recentSoldCars, regionBreakdown, biluppgifterStats }: BlocketLogsViewProps) {
  const [showAllNewCars, setShowAllNewCars] = useState(false)
  const [showAllSoldCars, setShowAllSoldCars] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isFetchingBiluppgifter, setIsFetchingBiluppgifter] = useState(false)
  const [fetchResult, setFetchResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const router = useRouter()

  // Hämta biluppgifter för annonser som saknar data
  const handleFetchBiluppgifter = async (batchSize: number = 10) => {
    setIsFetchingBiluppgifter(true)
    setFetchResult(null)
    try {
      const result = await fetchMissingBiluppgifter(batchSize)
      setFetchResult({ success: result.success, failed: result.failed, errors: result.errors })
      router.refresh() // Uppdatera stats
    } catch (error) {
      setFetchResult({ success: 0, failed: 1, errors: ['Kunde inte hämta biluppgifter: ' + String(error)] })
    } finally {
      setIsFetchingBiluppgifter(false)
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 30000)
    return () => clearInterval(interval)
  }, [router])

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
    // miltal is already stored in Swedish "mil"
    return `${miltal.toLocaleString('sv-SE')} mil`
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
  const runningLog = logs.find(l => l.status === 'running')
  const isRunning = !!runningLog
  const lastCompletedRun = logs.find(l => l.status === 'completed')
  const timeSinceLastRun = lastCompletedRun?.finished_at
    ? Math.floor((new Date().getTime() - new Date(lastCompletedRun.finished_at).getTime()) / 60000)
    : null

  // Calculate running time if currently running
  const runningTime = runningLog
    ? Math.floor((new Date().getTime() - new Date(runningLog.started_at).getTime()) / 1000)
    : null

  const displayedNewCars = showAllNewCars ? recentNewCars : recentNewCars.slice(0, 5)
  const displayedSoldCars = showAllSoldCars ? recentSoldCars : recentSoldCars.slice(0, 5)

  return (
    <div className="space-y-6">
      <Tabs defaultValue="scraper" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="scraper" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Blocket Scraper
          </TabsTrigger>
          <TabsTrigger value="biluppgifter" className="flex items-center gap-2">
            <FileSearch className="w-4 h-4" />
            Biluppgifter
            {biluppgifterStats.remaining > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {biluppgifterStats.remaining}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scraper" className="mt-6 space-y-6">
      {/* Live Status Banner */}
      <Card className={isRunning ? "bg-blue-50 border-blue-300" : "bg-green-50 border-green-200"}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isRunning && runningLog ? (
                <>
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-blue-900">
                        {runningLog.scrape_type === 'light' ? '⚡ Light Scrape' : '🔄 Full Scrape'} kör...
                      </p>
                      {getScrapeTypeBadge(runningLog.scrape_type)}
                    </div>
                    <p className="text-sm text-blue-700">
                      Körtid: {runningTime !== null ? (runningTime < 60 ? `${runningTime}s` : `${Math.floor(runningTime / 60)}m ${runningTime % 60}s`) : '-'}
                      {runningLog.annonser_hittade ? ` • ${runningLog.annonser_hittade} hittade` : ''}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Scraper aktiv</p>
                    <p className="text-sm text-green-700">
                      Senaste körning: {timeSinceLastRun !== null ? `${timeSinceLastRun} min sedan` : 'Ingen data'}
                      {lastCompletedRun && ` (${lastCompletedRun.scrape_type === 'light' ? 'Light' : 'Full'})`}
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

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <RefreshCw className="w-3 h-3" />
        <span>Uppdateras automatiskt var 30:e sekund</span>
      </div>

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
        </TabsContent>

        {/* Biluppgifter Tab */}
        <TabsContent value="biluppgifter" className="mt-6 space-y-6">
          {/* Biluppgifter Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Med regnummer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-700">{biluppgifterStats.totalWithRegnummer.toLocaleString()}</div>
                <p className="text-xs text-blue-600">aktiva annonser</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Hämtade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-700">{biluppgifterStats.totalFetched.toLocaleString()}</div>
                <p className="text-xs text-green-600">
                  {biluppgifterStats.totalWithRegnummer > 0
                    ? `${Math.round((biluppgifterStats.totalFetched / biluppgifterStats.totalWithRegnummer) * 100)}%`
                    : '0%'} av totalt
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Återstår
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-700">{biluppgifterStats.remaining.toLocaleString()}</div>
                <p className="text-xs text-amber-600">att hämta</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Idag
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-700">+{biluppgifterStats.fetchedToday}</div>
                <p className="text-xs text-purple-600">hämtade idag</p>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar + Fetch Button */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Hämtningsframsteg</span>
                <span className="text-sm text-muted-foreground">
                  {biluppgifterStats.totalFetched} / {biluppgifterStats.totalWithRegnummer}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${biluppgifterStats.totalWithRegnummer > 0
                      ? Math.min(100, (biluppgifterStats.totalFetched / biluppgifterStats.totalWithRegnummer) * 100)
                      : 0}%`
                  }}
                />
              </div>

              {/* Fetch Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={() => handleFetchBiluppgifter(5)}
                  disabled={isFetchingBiluppgifter || biluppgifterStats.remaining === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isFetchingBiluppgifter ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Hämtar...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Hämta 5 st
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleFetchBiluppgifter(20)}
                  disabled={isFetchingBiluppgifter || biluppgifterStats.remaining === 0}
                  variant="outline"
                >
                  {isFetchingBiluppgifter ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Hämta 20 st
                </Button>
                <Button
                  onClick={() => handleFetchBiluppgifter(50)}
                  disabled={isFetchingBiluppgifter || biluppgifterStats.remaining === 0}
                  variant="outline"
                >
                  {isFetchingBiluppgifter ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Hämta 50 st
                </Button>

                {/* Status message */}
                {fetchResult && (
                  <div className={`text-sm px-3 py-1 rounded-full ${
                    fetchResult.failed > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {fetchResult.success > 0 && <span>{fetchResult.success} hämtade</span>}
                    {fetchResult.failed > 0 && <span className="ml-2">{fetchResult.failed} misslyckades</span>}
                  </div>
                )}
              </div>

              {/* Error messages */}
              {fetchResult?.errors && fetchResult.errors.length > 0 && (
                <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded">
                  {fetchResult.errors.slice(0, 3).map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                  {fetchResult.errors.length > 3 && (
                    <div className="text-gray-500">...och {fetchResult.errors.length - 3} till</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Fetches - Detailed Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileSearch className="w-5 h-5 text-blue-600" />
                  Senaste hämtningar - All data
                </span>
                <Badge className="bg-blue-100 text-blue-800">{biluppgifterStats.recentFetches.length} st</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {biluppgifterStats.recentFetches.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Inga biluppgifter hämtade ännu</p>
              ) : (
                <div className="space-y-4">
                  {biluppgifterStats.recentFetches.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                      {/* Header row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-lg bg-blue-100 text-blue-800 px-3 py-1 rounded">
                            {item.regnummer}
                          </span>
                          {item.fetched_at && (
                            <span className="text-xs text-muted-foreground">
                              Hämtad {formatTimeAgo(item.fetched_at)}
                            </span>
                          )}
                        </div>
                        {item.blocket_id && (
                          <Badge variant="outline" className="text-xs">
                            Blocket #{item.blocket_id}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Fordonsdata */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-1">
                            <Car className="w-4 h-4" /> Fordonsdata
                          </h4>
                          <div className="text-sm space-y-1 bg-white p-2 rounded border">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Mätarställning:</span>
                              <span className="font-medium">
                                {item.mileage_mil ? `${item.mileage_mil.toLocaleString()} mil` : '-'}
                                {item.mileage_km && <span className="text-gray-400 text-xs ml-1">({item.mileage_km.toLocaleString()} km)</span>}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Antal ägare:</span>
                              <span className="font-medium">{item.num_owners ?? '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Årsskatt:</span>
                              <span className="font-medium">{item.annual_tax ? `${item.annual_tax.toLocaleString()} kr` : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Besiktning:</span>
                              {item.inspection_until ? (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    new Date(item.inspection_until) < new Date()
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : 'bg-green-50 text-green-700 border-green-200'
                                  }`}
                                >
                                  {new Date(item.inspection_until).toLocaleDateString('sv-SE')}
                                </Badge>
                              ) : (
                                <span>-</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Ägardata */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-1">
                            <Users className="w-4 h-4" /> Ägare
                          </h4>
                          <div className="text-sm space-y-1 bg-white p-2 rounded border">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Namn:</span>
                              <span className="font-medium max-w-[150px] truncate">{item.owner_name || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Ålder:</span>
                              <span className="font-medium">{item.owner_age ? `${item.owner_age} år` : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Telefon:</span>
                              <span className="font-mono text-sm">{item.owner_phone || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Ort:</span>
                              <span className="font-medium">{item.owner_city || '-'}</span>
                            </div>
                            {item.owner_address && (
                              <div className="pt-1 border-t text-xs text-gray-600">
                                {item.owner_address}
                                {item.owner_postal_code && `, ${item.owner_postal_code}`}
                                {item.owner_postal_city && ` ${item.owner_postal_city}`}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Relaterade fordon & Historik */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-1">
                            <Database className="w-4 h-4" /> Extra data
                          </h4>
                          <div className="text-sm space-y-1 bg-white p-2 rounded border">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Ägarens fordon:</span>
                              <span className="font-medium">
                                {item.owner_vehicles?.length ? (
                                  <Badge variant="outline" className="text-xs">
                                    {item.owner_vehicles.length} st
                                  </Badge>
                                ) : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Fordon på adress:</span>
                              <span className="font-medium">
                                {item.address_vehicles?.length ? (
                                  <Badge variant="outline" className="text-xs">
                                    {item.address_vehicles.length} st
                                  </Badge>
                                ) : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Mätarhistorik:</span>
                              <span className="font-medium">
                                {item.mileage_history?.length ? (
                                  <Badge variant="outline" className="text-xs">
                                    {item.mileage_history.length} avläsningar
                                  </Badge>
                                ) : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Ägarhistorik:</span>
                              <span className="font-medium">
                                {item.owner_history?.length ? (
                                  <Badge variant="outline" className="text-xs">
                                    {item.owner_history.length} byten
                                  </Badge>
                                ) : '-'}
                              </span>
                            </div>
                          </div>

                          {/* Visa ägarens andra fordon om de finns */}
                          {item.owner_vehicles && item.owner_vehicles.length > 0 && (
                            <div className="text-xs bg-blue-50 p-2 rounded border border-blue-100">
                              <span className="font-medium text-blue-700">Ägarens fordon:</span>
                              <div className="mt-1 space-y-0.5">
                                {item.owner_vehicles.slice(0, 3).map((v, i) => (
                                  <div key={i} className="text-blue-600">
                                    {v.regnr}: {v.description}
                                  </div>
                                ))}
                                {item.owner_vehicles.length > 3 && (
                                  <div className="text-blue-400">+{item.owner_vehicles.length - 3} till</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <FileSearch className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Om Biluppgifter</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Biluppgifter hämtas från biluppgifter.se och inkluderar fordonsdata (miltal, besiktning, skatt)
                    samt ägarinfo (namn, adress, telefon). Data hämtas för Blocket-annonser som har regnummer.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
