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

interface BiluppgifterFiltersProps {
  currentFilters: {
    owner_type?: string
    search?: string
    page?: string
  }
}

const OWNER_TYPE_OPTIONS = [
  { value: 'all', label: 'Alla typer' },
  { value: 'handlare', label: 'Handlare' },
  { value: 'formedling', label: 'Formedling' },
  { value: 'privat', label: 'Privat' },
  { value: 'foretag', label: 'Foretag' },
  { value: 'sold', label: 'Sold' },
]

export function BiluppgifterFilters({ currentFilters }: BiluppgifterFiltersProps) {
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
      router.push(`/handlare-biluppgifter?${params.toString()}`)
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
      router.push('/handlare-biluppgifter')
    })
  }, [router])

  const activeFilterCount = Object.entries(currentFilters).filter(
    ([key, value]) => value && value !== 'all' && key !== 'page'
  ).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Sok regnr, agarnamn..."
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
              'Sok'
            )}
          </Button>
        </div>

        {/* Owner type filter */}
        <Select
          value={currentFilters.owner_type || 'all'}
          onValueChange={(value) => updateFilter('owner_type', value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            {OWNER_TYPE_OPTIONS.map((option) => (
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
          {currentFilters.owner_type && currentFilters.owner_type !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Typ: {OWNER_TYPE_OPTIONS.find(o => o.value === currentFilters.owner_type)?.label}
              <button
                onClick={() => updateFilter('owner_type', null)}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {currentFilters.search && (
            <Badge variant="secondary" className="gap-1">
              Sok: {currentFilters.search}
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
        </div>
      )}
    </div>
  )
}
