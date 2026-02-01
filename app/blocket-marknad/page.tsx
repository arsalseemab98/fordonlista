import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { BlocketMarknadView } from '@/components/blocket-marknad/blocket-marknad-view'

// Force dynamic rendering - always fetch fresh data
export const dynamic = 'force-dynamic'

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

interface YearStats {
  year: string
  count: number
  avgPrice: number
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

export default async function BlocketMarknadPage() {
  const supabase = await createClient()

  // Get date range - start from Feb 1, 2026 (scraper started Jan 30, so Feb has complete data)
  const now = new Date()
  const dataStartDate = new Date('2026-02-01T00:00:00Z')

  // Fetch all ads for analysis - use 'publicerad' for when ad was actually posted on Blocket
  // Only include ads published from Feb 1 onwards for accurate lifecycle tracking
  const { data: allAds } = await supabase
    .from('blocket_annonser')
    .select('id, marke, modell, arsmodell, pris, miltal, region, publicerad, forst_sedd, borttagen, saljare_typ, kaross, farg, vaxellada, momsbil')
    .gte('publicerad', dataStartDate.toISOString())
    .order('publicerad', { ascending: false })

  // Calculate monthly statistics using PUBLICERAD (actual Blocket publish date)
  const monthlyStatsMap = new Map<string, {
    newAds: number
    soldAds: number
    prices: number[]
    daysOnMarket: number[]
  }>()

  // Initialize months from Feb 2026 to current month
  const startMonth = new Date('2026-02-01')
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  let iterDate = new Date(startMonth)
  while (iterDate <= currentMonth) {
    const monthKey = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}`
    monthlyStatsMap.set(monthKey, {
      newAds: 0,
      soldAds: 0,
      prices: [],
      daysOnMarket: []
    })
    iterDate.setMonth(iterDate.getMonth() + 1)
  }

  // Process ads - use publicerad for "new ads" count
  allAds?.forEach(ad => {
    if (!ad.publicerad) return

    // Count new ads by month using PUBLICERAD (actual publish date)
    const publishedDate = new Date(ad.publicerad)
    const newMonthKey = `${publishedDate.getFullYear()}-${String(publishedDate.getMonth() + 1).padStart(2, '0')}`

    if (monthlyStatsMap.has(newMonthKey)) {
      const stats = monthlyStatsMap.get(newMonthKey)!
      stats.newAds++
      if (ad.pris) stats.prices.push(ad.pris)
    }

    // Count sold ads by month
    if (ad.borttagen) {
      const soldDate = new Date(ad.borttagen)
      const soldMonthKey = `${soldDate.getFullYear()}-${String(soldDate.getMonth() + 1).padStart(2, '0')}`

      if (monthlyStatsMap.has(soldMonthKey)) {
        const stats = monthlyStatsMap.get(soldMonthKey)!
        stats.soldAds++

        // Calculate days on market (from publish to sold)
        const daysOnMarket = Math.floor((soldDate.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysOnMarket >= 0 && daysOnMarket < 365) {
          stats.daysOnMarket.push(daysOnMarket)
        }
      }
    }
  })

  // Convert to array and calculate aggregates
  const monthlyStats: MonthlyStats[] = []

  // For active ads calculation, we need to track cumulative
  // Start with ads published before Feb 1 that are still active
  const { count: initialActiveCount } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .lt('publicerad', dataStartDate.toISOString())
    .is('borttagen', null)

  let runningActiveAds = initialActiveCount || 0

  // Sort months chronologically
  const sortedMonths = Array.from(monthlyStatsMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))

  for (const [month, stats] of sortedMonths) {
    runningActiveAds = runningActiveAds + stats.newAds - stats.soldAds

    const avgPrice = stats.prices.length > 0
      ? Math.round(stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length)
      : 0

    // Calculate median days on market
    let medianDays = 0
    if (stats.daysOnMarket.length > 0) {
      const sorted = [...stats.daysOnMarket].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      medianDays = sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    }

    monthlyStats.push({
      month,
      newAds: stats.newAds,
      soldAds: stats.soldAds,
      activeAds: Math.max(0, runningActiveAds),
      avgPrice,
      medianDaysOnMarket: medianDays
    })
  }

  // Get brand statistics (top 20) - use publicerad for accurate counts
  const brandMap = new Map<string, { count: number; prices: number[]; mileages: number[] }>()

  allAds?.forEach(ad => {
    if (!ad.marke) return
    const brand = ad.marke.toUpperCase()

    if (!brandMap.has(brand)) {
      brandMap.set(brand, { count: 0, prices: [], mileages: [] })
    }

    const stats = brandMap.get(brand)!
    stats.count++
    if (ad.pris) stats.prices.push(ad.pris)
    if (ad.miltal) stats.mileages.push(ad.miltal)
  })

  const brandStats: BrandStats[] = Array.from(brandMap.entries())
    .map(([brand, stats]) => ({
      brand,
      count: stats.count,
      avgPrice: stats.prices.length > 0
        ? Math.round(stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length)
        : 0,
      avgMileage: stats.mileages.length > 0
        ? Math.round(stats.mileages.reduce((a, b) => a + b, 0) / stats.mileages.length)
        : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)

  // Get model statistics (brand + model combination)
  const modelMap = new Map<string, { brand: string; model: string; count: number; prices: number[]; mileages: number[] }>()

  allAds?.forEach(ad => {
    if (!ad.marke || !ad.modell) return
    const brand = ad.marke.toUpperCase()
    const model = ad.modell.toUpperCase()
    const key = `${brand}|${model}`

    if (!modelMap.has(key)) {
      modelMap.set(key, { brand, model, count: 0, prices: [], mileages: [] })
    }

    const stats = modelMap.get(key)!
    stats.count++
    if (ad.pris) stats.prices.push(ad.pris)
    if (ad.miltal) stats.mileages.push(ad.miltal)
  })

  const modelStats: ModelStats[] = Array.from(modelMap.values())
    .map(stats => ({
      brand: stats.brand,
      model: stats.model,
      count: stats.count,
      avgPrice: stats.prices.length > 0
        ? Math.round(stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length)
        : 0,
      avgMileage: stats.mileages.length > 0
        ? Math.round(stats.mileages.reduce((a, b) => a + b, 0) / stats.mileages.length)
        : 0
    }))
    .sort((a, b) => b.count - a.count)

  // ============================================
  // TOTAL MARKNAD - New statistics
  // ============================================

  // Helper function to calculate days on market
  const calcDaysOnMarket = (publicerad: string, borttagen: string | null): number | null => {
    if (!borttagen) return null
    const days = Math.floor((new Date(borttagen).getTime() - new Date(publicerad).getTime()) / (1000 * 60 * 60 * 24))
    return days >= 0 && days < 365 ? days : null
  }

  // Year statistics (årsmodell)
  const yearMap = new Map<string, { count: number; prices: number[] }>()
  allAds?.forEach(ad => {
    if (!ad.arsmodell) return
    const yearGroup = ad.arsmodell >= 2024 ? '2024+' :
                      ad.arsmodell >= 2022 ? '2022-2023' :
                      ad.arsmodell >= 2020 ? '2020-2021' :
                      ad.arsmodell >= 2015 ? '2015-2019' : 'Äldre'

    if (!yearMap.has(yearGroup)) {
      yearMap.set(yearGroup, { count: 0, prices: [] })
    }
    const stats = yearMap.get(yearGroup)!
    stats.count++
    if (ad.pris) stats.prices.push(ad.pris)
  })

  const yearStats: YearStats[] = Array.from(yearMap.entries())
    .map(([year, stats]) => ({
      year,
      count: stats.count,
      avgPrice: stats.prices.length > 0
        ? Math.round(stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length)
        : 0
    }))
    .sort((a, b) => {
      const order = ['2024+', '2022-2023', '2020-2021', '2015-2019', 'Äldre']
      return order.indexOf(a.year) - order.indexOf(b.year)
    })

  // Body type statistics (kaross)
  const bodyTypeMap = new Map<string, { count: number; prices: number[]; daysOnMarket: number[] }>()
  allAds?.forEach(ad => {
    if (!ad.kaross) return
    const bodyType = ad.kaross.charAt(0).toUpperCase() + ad.kaross.slice(1).toLowerCase()

    if (!bodyTypeMap.has(bodyType)) {
      bodyTypeMap.set(bodyType, { count: 0, prices: [], daysOnMarket: [] })
    }
    const stats = bodyTypeMap.get(bodyType)!
    stats.count++
    if (ad.pris) stats.prices.push(ad.pris)
    const days = calcDaysOnMarket(ad.publicerad, ad.borttagen)
    if (days !== null) stats.daysOnMarket.push(days)
  })

  const bodyTypeStats: BodyTypeStats[] = Array.from(bodyTypeMap.entries())
    .map(([bodyType, stats]) => ({
      bodyType,
      count: stats.count,
      avgPrice: stats.prices.length > 0
        ? Math.round(stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length)
        : 0,
      avgDaysOnMarket: stats.daysOnMarket.length > 0
        ? Math.round(stats.daysOnMarket.reduce((a, b) => a + b, 0) / stats.daysOnMarket.length)
        : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Color statistics (färg)
  const colorMap = new Map<string, { count: number; prices: number[]; daysOnMarket: number[] }>()
  allAds?.forEach(ad => {
    if (!ad.farg) return
    const color = ad.farg.charAt(0).toUpperCase() + ad.farg.slice(1).toLowerCase()

    if (!colorMap.has(color)) {
      colorMap.set(color, { count: 0, prices: [], daysOnMarket: [] })
    }
    const stats = colorMap.get(color)!
    stats.count++
    if (ad.pris) stats.prices.push(ad.pris)
    const days = calcDaysOnMarket(ad.publicerad, ad.borttagen)
    if (days !== null) stats.daysOnMarket.push(days)
  })

  const colorStats: ColorStats[] = Array.from(colorMap.entries())
    .map(([color, stats]) => ({
      color,
      count: stats.count,
      avgPrice: stats.prices.length > 0
        ? Math.round(stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length)
        : 0,
      avgDaysOnMarket: stats.daysOnMarket.length > 0
        ? Math.round(stats.daysOnMarket.reduce((a, b) => a + b, 0) / stats.daysOnMarket.length)
        : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Gearbox statistics (växellåda)
  const gearboxMap = new Map<string, { count: number; prices: number[] }>()
  allAds?.forEach(ad => {
    if (!ad.vaxellada) return
    const gearbox = ad.vaxellada.toLowerCase().includes('auto') ? 'Automat' : 'Manuell'

    if (!gearboxMap.has(gearbox)) {
      gearboxMap.set(gearbox, { count: 0, prices: [] })
    }
    const stats = gearboxMap.get(gearbox)!
    stats.count++
    if (ad.pris) stats.prices.push(ad.pris)
  })

  const gearboxStats: GearboxStats[] = Array.from(gearboxMap.entries())
    .map(([gearbox, stats]) => ({
      gearbox,
      count: stats.count,
      avgPrice: stats.prices.length > 0
        ? Math.round(stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length)
        : 0
    }))
    .sort((a, b) => b.count - a.count)

  // Sale speed statistics (hur snabbt säljs bilar?)
  const allDaysOnMarket: number[] = []
  allAds?.forEach(ad => {
    const days = calcDaysOnMarket(ad.publicerad, ad.borttagen)
    if (days !== null) allDaysOnMarket.push(days)
  })

  const saleSpeedStats: SaleSpeedStats[] = [
    { category: 'Supersnabb (0-7 dagar)', count: allDaysOnMarket.filter(d => d <= 7).length, percentage: 0 },
    { category: 'Snabb (8-14 dagar)', count: allDaysOnMarket.filter(d => d > 7 && d <= 14).length, percentage: 0 },
    { category: 'Normal (15-30 dagar)', count: allDaysOnMarket.filter(d => d > 14 && d <= 30).length, percentage: 0 },
    { category: 'Långsam (31-60 dagar)', count: allDaysOnMarket.filter(d => d > 30 && d <= 60).length, percentage: 0 },
    { category: 'Mycket långsam (60+ dagar)', count: allDaysOnMarket.filter(d => d > 60).length, percentage: 0 },
  ]

  const totalSold2 = allDaysOnMarket.length
  saleSpeedStats.forEach(s => {
    s.percentage = totalSold2 > 0 ? Math.round((s.count / totalSold2) * 100) : 0
  })

  // Momsbil statistics
  const momsbilCount = allAds?.filter(ad => ad.momsbil === true).length || 0
  const privatbilCount = allAds?.filter(ad => ad.momsbil === false).length || 0
  const momsbilPrices = allAds?.filter(ad => ad.momsbil === true && ad.pris).map(ad => ad.pris!) || []
  const privatbilPrices = allAds?.filter(ad => ad.momsbil === false && ad.pris).map(ad => ad.pris!) || []

  const momsbilStats = {
    momsbil: {
      count: momsbilCount,
      avgPrice: momsbilPrices.length > 0 ? Math.round(momsbilPrices.reduce((a, b) => a + b, 0) / momsbilPrices.length) : 0
    },
    privatbil: {
      count: privatbilCount,
      avgPrice: privatbilPrices.length > 0 ? Math.round(privatbilPrices.reduce((a, b) => a + b, 0) / privatbilPrices.length) : 0
    }
  }

  // Market health metrics
  const lastMonthStats = monthlyStats[monthlyStats.length - 1]
  const prevMonthStats = monthlyStats[monthlyStats.length - 2]

  const marketGrowth = lastMonthStats && prevMonthStats
    ? lastMonthStats.activeAds - prevMonthStats.activeAds
    : 0

  const avgDaysOnMarketTotal = allDaysOnMarket.length > 0
    ? Math.round(allDaysOnMarket.reduce((a, b) => a + b, 0) / allDaysOnMarket.length)
    : 0

  // Get region monthly breakdown - use publicerad
  const regionMonthlyMap = new Map<string, Map<string, number>>()

  allAds?.forEach(ad => {
    if (!ad.region || !ad.publicerad) return
    const region = ad.region.toLowerCase()
    const date = new Date(ad.publicerad)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!regionMonthlyMap.has(region)) {
      regionMonthlyMap.set(region, new Map())
    }

    const regionStats = regionMonthlyMap.get(region)!
    regionStats.set(monthKey, (regionStats.get(monthKey) || 0) + 1)
  })

  const regionMonthlyStats: RegionMonthlyStats[] = []
  regionMonthlyMap.forEach((months, region) => {
    months.forEach((count, month) => {
      regionMonthlyStats.push({ region, month, count })
    })
  })

  // Get seller type breakdown
  const { count: dealerCount } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .eq('saljare_typ', 'handlare')
    .is('borttagen', null)

  const { count: privateCount } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .eq('saljare_typ', 'privat')
    .is('borttagen', null)

  // Get price distribution for active ads
  const { data: priceDistData } = await supabase
    .from('blocket_annonser')
    .select('pris')
    .is('borttagen', null)
    .not('pris', 'is', null)

  const priceRanges = [
    { label: '0-50k', min: 0, max: 50000, count: 0 },
    { label: '50-100k', min: 50000, max: 100000, count: 0 },
    { label: '100-200k', min: 100000, max: 200000, count: 0 },
    { label: '200-300k', min: 200000, max: 300000, count: 0 },
    { label: '300-500k', min: 300000, max: 500000, count: 0 },
    { label: '500k+', min: 500000, max: Infinity, count: 0 },
  ]

  priceDistData?.forEach(ad => {
    if (!ad.pris) return
    const range = priceRanges.find(r => ad.pris >= r.min && ad.pris < r.max)
    if (range) range.count++
  })

  // Get current totals
  const { count: totalActive } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .is('borttagen', null)

  const { count: totalSold } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .not('borttagen', 'is', null)

  // Scraper start date for info display
  const scraperStartDate = '2026-01-30'

  return (
    <div className="flex flex-col">
      <Header
        title="Blocket Marknad"
        description="Marknadsanalys för bilar i Norrland - baserat på Blockets publiceringsdatum"
      />

      <div className="flex-1 p-6">
        <BlocketMarknadView
          monthlyStats={monthlyStats}
          brandStats={brandStats}
          modelStats={modelStats}
          regionMonthlyStats={regionMonthlyStats}
          priceRanges={priceRanges}
          totals={{
            activeAds: totalActive || 0,
            soldAds: totalSold || 0,
            dealerAds: dealerCount || 0,
            privateAds: privateCount || 0,
          }}
          scraperStartDate={scraperStartDate}
          yearStats={yearStats}
          bodyTypeStats={bodyTypeStats}
          colorStats={colorStats}
          gearboxStats={gearboxStats}
          saleSpeedStats={saleSpeedStats}
          momsbilStats={momsbilStats}
          marketHealth={{
            marketGrowth,
            avgDaysOnMarket: avgDaysOnMarketTotal,
            totalAdsTracked: allAds?.length || 0,
            totalSoldTracked: allDaysOnMarket.length,
          }}
        />
      </div>
    </div>
  )
}
