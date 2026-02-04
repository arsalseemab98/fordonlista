'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Store,
  RefreshCw,
  User,
  Building2,
  Phone,
  MapPin,
  Car,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface Stats {
  totalDealerAds: number
  totalBiluppgifter: number
  remaining: number
  totalHandlare: number
  totalFormedling: number
  totalPrivat: number
  totalForetag: number
  fetchedToday: number
  knownDealers: number
}

interface HandlareBiluppgifterViewProps {
  stats: Stats
  recentFetches: any[]
  blocketMap: Record<string, any>
  cronLogs: any[]
  topDealers: any[]
}

function OwnerTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string }> = {
    handlare: { label: 'Handlare', className: 'bg-orange-100 text-orange-800' },
    formedling: { label: 'Formedling', className: 'bg-purple-100 text-purple-800' },
    privat: { label: 'Privat', className: 'bg-green-100 text-green-800' },
    foretag: { label: 'Foretag', className: 'bg-blue-100 text-blue-800' },
  }
  const c = config[type] || { label: type || '?', className: 'bg-gray-100 text-gray-800' }
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>
}

function VehicleTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    'Personbil': 'bg-gray-100 text-gray-700',
    'MC': 'bg-red-100 text-red-700',
    'Snoskoter': 'bg-cyan-100 text-cyan-700',
    'ATV': 'bg-amber-100 text-amber-700',
    'Pickup': 'bg-yellow-100 text-yellow-700',
    'Transportbil': 'bg-indigo-100 text-indigo-700',
    'Maskin': 'bg-stone-100 text-stone-700',
  }
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-600'}`}>
      {type}
    </span>
  )
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  return Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('sv-SE')
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('sv-SE', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function ExpandableRow({ fetch: f, blocket }: { fetch: any; blocket: any }) {
  const [expanded, setExpanded] = useState(false)
  const prevOwner = f.previous_owner
  const vehicles = f.owner_vehicles || []
  const addressVehicles = f.address_vehicles || []
  const days = daysSince(f.dealer_since)

  return (
    <>
      <tr
        className="border-b hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-3 py-2 text-sm font-mono font-medium">{f.regnummer}</td>
        <td className="px-3 py-2 text-sm">
          {blocket ? `${blocket.marke} ${blocket.modell} ${blocket.arsmodell}` : '-'}
        </td>
        <td className="px-3 py-2 text-sm">{blocket?.pris?.toLocaleString() || '-'} kr</td>
        <td className="px-3 py-2 text-sm">{blocket?.saljare_namn || '-'}</td>
        <td className="px-3 py-2 text-sm">{f.owner_name || '-'}</td>
        <td className="px-3 py-2"><OwnerTypeBadge type={f.owner_type} /></td>
        <td className="px-3 py-2 text-sm">
          {f.dealer_since ? `${formatDate(f.dealer_since)} (${days}d)` : '-'}
        </td>
        <td className="px-3 py-2 text-sm">
          {prevOwner ? (
            <span className="text-green-700 font-medium">{prevOwner.name}</span>
          ) : f.owner_type === 'formedling' ? (
            <span className="text-purple-700 font-medium">{f.owner_name}</span>
          ) : '-'}
        </td>
        <td className="px-3 py-2 text-sm text-gray-500">{formatTime(f.fetched_at)}</td>
        <td className="px-3 py-2">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50 border-b">
          <td colSpan={10} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Handlare/Agare info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {f.owner_type === 'handlare' ? 'Handlare' : 'Agare'}
                </h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Namn:</span> {f.owner_name}</p>
                  {f.owner_age && <p><span className="text-gray-500">Alder:</span> {f.owner_age} ar</p>}
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    {f.owner_address}, {f.owner_postal_code} {f.owner_postal_city}
                  </p>
                  {f.owner_phone && (
                    <p className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-gray-400" />
                      {f.owner_phone}
                    </p>
                  )}
                  {f.dealer_since && (
                    <p><span className="text-gray-500">Agare sedan:</span> {formatDate(f.dealer_since)} ({days} dagar)</p>
                  )}
                  {f.is_dealer && <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">10+ fordon</Badge>}
                </div>
              </div>

              {/* Lead / Previous owner */}
              {(prevOwner || f.owner_type === 'formedling') && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {f.owner_type === 'formedling' ? 'Lead (agare = formedlas)' : 'Lead (forra agare)'}
                  </h4>
                  <div className="text-sm space-y-1">
                    {prevOwner ? (
                      <>
                        <p><span className="text-gray-500">Namn:</span> <span className="font-medium">{prevOwner.name}</span></p>
                        {prevOwner.age && <p><span className="text-gray-500">Alder:</span> {prevOwner.age} ar</p>}
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          {prevOwner.address}, {prevOwner.postal_code} {prevOwner.postal_city}
                        </p>
                        {prevOwner.phone && (
                          <p className="flex items-center gap-1 text-green-700 font-medium">
                            <Phone className="h-3 w-3" />
                            {prevOwner.phone}
                          </p>
                        )}
                        {prevOwner.purchase_date && (
                          <p><span className="text-gray-500">Agde bilen:</span> {formatDate(prevOwner.purchase_date)} &rarr; {formatDate(f.dealer_since)}</p>
                        )}
                        <Badge variant="outline" className="text-xs">{prevOwner.lead_type || 'privat'}</Badge>
                      </>
                    ) : (
                      <>
                        <p><span className="text-gray-500">Namn:</span> <span className="font-medium">{f.owner_name}</span></p>
                        {f.owner_age && <p><span className="text-gray-500">Alder:</span> {f.owner_age} ar</p>}
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          {f.owner_address}, {f.owner_postal_code} {f.owner_postal_city}
                        </p>
                        {f.owner_phone && (
                          <p className="flex items-center gap-1 text-green-700 font-medium">
                            <Phone className="h-3 w-3" />
                            {f.owner_phone}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Fordon */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Car className="h-4 w-4" />
                  {prevOwner ? `Leadets fordon (${prevOwner.vehicles?.length || 0})` :
                   vehicles.length > 0 ? `Agarens fordon (${vehicles.length})` : 'Inga fordon'}
                </h4>
                <div className="text-sm space-y-1 max-h-48 overflow-y-auto">
                  {(prevOwner?.vehicles || vehicles).slice(0, 10).map((v: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-gray-600">{v.regnr || '?'}</span>
                      <span className="flex-1 truncate">{v.model || '?'} {v.year || ''}</span>
                      <VehicleTypeBadge type={v.vehicle_type || 'Personbil'} />
                      {v.ownership_time && <span className="text-gray-400">{v.ownership_time}</span>}
                    </div>
                  ))}
                  {(prevOwner?.vehicles || vehicles).length > 10 && (
                    <p className="text-gray-400 text-xs">+{(prevOwner?.vehicles || vehicles).length - 10} till...</p>
                  )}
                </div>

                {addressVehicles.length > 0 && !prevOwner && (
                  <>
                    <h5 className="text-xs font-semibold text-gray-500 mt-2">Adressfordon ({addressVehicles.length})</h5>
                    {addressVehicles.slice(0, 5).map((v: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-gray-600">{v.regnr || '?'}</span>
                        <span className="flex-1 truncate">{v.model || '?'}</span>
                        <VehicleTypeBadge type={v.vehicle_type || '?'} />
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Agarkedja */}
              {f.owner_history?.length > 1 && (
                <div className="space-y-2 lg:col-span-3">
                  <h4 className="text-sm font-semibold flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Agarkedja ({f.owner_history.length} agare)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {f.owner_history.slice(0, 6).map((oh: any, i: number) => (
                      <div key={i} className={`text-xs px-2 py-1 rounded border ${i === 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
                        <span className="text-gray-400">[{i}]</span>{' '}
                        <span className="font-medium">{oh.name || '?'}</span>{' '}
                        <span className="text-gray-400">({oh.owner_class}) {oh.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blocket info */}
              {blocket && (
                <div className="space-y-1 text-sm">
                  <h4 className="text-sm font-semibold">Blocket-annons</h4>
                  <p><span className="text-gray-500">Saljare:</span> {blocket.saljare_namn} ({blocket.saljare_typ})</p>
                  <p><span className="text-gray-500">Publicerad:</span> {formatDate(blocket.publicerad)}</p>
                  <p><span className="text-gray-500">Plats:</span> {blocket.stad || blocket.region}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function HandlareBiluppgifterView({ stats, recentFetches, blocketMap, cronLogs, topDealers }: HandlareBiluppgifterViewProps) {
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-gray-500">Handlar-annonser</p>
            <p className="text-2xl font-bold">{stats.totalDealerAds.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-gray-500">Hamtade</p>
            <p className="text-2xl font-bold text-green-600">{stats.totalBiluppgifter.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-gray-500">Aterstar</p>
            <p className="text-2xl font-bold text-amber-600">{stats.remaining.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-gray-500">Idag</p>
            <p className="text-2xl font-bold text-blue-600">{stats.fetchedToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-gray-500">Kanda handlare</p>
            <p className="text-2xl font-bold">{stats.knownDealers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-gray-500">Framsteg</p>
            <p className="text-2xl font-bold">{stats.totalDealerAds > 0 ? Math.round((stats.totalBiluppgifter / stats.totalDealerAds) * 100) : 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Owner type breakdown */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-3 pb-2 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-600">Handlare</p>
              <p className="text-xl font-bold text-orange-800">{stats.totalHandlare}</p>
            </div>
            <Store className="h-5 w-5 text-orange-400" />
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-3 pb-2 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600">Formedling</p>
              <p className="text-xl font-bold text-purple-800">{stats.totalFormedling}</p>
            </div>
            <RefreshCw className="h-5 w-5 text-purple-400" />
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-3 pb-2 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600">Privat</p>
              <p className="text-xl font-bold text-green-800">{stats.totalPrivat}</p>
            </div>
            <User className="h-5 w-5 text-green-400" />
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-3 pb-2 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600">Foretag</p>
              <p className="text-xl font-bold text-blue-800">{stats.totalForetag}</p>
            </div>
            <Building2 className="h-5 w-5 text-blue-400" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recent">
        <TabsList>
          <TabsTrigger value="recent">Senast hamtade ({recentFetches.length})</TabsTrigger>
          <TabsTrigger value="dealers">Kanda handlare ({topDealers.length})</TabsTrigger>
          <TabsTrigger value="logs">Cron-loggar ({cronLogs.length})</TabsTrigger>
        </TabsList>

        {/* Recent fetches */}
        <TabsContent value="recent">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Regnr</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Bil</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Pris</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Blocket-saljare</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Biluppg-agare</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Typ</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Handlare sedan</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Lead</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Hamtad</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentFetches.map((f) => (
                      <ExpandableRow
                        key={f.id}
                        fetch={f}
                        blocket={blocketMap[f.regnummer?.toUpperCase()] || null}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Known dealers */}
        <TabsContent value="dealers">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Blocket-namn</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Biluppgifter-namn</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Annonser</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Ort</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Telefon</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Fordon</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Uppdaterad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDealers.map((d, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm font-medium">{d.name}</td>
                        <td className="px-3 py-2 text-sm">{d.biluppgifter_name || <span className="text-gray-300">-</span>}</td>
                        <td className="px-3 py-2 text-sm font-mono">{d.ad_count}</td>
                        <td className="px-3 py-2 text-sm">{d.postal_city || '-'}</td>
                        <td className="px-3 py-2 text-sm">{d.phone || '-'}</td>
                        <td className="px-3 py-2 text-sm font-mono">{d.vehicle_count ?? '-'}</td>
                        <td className="px-3 py-2 text-xs text-gray-400">{d.updated_at ? formatDate(d.updated_at) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cron logs */}
        <TabsContent value="logs">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Tid</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Typ</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Meddelande</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Detaljer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cronLogs.map((log, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{formatTime(log.created_at)}</td>
                        <td className="px-3 py-2">
                          <Badge
                            variant="outline"
                            className={log.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                          >
                            {log.type}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-sm">{log.message}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate">
                          {log.details ? JSON.stringify(log.details).substring(0, 100) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
