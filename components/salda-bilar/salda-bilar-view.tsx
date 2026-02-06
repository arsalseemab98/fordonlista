'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  User,
  Phone,
  MapPin,
  Car,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Search,
  PhoneOff,
  Store,
  Building2,
  Clock,
  CheckCircle,
  TrendingDown,
  Hourglass,
} from 'lucide-react'

interface Stats {
  totalConfirmed: number
  totalPending: number
  totalAwaiting: number
  privatSaljare: number
  handlareSaljare: number
  privatKopare: number
  foretagKopare: number
  handlareKopare: number
  withPhone: number
}

interface SaldaBilarViewProps {
  stats: Stats
  data: any[]
  currentFilters: {
    search?: string
    saljare?: string
    kopare?: string
    view?: string
    page?: string
  }
  totalCount: number
  totalPages: number
  currentPage: number
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('sv-SE')
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function LiggtidBadge({ days }: { days: number | null }) {
  if (days === null || days === undefined) return <span className="text-gray-400">-</span>
  let color = 'bg-green-100 text-green-800' // < 30 days
  if (days >= 180) color = 'bg-red-100 text-red-800'
  else if (days >= 90) color = 'bg-orange-100 text-orange-800'
  else if (days >= 30) color = 'bg-yellow-100 text-yellow-800'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {days}d
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'confirmed') {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Bekräftad
      </Badge>
    )
  }
  if (status === 'pending') {
    return (
      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
        <Hourglass className="h-3 w-3 mr-1" />
        Under verifiering
      </Badge>
    )
  }
  // awaiting
  return (
    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
      <Clock className="h-3 w-3 mr-1" />
      Väntar på bekräftelse
    </Badge>
  )
}

