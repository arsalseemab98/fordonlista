'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  ExternalLink,
} from 'lucide-react'

interface Stats {
  totalPrivatAds: number
  totalPrivatBiluppgifter: number
  withPhone: number
  withoutPhone: number
}

interface PrivatBiluppgifterViewProps {
  stats: Stats
  privatData: any[]
  blocketMap: Record<string, any>
  cities: string[]
  currentFilters: {
    search?: string
    lan?: string
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

function ExpandableRow({ data, blocket }: { data: any; blocket: any }) {
  const [expanded, setExpanded] = useState(false)
  const vehicles = data.owner_vehicles || []
  const addressVehicles = data.address_vehicles || []

  return (
    <>
      <tr
        className="border-b hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-3 py-2 text-sm font-mono font-medium">{data.regnummer}</td>
        <td className="px-3 py-2 text-sm">
          {blocket ? `${blocket.marke} ${blocket.modell} ${blocket.arsmodell}` : '-'}
        </td>
        <td className="px-3 py-2 text-sm">{blocket?.pris?.toLocaleString() || '-'} kr</td>
        <td className="px-3 py-2 text-sm">
          {blocket?.url ? (
            <a
              href={blocket.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
            >
              Se annons <ExternalLink className="h-3 w-3" />
            </a>
          ) : '-'}
        </td>
        <td className="px-3 py-2 text-sm font-medium">{data.owner_name || '-'}</td>
        <td className="px-3 py-2 text-sm">{data.owner_age ? `${data.owner_age} år` : '-'}</td>
        <td className="px-3 py-2 text-sm">{data.owner_postal_city || '-'}</td>
        <td className="px-3 py-2 text-sm">
          {data.owner_phone ? (
            <span className="text-green-700 font-medium flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {data.owner_phone}
            </span>
          ) : (
            <span className="text-gray-400 flex items-center gap-1">
              <PhoneOff className="h-3 w-3" />
              Saknas
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-sm text-gray-500">{vehicles.length}</td>
        <td className="px-3 py-2">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50 border-b">
          <td colSpan={10} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Ägare info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Ägare
                </h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Namn:</span> {data.owner_name}</p>
                  {data.owner_age && <p><span className="text-gray-500">Ålder:</span> {data.owner_age} år</p>}
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    {data.owner_address}, {data.owner_postal_code} {data.owner_postal_city}
                  </p>
                  {data.owner_phone && (
                    <p className="flex items-center gap-1 text-green-700 font-medium">
                      <Phone className="h-3 w-3" />
                      <a href={`tel:${data.owner_phone}`} className="hover:underline">
                        {data.owner_phone}
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Fordon */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <Car className="h-4 w-4" />
                  Ägarens fordon ({vehicles.length})
                </h4>
                <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                  {vehicles.slice(0, 8).map((v: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-gray-600">{v.regnr || '?'}</span>
                      <span className="flex-1 truncate">{v.model || '?'} {v.year || ''}</span>
                      {v.ownership_time && <span className="text-gray-400">{v.ownership_time}</span>}
                    </div>
                  ))}
                  {vehicles.length > 8 && (
                    <p className="text-gray-400 text-xs">+{vehicles.length - 8} till...</p>
                  )}
                  {vehicles.length === 0 && <p className="text-gray-400 text-xs">Inga fordon</p>}
                </div>
              </div>

              {/* Adressfordon */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Adressfordon ({addressVehicles.length})
                </h4>
                <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                  {addressVehicles.slice(0, 8).map((v: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-gray-600">{v.regnr || '?'}</span>
                      <span className="flex-1 truncate">{v.model || '?'}</span>
                    </div>
                  ))}
                  {addressVehicles.length > 8 && (
                    <p className="text-gray-400 text-xs">+{addressVehicles.length - 8} till...</p>
                  )}
                  {addressVehicles.length === 0 && <p className="text-gray-400 text-xs">Inga adressfordon</p>}
                </div>
              </div>

              {/* Blocket info */}
              {blocket && (
                <div className="space-y-1 text-sm md:col-span-3">
                  <h4 className="text-sm font-semibold">Blocket-annons</h4>
                  <div className="flex gap-4 text-xs text-gray-600">
                    <span>Publicerad: {formatDate(blocket.publicerad)}</span>
                    <span>Plats: {blocket.stad || blocket.region}</span>
                    <span>Pris: {blocket.pris?.toLocaleString()} kr</span>
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

export function PrivatBiluppgifterView({
  stats,
  privatData,
  blocketMap,
  cities,
  currentFilters,
  totalCount,
  totalPages,
  currentPage,
}: PrivatBiluppgifterViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(currentFilters.search || '')

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (searchInput) {
      params.set('search', searchInput)
    } else {
      params.delete('search')
    }
    params.delete('page')
    startTransition(() => {
      router.push(`/privat-biluppgifter?${params.toString()}`)
    })
  }

  const handleCityFilter = (city: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (city && city !== 'all') {
      params.set('lan', city)
    } else {
      params.delete('lan')
    }
    params.delete('page')
    startTransition(() => {
      router.push(`/privat-biluppgifter?${params.toString()}`)
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
      router.push(`/privat-biluppgifter?${params.toString()}`)
    })
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-blue-600">Privat-annonser (Blocket)</p>
            <p className="text-2xl font-bold text-blue-800">{stats.totalPrivatAds.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-green-600">Hämtade (Biluppgifter)</p>
            <p className="text-2xl font-bold text-green-800">{stats.totalPrivatBiluppgifter.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-600">Med telefon</p>
              <p className="text-2xl font-bold text-emerald-800">{stats.withPhone.toLocaleString()}</p>
            </div>
            <Phone className="h-5 w-5 text-emerald-400" />
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Utan telefon</p>
              <p className="text-2xl font-bold text-gray-800">{stats.withoutPhone.toLocaleString()}</p>
            </div>
            <PhoneOff className="h-5 w-5 text-gray-400" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex gap-2 flex-1 max-w-md">
          <Input
            placeholder="Sök regnr, namn, stad..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isPending}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Select
          value={currentFilters.lan || 'all'}
          onValueChange={handleCityFilter}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrera på stad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla städer</SelectItem>
            {cities.slice(0, 50).map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(currentFilters.search || currentFilters.lan) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchInput('')
              router.push('/privat-biluppgifter')
            }}
          >
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
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Blocket</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Ägare</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Ålder</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Stad</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Telefon</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Fordon</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {privatData.map((p) => (
                  <ExpandableRow
                    key={p.id}
                    data={p}
                    blocket={blocketMap[p.regnummer?.toUpperCase()] || null}
                  />
                ))}
                {privatData.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-gray-400 text-sm">
                      Inga resultat hittades
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
