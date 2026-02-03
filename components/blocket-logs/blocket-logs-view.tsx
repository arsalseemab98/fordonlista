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
  Home,
  ShoppingBag,
  ArrowRight,
  ClipboardList
} from 'lucide-react'
import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { deleteScraperLog, deleteAllLogs } from '@/app/blocket-logs/actions'
import { fetchMissingBiluppgifter } from '@/app/blocket-marknad/biluppgifter-actions'
import { populateKnownDealers, getAllKnownDealers, type KnownDealer } from '@/lib/dealers/known-dealers'
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
  owner_vehicles: Array<{
    regnr: string
    model: string
    year: number
    color: string
    status?: string
    ownership_time?: string
  }> | null
  address_vehicles: Array<{
    regnr: string
    model: string
    year: number
    color: string
    status?: string
  }> | null
  // Historik (JSONB arrays)
  mileage_history: Array<{ date: string; mileage_km: number; mileage_mil: number }> | null
  owner_history: Array<{
    date: string
    type: string
    name?: string
    owner_class?: string  // "company", "person", "unknown"
    details?: string
  }> | null
  // Blocket ad data (joined)
  blocket_annonser: {
    marke: string | null
    modell: string | null
    arsmodell: number | null
    miltal: number | null
    pris: number | null
    url: string | null
    bild_url: string | null
  } | null
  // Dealer detection
  is_dealer: boolean | null
  // Previous owner (when current is dealer)
  previous_owner: {
    name?: string
    profile_id?: string
    purchase_date?: string
    sold_date?: string
    ownership_duration?: string
    age?: number
    city?: string
    address?: string
    postal_code?: string
    postal_city?: string
    phone?: string
    vehicles?: Array<{
      regnr: string
      model?: string
      year?: number
      color?: string
      status?: string
      ownership_time?: string
    }>
  } | null
  // Metadata
  fetched_at: string | null
}

interface BiluppgifterLog {
  id: number
  type: 'info' | 'error' | 'warning'
  message: string
  details: Record<string, unknown>
  created_at: string
}

interface BiluppgifterStats {
  totalWithRegnummer: number
  totalFetched: number
  remaining: number
  fetchedToday: number
  recentFetches: RecentBiluppgifter[]
  logs: BiluppgifterLog[]
  recentErrors: BiluppgifterLog[]
  lastSuccessfulRun: BiluppgifterLog | null | undefined
  apiHealthy: boolean
}

interface SoldCarWithBuyer {
  id: number
  blocket_id: number | null
  regnummer: string
  // Säljdata
  slutpris: number | null
  liggtid_dagar: number | null
  saljare_typ: string | null
  sold_at: string | null
  // Bildata
  marke: string | null
  modell: string | null
  arsmodell: number | null
  miltal: number | null
  // Köpardata
  kopare_namn: string | null
  kopare_typ: string | null
  kopare_is_dealer: boolean
  kopare_alder: number | null
  kopare_adress: string | null
  kopare_postnummer: string | null
  kopare_postort: string | null
  kopare_telefon: string | null
  kopare_fordon: Array<{
    regnr: string
    model?: string
    year?: number
    ownership_time?: string
  }> | null
  adress_fordon: Array<{
    regnr: string
    model?: string
    year?: number
    status?: string
  }> | null
  buyer_fetched_at: string | null
}

interface SoldCarsStats {
  total: number
  dealerBuyers: number
  privateBuyers: number
  recentSoldWithBuyers: SoldCarWithBuyer[]
}

interface BlocketLogsViewProps {
  logs: ScraperLog[]
  stats: Stats
  recentNewCars: RecentCar[]
  recentSoldCars: SoldCar[]
  regionBreakdown: Record<string, number>
  biluppgifterStats: BiluppgifterStats
  soldCarsStats: SoldCarsStats
}

