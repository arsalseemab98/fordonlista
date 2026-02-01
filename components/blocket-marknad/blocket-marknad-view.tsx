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
  TrendingDown,
  Store,
  User,
  DollarSign,
  Clock,
  BarChart3,
  MapPin,
  Calendar,
  Activity
} from 'lucide-react'
import { useState } from 'react'

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

  // Calculate max values for chart scaling
  const maxNewAds = Math.max(...monthlyStats.map(m => m.newAds), 1)
  const maxSoldAds = Math.max(...monthlyStats.map(m => m.soldAds), 1)
  const maxActiveAds = Math.max(...monthlyStats.map(m => m.activeAds), 1)
  const maxPriceRange = Math.max(...priceRanges.map(p => p.count), 1)
  const maxBrandCount = Math.max(...brandStats.map(b => b.count), 1)

  // Calculate trends
  const currentMonth = monthlyStats[monthlyStats.length - 1]
  const previousMonth = monthlyStats[monthlyStats.length - 2]

  const newAdsTrend = previousMonth && currentMonth
    ? ((currentMonth.newAds - previousMonth.newAds) / (previousMonth.newAds || 1)) * 100
    : 0

  const soldAdsTrend = previousMonth && currentMonth
    ? ((currentMonth.soldAds - previousMonth.soldAds) / (previousMonth.soldAds || 1)) * 100
    : 0

  // Get region data for selected month (latest)
  const latestMonth = monthlyStats[monthlyStats.length - 1]?.month
  const regionDataForMonth = regionMonthlyStats
    .filter(r => r.month === latestMonth)
    .sort((a, b) => b.count - a.count)

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

      {/* Monthly Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New vs Sold Ads Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Nya vs Sålda per månad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyStats.map((month) => (
                <div key={month.month} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{formatMonth(month.month)}</span>
                    <span className="text-muted-foreground">
                      <span className="text-green-600">+{month.newAds}</span>
                      {' / '}
                      <span className="text-orange-600">-{month.soldAds}</span>
                    </span>
                  </div>
                  <div className="flex gap-1 h-6">
                    <div
                      className="bg-green-500 rounded-l"
                      style={{ width: `${(month.newAds / maxNewAds) * 50}%` }}
                      title={`Nya: ${month.newAds}`}
                    />
                    <div
                      className="bg-orange-500 rounded-r"
                      style={{ width: `${(month.soldAds / maxSoldAds) * 50}%` }}
                      title={`Sålda: ${month.soldAds}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span>Nya annonser</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded" />
                <span>Sålda/borttagna</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Ads Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Aktiva annonser över tid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyStats.map((month, index) => {
                const prevActive = index > 0 ? monthlyStats[index - 1].activeAds : month.activeAds
                const change = month.activeAds - prevActive
                return (
                  <div key={month.month} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{formatMonth(month.month)}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-bold">{month.activeAds.toLocaleString()}</span>
                        {change !== 0 && (
                          <span className={change > 0 ? 'text-green-600' : 'text-red-600'}>
                            {change > 0 ? '+' : ''}{change}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-6 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded"
                        style={{ width: `${(month.activeAds / maxActiveAds) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price and Time Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Prisfördelning (aktiva annonser)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {priceRanges.map((range) => (
                <div key={range.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{range.label}</span>
                    <span className="text-muted-foreground">{range.count.toLocaleString()} st</span>
                  </div>
                  <div className="h-6 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded"
                      style={{ width: `${(range.count / maxPriceRange) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Average Price Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Genomsnittspris per månad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyStats.filter(m => m.avgPrice > 0).map((month) => (
                <div key={month.month} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">{formatMonth(month.month)}</span>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-bold text-lg">{formatPrice(month.avgPrice)}</span>
                    </div>
                    {month.medianDaysOnMarket > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {month.medianDaysOnMarket}d median
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brand Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Märkesstatistik (senaste 12 mån)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bar chart visualization */}
            <div className="space-y-2">
              {brandStats.slice(0, 10).map((brand) => (
                <div key={brand.brand} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{brand.brand}</span>
                    <span className="text-muted-foreground">{brand.count} st</span>
                  </div>
                  <div className="h-5 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded"
                      style={{ width: `${(brand.count / maxBrandCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

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
                  {brandStats.map((brand) => (
                    <TableRow key={brand.brand}>
                      <TableCell className="font-medium">{brand.brand}</TableCell>
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
            Per region (senaste månaden)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {regionDataForMonth.map((region) => (
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
                <p className="text-sm font-medium text-gray-700 capitalize">{region.region}</p>
                <p className="text-2xl font-bold text-gray-900">{region.count}</p>
                <p className="text-xs text-gray-500">nya annonser</p>
              </div>
            ))}
          </div>

          {/* Region trend over time */}
          {selectedRegion && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-3 capitalize">{selectedRegion} - trend över tid</h4>
              <div className="space-y-2">
                {monthlyStats.map((month) => {
                  const regionData = regionMonthlyStats.find(
                    r => r.region === selectedRegion && r.month === month.month
                  )
                  const count = regionData?.count || 0
                  const maxForRegion = Math.max(
                    ...regionMonthlyStats
                      .filter(r => r.region === selectedRegion)
                      .map(r => r.count),
                    1
                  )

                  return (
                    <div key={month.month} className="flex items-center gap-3">
                      <span className="w-20 text-sm">{formatMonth(month.month)}</span>
                      <div className="flex-1 h-5 bg-gray-200 rounded overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded"
                          style={{ width: `${(count / maxForRegion) * 100}%` }}
                        />
                      </div>
                      <span className="w-12 text-sm text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
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
                    <TableCell className="font-medium">{formatMonth(month.month)}</TableCell>
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
