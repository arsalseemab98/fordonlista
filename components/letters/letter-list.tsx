'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Mail,
  Download,
  Check,
  Phone,
  PhoneOff,
  Send,
  Clock,
  MapPin,
  FileSpreadsheet,
  Calculator,
  Settings,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { markLetterSent } from '@/app/actions/letters'
import { deleteLead, bulkDeleteLeads } from '@/app/actions/leads'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'

interface Vehicle {
  id: string
  reg_nr: string | null
  make: string | null
  model: string | null
  year: number | null
}

interface Lead {
  id: string
  owner_info: string | null
  location: string | null
  phone: string | null
  letter_sent: boolean | null
  letter_sent_date: string | null
  vehicles: Vehicle[]
}

interface LetterListProps {
  leads: Lead[]
  counts: {
    total: number
    noPhone: number
    notSent: number
    sent: number
  }
  currentFilter: string
  letterCost: number
}

export function LetterList({ leads, counts, currentFilter, letterCost }: LetterListProps) {
  const router = useRouter()
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [isMarking, setIsMarking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [fromPlayground, setFromPlayground] = useState(false)

  // Check for leads sent from playground via localStorage
  useEffect(() => {
    const storedIds = localStorage.getItem('brevLeadIds')
    if (storedIds) {
      try {
        const leadIds: string[] = JSON.parse(storedIds)
        // Filter to only include IDs that exist in current leads
        const validIds = leadIds.filter(id => leads.some(l => l.id === id))
        if (validIds.length > 0) {
          setSelectedLeads(new Set(validIds))
          setFromPlayground(true)
          toast.info(`${validIds.length} leads förvalda från playground`)
        }
        // Clear localStorage after reading
        localStorage.removeItem('brevLeadIds')
      } catch {
        localStorage.removeItem('brevLeadIds')
      }
    }
  }, [leads])

  const filters = [
    { key: 'not_sent', label: 'Ej skickat', count: counts.notSent, icon: Clock },
    { key: 'no_phone', label: 'Utan telefon', count: counts.noPhone, icon: PhoneOff },
    { key: 'sent', label: 'Skickat', count: counts.sent, icon: Check },
    { key: 'all', label: 'Alla', count: counts.total, icon: Mail },
  ]

  const handleFilterChange = (filter: string) => {
    router.push(`/brev?filter=${filter}`)
  }

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)))
    }
  }

  const toggleSelect = (leadId: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    setSelectedLeads(newSelected)
  }

  const handleMarkSent = async () => {
    if (selectedLeads.size === 0) {
      toast.error('Välj minst en lead')
      return
    }

    setIsMarking(true)
    const result = await markLetterSent(Array.from(selectedLeads))
    setIsMarking(false)

    if (result.success) {
      toast.success(`${selectedLeads.size} leads markerade som skickade`)
      setSelectedLeads(new Set())
      router.refresh()
    } else {
      toast.error(result.error || 'Kunde inte markera som skickade')
    }
  }

  const handleDeleteClick = (lead: Lead) => {
    setLeadToDelete(lead)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return

    setIsDeleting(true)
    const result = await deleteLead(leadToDelete.id)
    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setLeadToDelete(null)

    if (result.success) {
      toast.success('Lead borttagen')
      router.refresh()
    } else {
      toast.error(result.error || 'Kunde inte ta bort lead')
    }
  }

  const handleBulkDeleteClick = () => {
    if (selectedLeads.size === 0) {
      toast.error('Välj minst en lead')
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  const handleBulkDeleteConfirm = async () => {
    setIsDeleting(true)
    const result = await bulkDeleteLeads(Array.from(selectedLeads))
    setIsDeleting(false)
    setBulkDeleteDialogOpen(false)

    if (result.success) {
      toast.success(`${selectedLeads.size} leads borttagna`)
      setSelectedLeads(new Set())
      router.refresh()
    } else {
      toast.error(result.error || 'Kunde inte ta bort leads')
    }
  }

  const handleExportCSV = () => {
    setIsExporting(true)

    // Determine which leads to export
    const leadsToExport = selectedLeads.size > 0
      ? leads.filter(l => selectedLeads.has(l.id))
      : leads

    // Build CSV data - one row per vehicle with reg_nr first (most important!)
    const csvRows: string[][] = []

    // Header row - REG.NR first!
    csvRows.push(['REG_NR', 'MÄRKE', 'MODELL', 'ÅR', 'ÄGARE', 'ORT'])

    leadsToExport.forEach(lead => {
      lead.vehicles.forEach(vehicle => {
        if (vehicle.reg_nr) {
          csvRows.push([
            vehicle.reg_nr || '',
            vehicle.make || '',
            vehicle.model || '',
            vehicle.year?.toString() || '',
            lead.owner_info || '',
            lead.location || ''
          ])
        }
      })
    })

    // Create CSV content
    const csvContent = csvRows
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    // Add BOM for Excel to recognize UTF-8
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    // Download
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `brevlista_${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setIsExporting(false)
    toast.success(`Exporterade ${csvRows.length - 1} rader`)
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filters.map(filter => {
          const Icon = filter.icon
          const isActive = currentFilter === filter.key
          return (
            <Button
              key={filter.key}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange(filter.key)}
              className={cn(
                'gap-2',
                isActive && 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {filter.label}
              <Badge
                variant="secondary"
                className={cn(
                  'ml-1',
                  isActive ? 'bg-blue-500 text-white' : 'bg-gray-100'
                )}
              >
                {filter.count}
              </Badge>
            </Button>
          )
        })}
      </div>

      {/* Cost Calculator */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Calculator className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Beräknad kostnad
                </p>
                <p className="text-2xl font-bold text-amber-700">
                  {((selectedLeads.size > 0 ? selectedLeads.size : leads.length) * letterCost).toFixed(2)} kr
                </p>
              </div>
            </div>
            <div className="text-right text-sm text-amber-700">
              <p>{selectedLeads.size > 0 ? selectedLeads.size : leads.length} brev × {letterCost.toFixed(2)} kr</p>
              <a href="/settings" className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 mt-1">
                <Settings className="h-3 w-3" />
                Ändra brevkostnad
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {selectedLeads.size > 0
                  ? `${selectedLeads.size} valda`
                  : `${leads.length} leads`}
              </span>
              {selectedLeads.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLeads(new Set())}
                >
                  Avmarkera alla
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={isExporting || leads.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportera CSV
                {selectedLeads.size > 0 && ` (${selectedLeads.size})`}
              </Button>

              {selectedLeads.size > 0 && currentFilter !== 'sent' && (
                <Button
                  onClick={handleMarkSent}
                  disabled={isMarking}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4" />
                  Markera som skickat
                </Button>
              )}

              {selectedLeads.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleBulkDeleteClick}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Ta bort ({selectedLeads.size})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <div className="py-12 text-center">
              <Mail className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Inga leads att visa</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedLeads.size === leads.length && leads.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="font-bold">REG.NR</TableHead>
                  <TableHead>Märke / Modell</TableHead>
                  <TableHead>Ägare</TableHead>
                  <TableHead>Ort</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Brev skickat</TableHead>
                  <TableHead className="w-[80px]">Åtgärd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map(lead => (
                  lead.vehicles.map((vehicle, vIndex) => (
                    <TableRow
                      key={`${lead.id}-${vehicle.id}`}
                      className={cn(
                        'hover:bg-gray-50',
                        selectedLeads.has(lead.id) && 'bg-blue-50'
                      )}
                    >
                      <TableCell>
                        {vIndex === 0 && (
                          <Checkbox
                            checked={selectedLeads.has(lead.id)}
                            onCheckedChange={() => toggleSelect(lead.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-lg bg-yellow-100 px-2 py-1 rounded">
                          {vehicle.reg_nr || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{vehicle.make}</span>
                          {vehicle.model && (
                            <span className="text-gray-500"> {vehicle.model}</span>
                          )}
                          {vehicle.year && (
                            <span className="text-gray-400 text-sm ml-2">({vehicle.year})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {vIndex === 0 && (
                          <span className="text-sm">{lead.owner_info || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vIndex === 0 && lead.location && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="h-3 w-3" />
                            {lead.location}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {vIndex === 0 && (
                          lead.phone ? (
                            <div className="flex items-center gap-1 text-sm text-green-600">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-sm text-gray-400">
                              <PhoneOff className="h-3 w-3" />
                              Saknas
                            </div>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {vIndex === 0 && (
                          lead.letter_sent ? (
                            <Badge className="bg-green-100 text-green-700">
                              <Check className="h-3 w-3 mr-1" />
                              {lead.letter_sent_date
                                ? format(new Date(lead.letter_sent_date), 'd MMM', { locale: sv })
                                : 'Ja'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-400">
                              Ej skickat
                            </Badge>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        {vIndex === 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(lead)}
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Export Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Export-format (CSV)</p>
              <p className="mt-1">
                Kolumner: <strong>REG_NR</strong>, MÄRKE, MODELL, ÅR, ÄGARE, ORT
              </p>
              <p className="text-blue-600 mt-1">
                Filen kan öppnas direkt i Excel med svensk teckenkodning.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Single Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Ta bort lead
            </AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort denna lead? Detta tar även bort alla
              tillhörande fordon och samtalsloggar. Åtgärden kan inte ångras.
              {leadToDelete && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{leadToDelete.owner_info || 'Okänd ägare'}</p>
                  <p className="text-sm text-gray-600">{leadToDelete.vehicles.length} fordon</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Tar bort...' : 'Ta bort'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Ta bort {selectedLeads.size} leads
            </AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort {selectedLeads.size} leads? Detta tar även bort alla
              tillhörande fordon och samtalsloggar. Åtgärden kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Tar bort...' : `Ta bort ${selectedLeads.size} leads`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
