import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { BlocketLogsView } from '@/components/blocket-logs/blocket-logs-view'

// Force dynamic rendering - always fetch fresh data
export const dynamic = 'force-dynamic'

export default async function BlocketLogsPage() {
  const supabase = await createClient()

  // Fetch scraper logs
  const { data: logs, error } = await supabase
    .from('blocket_scraper_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching blocket logs:', error)
  }

  // Fetch database stats using count queries (not limited to 1000 rows)
  const { count: totalAdsInDb } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })

  const { count: dealerAds } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .eq('saljare_typ', 'handlare')

  const { count: privateAds } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .eq('saljare_typ', 'privat')

  // Fetch active vs sold stats
  const { count: activeAds } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .is('borttagen', null)

  const { count: soldAds } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .not('borttagen', 'is', null)

  // Fetch recent NEW cars (last 24 hours)
  const yesterday = new Date()
  yesterday.setHours(yesterday.getHours() - 24)

  const { data: recentNewCars } = await supabase
    .from('blocket_annonser')
    .select('id, marke, modell, arsmodell, pris, miltal, region, stad, saljare_typ, forst_sedd, url, bild_url, kaross, farg, vaxellada, momsbil')
    .gte('forst_sedd', yesterday.toISOString())
    .order('forst_sedd', { ascending: false })
    .limit(20)

  // Fetch recent SOLD cars (last 24 hours)
  const { data: recentSoldCars } = await supabase
    .from('blocket_annonser')
    .select('id, marke, modell, arsmodell, pris, miltal, region, stad, saljare_typ, borttagen, borttagen_anledning, url, forst_sedd')
    .gte('borttagen', yesterday.toISOString())
    .not('borttagen', 'is', null)
    .order('borttagen', { ascending: false })
    .limit(20)

  // Calculate stats
  const totalRuns = logs?.length || 0
  const successfulRuns = logs?.filter(l => l.status === 'completed').length || 0
  const failedRuns = logs?.filter(l => l.status === 'failed').length || 0
  const totalNewAds = logs?.reduce((sum, l) => sum + (l.nya_annonser || 0), 0) || 0
  const totalAdsScanned = logs?.reduce((sum, l) => sum + (l.annonser_hittade || 0), 0) || 0

  // Count new ads today (from database, not just logs)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count: newAdsToday } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .gte('forst_sedd', today.toISOString())

  // Count sold ads today
  const { count: soldAdsToday } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .gte('borttagen', today.toISOString())

  // Get per-region breakdown using RPC to avoid 1000 row limit
  const { data: regionStatsRaw } = await supabase.rpc('get_region_counts')

  // Fallback: count each region separately if RPC doesn't exist
  let regionBreakdown: Record<string, number> = {}

  if (regionStatsRaw && Array.isArray(regionStatsRaw)) {
    regionBreakdown = regionStatsRaw.reduce((acc: Record<string, number>, row: { region: string; count: number }) => {
      acc[row.region || 'okänd'] = row.count
      return acc
    }, {})
  } else {
    // Fallback: separate count queries per region
    const regions = ['norrbotten', 'vasterbotten', 'jamtland', 'vasternorrland']
    for (const region of regions) {
      const { count } = await supabase
        .from('blocket_annonser')
        .select('*', { count: 'exact', head: true })
        .eq('region', region)
        .is('borttagen', null)
      regionBreakdown[region] = count || 0
    }
  }

  // ===== BILUPPGIFTER STATS =====
  // Totalt antal aktiva annonser med regnummer (kan hämtas)
  const { count: totalWithRegnummer } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .is('borttagen', null)
    .not('regnummer', 'is', null)

  // Antal som redan har biluppgifter-data
  const { count: totalFetched } = await supabase
    .from('biluppgifter_data')
    .select('*', { count: 'exact', head: true })

  // Senast hämtade (med alla detaljer)
  const { data: recentBiluppgifter } = await supabase
    .from('biluppgifter_data')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(20)

  // Hämtade idag
  const { count: fetchedToday } = await supabase
    .from('biluppgifter_data')
    .select('*', { count: 'exact', head: true })
    .gte('fetched_at', today.toISOString())

  // Uppdaterade (fetched_at != created_at)
  const { count: updatedCount } = await supabase
    .from('biluppgifter_data')
    .select('*', { count: 'exact', head: true })
    .not('updated_at', 'eq', supabase.rpc('created_at'))

  const biluppgifterStats = {
    totalWithRegnummer: totalWithRegnummer || 0,
    totalFetched: totalFetched || 0,
    remaining: (totalWithRegnummer || 0) - (totalFetched || 0),
    fetchedToday: fetchedToday || 0,
    recentFetches: recentBiluppgifter || [],
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Blocket Scraper"
        description="Övervakning av Blocket-scrapern - Full scrape 06:00 & 18:00, Light scrape var 15:e min (07-22)"
      />

      <div className="flex-1 p-6">
        <BlocketLogsView
          logs={logs || []}
          stats={{
            totalRuns,
            successfulRuns,
            failedRuns,
            totalNewAds,
            totalAdsScanned,
            totalAdsInDb: totalAdsInDb || 0,
            dealerAds: dealerAds || 0,
            privateAds: privateAds || 0,
            activeAds: activeAds || 0,
            soldAds: soldAds || 0,
            newAdsToday: newAdsToday || 0,
            soldAdsToday: soldAdsToday || 0,
          }}
          recentNewCars={recentNewCars || []}
          recentSoldCars={recentSoldCars || []}
          regionBreakdown={regionBreakdown}
          biluppgifterStats={biluppgifterStats}
        />
      </div>
    </div>
  )
}
