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
  Info
} from 'lucide-react'
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

interface BlocketMarknadViewProps {
  monthlyStats: MonthlyStats[]
  brandStats: BrandStats[]
  regionMonthlyStats: RegionMonthlyStats[]
  priceRanges: PriceRange[]
  totals: Totals
  scraperStartDate?: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export function BlocketMarknadView({
  monthlyStats,
  brandStats,
  regionMonthlyStats,
  priceRanges,
  totals,
  scraperStartDate
}: BlocketMarknadViewProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)

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
      <Tabs defaultValue="oversikt" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="oversikt" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Översikt
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Populäraste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{brandStats[0]?.brand || '-'}</div>
                <p className="text-xs text-muted-foreground">{brandStats[0]?.count || 0} annonser</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Dyraste (snitt)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {[...brandStats].sort((a, b) => b.avgPrice - a.avgPrice)[0]?.brand || '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPrice([...brandStats].sort((a, b) => b.avgPrice - a.avgPrice)[0]?.avgPrice || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lägst miltal (snitt)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {[...brandStats].filter(b => b.avgMileage > 0).sort((a, b) => a.avgMileage - b.avgMileage)[0]?.brand || '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {[...brandStats].filter(b => b.avgMileage > 0).sort((a, b) => a.avgMileage - b.avgMileage)[0]?.avgMileage.toLocaleString() || 0} mil
                </p>
              </CardContent>
            </Card>
          </div>

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

          {/* Brand Click to Select */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Klicka på ett märke för detaljer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-6">
                {brandStats.map((brand, index) => (
                  <button
                    key={brand.brand}
                    onClick={() => setSelectedBrand(selectedBrand === brand.brand ? null : brand.brand)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      selectedBrand === brand.brand
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    {brand.brand} ({brand.count})
                  </button>
                ))}
              </div>

              {selectedBrand && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  {(() => {
                    const brand = brandStats.find(b => b.brand === selectedBrand)
                    if (!brand) return null
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-sm text-gray-600">Antal annonser</p>
                          <p className="text-2xl font-bold text-blue-600">{brand.count}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-sm text-gray-600">Genomsnittspris</p>
                          <p className="text-2xl font-bold text-green-600">{formatPrice(brand.avgPrice)}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-sm text-gray-600">Genomsnittligt miltal</p>
                          <p className="text-2xl font-bold text-purple-600">{brand.avgMileage.toLocaleString()} mil</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-sm text-gray-600">Andel av marknad</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {totals.activeAds > 0 ? ((brand.count / totals.activeAds) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Full Brand Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Alla märken (detaljerad tabell)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Märke</TableHead>
                      <TableHead className="text-right">Antal</TableHead>
                      <TableHead className="text-right">Andel</TableHead>
                      <TableHead className="text-right">Snittpris</TableHead>
                      <TableHead className="text-right">Snittmil</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brandStats.map((brand, index) => (
                      <TableRow key={brand.brand} className={selectedBrand === brand.brand ? 'bg-blue-50' : ''}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            {brand.brand}
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
                    ))}
                  </TableBody>
                </Table>
              </div>
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
