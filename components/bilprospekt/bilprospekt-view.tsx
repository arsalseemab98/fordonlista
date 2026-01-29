'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Database,
  Car,
  User,
  Building2,
  RefreshCw,
} from 'lucide-react'

interface Prospect {
  id: number
  bp_id: number
  reg_number: string
  brand: string
  model: string | null
  fuel: string | null
  color: string | null
  car_year: number | null
  date_acquired: string | null
  owner_name: string | null
  owner_type: string | null
  owner_gender: string | null
  municipality: string | null
  region: string | null
  kaross: string | null
  transmission: string | null
  engine_power: number | null
  mileage: number | null
  leasing: boolean
  credit: boolean
}

interface BilprospektViewProps {
  prospects: Prospect[]
  totalCount: number
  currentPage: number
  pageSize: number
  currentFilters: {
    region?: string
    brand?: string
    fuel?: string
    yearFrom?: number
    yearTo?: number
    possessionFrom?: number
    possessionTo?: number
    search?: string
  }
  availableBrands: string[]
  availableFuels: string[]
  availableMunicipalities: string[]
}

const REGIONS = [
  { value: '25', label: 'Norrbotten' },
  { value: '24', label: 'Västerbotten' },
  { value: '22', label: 'Västernorrland' },
  { value: '23', label: 'Jämtland' },
  { value: '21', label: 'Gävleborg' },
  { value: '20', label: 'Dalarna' },
  { value: '01', label: 'Stockholm' },
  { value: '14', label: 'Västra Götaland' },
  { value: '12', label: 'Skåne' },
]

