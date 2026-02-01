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

interface RegionMonthlyStats {
  region: string
  month: string
  count: number
}

export default async function BlocketMarknadPage() {
  const supabase = await createClient()

  // Get date range - last 6 months (we only have real data from late Jan 2026)
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  // Fetch all ads for analysis - use 'publicerad' for when ad was actually posted on Blocket
  // This gives accurate historical data, unlike 'forst_sedd' which is when our scraper found it
  const { data: allAds } = await supabase
    .from('blocket_annonser')
    .select('id, marke, modell, pris, miltal, region, publicerad, forst_sedd, borttagen, saljare_typ')
    .gte('publicerad', sixMonthsAgo.toISOString())
    .order('publicerad', { ascending: false })

  // Calculate monthly statistics using PUBLICERAD (actual Blocket publish date)
  const monthlyStatsMap = new Map<string, {
    newAds: number
    soldAds: number
    prices: number[]
    daysOnMarket: number[]
  }>()

  // Initialize last 6 months
  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthlyStatsMap.set(monthKey, {
      newAds: 0,
      soldAds: 0,
      prices: [],
      daysOnMarket: []
    })
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
  // Start with ads published before our time range that are still active
  const { count: initialActiveCount } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .lt('publicerad', sixMonthsAgo.toISOString())
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
    .slice(0, 20)

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
          regionMonthlyStats={regionMonthlyStats}
          priceRanges={priceRanges}
          totals={{
            activeAds: totalActive || 0,
            soldAds: totalSold || 0,
            dealerAds: dealerCount || 0,
            privateAds: privateCount || 0,
          }}
          scraperStartDate={scraperStartDate}
        />
      </div>
    </div>
  )
}