function SaljareTypBadge({ typ }: { typ: string | null }) {
  if (!typ) return <span className="text-gray-400">-</span>
  if (typ === 'handlare') {
    return (
      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
        <Store className="h-3 w-3 mr-1" />
        Handlare
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
      <User className="h-3 w-3 mr-1" />
      Privat
    </Badge>
  )
}

function KopareTypBadge({ typ, isDealer }: { typ: string | null; isDealer: boolean }) {
  if (isDealer) {
    return (
      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
        <Store className="h-3 w-3 mr-1" />
        Handlare
      </Badge>
    )
  }
  if (typ === 'företag') {
    return (
      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
        <Building2 className="h-3 w-3 mr-1" />
        Företag
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
      <User className="h-3 w-3 mr-1" />
      Privatperson
    </Badge>
  )
}

function AwaitingRow({ data }: { data: any }) {
  const [expanded, setExpanded] = useState(false)
  const days = daysSince(data.sold_at)
  const liggtid = data.forst_sedd && data.borttagen
    ? Math.floor((new Date(data.borttagen).getTime() - new Date(data.forst_sedd).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const ownerVehicles = data.bu_owner_vehicles || []
  const addressVehicles = data.bu_address_vehicles || []
  const hasBuData = !!data.bu_fetched_at

  return (
    <>
      <tr
        className="border-b hover:bg-yellow-50/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-3 py-2 text-sm font-mono font-medium">{data.regnummer}</td>
        <td className="px-3 py-2 text-sm">
          {data.marke} {data.modell} {data.arsmodell}
        </td>
        <td className="px-3 py-2 text-sm">{data.pris?.toLocaleString() || '-'} kr</td>
        <td className="px-3 py-2 text-sm">{formatDate(data.sold_at)}</td>
        <td className="px-3 py-2 text-sm">
          <LiggtidBadge days={liggtid} />
        </td>
        <td className="px-3 py-2 text-sm">
          <SaljareTypBadge typ={data.saljare_typ} />
        </td>
        <td className="px-3 py-2 text-sm">
          <StatusBadge status="awaiting" />
        </td>
        <td className="px-3 py-2 text-sm text-gray-500">
          {days !== null ? `${days}d sedan` : '-'}
        </td>
        <td className="px-3 py-2">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-yellow-50/30 border-b">
          <td colSpan={9} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Bil-detaljer */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Car className="h-4 w-4" />
                  Fordon
                </h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Regnr:</span> <span className="font-mono">{data.regnummer}</span></p>
                  <p><span className="text-gray-500">Märke/Modell:</span> {data.marke} {data.modell}</p>
                  <p><span className="text-gray-500">Årsmodell:</span> {data.arsmodell || '-'}</p>
                  <p><span className="text-gray-500">Miltal:</span> {data.miltal ? `${data.miltal.toLocaleString()} mil` : '-'}</p>
                  <p><span className="text-gray-500">Bränsle:</span> {data.bransle || '-'}</p>
                  <p><span className="text-gray-500">Växellåda:</span> {data.vaxellada || '-'}</p>
                  <p><span className="text-gray-500">Kaross:</span> {data.kaross || '-'}</p>
                  <p><span className="text-gray-500">Färg:</span> {data.farg || '-'}</p>
                  {data.effekt && <p><span className="text-gray-500">Effekt:</span> {data.effekt} hk</p>}
                </div>
              </div>

              {/* Säljare / Annons */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  Säljare & Annons
                </h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Typ:</span> {data.saljare_typ || '-'}</p>
                  {data.saljare_namn && <p><span className="text-gray-500">Namn:</span> {data.saljare_namn}</p>}
                  <p><span className="text-gray-500">Pris:</span> {data.pris?.toLocaleString() || '-'} kr</p>
                  <p><span className="text-gray-500">Region:</span> {data.region || '-'}</p>
                  {data.kommun && <p><span className="text-gray-500">Kommun:</span> {data.kommun}</p>}
                  {data.stad && <p><span className="text-gray-500">Stad:</span> {data.stad}</p>}
                  <p><span className="text-gray-500">Publicerad:</span> {formatDate(data.forst_sedd)}</p>
                  <p><span className="text-gray-500">Borttagen:</span> {formatDate(data.borttagen)}</p>
                  {liggtid !== null && <p><span className="text-gray-500">Liggtid:</span> {liggtid} dagar</p>}
                </div>
              </div>

              {/* Ägare (biluppgifter) */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Ägare (biluppgifter)
                </h4>
                {hasBuData ? (
                  <div className="text-sm space-y-1">
                    <p><span className="text-gray-500">Namn:</span> {data.bu_owner_name || '-'}</p>
                    {data.bu_owner_age && <p><span className="text-gray-500">Ålder:</span> {data.bu_owner_age} år</p>}
                    {data.bu_owner_city && <p><span className="text-gray-500">Ort:</span> {data.bu_owner_city}</p>}
                    {data.bu_num_owners && <p><span className="text-gray-500">Antal ägare:</span> {data.bu_num_owners}</p>}
                    {data.bu_annual_tax && <p><span className="text-gray-500">Årsskatt:</span> {data.bu_annual_tax.toLocaleString()} kr</p>}
                    {data.bu_inspection_until && <p><span className="text-gray-500">Besiktning:</span> {data.bu_inspection_until}</p>}
                    <p className="text-xs text-gray-400 mt-1">Hämtad: {formatDate(data.bu_fetched_at)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Biluppgifter ej hämtad ännu</p>
                )}
              </div>

              {/* Ägarens fordon */}
              {hasBuData && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Fordon ({ownerVehicles.length} äg / {addressVehicles.length} adr)
                  </h4>
                  <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                    {ownerVehicles.length > 0 && (
                      <>
                        <p className="text-xs text-gray-500 font-medium">Ägarens fordon:</p>
                        {ownerVehicles.slice(0, 5).map((v: any, i: number) => (
                          <div key={`o${i}`} className="flex items-center gap-2 text-xs">
                            <span className="font-mono text-gray-600">{v.regnr || '?'}</span>
                            <span className="flex-1 truncate">{v.model || v.description || '?'}</span>
                          </div>
                        ))}
                        {ownerVehicles.length > 5 && (
                          <p className="text-gray-400 text-xs">+{ownerVehicles.length - 5} till...</p>
                        )}
                      </>
                    )}
                    {addressVehicles.length > 0 && (
                      <>
                        <p className="text-xs text-gray-500 font-medium mt-1">Adressfordon:</p>
                        {addressVehicles.slice(0, 5).map((v: any, i: number) => (
                          <div key={`a${i}`} className="flex items-center gap-2 text-xs">
                            <span className="font-mono text-gray-600">{v.regnr || '?'}</span>
                            <span className="flex-1 truncate">{v.model || v.description || '?'}</span>
                          </div>
                        ))}
                        {addressVehicles.length > 5 && (
                          <p className="text-gray-400 text-xs">+{addressVehicles.length - 5} till...</p>
                        )}
                      </>
                    )}
                    {ownerVehicles.length === 0 && addressVehicles.length === 0 && (
                      <p className="text-gray-400 text-xs">Inga fordon</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function PendingRow({ data }: { data: any }) {
  return (
    <tr className="border-b hover:bg-blue-50/50">
      <td className="px-3 py-2 text-sm font-mono font-medium">{data.regnummer}</td>
      <td className="px-3 py-2 text-sm">
        {data.marke} {data.modell} {data.arsmodell}
      </td>
      <td className="px-3 py-2 text-sm">{data.pris?.toLocaleString() || '-'} kr</td>
      <td className="px-3 py-2 text-sm">{formatDate(data.sold_at)}</td>
      <td className="px-3 py-2 text-sm">-</td>
      <td className="px-3 py-2 text-sm text-gray-500">{data.original_owner || '-'}</td>
      <td className="px-3 py-2 text-sm">
        <StatusBadge status="pending" />
      </td>
      <td className="px-3 py-2 text-sm text-gray-400 text-xs">
        Kollad {data.check_count || 0}x
      </td>
      <td className="px-3 py-2"></td>
    </tr>
  )
}

function ConfirmedRow({ data }: { data: any }) {
  const [expanded, setExpanded] = useState(false)
  const kopareFordon = data.kopare_fordon || []
  const adressFordon = data.adress_fordon || []

  return (
    <>
      <tr
        className="border-b hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-3 py-2 text-sm font-mono font-medium">{data.regnummer}</td>
        <td className="px-3 py-2 text-sm">
          {data.marke} {data.modell} {data.arsmodell}
        </td>
        <td className="px-3 py-2 text-sm">{data.slutpris?.toLocaleString() || '-'} kr</td>
        <td className="px-3 py-2 text-sm">{formatDate(data.sold_at)}</td>
        <td className="px-3 py-2 text-sm">
          <LiggtidBadge days={data.liggtid_dagar} />
        </td>
        <td className="px-3 py-2 text-sm">
          <SaljareTypBadge typ={data.saljare_typ} />
        </td>
        <td className="px-3 py-2 text-sm font-medium">{data.kopare_namn || '-'}</td>
        <td className="px-3 py-2 text-sm">
          <KopareTypBadge typ={data.kopare_typ} isDealer={data.kopare_is_dealer} />
        </td>
        <td className="px-3 py-2">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50 border-b">
          <td colSpan={9} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Säljare info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  Säljare
                </h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Typ:</span> {data.saljare_typ}</p>
                  {data.saljare_namn && (
                    <p><span className="text-gray-500">Namn:</span> {data.saljare_namn}</p>
                  )}
                  <p><span className="text-gray-500">Slutpris:</span> {data.slutpris?.toLocaleString()} kr</p>
                  <p><span className="text-gray-500">Miltal:</span> {data.miltal?.toLocaleString() || '-'} mil</p>
                  <p><span className="text-gray-500">Liggtid:</span> {data.liggtid_dagar || '-'} dagar</p>
                </div>
              </div>

              {/* Köpare info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Köpare
                </h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Namn:</span> {data.kopare_namn}</p>
                  <p><span className="text-gray-500">Typ:</span> {data.kopare_is_dealer ? 'Handlare' : data.kopare_typ}</p>
                  {data.kopare_alder && <p><span className="text-gray-500">Ålder:</span> {data.kopare_alder} år</p>}
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    {data.kopare_adress}, {data.kopare_postnummer} {data.kopare_postort}
                  </p>
                  {data.kopare_telefon ? (
                    <p className="flex items-center gap-1 text-green-700 font-medium">
                      <Phone className="h-3 w-3" />
                      <a href={`tel:${data.kopare_telefon}`} className="hover:underline">
                        {data.kopare_telefon}
                      </a>
                    </p>
                  ) : (
                    <p className="flex items-center gap-1 text-gray-400">
                      <PhoneOff className="h-3 w-3" />
                      Ingen telefon
                    </p>
                  )}
                </div>
              </div>

              {/* Köparens fordon */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Car className="h-4 w-4" />
                  Köparens fordon ({kopareFordon.length})
                </h4>
                <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                  {kopareFordon.slice(0, 8).map((v: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-gray-600">{v.regnr || '?'}</span>
                      <span className="flex-1 truncate">{v.model || v.description || '?'}</span>
                    </div>
                  ))}
                  {kopareFordon.length > 8 && (
                    <p className="text-gray-400 text-xs">+{kopareFordon.length - 8} till...</p>
                  )}
                  {kopareFordon.length === 0 && <p className="text-gray-400 text-xs">Inga fordon</p>}
                </div>
              </div>

              {/* Adressfordon */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Adressfordon ({adressFordon.length})
                </h4>
                <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                  {adressFordon.slice(0, 8).map((v: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-gray-600">{v.regnr || '?'}</span>
                      <span className="flex-1 truncate">{v.model || v.description || '?'}</span>
                    </div>
                  ))}
                  {adressFordon.length > 8 && (
                    <p className="text-gray-400 text-xs">+{adressFordon.length - 8} till...</p>
                  )}
                  {adressFordon.length === 0 && <p className="text-gray-400 text-xs">Inga adressfordon</p>}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function SaldaBilarView({
  stats,
  data,
  currentFilters,
  totalCount,
  totalPages,
  currentPage,
}: SaldaBilarViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(currentFilters.search || '')

  const activeView = currentFilters.view || 'awaiting'

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (searchInput) {
      params.set('search', searchInput)
    } else {
      params.delete('search')
    }
    params.delete('page')
    startTransition(() => {
      router.push(`/salda-bilar?${params.toString()}`)
    })
  }

  const handleViewChange = (view: string) => {
    const params = new URLSearchParams()
    if (view !== 'awaiting') {
      params.set('view', view)
    }
    startTransition(() => {
      router.push(`/salda-bilar?${params.toString()}`)
    })
  }

  const handleSaljareFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set('saljare', value)
    } else {
      params.delete('saljare')
    }
    params.delete('page')
    startTransition(() => {
      router.push(`/salda-bilar?${params.toString()}`)
    })
  }

  const handleKopareFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set('kopare', value)
    } else {
      params.delete('kopare')
    }
    params.delete('page')
    startTransition(() => {
      router.push(`/salda-bilar?${params.toString()}`)
    })
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(page))
    }
    startTransition(() => {
      router.push(`/salda-bilar?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    setSearchInput('')
    startTransition(() => {
      router.push('/salda-bilar')
    })
  }

  // Dynamic table headers based on view
  const getTableHeaders = () => {
    if (activeView === 'confirmed') {
      return ['Regnr', 'Bil', 'Pris', 'Såld', 'Liggtid', 'Säljare', 'Köpare', 'Köpartyp', '']
    }
    if (activeView === 'pending') {
      return ['Regnr', 'Bil', 'Pris', 'Såld', 'Liggtid', 'Ägare', 'Status', 'Kontroller', '']
    }
    // awaiting
    return ['Regnr', 'Bil', 'Pris', 'Borttagen', 'Liggtid', 'Säljare', 'Status', 'Tid', '']
  }

  return (
    <div className="space-y-6">
      {/* Stats cards — 3 main view cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeView === 'awaiting' ? 'ring-2 ring-yellow-500 bg-yellow-50' : 'bg-yellow-50 border-yellow-200'
          }`}
          onClick={() => handleViewChange('awaiting')}
        >
          <CardContent className="pt-3 pb-2 px-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-600">Väntar på bekräftelse</p>
              <p className="text-2xl font-bold text-yellow-800">{stats.totalAwaiting.toLocaleString()}</p>
              <p className="text-xs text-yellow-600/70 mt-0.5">Borttagna från Blocket, markerade SÅLD</p>
            </div>
            <Clock className="h-5 w-5 text-yellow-400" />
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeView === 'pending' ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-blue-50 border-blue-200'
          }`}
          onClick={() => handleViewChange('pending')}
        >
          <CardContent className="pt-3 pb-2 px-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600">Under verifiering</p>
              <p className="text-2xl font-bold text-blue-800">{stats.totalPending.toLocaleString()}</p>
              <p className="text-xs text-blue-600/70 mt-0.5">Kollar ägarbyte via biluppgifter</p>
            </div>
            <Hourglass className="h-5 w-5 text-blue-400" />
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeView === 'confirmed' ? 'ring-2 ring-green-500 bg-green-50' : 'bg-green-50 border-green-200'
          }`}
          onClick={() => handleViewChange('confirmed')}
        >
          <CardContent className="pt-3 pb-2 px-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600">Bekräftade</p>
              <p className="text-2xl font-bold text-green-800">{stats.totalConfirmed.toLocaleString()}</p>
              <p className="text-xs text-green-600/70 mt-0.5">Ägarbyte bekräftat med köpardata</p>
            </div>
            <CheckCircle className="h-5 w-5 text-green-400" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed stats for confirmed view */}
      {activeView === 'confirmed' && stats.totalConfirmed > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-3 pb-2 px-3">
              <p className="text-xs text-blue-600">Privat sälj</p>
              <p className="text-xl font-bold text-blue-800">{stats.privatSaljare.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-3 pb-2 px-3">
              <p className="text-xs text-purple-600">Handlare sälj</p>
              <p className="text-xl font-bold text-purple-800">{stats.handlareSaljare.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="pt-3 pb-2 px-3">
              <p className="text-xs text-emerald-600">Privat köp</p>
              <p className="text-xl font-bold text-emerald-800">{stats.privatKopare.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-3 pb-2 px-3">
              <p className="text-xs text-amber-600">Företag köp</p>
              <p className="text-xl font-bold text-amber-800">{stats.foretagKopare.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-teal-50 border-teal-200">
            <CardContent className="pt-3 pb-2 px-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-teal-600">Med telefon</p>
                <p className="text-xl font-bold text-teal-800">{stats.withPhone.toLocaleString()}</p>
              </div>
              <Phone className="h-4 w-4 text-teal-400" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* View description banners */}
      {activeView === 'awaiting' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          <Clock className="h-4 w-4 inline mr-2" />
          <strong>Väntar på bekräftelse:</strong> Dessa annonser har tagits bort från Blocket med anledning &quot;SÅLD&quot;. Cronen kollar ägarbyte efter 7 dagar via biluppgifter.se och flyttar dem till &quot;Bekräftade&quot; när ägarbytet är bekräftat.
        </div>
      )}
      {activeView === 'pending' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <Hourglass className="h-4 w-4 inline mr-2" />
          <strong>Under verifiering:</strong> Dessa bilar har kollats mot biluppgifter.se men ägaren har inte bytt ännu. Kontrolleras var 14:e dag i upp till 90 dagar.
        </div>
      )}
      {activeView === 'confirmed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          <CheckCircle className="h-4 w-4 inline mr-2" />
          <strong>Bekräftade försäljningar:</strong> Ägarbyte bekräftat via biluppgifter.se. Köpardata (namn, adress, telefon, fordon) har hämtats.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2 flex-1 max-w-md">
          <Input
            placeholder="Sök regnr, namn, märke..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isPending}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {(activeView === 'confirmed' || activeView === 'awaiting') && (
          <Select
            value={currentFilters.saljare || 'all'}
            onValueChange={handleSaljareFilter}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Säljare" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla säljare</SelectItem>
              <SelectItem value="privat">Privat</SelectItem>
              <SelectItem value="handlare">Handlare</SelectItem>
            </SelectContent>
          </Select>
        )}

        {activeView === 'confirmed' && (
          <Select
            value={currentFilters.kopare || 'all'}
            onValueChange={handleKopareFilter}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Köpare" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla köpare</SelectItem>
              <SelectItem value="privatperson">Privatperson</SelectItem>
              <SelectItem value="företag">Företag</SelectItem>
              <SelectItem value="handlare">Handlare</SelectItem>
            </SelectContent>
          </Select>
        )}

        {(currentFilters.search || currentFilters.saljare || currentFilters.kopare) && (
          <Button variant="ghost" onClick={clearFilters}>
            Rensa filter
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {getTableHeaders().map((header, i) => (
                    <th key={i} className="px-3 py-2 text-xs font-medium text-gray-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item) => {
                  const status = item._status || 'confirmed'
                  if (status === 'awaiting') return <AwaitingRow key={item.id} data={item} />
                  if (status === 'pending') return <PendingRow key={item.id} data={item} />
                  return <ConfirmedRow key={item.id} data={item} />
                })}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-gray-400 text-sm">
                      {activeView === 'awaiting' && 'Inga bilar väntar på bekräftelse'}
                      {activeView === 'pending' && 'Inga bilar under verifiering'}
                      {activeView === 'confirmed' && 'Inga bekräftade försäljningar ännu'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                Sida {currentPage} av {totalPages} ({totalCount} resultat)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isPending}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Föregående
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isPending}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Nästa
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
