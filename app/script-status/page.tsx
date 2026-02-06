import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ScriptStatusView } from '@/components/script-status/script-status-view'

export const dynamic = 'force-dynamic'

// Define known scripts
const SCRIPTS = [
  {
    id: 'blocket-scraper',
    name: 'Blocket Scraper',
    description: 'Hämtar annonser från Blocket varje timme',
    schedule: 'Full 06:00 & 18:00, Light var 15 min (07-22)',
    logTable: 'blocket_scraper_log',
    type: 'cron',
  },
  {
    id: 'biluppgifter-continuous',
    name: 'Biluppgifter Continuous',
    description: 'Hämtar ägardata för handlare och privat från biluppgifter.se',
    schedule: 'Kontinuerlig (background)',
    logTable: 'biluppgifter_log',
    type: 'background',
  },
  {
    id: 'bilprospekt-sync',
    name: 'Bilprospekt Sync',
    description: 'Synkar prospektdata från Bilprospekt API',
    schedule: 'Veckovis (manuell)',
    logTable: 'bilprospekt_sync_log',
    type: 'manual',
  },
  {
    id: 'sold-cars-checker',
    name: 'Sold Cars Checker',
    description: 'Kontrollerar ägarbyte för sålda bilar',
    schedule: 'Var 14:e dag',
    logTable: 'biluppgifter_log',
    type: 'cron',
  },
]

export default async function ScriptStatusPage() {
  const supabase = await createClient()
  const now = new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // --- Blocket Scraper Logs ---
  const { data: blocketLogs } = await supabase
    .from('blocket_scraper_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20)

  // --- Biluppgifter Logs ---
  const { data: biluppgifterLogs } = await supabase
    .from('biluppgifter_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  // --- Bilprospekt Sync Logs ---
  const { data: bilprospektLogs } = await supabase
    .from('bilprospekt_sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20)

  // --- Stats ---
  // Blocket scraper stats
  const lastBlocketRun = blocketLogs?.[0]
  const blocketRunsToday = blocketLogs?.filter(l =>
    new Date(l.started_at) >= today
  ).length || 0
  const blocketErrors = blocketLogs?.filter(l => l.status === 'failed').length || 0

  // Biluppgifter stats
  const lastBiluppgifterInfo = biluppgifterLogs?.find(l => l.type === 'info')
  const lastBiluppgifterError = biluppgifterLogs?.find(l => l.type === 'error')
  const biluppgifterErrorsToday = biluppgifterLogs?.filter(l =>
    l.type === 'error' && new Date(l.created_at) >= today
  ).length || 0

  // Bilprospekt stats
  const lastBilprospektSync = bilprospektLogs?.[0]
  const runningBilprospektSync = bilprospektLogs?.find(l => l.status === 'running')

  // Biluppgifter data stats
  const { count: totalBiluppgifter } = await supabase
    .from('biluppgifter_data')
    .select('*', { count: 'exact', head: true })

  const { count: fetchedToday } = await supabase
    .from('biluppgifter_data')
    .select('*', { count: 'exact', head: true })
    .gte('fetched_at', today.toISOString())

  // Active blocket ads without biluppgifter
  const { count: activeAdsWithRegnr } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .is('borttagen', null)
    .not('regnummer', 'is', null)

  // Blocket annonser stats
  const { count: totalBlocketAds } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })

  const { count: newAdsToday } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .gte('forst_sedd', today.toISOString())

  const { count: soldAdsToday } = await supabase
    .from('blocket_annonser')
    .select('*', { count: 'exact', head: true })
    .gte('borttagen', today.toISOString())

  // Bilprospekt stats
  const { count: totalBilprospekt } = await supabase
    .from('bilprospekt_prospects')
    .select('*', { count: 'exact', head: true })

  // Build script status objects
  const scriptStatuses = [
    {
      ...SCRIPTS[0],
      status: lastBlocketRun?.status === 'running' ? 'running' :
              lastBlocketRun?.status === 'completed' ? 'ok' :
              lastBlocketRun?.status === 'failed' ? 'error' : 'unknown',
      lastRun: lastBlocketRun?.started_at,
      lastRunDuration: lastBlocketRun?.duration_seconds,
      runsToday: blocketRunsToday,
      errorsToday: blocketErrors,
      stats: {
        totalAds: totalBlocketAds || 0,
        newToday: newAdsToday || 0,
        soldToday: soldAdsToday || 0,
      },
      logs: blocketLogs?.slice(0, 10) || [],
    },
    {
      ...SCRIPTS[1],
      status: lastBiluppgifterError && (!lastBiluppgifterInfo ||
        new Date(lastBiluppgifterError.created_at) > new Date(lastBiluppgifterInfo.created_at))
        ? 'error' : lastBiluppgifterInfo ? 'ok' : 'unknown',
      lastRun: lastBiluppgifterInfo?.created_at,
      errorsToday: biluppgifterErrorsToday,
      stats: {
        totalFetched: totalBiluppgifter || 0,
        fetchedToday: fetchedToday || 0,
        remaining: (activeAdsWithRegnr || 0) - (totalBiluppgifter || 0),
      },
      logs: biluppgifterLogs?.slice(0, 10) || [],
    },
    {
      ...SCRIPTS[2],
      status: runningBilprospektSync ? 'running' :
              lastBilprospektSync?.status === 'success' ? 'ok' :
              lastBilprospektSync?.status === 'failed' ? 'error' : 'unknown',
      lastRun: lastBilprospektSync?.started_at,
      lastRunDuration: lastBilprospektSync?.finished_at && lastBilprospektSync?.started_at
        ? Math.round((new Date(lastBilprospektSync.finished_at).getTime() - new Date(lastBilprospektSync.started_at).getTime()) / 1000)
        : null,
      stats: {
        totalProspects: totalBilprospekt || 0,
        lastRecordsFetched: lastBilprospektSync?.records_fetched || 0,
        lastDataDate: lastBilprospektSync?.bilprospekt_date || null,
      },
      logs: bilprospektLogs?.slice(0, 10) || [],
    },
    {
      ...SCRIPTS[3],
      status: 'unknown',
      lastRun: null,
      stats: {},
      logs: [],
    },
  ]

  // Summary stats
  const summary = {
    totalScripts: SCRIPTS.length,
    running: scriptStatuses.filter(s => s.status === 'running').length,
    ok: scriptStatuses.filter(s => s.status === 'ok').length,
    errors: scriptStatuses.filter(s => s.status === 'error').length,
    unknown: scriptStatuses.filter(s => s.status === 'unknown').length,
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Script Status"
        description="Övervakning av alla bakgrundsscript och cron-jobb"
      />
      <div className="flex-1 p-6">
        <ScriptStatusView
          scripts={scriptStatuses}
          summary={summary}
          blocketLogs={blocketLogs || []}
          biluppgifterLogs={biluppgifterLogs || []}
          bilprospektLogs={bilprospektLogs || []}
        />
      </div>
    </div>
  )
}
