'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, Phone, Mail, MapPin, CheckCircle, XCircle, Star, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { searchByRegNr, quickUpdateLeadStatus, type SearchResult } from '@/app/actions/search'

const STATUS_OPTIONS = [
  { value: 'interested', label: 'Intresserad', color: 'bg-green-100 text-green-700 hover:bg-green-200', icon: Star },
  { value: 'not_interested', label: 'Ej intresserad', color: 'bg-red-100 text-red-700 hover:bg-red-200', icon: XCircle },
  { value: 'callback', label: 'Ring tillbaka', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200', icon: Phone },
  { value: 'booked', label: 'Bokad', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200', icon: CheckCircle },
] as const

const STATUS_LABELS: Record<string, string> = {
  new: 'Ny',
  pending_review: 'Granskas',
  to_call: 'Att ringa',
  called: 'Ringd',
  interested: 'Intresserad',
  booked: 'Bokad',
  bought: 'Köpt',
  not_interested: 'Ej intresserad',
  do_not_call: 'Ring ej',
  callback: 'Ring tillbaka',
  no_answer: 'Inget svar',
  prospekt_archive: 'Arkiv',
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'interested': return 'bg-green-100 text-green-700'
    case 'booked': return 'bg-blue-100 text-blue-700'
    case 'bought': return 'bg-purple-100 text-purple-700'
    case 'not_interested': return 'bg-red-100 text-red-700'
    case 'do_not_call': return 'bg-red-200 text-red-800'
    case 'callback': return 'bg-yellow-100 text-yellow-700'
    case 'no_answer': return 'bg-orange-100 text-orange-700'
    case 'prospekt_archive': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export function RegNrSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (q.length < 2) return

    setIsLoading(true)
    setError(null)

    const res = await searchByRegNr(q)

    if (res.success) {
      setResults(res.results)
    } else {
      setError(res.error || 'Sökningen misslyckades')
      setResults([])
    }

    setIsOpen(true)
    setIsLoading(false)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleQuickStatus = async (leadId: string, status: string) => {
    setUpdatingId(leadId)
    const res = await quickUpdateLeadStatus(leadId, status)
    if (res.success) {
      setResults(prev =>
        prev.map(r => r.lead_id === leadId ? { ...r, status } : r)
      )
    }
    setUpdatingId(null)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
          <Input
            type="text"
            placeholder="Sök lead reg.nr..."
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            className="pl-9 w-[160px] md:w-[180px] h-9 uppercase font-mono border-emerald-300 focus-visible:ring-emerald-400"
            maxLength={7}
          />
        </div>
        <Button
          size="sm"
          onClick={handleSearch}
          disabled={isLoading || query.trim().length < 2}
          className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
          title="Sök lead via reg.nr"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Sökresultat: <span className="font-mono">{query.toUpperCase()}</span>
              <Badge variant="secondary">{results.length} träffar</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 space-y-3">
            {error && (
              <div className="text-center py-6 text-red-500">{error}</div>
            )}

            {!error && results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Inga fordon hittades med reg.nr &quot;{query.toUpperCase()}&quot;
              </div>
            )}

            {results.map((r) => (
              <div
                key={r.lead_id}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/30 transition-colors"
              >
                {/* Row 1: Vehicle + Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-lg">{r.reg_nr}</span>
                    {r.make && r.model && (
                      <span className="text-muted-foreground">
                        {r.make} {r.model} {r.year && `(${r.year})`}
                      </span>
                    )}
                  </div>
                  <Badge className={getStatusBadgeClass(r.status)}>
                    {STATUS_LABELS[r.status] || r.status}
                  </Badge>
                </div>

                {/* Row 2: Owner info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {r.owner_info && (
                    <span className="font-medium text-foreground">{r.owner_info}</span>
                  )}
                  {r.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {r.phone}
                    </span>
                  )}
                  {r.county && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {r.county}
                    </span>
                  )}
                  {r.prospect_type && (
                    <Badge variant="outline" className="text-xs">{r.prospect_type}</Badge>
                  )}
                  {r.sent_to_brev_at && (
                    <span className="flex items-center gap-1 text-green-600">
                      <Mail className="h-3 w-3" />
                      Brev {new Date(r.sent_to_brev_at).toLocaleDateString('sv-SE')}
                    </span>
                  )}
                </div>

                {/* Row 3: Quick actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {STATUS_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    const isActive = r.status === opt.value
                    return (
                      <Button
                        key={opt.value}
                        variant="ghost"
                        size="sm"
                        disabled={updatingId === r.lead_id || isActive}
                        className={`h-7 text-xs ${isActive ? opt.color + ' font-semibold' : 'hover:' + opt.color}`}
                        onClick={() => handleQuickStatus(r.lead_id, opt.value)}
                      >
                        {updatingId === r.lead_id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Icon className="h-3 w-3 mr-1" />
                        )}
                        {opt.label}
                      </Button>
                    )
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs ml-auto"
                    onClick={() => {
                      setIsOpen(false)
                      router.push(`/leads/${r.lead_id}`)
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Öppna lead
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
