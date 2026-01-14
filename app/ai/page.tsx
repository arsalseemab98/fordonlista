import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Target,
  Lightbulb
} from 'lucide-react'

async function getAIStats() {
  const supabase = await createClient()

  // Get various stats for AI insights
  const [
    { count: totalLeads },
    { count: interestedLeads },
    { count: notInterestedLeads },
    { count: highMileageVehicles },
    { count: deregisteredVehicles },
    { data: preferences },
    { data: topMakes }
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'interested'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'not_interested'),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }).gt('mileage', 200000),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('in_traffic', false),
    supabase.from('preferences').select('*').limit(1).single(),
    supabase.from('vehicles').select('make').not('make', 'is', null)
  ])

  // Calculate make distribution
  const makeCount: Record<string, number> = {}
  topMakes?.forEach((v: { make: string }) => {
    if (v.make) {
      makeCount[v.make] = (makeCount[v.make] || 0) + 1
    }
  })

  const sortedMakes = Object.entries(makeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Calculate conversion rate
  const contacted = (interestedLeads || 0) + (notInterestedLeads || 0)
  const conversionRate = contacted > 0
    ? Math.round((interestedLeads || 0) / contacted * 100)
    : 0

  return {
    totalLeads: totalLeads || 0,
    interestedLeads: interestedLeads || 0,
    notInterestedLeads: notInterestedLeads || 0,
    highMileageVehicles: highMileageVehicles || 0,
    deregisteredVehicles: deregisteredVehicles || 0,
    conversionRate,
    preferences,
    topMakes: sortedMakes
  }
}

export default async function AIPage() {
  const stats = await getAIStats()

  const insights = [
    {
      type: 'success',
      icon: CheckCircle2,
      title: 'Konverteringsgrad',
      description: `${stats.conversionRate}% av kontaktade leads är intresserade`,
      color: 'text-green-600'
    },
    stats.highMileageVehicles > 0 && {
      type: 'warning',
      icon: AlertTriangle,
      title: 'Högt miltal',
      description: `${stats.highMileageVehicles} fordon har över 200 000 km`,
      color: 'text-orange-600'
    },
    stats.deregisteredVehicles > 0 && {
      type: 'info',
      icon: Target,
      title: 'Avställda fordon',
      description: `${stats.deregisteredVehicles} fordon är avställda - potentiella säljare`,
      color: 'text-blue-600'
    }
  ].filter(Boolean)

  return (
    <div className="flex flex-col">
      <Header
        title="AI Insikter"
        description="Analys och mönster från dina leads"
      />

      <div className="flex-1 p-6 space-y-6 max-w-5xl">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-green-700">{stats.conversionRate}%</p>
                  <p className="text-sm text-gray-500">Konverteringsgrad</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-blue-700">{stats.interestedLeads}</p>
                  <p className="text-sm text-gray-500">Intresserade leads</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-purple-700">{stats.totalLeads}</p>
                  <p className="text-sm text-gray-500">Totala leads</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Insikter
            </CardTitle>
            <CardDescription>
              AI-genererade observationer baserat på din data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insights.length > 0 ? (
              <div className="space-y-4">
                {insights.map((insight, index) => {
                  if (!insight) return null
                  const Icon = insight.icon
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-lg bg-gray-50"
                    >
                      <Icon className={`h-6 w-6 ${insight.color} mt-0.5`} />
                      <div>
                        <p className="font-medium">{insight.title}</p>
                        <p className="text-sm text-gray-600">{insight.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Importera leads för att få AI-insikter
              </p>
            )}
          </CardContent>
        </Card>

        {/* Make Distribution */}
        {stats.topMakes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-gray-500" />
                Märkesfördelning
              </CardTitle>
              <CardDescription>
                De vanligaste bilmärkena i dina leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topMakes.map(([make, count]) => {
                  const maxCount = stats.topMakes[0][1]
                  const percentage = Math.round((count / maxCount) * 100)
                  const isPreferred = stats.preferences?.preferred_makes?.includes(make)
                  const isExcluded = stats.preferences?.excluded_makes?.includes(make)

                  return (
                    <div key={make} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{make}</span>
                          {isPreferred && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              Föredragen
                            </Badge>
                          )}
                          {isExcluded && (
                            <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                              Exkluderad
                            </Badge>
                          )}
                        </div>
                        <span className="text-gray-500">{count} st</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isPreferred
                              ? 'bg-green-500'
                              : isExcluded
                              ? 'bg-red-300'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Recommendations */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Brain className="h-5 w-5" />
              AI-rekommendationer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800">
            {stats.totalLeads === 0 ? (
              <p>Importera leads för att få personliga rekommendationer från AI.</p>
            ) : (
              <div className="space-y-4">
                <p>
                  Baserat på din data rekommenderar vi:
                </p>
                <ul className="space-y-2">
                  {stats.deregisteredVehicles > 0 && (
                    <li className="flex items-start gap-2">
                      <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                      <span>
                        Fokusera på de {stats.deregisteredVehicles} avställda fordonen - dessa ägare är mer benägna att sälja
                      </span>
                    </li>
                  )}
                  {stats.preferences?.preferred_makes?.length > 0 && (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                      <span>
                        Prioritera {stats.preferences.preferred_makes.slice(0, 3).join(', ')} baserat på dina preferenser
                      </span>
                    </li>
                  )}
                  {stats.conversionRate > 0 && (
                    <li className="flex items-start gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                      <span>
                        Din konverteringsgrad på {stats.conversionRate}% är {stats.conversionRate >= 20 ? 'bra' : 'normal'} - fortsätt samma strategi
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
