'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, X, Filter, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeadsFiltersProps {
  currentFilters: {
    status?: string
    search?: string
    make?: string
    minMileage?: string
    maxMileage?: string
    inTraffic?: string
  }
  makes: string[]
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alla statusar' },
  { value: 'new', label: 'Nya' },
  { value: 'contacted', label: 'Kontaktade' },
  { value: 'interested', label: 'Intresserade' },
  { value: 'not_interested', label: 'Ej intresserade' },
  { value: 'no_answer', label: 'Inget svar' },
  { value: 'callback', label: 'Ring tillbaka' },
  { value: 'booked', label: 'Bokade' },
  { value: 'completed', label: 'Avslutade' },
]

const TRAFFIC_OPTIONS = [
  { value: 'all', label: 'Alla' },
  { value: 'true', label: 'I trafik' },
  { value: 'false', label: 'Avställda' },
]

export function LeadsFilters({ currentFilters, makes }: LeadsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(currentFilters.search || '')

  const updateFilter = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    // Reset to page 1 when filters change
    params.delete('page')

    startTransition(() => {
      router.push(`/leads?${params.toString()}`)
    })
  }, [router, searchParams])

  const handleSearch = useCallback(() => {
    updateFilter('search', searchValue || null)
  }, [searchValue, updateFilter])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  const clearAllFilters = useCallback(() => {
    setSearchValue('')
    startTransition(() => {
      router.push('/leads')
    })
  }, [router])

  const activeFilterCount = Object.entries(currentFilters).filter(
    ([key, value]) => value && value !== 'all' && key !== 'page'
  ).length

  return (
    <div className="space-y-4">
      {/* Main filter row */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Sök telefon, ägare, plats..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-20"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSearch}
            disabled={isPending}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Sök'
            )}
          </Button>
        </div>

        {/* Status filter */}
        <Select
          value={currentFilters.status || 'all'}
          onValueChange={(value) => updateFilter('status', value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Make filter */}
        <Select
          value={currentFilters.make || 'all'}
          onValueChange={(value) => updateFilter('make', value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Märke" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla märken</SelectItem>
            {makes.map((make) => (
              <SelectItem key={make} value={make}>
                {make}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Traffic status */}
        <Select
          value={currentFilters.inTraffic || 'all'}
          onValueChange={(value) => updateFilter('inTraffic', value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Trafik" />
          </SelectTrigger>
          <SelectContent>
            {TRAFFIC_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="gap-1.5 text-gray-500"
          >
            <X className="h-4 w-4" />
            Rensa filter
          </Button>
        )}
      </div>

      {/* Active filters badges */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 flex items-center gap-1.5">
            <Filter className="h-4 w-4" />
            Aktiva filter:
          </span>
          {currentFilters.status && currentFilters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {STATUS_OPTIONS.find(s => s.value === currentFilters.status)?.label}
              <button
                onClick={() => updateFilter('status', null)}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {currentFilters.make && currentFilters.make !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Märke: {currentFilters.make}
              <button
                onClick={() => updateFilter('make', null)}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {currentFilters.search && (
            <Badge variant="secondary" className="gap-1">
              Sök: {currentFilters.search}
              <button
                onClick={() => {
                  setSearchValue('')
                  updateFilter('search', null)
                }}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {currentFilters.inTraffic && currentFilters.inTraffic !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {currentFilters.inTraffic === 'true' ? 'I trafik' : 'Avställda'}
              <button
                onClick={() => updateFilter('inTraffic', null)}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
