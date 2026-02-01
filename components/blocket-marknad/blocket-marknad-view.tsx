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
  PieChart as PieChartIcon
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
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export function BlocketMarknadView({
  monthlyStats,
  brandStats,
  regionMonthlyStats,
  priceRanges,
  totals
}: BlocketMarknadViewProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

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

  // Region chart data
  const regionChartData = regions.map(region => {
    const data: Record<string, string | number> = { region: region.charAt(0).toUpperCase() + region.slice(1) }
    monthlyStats.forEach(m => {
      const regionData = regionMonthlyStats.find(r => r.region === region && r.month === m.month)
      data[formatMonth(m.month)] = regionData?.count || 0
    })
    return data
  })

  return (
    <div className="space-y-6">
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

      {/* Main Overview Chart - Full Width */}
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
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="newAds"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 8 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="soldAds"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 8 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="activeAds"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 8 }}
                strokeDasharray="5 5"
              />
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

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New vs Sold Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Nya vs Sålda per månad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value, name) => [value, name === 'newAds' ? 'Nya' : 'Sålda']}
                  labelFormatter={(label) => chartData.find(d => d.monthLabel === label)?.monthFull || String(label)}
                />
                <Legend formatter={(value) => value === 'newAds' ? 'Nya annonser' : 'Sålda/borttagna'} />
                <Line
                  type="monotone"
                  dataKey="newAds"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="soldAds"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: '#f97316', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Active Ads Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Aktiva annonser över tid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => [Number(value).toLocaleString(), 'Aktiva']}
                  labelFormatter={(label) => chartData.find(d => d.monthLabel === label)?.monthFull || String(label)}
                />
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="activeAds"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorActive)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Price and Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price Distribution Bar Chart */}
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

        {/* Seller Type Pie Chart */}
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

      {/* Average Price Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Genomsnittspris per månad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData.filter(m => m.avgPrice > 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value) => [formatPrice(Number(value)), 'Snittpris']}
                labelFormatter={(label) => chartData.find(d => d.monthLabel === label)?.monthFull || label}
              />
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="avgPrice"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Brand Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Top 10 märken (senaste 12 mån)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={brandChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="brand" type="category" tick={{ fontSize: 12 }} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value, name) => [
                    name === 'antal' ? Number(value).toLocaleString() + ' st' : value + 'k kr',
                    name === 'antal' ? 'Antal' : 'Snittpris'
                  ]}
                />
                <Legend formatter={(value) => value === 'antal' ? 'Antal annonser' : 'Snittpris (tkr)'} />
                <Bar dataKey="antal" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Table with details */}
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Märke</TableHead>
                    <TableHead className="text-right">Antal</TableHead>
                    <TableHead className="text-right">Snittpris</TableHead>
                    <TableHead className="text-right">Snittmil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brandStats.map((brand, index) => (
                    <TableRow key={brand.brand}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          {brand.brand}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{brand.count}</TableCell>
                      <TableCell className="text-right">{formatPrice(brand.avgPrice)}</TableCell>
                      <TableCell className="text-right">
                        {brand.avgMileage > 0 ? `${brand.avgMileage.toLocaleString()} mil` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Region Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Per region (senaste månaden: {formatMonthFull(latestMonth || '')})
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

          {/* Region trend chart */}
          {selectedRegion && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-3 capitalize">{selectedRegion} - trend över tid</h4>
              <ResponsiveContainer width="100%" height={200}>
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
    </div>
  )
}
