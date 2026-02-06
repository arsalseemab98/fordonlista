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
  Calendar,
  TrendingDown,
} from 'lucide-react'

interface Stats {
  totalConfirmed: number
  totalPending: number
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

function ExpandableRow({ data }: { data: any }) {
  const [expanded, setExpanded] = useState(false)

  // Handle pending rows
  if (data._isPending) {
    return (
      <tr className="border-b hover:bg-yellow-50 bg-yellow-50/30">
        <td className="px-3 py-2 text-sm font-mono font-medium">{data.regnummer}</td>
        <td className="px-3 py-2 text-sm">
          {data.marke} {data.modell} {data.arsmodell}
        </td>
        <td className="px-3 py-2 text-sm">{data.pris?.toLocaleString() || '-'} kr</td>
        <td className="px-3 py-2 text-sm">{formatDate(data.sold_at)}</td>
        <td className="px-3 py-2 text-sm" colSpan={2}>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Väntar på ägarbyte
          </Badge>
        </td>
        <td className="px-3 py-2 text-sm text-gray-500">{data.original_owner || '-'}</td>
        <td className="px-3 py-2 text-sm text-gray-400 text-xs">
          Kollad {data.check_count}x
        </td>
        <td className="px-3 py-2"></td>
      </tr>
    )
  }

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

  const activeView = currentFilters.view || 'confirmed'

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
    if (view !== 'confirmed') {
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

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeView === 'confirmed' ? 'ring-2 ring-green-500 bg-green-50' : 'bg-green-50 border-green-200'
          }`}
          onClick={() => handleViewChange('confirmed')}
        >
          <CardContent className="pt-3 pb-2 px-3">
            <p className="text-xs text-green-600">Bekräftade</p>
            <p className="text-xl font-bold text-green-800">{stats.totalConfirmed.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeView === 'pending' ? 'ring-2 ring-yellow-500 bg-yellow-50' : 'bg-yellow-50 border-yellow-200'
          }`}
          onClick={() => handleViewChange('pending')}
        >
          <CardContent className="pt-3 pb-2 px-3">
            <p className="text-xs text-yellow-600">Väntar</p>
            <p className="text-xl font-bold text-yellow-800">{stats.totalPending.toLocaleString()}</p>
          </CardContent>
        </Card>

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

        <Card className="bg-fuchsia-50 border-fuchsia-200">
          <CardContent className="pt-3 pb-2 px-3">
            <p className="text-xs text-fuchsia-600">Handlare köp</p>
            <p className="text-xl font-bold text-fuchsia-800">{stats.handlareKopare.toLocaleString()}</p>
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

      {/* View description */}
      {activeView === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          <Clock className="h-4 w-4 inline mr-2" />
          <strong>Väntar på ägarbyte:</strong> Dessa bilar har försvunnit från Blocket men ägarbytet har inte bekräftats ännu på biluppgifter.se.
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

        {activeView === 'confirmed' && (
          <>
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
          </>
        )}

        {(currentFilters.search || currentFilters.saljare || currentFilters.kopare || activeView !== 'confirmed') && (
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
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Regnr</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Bil</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Pris</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Såld</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Liggtid</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Säljare</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Köpare</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Köpartyp</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <ExpandableRow
                    key={item.id}
                    data={item}
                  />
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-gray-400 text-sm">
                      Inga sålda bilar hittades
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
