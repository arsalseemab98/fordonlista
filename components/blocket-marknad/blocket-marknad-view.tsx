'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Car,
  TrendingUp,
  Store,
  User,
  DollarSign,
  Clock,
  BarChart3,
  MapPin,
  Calendar,
  Activity,
  PieChart as PieChartIcon,
  Info,
  Search,
  ChevronDown,
  ChevronRight,
  Globe,
  Zap,
  Palette,
  Settings2,
  Timer,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  Database,
  Rocket,
  Gauge,
  Turtle,
  ThumbsUp,
  Building2,
  UserCircle,
  Circle,
  Lightbulb,
  Trophy,
  ArrowUp,
  ArrowDown,
  Package,
  HelpCircle
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface MonthlyStats {
  month: string
  newAds: number
  soldAds: number
  activeAds: number
  avgPrice: number
  medianDaysOnMarket: number
}

interface BrandStats {
  brand: string
  count: number
  avgPrice: number
  avgMileage: number
}

interface ModelStats {
  brand: string
  model: string
  count: number
  avgPrice: number
  avgMileage: number
}

interface RegionMonthlyStats {
  region: string
  month: string
  count: number
}

interface PriceRange {
  label: string
  min: number
  max: number
  count: number
}

interface Totals {
  activeAds: number
  soldAds: number
  dealerAds: number
  privateAds: number
}

interface YearStats {
  year: string
  count: number
  avgPrice: number
  avgMileage: number
}

interface BodyTypeStats {
  bodyType: string
  count: number
  avgPrice: number
  avgDaysOnMarket: number
}

interface ColorStats {
  color: string
  count: number
  avgPrice: number
  avgDaysOnMarket: number
}

interface GearboxStats {
  gearbox: string
  count: number
  avgPrice: number
}

interface SaleSpeedStats {
  category: string
  count: number
  percentage: number
}

interface SellerMomsStats {
  handlareMoms: { count: number; avgPrice: number }
  handlareUtanMoms: { count: number; avgPrice: number }
  privat: { count: number; avgPrice: number }
}

interface MarketHealth {
  marketGrowth: number
  avgDaysOnMarket: number
  totalAdsTracked: number
  totalSoldTracked: number
}

interface BlocketMarknadViewProps {
  monthlyStats: MonthlyStats[]
  brandStats: BrandStats[]
  modelStats: ModelStats[]
  regionMonthlyStats: RegionMonthlyStats[]
  priceRanges: PriceRange[]
  totals: Totals
  scraperStartDate?: string
  yearStats: YearStats[]
  bodyTypeStats: BodyTypeStats[]
  colorStats: ColorStats[]
  gearboxStats: GearboxStats[]
  saleSpeedStats: SaleSpeedStats[]
  sellerMomsStats: SellerMomsStats
  marketHealth: MarketHealth
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export function BlocketMarknadView({
  monthlyStats,
  brandStats,
  modelStats,
  regionMonthlyStats,
  priceRanges,
  totals,
  scraperStartDate,
  yearStats,
  bodyTypeStats,
  colorStats,
  gearboxStats,
  saleSpeedStats,
  sellerMomsStats,
  marketHealth
}: BlocketMarknadViewProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
    return `${months[parseInt(month) - 1]}`
  }

