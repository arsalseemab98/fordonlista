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

  // Get per-region breakdown
  const { data: regionStats } = await supabase
    .from('blocket_annonser')
    .select('region')
    .is('borttagen', null)

  const regionBreakdown = regionStats?.reduce((acc, { region }) => {
    const key = region || 'okänd'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

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
        />
      </div>
    </div>
  )
}