export function BlocketLogsView({ logs, stats, recentNewCars, recentSoldCars, regionBreakdown, biluppgifterStats, soldCarsStats }: BlocketLogsViewProps) {
  const [showAllNewCars, setShowAllNewCars] = useState(false)
  const [showAllSoldCars, setShowAllSoldCars] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isFetchingBiluppgifter, setIsFetchingBiluppgifter] = useState(false)
  const [fetchResult, setFetchResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const router = useRouter()

  // Dealer state
  const [dealers, setDealers] = useState<KnownDealer[]>([])
  const [isLoadingDealers, setIsLoadingDealers] = useState(false)
  const [isPopulatingDealers, setIsPopulatingDealers] = useState(false)
  const [dealerResult, setDealerResult] = useState<{ added: number; total: number } | null>(null)

  // Load dealers on mount
  useEffect(() => {
    async function loadDealers() {
      setIsLoadingDealers(true)
      try {
        const data = await getAllKnownDealers()
        setDealers(data)
      } catch (error) {
        console.error('Error loading dealers:', error)
      }
      setIsLoadingDealers(false)
    }
    loadDealers()
  }, [])

  // Populate dealers from Blocket data
  const handlePopulateDealers = async () => {
    setIsPopulatingDealers(true)
    setDealerResult(null)
    try {
      const result = await populateKnownDealers()
      if (result.success) {
        setDealerResult({ added: result.added, total: result.total })
        // Reload dealers list
        const data = await getAllKnownDealers()
        setDealers(data)
      }
    } catch (error) {
      console.error('Error populating dealers:', error)
    }
    setIsPopulatingDealers(false)
  }

  // Kolla om ägare är bilhandlare eller hyrbilsföretag
  const isDealerOrRental = (ownerName: string | null, ownerHistory: RecentBiluppgifter['owner_history']) => {
    if (!ownerName) return false

    const dealerKeywords = [
      'bil ab', 'bilar ab', 'auto ab', 'motor ab', 'car ab', 'cars ab',
      'bilhandlare', 'bilgruppen', 'bilbolaget', 'bilcenter', 'bilhus',
      'hyrbil', 'uthyrning', 'rental', 'leasing',
      'hertz', 'avis', 'europcar', 'sixt', 'budget'
    ]

    const nameLower = ownerName.toLowerCase()
    const isDealer = dealerKeywords.some(kw => nameLower.includes(kw))

    // Kolla också owner_history första posten
    if (!isDealer && ownerHistory && ownerHistory.length > 0) {
      const firstOwner = ownerHistory[0]
      if (firstOwner.type === 'Bilhandlare' ||
          firstOwner.type?.includes('Finans') ||
          firstOwner.type?.includes('Leasing') ||
          firstOwner.owner_class === 'company') {
        // Kolla om namnet innehåller bil-relaterade ord
        return dealerKeywords.some(kw => nameLower.includes(kw))
      }
    }

    return isDealer
  }

  // Hitta förra privatägaren från historiken
  const findPreviousPrivateOwner = (ownerHistory: RecentBiluppgifter['owner_history']) => {
    if (!ownerHistory || ownerHistory.length < 2) return null

    // Hoppa över första (nuvarande ägare = handlaren)
    for (let i = 1; i < ownerHistory.length; i++) {
      const owner = ownerHistory[i]
      if (owner.type === 'Privatperson' || owner.owner_class === 'person') {
        // Hitta nästa ägare för att beräkna slutdatum
        const soldDate = ownerHistory[i - 1]?.date || null
        return {
          name: owner.name,
          purchaseDate: owner.date,
          soldDate: soldDate,
          details: owner.details
        }
      }
    }
    return null
  }

  // Beräkna ägartid mellan två datum
  const calculateOwnershipDuration = (startDate: string, endDate: string | null) => {
    if (!startDate || !endDate) return null

    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffMs = end.getTime() - start.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 30) return `${diffDays} dagar`

    const years = Math.floor(diffDays / 365)
    const months = Math.floor((diffDays % 365) / 30)

    if (years === 0) return `${months} mån`
    if (months === 0) return `${years} år`
    return `${years} år, ${months} mån`
  }

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
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="scraper" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Scraper
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
          <TabsTrigger value="sold" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Sålda
            {soldCarsStats.total > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {soldCarsStats.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dealers" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Handlare
            {dealers.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {dealers.length}
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

          {/* API Health Status */}
          <Card className={biluppgifterStats.apiHealthy
            ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300"
            : "bg-gradient-to-br from-red-50 to-rose-50 border-red-300"
          }>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {biluppgifterStats.apiHealthy ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-green-700">Biluppgifter API: OK</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-red-700">Biluppgifter API: FEL</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {biluppgifterStats.lastSuccessfulRun ? (
                <p className="text-sm text-muted-foreground">
                  Senaste lyckade körning: {new Date(biluppgifterStats.lastSuccessfulRun.created_at).toLocaleString('sv-SE')}
                  {biluppgifterStats.lastSuccessfulRun.details && (
                    <span className="ml-2">
                      ({(biluppgifterStats.lastSuccessfulRun.details as { success?: number })?.success || 0} sparade)
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Ingen körning registrerad ännu</p>
              )}

              {/* Recent errors */}
              {biluppgifterStats.recentErrors.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-red-700">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    {biluppgifterStats.recentErrors.length} senaste fel:
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {biluppgifterStats.recentErrors.slice(0, 5).map((err) => (
                      <div key={err.id} className="text-xs bg-red-100 text-red-800 p-2 rounded">
                        <span className="font-mono">{new Date(err.created_at).toLocaleString('sv-SE')}</span>
                        <span className="mx-2">-</span>
                        <span>{err.message}</span>
                        {err.details?.error && (
                          <span className="text-red-600 ml-1">({String(err.details.error)})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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

          {/* Biluppgifter Cron Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-purple-600" />
                  Cron-körningsloggar
                </span>
                <Badge className="bg-purple-100 text-purple-800">{biluppgifterStats.logs.length} st</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {biluppgifterStats.logs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Inga loggar ännu</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {biluppgifterStats.logs.slice(0, 20).map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-start gap-3 p-2 rounded text-sm ${
                        log.type === 'error'
                          ? 'bg-red-50 border border-red-200'
                          : log.type === 'warning'
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                        log.type === 'error'
                          ? 'bg-red-200 text-red-800'
                          : log.type === 'warning'
                          ? 'bg-amber-200 text-amber-800'
                          : 'bg-blue-200 text-blue-800'
                      }`}>
                        {log.type.toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{log.message}</div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {(log.details as { success?: number; failed?: number; skipped?: number }).success !== undefined && (
                              <span className="mr-2">✅ {(log.details as { success?: number }).success} sparade</span>
                            )}
                            {(log.details as { failed?: number }).failed !== undefined && (log.details as { failed?: number }).failed! > 0 && (
                              <span className="mr-2">❌ {(log.details as { failed?: number }).failed} fel</span>
                            )}
                            {(log.details as { skipped?: number }).skipped !== undefined && (log.details as { skipped?: number }).skipped! > 0 && (
                              <span className="mr-2">⏭️ {(log.details as { skipped?: number }).skipped} hoppade</span>
                            )}
                            {(log.details as { duration_seconds?: number }).duration_seconds && (
                              <span>⏱️ {(log.details as { duration_seconds?: number }).duration_seconds}s</span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('sv-SE', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  ))}
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
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono font-bold text-lg bg-blue-100 text-blue-800 px-3 py-1 rounded">
                            {item.regnummer}
                          </span>
                          {/* Car info from Blocket */}
                          {item.blocket_annonser && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800">
                                {item.blocket_annonser.marke} {item.blocket_annonser.modell}
                              </span>
                              {item.blocket_annonser.arsmodell && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.blocket_annonser.arsmodell}
                                </Badge>
                              )}
                              {item.blocket_annonser.miltal && (
                                <span className="text-sm text-gray-600">
                                  {item.blocket_annonser.miltal.toLocaleString()} mil
                                </span>
                              )}
                              {item.blocket_annonser.pris && (
                                <span className="text-sm font-medium text-green-700">
                                  {item.blocket_annonser.pris.toLocaleString()} kr
                                </span>
                              )}
                            </div>
                          )}
                          {item.fetched_at && (
                            <span className="text-xs text-muted-foreground" title={new Date(item.fetched_at).toLocaleString('sv-SE')}>
                              Hämtad {new Date(item.fetched_at).toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.blocket_annonser?.url && (
                            <a
                              href={item.blocket_annonser.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Blocket
                            </a>
                          )}
                          {item.blocket_id && !item.blocket_annonser?.url && (
                            <Badge variant="outline" className="text-xs">
                              Blocket #{item.blocket_id}
                            </Badge>
                          )}
                        </div>
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

                        {/* Ägardata - Villkorad visning för bilhandlare */}
                        {(() => {
                          // Use stored is_dealer flag, fallback to computed
                          const isDealer = item.is_dealer ?? isDealerOrRental(item.owner_name, item.owner_history)
                          // Use stored previous_owner data if available, otherwise compute from history
                          const previousOwner = item.previous_owner || (isDealer ? findPreviousPrivateOwner(item.owner_history) : null)
                          const dealerSinceDate = isDealer && item.owner_history?.[0]?.date

                          if (isDealer) {
                            return (
                              <>
                                {/* Nuvarande ägare = Bilhandlare */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm text-orange-700 flex items-center gap-1">
                                    <Store className="w-4 h-4" /> Bilhandlare
                                  </h4>
                                  <div className="text-sm space-y-1 bg-orange-50 p-2 rounded border border-orange-200">
                                    <div className="flex justify-between">
                                      <span className="text-orange-600">Namn:</span>
                                      <span className="font-medium text-orange-900 max-w-[150px] truncate">{item.owner_name || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-orange-600">Ort:</span>
                                      <span className="font-medium">{item.owner_city || '-'}</span>
                                    </div>
                                    {dealerSinceDate && (
                                      <div className="flex justify-between">
                                        <span className="text-orange-600">Ägare sedan:</span>
                                        <span className="font-medium">{new Date(dealerSinceDate).toLocaleDateString('sv-SE')}</span>
                                      </div>
                                    )}
                                    {dealerSinceDate && (
                                      <div className="flex justify-between">
                                        <span className="text-orange-600">Haft bilen:</span>
                                        <span className="font-medium">{calculateOwnershipDuration(dealerSinceDate, new Date().toISOString().split('T')[0])}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Förra ägaren = LEAD */}
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm text-green-700 flex items-center gap-1">
                                    <User className="w-4 h-4" /> Förra ägare (LEAD)
                                  </h4>
                                  {previousOwner ? (
                                    <div className="text-sm space-y-2 bg-green-50 p-2 rounded border border-green-200">
                                      <div className="space-y-1">
                                        <div className="flex justify-between">
                                          <span className="text-green-600">Namn:</span>
                                          <span className="font-semibold text-green-900">{previousOwner.name || '-'}</span>
                                        </div>
                                        {'age' in previousOwner && previousOwner.age && (
                                          <div className="flex justify-between">
                                            <span className="text-green-600">Ålder:</span>
                                            <span className="font-medium">{previousOwner.age} år</span>
                                          </div>
                                        )}
                                        {'phone' in previousOwner && previousOwner.phone && (
                                          <div className="flex justify-between">
                                            <span className="text-green-600">Telefon:</span>
                                            <span className="font-mono text-sm">{previousOwner.phone}</span>
                                          </div>
                                        )}
                                        {'city' in previousOwner && previousOwner.city && (
                                          <div className="flex justify-between">
                                            <span className="text-green-600">Ort:</span>
                                            <span className="font-medium">{previousOwner.city}</span>
                                          </div>
                                        )}
                                        {'address' in previousOwner && previousOwner.address && (
                                          <div className="pt-1 text-xs text-green-700">
                                            {previousOwner.address}
                                            {'postal_code' in previousOwner && previousOwner.postal_code && `, ${previousOwner.postal_code}`}
                                            {'postal_city' in previousOwner && previousOwner.postal_city && ` ${previousOwner.postal_city}`}
                                          </div>
                                        )}
                                        <div className="flex justify-between pt-1 border-t border-green-200">
                                          <span className="text-green-600">Köpte bilen:</span>
                                          <span className="font-medium">
                                            {'purchase_date' in previousOwner && previousOwner.purchase_date
                                              ? new Date(previousOwner.purchase_date).toLocaleDateString('sv-SE')
                                              : 'purchaseDate' in previousOwner && previousOwner.purchaseDate
                                                ? new Date(previousOwner.purchaseDate).toLocaleDateString('sv-SE')
                                                : '-'}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-green-600">Sålde bilen:</span>
                                          <span className="font-medium">
                                            {'sold_date' in previousOwner && previousOwner.sold_date
                                              ? new Date(previousOwner.sold_date).toLocaleDateString('sv-SE')
                                              : 'soldDate' in previousOwner && previousOwner.soldDate
                                                ? new Date(previousOwner.soldDate).toLocaleDateString('sv-SE')
                                                : '-'}
                                          </span>
                                        </div>
                                        {'ownership_duration' in previousOwner && previousOwner.ownership_duration && (
                                          <div className="flex justify-between">
                                            <span className="text-green-600 font-medium">Ägde bilen i:</span>
                                            <Badge className="bg-green-100 text-green-800 font-semibold">
                                              {previousOwner.ownership_duration}
                                            </Badge>
                                          </div>
                                        )}
                                      </div>

                                      {/* Förra ägarens fordon */}
                                      {'vehicles' in previousOwner && previousOwner.vehicles && previousOwner.vehicles.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-green-200">
                                          <span className="font-medium text-green-700 text-xs block mb-1">
                                            Förra ägarens fordon ({previousOwner.vehicles.length} st):
                                          </span>
                                          <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {previousOwner.vehicles.slice(0, 6).map((v, i) => (
                                              <div key={i} className="flex items-center justify-between bg-white p-1.5 rounded border border-green-100 text-xs">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-mono font-semibold text-green-800">{v.regnr}</span>
                                                  <span className="text-gray-700">{v.model}</span>
                                                  <span className="text-gray-400">{v.year}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  {v.ownership_time && (
                                                    <span className="text-gray-500 text-[10px]">{v.ownership_time}</span>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                            {previousOwner.vehicles.length > 6 && (
                                              <div className="text-green-500 text-center text-xs">+{previousOwner.vehicles.length - 6} fordon till</div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-sm bg-gray-50 p-2 rounded border text-gray-500">
                                      Ingen privatperson hittad i historiken
                                    </div>
                                  )}
                                </div>
                              </>
                            )
                          }

                          // Vanlig privatägare
                          return (
                            <>
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

                              {/* Extra data - endast för privatägare */}
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

                                {/* Visa ägarens andra fordon om de finns - endast för privatägare */}
                                {item.owner_vehicles && item.owner_vehicles.length > 0 && (
                                  <div className="text-xs bg-blue-50 p-2 rounded border border-blue-100 max-h-48 overflow-y-auto">
                                    <span className="font-medium text-blue-700 block mb-2">
                                      Ägarens fordon ({item.owner_vehicles.length} st):
                                    </span>
                                    <div className="space-y-1.5">
                                      {item.owner_vehicles.slice(0, 8).map((v, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white p-1.5 rounded border border-blue-100">
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono font-semibold text-blue-800">{v.regnr}</span>
                                            <span className="text-gray-700">{v.model}</span>
                                            <span className="text-gray-400">{v.year}</span>
                                            {v.color && <span className="text-gray-400">({v.color})</span>}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {v.status && (
                                              <Badge variant="outline" className={`text-[10px] ${v.status === 'I Trafik' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                                                {v.status}
                                              </Badge>
                                            )}
                                            {v.ownership_time && (
                                              <span className="text-gray-500 text-[10px]">{v.ownership_time}</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      {item.owner_vehicles.length > 8 && (
                                        <div className="text-blue-400 text-center pt-1">+{item.owner_vehicles.length - 8} fordon till</div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Visa fordon på adressen om de finns */}
                                {item.address_vehicles && item.address_vehicles.length > 0 && (
                                  <div className="text-xs bg-purple-50 p-2 rounded border border-purple-100 max-h-32 overflow-y-auto">
                                    <span className="font-medium text-purple-700 block mb-2">
                                      Fordon på adressen ({item.address_vehicles.length} st):
                                    </span>
                                    <div className="space-y-1">
                                      {item.address_vehicles.slice(0, 5).map((v, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-white p-1 rounded border border-purple-100">
                                          <span className="font-mono font-semibold text-purple-800">{v.regnr}</span>
                                          <span className="text-gray-700">{v.model}</span>
                                          <span className="text-gray-400">{v.year}</span>
                                        </div>
                                      ))}
                                      {item.address_vehicles.length > 5 && (
                                        <div className="text-purple-400 text-center">+{item.address_vehicles.length - 5} till</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )
                        })()}
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

        {/* Sålda bilar Tab */}
        <TabsContent value="sold" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Totalt med köpardata</span>
                </div>
                <p className="text-3xl font-bold text-green-700 mt-2">{soldCarsStats.total}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-600 font-medium">Köpt av privatperson</span>
                </div>
                <p className="text-3xl font-bold text-blue-700 mt-2">{soldCarsStats.privateBuyers}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-orange-600" />
                  <span className="text-sm text-orange-600 font-medium">Köpt av handlare</span>
                </div>
                <p className="text-3xl font-bold text-orange-700 mt-2">{soldCarsStats.dealerBuyers}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-purple-600 font-medium">Flöde</span>
                </div>
                <p className="text-sm font-medium text-purple-700 mt-2">
                  {soldCarsStats.total > 0
                    ? `${Math.round((soldCarsStats.dealerBuyers / soldCarsStats.total) * 100)}% till handlare`
                    : '-'
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sold Cars List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Sålda bilar med köpardata
                <Badge className="bg-green-100 text-green-800">{soldCarsStats.recentSoldWithBuyers.length} st</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {soldCarsStats.recentSoldWithBuyers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Ingen köpardata hämtad ännu. Data hämtas automatiskt för bilar sålda 7-30 dagar sedan.
                </p>
              ) : (
                <div className="space-y-4">
                  {soldCarsStats.recentSoldWithBuyers.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono font-bold text-lg bg-green-100 text-green-800 px-3 py-1 rounded">
                            {item.regnummer}
                          </span>
                          {item.marke && item.modell && (
                            <span className="font-semibold text-gray-800">
                              {item.marke} {item.modell} {item.arsmodell || ''}
                            </span>
                          )}
                          {item.slutpris && (
                            <Badge variant="secondary">
                              {item.slutpris.toLocaleString()} kr
                            </Badge>
                          )}
                          {item.liggtid_dagar != null && (
                            <span className="text-sm text-gray-500">
                              {item.liggtid_dagar} dagar på marknaden
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.saljare_typ && (
                            <Badge variant="outline" className={item.saljare_typ === 'handlare' ? 'bg-orange-50' : 'bg-blue-50'}>
                              Säljare: {item.saljare_typ}
                            </Badge>
                          )}
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <Badge className={item.kopare_is_dealer ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}>
                            Köpare: {item.kopare_is_dealer ? 'Handlare' : 'Privat'}
                          </Badge>
                        </div>
                      </div>

                      {/* Content Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Köparinfo */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-1">
                            {item.kopare_is_dealer ? <Store className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            {item.kopare_is_dealer ? 'Bilhandlare' : 'Köpare'}
                          </h4>
                          <div className="text-sm space-y-1 bg-white p-2 rounded border">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Namn:</span>
                              <span className="font-medium truncate max-w-[150px]">{item.kopare_namn || '-'}</span>
                            </div>
                            {/* Ålder - endast för privatpersoner */}
                            {!item.kopare_is_dealer && item.kopare_alder && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Ålder:</span>
                                <span className="font-medium">{item.kopare_alder} år</span>
                              </div>
                            )}
                            {/* Telefon - endast för privatpersoner */}
                            {!item.kopare_is_dealer && item.kopare_telefon && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Telefon:</span>
                                <span className="font-mono text-sm">{item.kopare_telefon}</span>
                              </div>
                            )}
                            {item.kopare_postort && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Ort:</span>
                                <span className="font-medium">{item.kopare_postort}</span>
                              </div>
                            )}
                            {/* Innehavstid - för alla köpare */}
                            {item.sold_at && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Ägt sedan:</span>
                                <span className="font-medium">
                                  {new Date(item.sold_at).toLocaleDateString('sv-SE')}
                                  <span className="text-gray-400 ml-1">
                                    ({Math.floor((Date.now() - new Date(item.sold_at).getTime()) / (1000 * 60 * 60 * 24))} dagar)
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Köparens adress - visas för alla */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-1">
                            <Home className="w-4 h-4" /> Adress
                          </h4>
                          <div className="text-sm space-y-1 bg-white p-2 rounded border">
                            {item.kopare_adress ? (
                              <>
                                <div className="text-gray-800">{item.kopare_adress}</div>
                                <div className="text-gray-600">
                                  {item.kopare_postnummer} {item.kopare_postort}
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-400">Ingen adress</span>
                            )}
                          </div>
                        </div>

                        {/* Köparens fordon - ENDAST för privatpersoner */}
                        {!item.kopare_is_dealer ? (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-1">
                              <Car className="w-4 h-4" /> Köparens fordon
                              {item.kopare_fordon && item.kopare_fordon.length > 0 && (
                                <Badge variant="outline" className="ml-1 text-xs">{item.kopare_fordon.length} st</Badge>
                              )}
                            </h4>
                            <div className="text-sm bg-white p-2 rounded border max-h-40 overflow-y-auto">
                              {item.kopare_fordon && item.kopare_fordon.length > 0 ? (
                                <div className="space-y-1">
                                  {item.kopare_fordon.slice(0, 6).map((v, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono bg-gray-100 px-1 rounded">{v.regnr}</span>
                                        <span className="text-gray-600">
                                          {v.model || ''} {v.year || ''}
                                        </span>
                                      </div>
                                      {v.ownership_time && (
                                        <span className="text-blue-600 text-xs">{v.ownership_time}</span>
                                      )}
                                    </div>
                                  ))}
                                  {item.kopare_fordon.length > 6 && (
                                    <div className="text-gray-400 text-center text-xs">+{item.kopare_fordon.length - 6} fordon till</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">Inga andra fordon</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-1">
                              <Store className="w-4 h-4" /> Info
                            </h4>
                            <div className="text-sm bg-orange-50 p-2 rounded border border-orange-200">
                              <span className="text-orange-700 text-xs">
                                Bilhandlare - fordonslista visas ej
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Fordon på adressen - ENDAST för privatpersoner */}
                      {!item.kopare_is_dealer && item.adress_fordon && item.adress_fordon.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-1 mb-2">
                            <MapPin className="w-4 h-4" /> Fordon på köparens adress
                            <Badge variant="outline" className="ml-1 text-xs">{item.adress_fordon.length} st</Badge>
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {item.adress_fordon.slice(0, 8).map((v, i) => (
                              <div key={i} className="text-xs bg-purple-50 border border-purple-200 rounded px-2 py-1">
                                <span className="font-mono">{v.regnr}</span>
                                {v.model && <span className="text-purple-600 ml-1">{v.model}</span>}
                              </div>
                            ))}
                            {item.adress_fordon.length > 8 && (
                              <span className="text-xs text-gray-400 self-center">+{item.adress_fordon.length - 8} till</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Timestamp */}
                      {item.sold_at && (
                        <div className="mt-2 text-xs text-gray-400 text-right">
                          Såld {new Date(item.sold_at).toLocaleDateString('sv-SE')}
                          {item.buyer_fetched_at && (
                            <span> • Köpardata hämtad {new Date(item.buyer_fetched_at).toLocaleDateString('sv-SE')}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900">Om Sålda bilar</p>
                  <p className="text-sm text-green-700 mt-1">
                    När en bil säljs på Blocket hämtar vi köparens information från Biluppgifter 7-14 dagar senare
                    (efter omregistrering). Vi ser vem som köpte, deras adress, och vilka andra fordon de äger.
                    <br /><br />
                    <strong>Flödesanalys:</strong> Vi kan se om bilar går Privat→Handlare (handlare köper in)
                    eller Handlare→Privat (slutkund köper).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bilhandlare Tab */}
        <TabsContent value="dealers" className="mt-6 space-y-6">
          {/* Dealer Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-orange-600" />
                  <span className="text-sm text-orange-600 font-medium">Kända handlare</span>
                </div>
                <p className="text-3xl font-bold text-orange-700 mt-2">{dealers.length}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Totalt annonser</span>
                </div>
                <p className="text-3xl font-bold text-green-700 mt-2">
                  {dealers.reduce((sum, d) => sum + d.ad_count, 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-600 font-medium">Regioner</span>
                </div>
                <p className="text-3xl font-bold text-blue-700 mt-2">
                  {new Set(dealers.flatMap(d => d.regions || [])).size}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-purple-600 font-medium">Matchade i Biluppgifter</span>
                </div>
                <p className="text-3xl font-bold text-purple-700 mt-2">
                  {biluppgifterStats.recentFetches.filter(f => f.is_dealer).length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Uppdatera handlarlista
                </span>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePopulateDealers}
                  disabled={isPopulatingDealers}
                >
                  {isPopulatingDealers ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Söker...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Bygg från Blocket + Biluppgifter
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Bygger en lista på kända bilhandlare genom att korsreferera Blocket-annonser
                (där saljare_typ = &quot;handlare&quot;) med ägarnamn från Biluppgifter.
                Denna lista används sedan för att automatiskt identifiera bilhandlare i nya biluppgifter-sökningar.
              </p>

              {dealerResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-800">
                    ✅ Hittade <strong>{dealerResult.added}</strong> handlare.
                    Totalt <strong>{dealerResult.total}</strong> i databasen.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dealer List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Kända bilhandlare
                <Badge className="bg-orange-100 text-orange-800">{dealers.length} st</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingDealers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : dealers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Ingen handlarlista ännu. Klicka &quot;Bygg från Blocket + Biluppgifter&quot; för att skapa en.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Handlare</TableHead>
                        <TableHead className="text-center">Annonser</TableHead>
                        <TableHead>Regioner</TableHead>
                        <TableHead>Källa</TableHead>
                        <TableHead className="text-right">Senast sedd</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dealers.slice(0, 50).map((dealer) => (
                        <TableRow key={dealer.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Store className="w-4 h-4 text-orange-500" />
                              {dealer.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{dealer.ad_count}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {dealer.regions?.slice(0, 3).map((region) => (
                                <Badge key={region} variant="outline" className="text-xs">
                                  {region}
                                </Badge>
                              ))}
                              {(dealer.regions?.length || 0) > 3 && (
                                <Badge variant="outline" className="text-xs text-gray-400">
                                  +{(dealer.regions?.length || 0) - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {dealer.source}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {dealer.last_seen_at ? new Date(dealer.last_seen_at).toLocaleDateString('sv-SE') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {dealers.length > 50 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      Visar 50 av {dealers.length} handlare
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Store className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-orange-900">Om Bilhandlare-identifiering</p>
                  <p className="text-sm text-orange-700 mt-1">
                    <strong>Problem:</strong> Biluppgifter visar bara &quot;företag&quot; som ägartyp - kan vara vad som helst.
                    <br />
                    <strong>Lösning:</strong> Via Blocket vet vi vilka företag som faktiskt är bilhandlare
                    (de som listar med saljare_typ = &quot;handlare&quot;). Vi bygger en lista på dessa och matchar sedan
                    mot ägarnamn i Biluppgifter.
                    <br />
                    <strong>Resultat:</strong> När en känd handlare äger bilen → hämta förra privata ägarens data som lead.
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
