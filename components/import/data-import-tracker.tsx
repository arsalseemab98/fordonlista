'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Calendar,
  Plus,
  Trash2,
  Database,
  Clock,
  FileSpreadsheet,
  MapPin
} from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { toast } from 'sonner'
import { saveDataImport, deleteDataImport } from '@/app/actions/settings'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'

interface DataImport {
  id: string
  import_date: string
  data_source: string
  date_range_start: string | null
  date_range_end: string | null
  filter_type: string | null
  record_count: number
  notes: string | null
  county: string | null
  created_at: string
}

interface DataImportTrackerProps {
  imports: DataImport[]
}

const FILTER_TYPES = [
  { value: 'avställda', label: 'Avställda fordon' },
  { value: 'nyköpt_bil', label: 'Nyköpt bil (kort innehavstid)' },
  { value: 'låg_miltal', label: 'Låg körsträcka' },
  { value: 'alla', label: 'Alla typer' },
]

const SWEDISH_COUNTIES = [
  { value: 'alla', label: 'Hela Sverige' },
  { value: 'blekinge', label: 'Blekinge' },
  { value: 'dalarna', label: 'Dalarna' },
  { value: 'gotland', label: 'Gotland' },
  { value: 'gävleborg', label: 'Gävleborg' },
  { value: 'halland', label: 'Halland' },
  { value: 'jämtland', label: 'Jämtland' },
  { value: 'jönköping', label: 'Jönköping' },
  { value: 'kalmar', label: 'Kalmar' },
  { value: 'kronoberg', label: 'Kronoberg' },
  { value: 'norrbotten', label: 'Norrbotten' },
  { value: 'skåne', label: 'Skåne' },
  { value: 'stockholm', label: 'Stockholm' },
  { value: 'södermanland', label: 'Södermanland' },
  { value: 'uppsala', label: 'Uppsala' },
  { value: 'värmland', label: 'Värmland' },
  { value: 'västerbotten', label: 'Västerbotten' },
  { value: 'västernorrland', label: 'Västernorrland' },
  { value: 'västmanland', label: 'Västmanland' },
  { value: 'västra_götaland', label: 'Västra Götaland' },
  { value: 'örebro', label: 'Örebro' },
  { value: 'östergötland', label: 'Östergötland' },
]

export function DataImportTracker({ imports }: DataImportTrackerProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    data_source: 'Bilprospekt',
    date_range_start: '',
    date_range_end: '',
    filter_type: '',
    record_count: 0,
    notes: '',
    county: 'alla'
  })

  const handleSave = async () => {
    setIsSaving(true)
    const result = await saveDataImport({
      data_source: formData.data_source,
      date_range_start: formData.date_range_start || undefined,
      date_range_end: formData.date_range_end || undefined,
      filter_type: formData.filter_type || undefined,
      record_count: formData.record_count,
      notes: formData.notes || undefined,
      county: formData.county || 'alla'
    })
    setIsSaving(false)

    if (result.success) {
      toast.success('Datahämtning registrerad')
      setIsOpen(false)
      setFormData({
        data_source: 'Bilprospekt',
        date_range_start: '',
        date_range_end: '',
        filter_type: '',
        record_count: 0,
        notes: '',
        county: 'alla'
      })
      router.refresh()
    } else {
      toast.error('Kunde inte spara')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Vill du verkligen ta bort denna post?')) return

    const result = await deleteDataImport(id)
    if (result.success) {
      toast.success('Post borttagen')
      router.refresh()
    } else {
      toast.error('Kunde inte ta bort')
    }
  }

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start && !end) return '-'
    if (start && end) {
      return `${format(new Date(start), 'd MMM', { locale: sv })} - ${format(new Date(end), 'd MMM yyyy', { locale: sv })}`
    }
    if (start) return `från ${format(new Date(start), 'd MMM yyyy', { locale: sv })}`
    if (end) return `till ${format(new Date(end), 'd MMM yyyy', { locale: sv })}`
    return '-'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-gray-500" />
              Datahämtnings-logg
            </CardTitle>
            <CardDescription>
              Håll koll på vilka datumperioder du har hämtat data för
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Logga hämtning
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Logga datahämtning</DialogTitle>
                <DialogDescription>
                  Registrera vilken data du har hämtat från Bilprospekt eller annan källa
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="data-source">Datakälla</Label>
                  <Select
                    value={formData.data_source}
                    onValueChange={(value) => setFormData({ ...formData, data_source: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bilprospekt">Bilprospekt</SelectItem>
                      <SelectItem value="Transportstyrelsen">Transportstyrelsen</SelectItem>
                      <SelectItem value="Annan">Annan källa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date-start">Från datum</Label>
                    <Input
                      id="date-start"
                      type="date"
                      value={formData.date_range_start}
                      onChange={(e) => setFormData({ ...formData, date_range_start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-end">Till datum</Label>
                    <Input
                      id="date-end"
                      type="date"
                      value={formData.date_range_end}
                      onChange={(e) => setFormData({ ...formData, date_range_end: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-type">Filtertyp</Label>
                  <Select
                    value={formData.filter_type}
                    onValueChange={(value) => setFormData({ ...formData, filter_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj filtertyp" />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="county">Län</Label>
                  <Select
                    value={formData.county}
                    onValueChange={(value) => setFormData({ ...formData, county: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj län" />
                    </SelectTrigger>
                    <SelectContent>
                      {SWEDISH_COUNTIES.map(county => (
                        <SelectItem key={county.value} value={county.value}>
                          {county.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="record-count">Antal poster</Label>
                  <Input
                    id="record-count"
                    type="number"
                    min="0"
                    value={formData.record_count}
                    onChange={(e) => setFormData({ ...formData, record_count: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Anteckningar</Label>
                  <Textarea
                    id="notes"
                    placeholder="T.ex. 'Avställda 2-10 månader, Stockholmsområdet'"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Avbryt
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Sparar...' : 'Spara'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {imports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>Inga datahämtningar loggade ännu</p>
            <p className="text-sm mt-1">Klicka på "Logga hämtning" för att börja</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Källa</TableHead>
                <TableHead>Datumperiod</TableHead>
                <TableHead>Filter</TableHead>
                <TableHead>Län</TableHead>
                <TableHead className="text-right">Antal</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports.map(imp => (
                <TableRow key={imp.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {format(new Date(imp.import_date), 'd MMM yyyy', { locale: sv })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{imp.data_source}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDateRange(imp.date_range_start, imp.date_range_end)}
                  </TableCell>
                  <TableCell>
                    {imp.filter_type && (
                      <Badge variant="secondary" className="text-xs">
                        {FILTER_TYPES.find(f => f.value === imp.filter_type)?.label || imp.filter_type}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {imp.county && imp.county !== 'alla' ? (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="h-3 w-3" />
                        {SWEDISH_COUNTIES.find(c => c.value === imp.county)?.label || imp.county}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Hela Sverige</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {imp.record_count > 0 ? imp.record_count.toLocaleString() : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(imp.id)}
                      className="h-8 w-8 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
