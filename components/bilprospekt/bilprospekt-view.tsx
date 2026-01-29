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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Database,
  User,
  Building2,
  Gauge,
  Loader2,
  Phone,
  MapPin,
  Car,
  Calendar,
  Users,
  Receipt,
  Info,
  CheckCircle2,
} from 'lucide-react'
import { fetchMileageForProspects, checkBiluppgifterStatus } from '@/app/bilprospekt/actions'
import { useToast } from '@/hooks/use-toast'

interface AddressVehicle {
  regnr: string
  description: string
  status?: string
}

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
  seller_name: string | null
  chassis: string | null
  in_service: string | null
  cylinder_volume: number | null
  fwd: string | null
  new_or_old: string | null
  // Biluppgifter data
  bu_num_owners: number | null
  bu_annual_tax: number | null
  bu_inspection_until: string | null
  bu_owner_age: number | null
  bu_owner_address: string | null
  bu_owner_postal_code: string | null
  bu_owner_postal_city: string | null
  bu_owner_phone: string | null
  bu_owner_vehicles: AddressVehicle[] | null
  bu_address_vehicles: AddressVehicle[] | null
  bu_fetched_at: string | null
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
  const { toast } = useToast()

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || '')
  const [isFetchingData, setIsFetchingData] = useState(false)

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

  const handleFetchBiluppgifter = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: 'Välj prospekt',
        description: 'Markera minst ett prospekt för att hämta data.',
        variant: 'destructive',
      })
      return
    }

    const isHealthy = await checkBiluppgifterStatus()
    if (!isHealthy) {
      toast({
        title: 'Biluppgifter API är inte tillgänglig',
        description: 'Starta biluppgifter-api: cd biluppgifter-api && uvicorn server:app --port 3456',
        variant: 'destructive',
      })
      return
    }

    setIsFetchingData(true)

    try {
      const selectedProspects = prospects
        .filter(p => selectedIds.has(p.id))
        .map(p => ({ bp_id: p.bp_id, reg_number: p.reg_number }))

      const result = await fetchMileageForProspects(selectedProspects)

      if (result.success) {
        toast({
          title: 'Biluppgifter hämtade',
          description: `${result.updated} av ${result.total} prospekt uppdaterade.`,
        })
        setSelectedIds(new Set())
        router.refresh()
      } else {
        toast({
          title: 'Fel',
          description: 'Kunde inte hämta biluppgifter.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching biluppgifter:', error)
      toast({
        title: 'Fel',
        description: 'Ett oväntat fel uppstod.',
        variant: 'destructive',
      })
    } finally {
      setIsFetchingData(false)
    }
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

  const hasBiluppgifterData = (prospect: Prospect) => {
    return prospect.bu_fetched_at !== null
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
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedIds.size} valda</Badge>
            <Button
              size="sm"
              onClick={handleFetchBiluppgifter}
              disabled={isFetchingData}
              className="gap-2"
            >
              {isFetchingData ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Gauge className="w-4 h-4" />
              )}
              Hämta biluppgifter
            </Button>
          </div>
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

            <Input
              type="number"
              placeholder="År från"
              value={currentFilters.yearFrom || ''}
              onChange={(e) => updateFilters({ year_from: e.target.value || undefined })}
              className="w-full"
            />

            <Input
              type="number"
              placeholder="År till"
              value={currentFilters.yearTo || ''}
              onChange={(e) => updateFilters({ year_to: e.target.value || undefined })}
              className="w-full"
            />

            <Input
              type="number"
              placeholder="Innehav från (mån)"
              value={currentFilters.possessionFrom || ''}
              onChange={(e) => updateFilters({ possession_from: e.target.value || undefined })}
              className="w-full"
            />

            <Input
              type="number"
              placeholder="Innehav till (mån)"
              value={currentFilters.possessionTo || ''}
              onChange={(e) => updateFilters({ possession_to: e.target.value || undefined })}
              className="w-full"
            />

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
                  <TableHead>År</TableHead>
                  <TableHead>Bränsle</TableHead>
                  <TableHead>Mil</TableHead>
                  <TableHead>Ägare</TableHead>
                  <TableHead>Ålder</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Adress</TableHead>
                  <TableHead>Ort</TableHead>
                  <TableHead>Ägare #</TableHead>
                  <TableHead>Skatt/år</TableHead>
                  <TableHead>Besikt.</TableHead>
                  <TableHead>Fordon</TableHead>
                  <TableHead>Innehav</TableHead>
                  <TableHead>Info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={18} className="h-32 text-center">
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
                      className={`cursor-pointer hover:bg-muted/50 ${hasBiluppgifterData(prospect) ? 'bg-green-50/30' : ''}`}
                      onClick={() => handleSelectOne(prospect.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(prospect.id)}
                          onCheckedChange={() => handleSelectOne(prospect.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm font-medium text-blue-600">
                            {prospect.reg_number}
                          </span>
                          {hasBiluppgifterData(prospect) && (
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{prospect.brand}</TableCell>
                      <TableCell className="text-sm">{prospect.model || '-'}</TableCell>
                      <TableCell>{prospect.car_year || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getFuelBadgeColor(prospect.fuel)}>
                          {prospect.fuel || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {prospect.mileage ? (
                          <span className="font-medium">{prospect.mileage.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {prospect.owner_type === 'company' ? (
                            <Building2 className="w-4 h-4 text-purple-500" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm max-w-[100px] truncate">
                            {prospect.owner_name?.split(',')[0] || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {prospect.bu_owner_age ? (
                          <span>{prospect.bu_owner_age} år</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {prospect.bu_owner_phone ? (
                          <a
                            href={`tel:${prospect.bu_owner_phone}`}
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="w-3 h-3" />
                            {prospect.bu_owner_phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm max-w-[120px] truncate" title={prospect.bu_owner_address || ''}>
                        {prospect.bu_owner_address || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {prospect.bu_owner_postal_city || prospect.municipality || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {prospect.bu_num_owners ? (
                          <Badge variant="outline">{prospect.bu_num_owners}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {prospect.bu_annual_tax ? (
                          <span>{prospect.bu_annual_tax.toLocaleString()} kr</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {prospect.bu_inspection_until ? (
                          <Badge variant="outline" className={
                            new Date(prospect.bu_inspection_until) < new Date() ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
                          }>
                            {prospect.bu_inspection_until}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm" onClick={(e) => e.stopPropagation()}>
                        {(prospect.bu_address_vehicles && prospect.bu_address_vehicles.length > 0) ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-1">
                                <Car className="w-3 h-3" />
                                {prospect.bu_address_vehicles.length}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  Fordon på adressen
                                </h4>
                                <div className="text-sm text-muted-foreground mb-2">
                                  {prospect.bu_owner_address}, {prospect.bu_owner_postal_code} {prospect.bu_owner_postal_city}
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                  {prospect.bu_address_vehicles.map((v, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                                      <div>
                                        <span className="font-mono font-medium">{v.regnr}</span>
                                        <span className="text-muted-foreground ml-2">{v.description}</span>
                                      </div>
                                      {v.status && (
                                        <Badge variant="outline" className={v.status === 'I Trafik' ? 'bg-green-50' : 'bg-red-50'}>
                                          {v.status}
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {calculatePossession(prospect.date_acquired)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Info className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-3">
                              <h4 className="font-medium">Detaljer: {prospect.reg_number}</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-muted-foreground">Typ:</div>
                                <div>{prospect.kaross || '-'}</div>
                                <div className="text-muted-foreground">Växellåda:</div>
                                <div>{prospect.transmission || '-'}</div>
                                <div className="text-muted-foreground">HK:</div>
                                <div>{prospect.engine_power || '-'}</div>
                                <div className="text-muted-foreground">CC:</div>
                                <div>{prospect.cylinder_volume || '-'}</div>
                                <div className="text-muted-foreground">Färg:</div>
                                <div>{prospect.color || '-'}</div>
                                <div className="text-muted-foreground">4WD:</div>
                                <div>{prospect.fwd === 'Ja' ? 'Ja' : 'Nej'}</div>
                                <div className="text-muted-foreground">I trafik:</div>
                                <div>{prospect.in_service || '-'}</div>
                                <div className="text-muted-foreground">Ny/Begagnad:</div>
                                <div>{prospect.new_or_old || '-'}</div>
                                <div className="text-muted-foreground">Inköpsplats:</div>
                                <div className="truncate" title={prospect.seller_name || ''}>{prospect.seller_name || '-'}</div>
                                <div className="text-muted-foreground">Chassi:</div>
                                <div className="font-mono text-xs truncate" title={prospect.chassis || ''}>{prospect.chassis || '-'}</div>
                                <div className="text-muted-foreground">Finansiering:</div>
                                <div>
                                  {prospect.credit ? 'Kredit' : prospect.leasing ? 'Leasing' : 'Kontant'}
                                </div>
                              </div>
                              {hasBiluppgifterData(prospect) && (
                                <div className="pt-2 border-t text-xs text-muted-foreground">
                                  Biluppgifter hämtade: {new Date(prospect.bu_fetched_at!).toLocaleString('sv-SE')}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
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
