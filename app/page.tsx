import { Header } from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Car,
  Phone,
  TrendingUp,
  Clock,
  CheckCircle2,
  Upload
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

// Revalidate every 60 seconds for dashboard stats
export const revalidate = 60

async function getStats() {
  const supabase = await createClient()

  const [
    { count: totalLeads },
    { count: newLeads },
    { count: interestedLeads },
    { count: totalVehicles },
    { count: deregisteredVehicles },
    { count: callsToday }
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'interested'),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('in_traffic', false),
    supabase.from('call_logs').select('*', { count: 'exact', head: true }).gte('called_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  ])

  return {
    totalLeads: totalLeads || 0,
    newLeads: newLeads || 0,
    interestedLeads: interestedLeads || 0,
    totalVehicles: totalVehicles || 0,
    deregisteredVehicles: deregisteredVehicles || 0,
    callsToday: callsToday || 0
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  const statCards = [
    {
      title: 'Totala Leads',
      value: stats.totalLeads,
      description: 'Alla kontakter i systemet',
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
      href: '/leads'
    },
    {
      title: 'Nya att ringa',
      value: stats.newLeads,
      description: 'Väntar på första samtal',
      icon: Phone,
      color: 'bg-green-100 text-green-600',
      href: '/to-call'
    },
    {
      title: 'Intresserade',
      value: stats.interestedLeads,
      description: 'Vill eventuellt sälja',
      icon: CheckCircle2,
      color: 'bg-emerald-100 text-emerald-600',
      href: '/leads?status=interested'
    },
    {
      title: 'Fordon',
      value: stats.totalVehicles,
      description: `${stats.deregisteredVehicles} avställda`,
      icon: Car,
      color: 'bg-purple-100 text-purple-600',
      href: '/vehicles'
    },
  ]

  return (
    <div className="flex flex-col">
      <Header
        title="Dashboard"
        description="Översikt av leads och fordon"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex gap-4">
          <Link href="/import">
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Importera Excel
            </Button>
          </Link>
          <Link href="/to-call">
            <Button variant="outline" className="gap-2">
              <Phone className="h-4 w-4" />
              Börja ringa
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${stat.color}`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Today's Priority */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                AI-Prioriterade Leads
              </CardTitle>
              <CardDescription>
                Rekommenderade att ringa idag baserat på dina preferenser
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.totalLeads === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Car className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">Inga leads ännu</p>
                  <p className="text-sm mt-1">Importera en Excel-fil för att komma igång</p>
                  <Link href="/import">
                    <Button className="mt-4" variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Importera nu
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    AI-prioritering aktiveras när du har leads i systemet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-600" />
                Senaste Aktivitet
              </CardTitle>
              <CardDescription>
                Dina senaste samtal och importer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.callsToday === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">Ingen aktivitet idag</p>
                  <p className="text-sm mt-1">Börja ringa för att se aktivitet här</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    {stats.callsToday} samtal idag
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Guide */}
        {stats.totalLeads === 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Kom igång med Fordonlista</CardTitle>
              <CardDescription className="text-blue-700">
                Följ dessa steg för att börja använda systemet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-medium">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Importera Excel</p>
                    <p className="text-sm text-blue-700">Ladda upp din fordonslista från portalen</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-medium">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Konfigurera inställningar</p>
                    <p className="text-sm text-blue-700">Ställ in dina preferenser för märken och miltal</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-medium">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Börja ringa</p>
                    <p className="text-sm text-blue-700">AI hjälper dig prioritera vem du ska ringa</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