  const formatMonthFull = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
    return `${months[parseInt(month) - 1]} ${year}`
  }

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M kr`
    }
    if (price >= 1000) {
      return `${Math.round(price / 1000)}k kr`
    }
    return `${price} kr`
  }

  // Get unique regions
  const regions = [...new Set(regionMonthlyStats.map(r => r.region))].sort()

  // Prepare data for charts
  const chartData = monthlyStats.map(m => ({
    ...m,
    monthLabel: formatMonth(m.month),
    monthFull: formatMonthFull(m.month),
    net: m.newAds - m.soldAds
  }))

  // Seller type pie data
  const sellerTypeData = [
    { name: 'Handlare', value: totals.dealerAds, color: '#3b82f6' },
    { name: 'Privat', value: totals.privateAds, color: '#14b8a6' }
  ]

  // Price range bar data
  const priceRangeData = priceRanges.map(p => ({
    range: p.label,
    antal: p.count
  }))

  // Brand bar data (top 10)
  const brandChartData = brandStats.slice(0, 10).map(b => ({
    brand: b.brand,
    antal: b.count,
    pris: Math.round(b.avgPrice / 1000)
  }))

  // Get region data for selected month (latest)
  const latestMonth = monthlyStats[monthlyStats.length - 1]?.month
  const regionDataForMonth = regionMonthlyStats
    .filter(r => r.month === latestMonth)
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      {/* Data Source Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Om statistiken</p>
              <p>
                Statistik från <strong>1 februari 2026</strong> och framåt.
                Scraper startade 30 januari, så februari har komplett data för hela livscykeln (upplagd → såld).
              </p>
              <p className="mt-1 text-blue-600">
                Ju längre scrapern körs, desto mer data samlas in för bättre trendanalys.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Car className="w-4 h-4" />
              Aktiva annonser
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{totals.activeAds.toLocaleString()}</div>
            <p className="text-xs text-blue-600">på marknaden nu</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Sålda totalt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{totals.soldAds.toLocaleString()}</div>
            <p className="text-xs text-green-600">bilar sålda</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700 flex items-center gap-2">
              <Store className="w-4 h-4" />
              Handlare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700">{totals.dealerAds.toLocaleString()}</div>
            <p className="text-xs text-indigo-600">
              {totals.activeAds > 0 ? Math.round((totals.dealerAds / totals.activeAds) * 100) : 0}% av aktiva
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-teal-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              Privat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-700">{totals.privateAds.toLocaleString()}</div>
            <p className="text-xs text-teal-600">
              {totals.activeAds > 0 ? Math.round((totals.privateAds / totals.activeAds) * 100) : 0}% av aktiva
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="total-marknad" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="total-marknad" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Total Marknad
          </TabsTrigger>
          <TabsTrigger value="oversikt" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Trender
          </TabsTrigger>
          <TabsTrigger value="marken" className="flex items-center gap-2">
            <Car className="w-4 h-4" />
            Märken
          </TabsTrigger>
          <TabsTrigger value="regioner" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Regioner
          </TabsTrigger>
        </TabsList>

        {/* TOTAL MARKNAD TAB - Enkel och tydlig */}
        <TabsContent value="total-marknad" className="space-y-6">
          {/* Marknadens hälsa - Enkla kort */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                    <Car className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-green-700 font-medium">Bilar till salu just nu</p>
                  <p className="text-3xl font-bold text-green-600">{totals.activeAds.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                    {marketHealth.marketGrowth >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {marketHealth.marketGrowth >= 0 ? '+' : ''}{marketHealth.marketGrowth} från förra månaden
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-blue-700 font-medium">Bilar som sålts</p>
                  <p className="text-3xl font-bold text-blue-600">{totals.soldAds.toLocaleString()}</p>
                  <p className="text-xs text-blue-600 mt-1">Sedan februari 2026</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 bg-amber-100 rounded-full flex items-center justify-center">
                    <Timer className="w-6 h-6 text-amber-600" />
                  </div>
                  <p className="text-sm text-amber-700 font-medium">Dagar att sälja (snitt)</p>
                  <p className="text-3xl font-bold text-amber-600">{marketHealth.avgDaysOnMarket}</p>
                  <p className="text-xs text-amber-600 mt-1 flex items-center justify-center gap-1">
                    {marketHealth.avgDaysOnMarket < 30 ? <><Rocket className="w-3 h-3" /> Snabb marknad!</> : marketHealth.avgDaysOnMarket < 60 ? <><ThumbsUp className="w-3 h-3" /> Normal hastighet</> : <><Turtle className="w-3 h-3" /> Långsam marknad</>}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center">
                    <Database className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-purple-700 font-medium">Data vi följer</p>
                  <p className="text-3xl font-bold text-purple-600">{marketHealth.totalAdsTracked.toLocaleString()}</p>
                  <p className="text-xs text-purple-600 mt-1">Annonser totalt analyserade</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hur snabbt säljs bilar? */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Hur snabbt säljs bilar?
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Visar hur lång tid det tar innan en bil blir såld
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {saleSpeedStats.map((stat, index) => {
                  const IconComponent = index === 0 ? Rocket : index === 1 ? Zap : index === 2 ? ThumbsUp : index === 3 ? Gauge : Turtle
                  const iconColor = index === 0 ? 'text-green-600' : index === 1 ? 'text-emerald-500' : index === 2 ? 'text-yellow-600' : index === 3 ? 'text-orange-500' : 'text-red-500'
                  const bgColor = index === 0 ? 'bg-green-500' : index === 1 ? 'bg-emerald-400' : index === 2 ? 'bg-yellow-400' : index === 3 ? 'bg-orange-400' : 'bg-red-400'
                  return (
                    <div key={stat.category} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <IconComponent className={`w-4 h-4 ${iconColor}`} />
                          {stat.category}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {stat.count} bilar ({stat.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full ${bgColor} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                          style={{ width: `${Math.max(stat.percentage, 2)}%` }}
                        >
                          {stat.percentage >= 10 && (
                            <span className="text-xs text-white font-medium">{stat.percentage}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  <strong>Vad betyder detta?</strong> Om en bil säljs på 0-7 dagar är den supersnabb!
                  De flesta bilar säljs inom 30 dagar om priset är rätt.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Vilken typ av bil är populärast? */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Årsmodell + Mätarställning */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Årsmodell & Mätarställning
                </CardTitle>
                <p className="text-sm text-muted-foreground">Ålder, pris och körda mil</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={yearStats.map(y => ({ name: y.year, value: y.count }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {yearStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [Number(value).toLocaleString() + ' bilar', 'Antal']} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Detailed Table */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                      <span>Årsmodell</span>
                      <span className="text-right">Antal</span>
                      <span className="text-right">Snittpris</span>
                      <span className="text-right">Snitt mil</span>
                    </div>
                    {yearStats.map((y, i) => (
                      <div key={y.year} className="grid grid-cols-4 gap-2 text-sm items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-medium">{y.year}</span>
                        </div>
                        <span className="text-right text-muted-foreground">{y.count.toLocaleString()}</span>
                        <span className="text-right font-medium">{formatPrice(y.avgPrice)}</span>
                        <span className="text-right text-muted-foreground">{y.avgMileage.toLocaleString()} mil</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kaross/Typ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-indigo-500" />
                  Vilken typ av bil?
                </CardTitle>
                <p className="text-sm text-muted-foreground">SUV, Sedan, Kombi och andra</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={bodyTypeStats.slice(0, 6)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="bodyType" type="category" tick={{ fontSize: 12 }} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value, name) => [
                        name === 'count' ? Number(value).toLocaleString() + ' bilar' : value + ' dagar',
                        name === 'count' ? 'Antal' : 'Snitt dagar till såld'
                      ]}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-indigo-50 rounded-lg flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-indigo-600" />
                  <p className="text-sm text-indigo-700">
                    <strong>{bodyTypeStats[0]?.bodyType || 'SUV'}</strong> är mest populär med {bodyTypeStats[0]?.count || 0} bilar!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Färg och Växellåda */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Färger */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-pink-500" />
                  Vilken färg är populärast?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {colorStats.slice(0, 8).map((color, index) => {
                    const totalColors = colorStats.reduce((sum, c) => sum + c.count, 0)
                    const percentage = totalColors > 0 ? Math.round((color.count / totalColors) * 100) : 0
                    const colorHex = color.color.toLowerCase().includes('svart') ? '#1f2937' :
                                     color.color.toLowerCase().includes('vit') ? '#f3f4f6' :
                                     color.color.toLowerCase().includes('grå') || color.color.toLowerCase().includes('silver') ? '#9ca3af' :
                                     color.color.toLowerCase().includes('blå') ? '#3b82f6' :
                                     color.color.toLowerCase().includes('röd') ? '#ef4444' :
                                     color.color.toLowerCase().includes('grön') ? '#22c55e' :
                                     color.color.toLowerCase().includes('gul') ? '#eab308' : '#a16207'
                    return (
                      <div key={color.color} className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full border-2 border-gray-200 flex-shrink-0"
                          style={{ backgroundColor: colorHex }}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">{color.color}</span>
                            <span className="text-sm text-muted-foreground">{color.count} st ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                            <div
                              className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 p-3 bg-pink-50 rounded-lg flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-pink-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-pink-700">
                    <strong>{colorStats[0]?.color || 'Svart'}</strong> säljs på {colorStats[0]?.avgDaysOnMarket || 0} dagar i snitt
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Växellåda */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-gray-600" />
                  Automat eller Manuell?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center gap-8 py-6">
                  {gearboxStats.map((g, index) => {
                    const totalGearbox = gearboxStats.reduce((sum, gb) => sum + gb.count, 0)
                    const percentage = totalGearbox > 0 ? Math.round((g.count / totalGearbox) * 100) : 0
                    return (
                      <div key={g.gearbox} className="text-center">
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center ${index === 0 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                          <div>
                            <span className={`text-3xl font-bold ${index === 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                              {g.gearbox === 'Automat' ? 'A' : 'M'}
                            </span>
                            <p className="text-2xl font-bold mt-2">{percentage}%</p>
                          </div>
                        </div>
                        <p className="mt-3 font-medium">{g.gearbox}</p>
                        <p className="text-sm text-muted-foreground">{g.count.toLocaleString()} bilar</p>
                        <p className="text-xs text-muted-foreground">Snitt: {formatPrice(g.avgPrice)}</p>
                      </div>
                    )
                  })}
                </div>
                <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    <strong>Tips!</strong> {gearboxStats[0]?.gearbox === 'Automat' ? 'Automat är vanligast - folk gillar bekvämlighet!' : 'Manuell är vanligast - kanske för lägre pris?'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Märken - Pris & Mätarställning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-purple-500" />
                Top 10 Märken - Pris & Mil
              </CardTitle>
              <p className="text-sm text-muted-foreground">Snittpris och mätarställning per märke</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                  <span>Märke</span>
                  <span className="text-right">Antal</span>
                  <span className="text-right">Snittpris</span>
                  <span className="text-right">Snitt mil</span>
                </div>
                {brandStats.slice(0, 10).map((b, i) => (
                  <div key={b.brand} className="grid grid-cols-4 gap-2 text-sm items-center py-1 hover:bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="font-medium truncate">{b.brand}</span>
                    </div>
                    <span className="text-right text-muted-foreground">{b.count.toLocaleString()}</span>
                    <span className="text-right font-medium">{formatPrice(b.avgPrice)}</span>
                    <span className="text-right text-muted-foreground">{b.avgMileage.toLocaleString()} mil</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700">
                  <strong>Insikt:</strong> {brandStats[0]?.brand} dominerar med {brandStats[0]?.count} bilar.
                  Lägst mil har {brandStats.slice(0, 10).sort((a, b) => a.avgMileage - b.avgMileage)[0]?.brand} ({brandStats.slice(0, 10).sort((a, b) => a.avgMileage - b.avgMileage)[0]?.avgMileage.toLocaleString()} mil snitt).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Handlare vs Privat - Enkelt */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-500" />
                Vem säljer bilarna?
              </CardTitle>
              <p className="text-sm text-muted-foreground">Bilhandlare vs Privatpersoner</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-6 bg-blue-50 rounded-xl">
                  <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-lg font-bold text-blue-700">Bilhandlare</p>
                  <p className="text-4xl font-bold text-blue-600 my-2">{totals.dealerAds.toLocaleString()}</p>
                  <p className="text-sm text-blue-600">
                    {totals.activeAds > 0 ? Math.round((totals.dealerAds / totals.activeAds) * 100) : 0}% av alla annonser
                  </p>
                </div>
                <div className="text-center p-6 bg-teal-50 rounded-xl">
                  <div className="w-16 h-16 mx-auto mb-3 bg-teal-100 rounded-full flex items-center justify-center">
                    <UserCircle className="w-8 h-8 text-teal-600" />
                  </div>
                  <p className="text-lg font-bold text-teal-700">Privatpersoner</p>
                  <p className="text-4xl font-bold text-teal-600 my-2">{totals.privateAds.toLocaleString()}</p>
                  <p className="text-sm text-teal-600">
                    {totals.activeAds > 0 ? Math.round((totals.privateAds / totals.activeAds) * 100) : 0}% av alla annonser
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Säljare & Moms - uppdelat på handlare med/utan moms + privat */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Säljare & Momsuppgifter
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Uppdelat på bilhandlare (med/utan moms) och privatpersoner
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-green-600" />
                    <p className="text-sm text-green-700 font-medium">Handlare med moms</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{sellerMomsStats.handlareMoms.count.toLocaleString()}</p>
                  <p className="text-sm text-green-600">Snitt: {formatPrice(sellerMomsStats.handlareMoms.avgPrice)}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <p className="text-sm text-blue-700 font-medium">Handlare utan moms</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{sellerMomsStats.handlareUtanMoms.count.toLocaleString()}</p>
                  <p className="text-sm text-blue-600">Snitt: {formatPrice(sellerMomsStats.handlareUtanMoms.avgPrice)}</p>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <UserCircle className="w-4 h-4 text-teal-600" />
                    <p className="text-sm text-teal-700 font-medium">Privatpersoner</p>
                  </div>
                  <p className="text-2xl font-bold text-teal-600">{sellerMomsStats.privat.count.toLocaleString()}</p>
                  <p className="text-sm text-teal-600">Snitt: {formatPrice(sellerMomsStats.privat.avgPrice)}</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800">
                  <strong>Tips!</strong> Momsbilar (25% avdrag) är ofta nyare tjänstebilar med lägre mil.
                  Handlare utan moms säljer ofta begagnade bilar från inbyten.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Enkel sammanfattning */}
          <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6" />
                <h3 className="text-xl font-bold">Sammanfattning av marknaden</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/20 rounded-lg p-4">
                  <p className="text-sm opacity-90">Mest populära biltyp</p>
                  <p className="text-lg font-bold">{bodyTypeStats[0]?.bodyType || 'SUV'}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-4">
                  <p className="text-sm opacity-90">Vanligaste färgen</p>
                  <p className="text-lg font-bold">{colorStats[0]?.color || 'Svart'}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-4">
                  <p className="text-sm opacity-90">Typisk försäljningstid</p>
                  <p className="text-lg font-bold">{marketHealth.avgDaysOnMarket} dagar</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ÖVERSIKT TAB */}
        <TabsContent value="oversikt" className="space-y-6">
          {/* Main Overview Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Marknadsöversikt - Upplagda, Sålda & Aktiva annonser
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Nya/Sålda', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Totalt aktiva', angle: 90, position: 'insideRight', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value, name) => {
                      const labels: Record<string, string> = {
                        newAds: 'Upplagda',
                        soldAds: 'Sålda',
                        activeAds: 'Aktiva totalt'
                      }
                      return [Number(value).toLocaleString(), labels[name as string] || name]
                    }}
                    labelFormatter={(label) => chartData.find(d => d.monthLabel === label)?.monthFull || String(label)}
                  />
                  <Legend
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        newAds: '📈 Upplagda (nya)',
                        soldAds: '📉 Sålda/borttagna',
                        activeAds: '📊 Aktiva totalt'
                      }
                      return labels[value] || value
                    }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="newAds" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
                  <Line yAxisId="left" type="monotone" dataKey="soldAds" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="activeAds" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">Senaste månadens upplagda</p>
                  <p className="text-2xl font-bold text-green-600">+{chartData[chartData.length - 1]?.newAds || 0}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-700 font-medium">Senaste månadens sålda</p>
                  <p className="text-2xl font-bold text-orange-600">-{chartData[chartData.length - 1]?.soldAds || 0}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">Netto (upplagda - sålda)</p>
                  <p className={`text-2xl font-bold ${(chartData[chartData.length - 1]?.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(chartData[chartData.length - 1]?.net || 0) >= 0 ? '+' : ''}{chartData[chartData.length - 1]?.net || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price and Seller Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Prisfördelning (aktiva annonser)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={priceRangeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="range" type="category" tick={{ fontSize: 12 }} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value) => [Number(value).toLocaleString() + ' st', 'Antal']}
                    />
                    <Bar dataKey="antal" radius={[0, 4, 4, 0]}>
                      {priceRangeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Säljare
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sellerTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {sellerTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value) => [Number(value).toLocaleString() + ' st', 'Antal']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Details Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Månadsöversikt (detaljerad)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Månad</TableHead>
                    <TableHead className="text-right">Nya</TableHead>
                    <TableHead className="text-right">Sålda</TableHead>
                    <TableHead className="text-right">Netto</TableHead>
                    <TableHead className="text-right">Aktiva</TableHead>
                    <TableHead className="text-right">Snittpris</TableHead>
                    <TableHead className="text-right">Median dagar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...monthlyStats].reverse().map((month) => {
                    const net = month.newAds - month.soldAds
                    return (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium">{formatMonthFull(month.month)}</TableCell>
                        <TableCell className="text-right text-green-600">+{month.newAds}</TableCell>
                        <TableCell className="text-right text-orange-600">-{month.soldAds}</TableCell>
                        <TableCell className={`text-right font-medium ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {net >= 0 ? '+' : ''}{net}
                        </TableCell>
                        <TableCell className="text-right font-bold">{month.activeAds.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatPrice(month.avgPrice)}</TableCell>
                        <TableCell className="text-right">
                          {month.medianDaysOnMarket > 0 ? `${month.medianDaysOnMarket} dagar` : '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MÄRKEN TAB */}
        <TabsContent value="marken" className="space-y-6">
          {/* Search Field */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Sök märke eller modell..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Brand Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Antal märken</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{brandStats.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Antal modeller</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{modelStats.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Populäraste märke</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{brandStats[0]?.brand || '-'}</div>
                <p className="text-xs text-muted-foreground">{brandStats[0]?.count || 0} annonser</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Populäraste modell</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{modelStats[0]?.model || '-'}</div>
                <p className="text-xs text-muted-foreground">{modelStats[0]?.brand} - {modelStats[0]?.count || 0} st</p>
              </CardContent>
            </Card>
          </div>

          {/* Top 20 Models */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Top 20 modeller (alla märken)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart
                  data={modelStats
                    .filter(m => !searchQuery ||
                      m.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      m.model.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 20)
                    .map(m => ({
                      name: `${m.brand} ${m.model}`,
                      antal: m.count,
                      pris: Math.round(m.avgPrice / 1000)
                    }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value, name) => [
                      name === 'antal' ? Number(value).toLocaleString() + ' st' : value + 'k kr',
                      name === 'antal' ? 'Antal' : 'Snittpris'
                    ]}
                  />
                  <Bar dataKey="antal" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expandable Brand Table with Models */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Märken & Modeller (klicka för att expandera)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Märke / Modell</TableHead>
                      <TableHead className="text-right">Antal</TableHead>
                      <TableHead className="text-right">Andel</TableHead>
                      <TableHead className="text-right">Snittpris</TableHead>
                      <TableHead className="text-right">Snittmil</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brandStats
                      .filter(brand =>
                        !searchQuery ||
                        brand.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        modelStats.some(m =>
                          m.brand === brand.brand &&
                          m.model.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                      )
                      .map((brand, index) => {
                        const brandModels = modelStats
                          .filter(m => m.brand === brand.brand)
                          .filter(m => !searchQuery ||
                            m.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            m.brand.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .sort((a, b) => b.count - a.count)
                        const isExpanded = expandedBrand === brand.brand

                        return (
                          <>
                            <TableRow
                              key={brand.brand}
                              className={`cursor-pointer hover:bg-gray-50 ${isExpanded ? 'bg-blue-50' : ''}`}
                              onClick={() => setExpandedBrand(isExpanded ? null : brand.brand)}
                            >
                              <TableCell>
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                <span className="flex items-center gap-2">
                                  <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  />
                                  {brand.brand}
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    {brandModels.length} modeller
                                  </Badge>
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-bold">{brand.count}</TableCell>
                              <TableCell className="text-right">
                                {totals.activeAds > 0 ? ((brand.count / totals.activeAds) * 100).toFixed(1) : 0}%
                              </TableCell>
                              <TableCell className="text-right">{formatPrice(brand.avgPrice)}</TableCell>
                              <TableCell className="text-right">
                                {brand.avgMileage > 0 ? `${brand.avgMileage.toLocaleString()} mil` : '-'}
                              </TableCell>
                            </TableRow>
                            {isExpanded && brandModels.map((model, modelIndex) => (
                              <TableRow key={`${model.brand}-${model.model}`} className="bg-gray-50/50">
                                <TableCell></TableCell>
                                <TableCell className="pl-10 text-gray-600">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                                    {model.model}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">{model.count}</TableCell>
                                <TableCell className="text-right text-gray-500">
                                  {brand.count > 0 ? ((model.count / brand.count) * 100).toFixed(1) : 0}%
                                </TableCell>
                                <TableCell className="text-right">{formatPrice(model.avgPrice)}</TableCell>
                                <TableCell className="text-right">
                                  {model.avgMileage > 0 ? `${model.avgMileage.toLocaleString()} mil` : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        )
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Brand Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Top 15 märken - antal annonser
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={brandStats.slice(0, 15).map(b => ({ ...b, pris: Math.round(b.avgPrice / 1000) }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="brand" type="category" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value, name) => [
                      name === 'count' ? Number(value).toLocaleString() + ' st' : value + 'k kr',
                      name === 'count' ? 'Antal' : 'Snittpris'
                    ]}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REGIONER TAB */}
        <TabsContent value="regioner" className="space-y-6">
          {/* Region Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Annonser per region (senaste månaden: {formatMonthFull(latestMonth || '')})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {regionDataForMonth.map((region, index) => (
                  <div
                    key={region.region}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedRegion === region.region
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedRegion(
                      selectedRegion === region.region ? null : region.region
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <p className="text-sm font-medium text-gray-700 capitalize">{region.region}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{region.count}</p>
                    <p className="text-xs text-gray-500">nya annonser</p>
                  </div>
                ))}
              </div>

              {selectedRegion && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3 capitalize">{selectedRegion} - trend över tid</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={monthlyStats.map(m => ({
                        month: formatMonth(m.month),
                        antal: regionMonthlyStats.find(r => r.region === selectedRegion && r.month === m.month)?.count || 0
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value) => [value + ' st', 'Nya annonser']}
                      />
                      <Bar dataKey="antal" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Region Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Jämför regioner över tid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyStats.map(m => {
                  const data: Record<string, string | number> = { month: formatMonth(m.month) }
                  regions.forEach(region => {
                    const regionData = regionMonthlyStats.find(r => r.region === region && r.month === m.month)
                    data[region] = regionData?.count || 0
                  })
                  return data
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  {regions.map((region, index) => (
                    <Line
                      key={region}
                      type="monotone"
                      dataKey={region}
                      name={region.charAt(0).toUpperCase() + region.slice(1)}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ fill: COLORS[index % COLORS.length], r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