export function BilprospektView({
  prospects,
  totalCount,
  currentPage,
  pageSize,
  currentFilters,
  availableBrands,
  availableFuels,
}: BilprospektViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '')

  const totalPages = Math.ceil(totalCount / pageSize)

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    // Reset to page 0 when filters change
    if (!updates.page) {
      params.set('page', '0')
    }
    router.push(`/bilprospekt?${params.toString()}`)
  }

  const handleSearch = () => {
    updateFilters({ search: searchTerm || undefined })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === prospects.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(prospects.map(p => p.id)))
    }
  }

  const handleSelectOne = (id: number) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const getFuelBadgeColor = (fuel: string | null) => {
    if (!fuel) return 'bg-gray-100 text-gray-600'
    if (fuel.includes('EL') && !fuel.includes('HYBRID')) return 'bg-green-100 text-green-800'
    if (fuel.includes('DIESEL')) return 'bg-gray-200 text-gray-800'
    if (fuel.includes('BENSIN')) return 'bg-amber-100 text-amber-800'
    if (fuel.includes('HYBRID')) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-600'
  }

  const calculatePossession = (dateAcquired: string | null) => {
    if (!dateAcquired) return '-'
    const acquired = new Date(dateAcquired)
    const now = new Date()
    const months = Math.floor((now.getTime() - acquired.getTime()) / (1000 * 60 * 60 * 24 * 30))
    if (months < 12) return `${months} mån`
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    return remainingMonths > 0 ? `${years}å ${remainingMonths}m` : `${years} år`
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Totalt</p>
            <p className="text-2xl font-bold">{totalCount.toLocaleString()}</p>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <Badge variant="secondary">{selectedIds.size} valda</Badge>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* Region */}
            <Select
              value={currentFilters.region || '25'}
              onValueChange={(value) => updateFilters({ region: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Brand */}
            <Select
              value={currentFilters.brand || 'all'}
              onValueChange={(value) => updateFilters({ brand: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Märke" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla märken</SelectItem>
                {availableBrands.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Fuel */}
            <Select
              value={currentFilters.fuel || 'all'}
              onValueChange={(value) => updateFilters({ fuel: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Bränsle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla</SelectItem>
                {availableFuels.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year From */}
            <Input
              type="number"
              placeholder="År från"
              value={currentFilters.yearFrom || ''}
              onChange={(e) => updateFilters({ year_from: e.target.value || undefined })}
              className="w-full"
            />

            {/* Year To */}
            <Input
              type="number"
              placeholder="År till"
              value={currentFilters.yearTo || ''}
              onChange={(e) => updateFilters({ year_to: e.target.value || undefined })}
              className="w-full"
            />

            {/* Possession From */}
            <Input
              type="number"
              placeholder="Innehav från (mån)"
              value={currentFilters.possessionFrom || ''}
              onChange={(e) => updateFilters({ possession_from: e.target.value || undefined })}
              className="w-full"
            />

            {/* Possession To */}
            <Input
              type="number"
              placeholder="Innehav till (mån)"
              value={currentFilters.possessionTo || ''}
              onChange={(e) => updateFilters({ possession_to: e.target.value || undefined })}
              className="w-full"
            />

            {/* Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Sök reg.nr, namn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button size="icon" onClick={handleSearch}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Active filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            {currentFilters.region && (
              <Badge variant="outline">
                {REGIONS.find(r => r.value === currentFilters.region)?.label || currentFilters.region}
              </Badge>
            )}
            {currentFilters.brand && (
              <Badge variant="outline" className="bg-green-50">{currentFilters.brand}</Badge>
            )}
            {currentFilters.fuel && (
              <Badge variant="outline" className="bg-amber-50">{currentFilters.fuel}</Badge>
            )}
            {(currentFilters.possessionFrom || currentFilters.possessionTo) && (
              <Badge variant="outline" className="bg-blue-50">
                Innehav: {currentFilters.possessionFrom || 0}-{currentFilters.possessionTo || '∞'} mån
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={prospects.length > 0 && selectedIds.size === prospects.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Reg.nr</TableHead>
                  <TableHead>Märke</TableHead>
                  <TableHead>Modell</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>År</TableHead>
                  <TableHead>Bränsle</TableHead>
                  <TableHead>Växel</TableHead>
                  <TableHead>HK</TableHead>
                  <TableHead>Mil</TableHead>
                  <TableHead>Ägare</TableHead>
                  <TableHead>Ort</TableHead>
                  <TableHead>Köpt</TableHead>
                  <TableHead>Innehav</TableHead>
                  <TableHead>Finansiering</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Database className="w-10 h-10 opacity-20" />
                        <p>Inga prospekt hittades</p>
                        <p className="text-sm">Justera filter eller importera data</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  prospects.map((prospect) => (
                    <TableRow
                      key={prospect.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSelectOne(prospect.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(prospect.id)}
                          onCheckedChange={() => handleSelectOne(prospect.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-medium text-blue-600">
                          {prospect.reg_number}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{prospect.brand}</TableCell>
                      <TableCell className="text-sm">{prospect.model || '-'}</TableCell>
                      <TableCell className="text-sm">{prospect.kaross || '-'}</TableCell>
                      <TableCell>{prospect.car_year || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getFuelBadgeColor(prospect.fuel)}>
                          {prospect.fuel || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={prospect.transmission === 'Automat' ? 'bg-purple-50' : ''}>
                          {prospect.transmission === 'Automat' ? 'A' : 'M'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{prospect.engine_power && prospect.engine_power > 0 ? prospect.engine_power : '-'}</TableCell>
                      <TableCell className="text-sm">{prospect.mileage || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {prospect.owner_type === 'company' ? (
                            <Building2 className="w-4 h-4 text-purple-500" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm max-w-[120px] truncate">
                            {prospect.owner_name?.split(',')[0] || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{prospect.municipality || '-'}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {prospect.date_acquired ? new Date(prospect.date_acquired).toLocaleDateString('sv-SE') : '-'}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {calculatePossession(prospect.date_acquired)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {prospect.credit && <Badge variant="outline" className="bg-yellow-50 text-yellow-800 mr-1">Kredit</Badge>}
                        {prospect.leasing && <Badge variant="outline" className="bg-purple-50 text-purple-800">Leasing</Badge>}
                        {!prospect.credit && !prospect.leasing && '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                Visar {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, totalCount)} av {totalCount.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilters({ page: String(currentPage - 1) })}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm px-3">
                  Sida {currentPage + 1} av {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilters({ page: String(currentPage + 1) })}
                  disabled={currentPage >= totalPages - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
