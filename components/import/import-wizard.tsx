'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { FileDropzone } from '@/components/import/file-dropzone'
import { ColumnMapper } from '@/components/import/column-mapper'
import { ImportPreview } from '@/components/import/import-preview'
import { parseExcelFile, importVehicles, ImportResult, ImportMetadata } from '@/app/actions/import'
import { ParseResult, ColumnMapping } from '@/lib/import/excel-parser'
import { toast } from 'sonner'
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  Check,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MapPin,
  Tag,
  Calendar,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

const SWEDISH_COUNTIES = [
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

const PROSPECT_TYPES = [
  { value: '', label: 'Välj typ...' },
  { value: 'avställda', label: 'Avställda fordon' },
  { value: 'nyköpt_bil', label: 'Nyköpt bil (kort innehavstid)' },
  { value: 'låg_miltal', label: 'Låg körsträcka' },
  { value: 'alla', label: 'Alla typer' },
]

type ImportStep = 'upload' | 'map' | 'review' | 'complete'

export function ImportWizard() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [selectedCounties, setSelectedCounties] = useState<string[]>([])
  const [metadata, setMetadata] = useState<Omit<ImportMetadata, 'county'>>({
    prospect_type: '',
    data_period_start: '',
    data_period_end: ''
  })

  const handleFileAccepted = async (acceptedFile: File) => {
    setFile(acceptedFile)
    setIsLoading(true)

    const formData = new FormData()
    formData.append('file', acceptedFile)

    const result = await parseExcelFile(formData)

    setIsLoading(false)

    if (result.success && result.data) {
      setParseResult(result.data)
      setMappings(result.data.suggestedMappings)
      setStep('map')
      toast.success(`Hittade ${result.data.totalRows} rader att importera`)
    } else {
      toast.error(result.error || 'Kunde inte läsa filen')
      setFile(null)
    }
  }

  const handleClearFile = () => {
    setFile(null)
    setParseResult(null)
    setMappings([])
    setStep('upload')
    setImportResult(null)
  }

  const handleStartImport = async () => {
    if (!file || !parseResult) return

    // Validera att vi har reg_nr eller chassis_nr mappat
    const hasRequired = mappings.some(
      m => m.mappedField === 'reg_nr' || m.mappedField === 'chassis_nr'
    )

    if (!hasRequired) {
      toast.error('Du måste mappa minst Reg.nr eller Chassinummer')
      return
    }

    setIsLoading(true)
    setStep('review')

    const formData = new FormData()
    formData.append('file', file)

    // Filter out any undefined mappings
    const validMappings = mappings.filter(m => m && m.excelColumn !== undefined)

    // Prepare metadata (only include non-empty values)
    const importMetadata: ImportMetadata = {}
    if (selectedCounties.length > 0) importMetadata.county = selectedCounties.join(',')
    if (metadata.prospect_type) importMetadata.prospect_type = metadata.prospect_type
    if (metadata.data_period_start) importMetadata.data_period_start = metadata.data_period_start
    if (metadata.data_period_end) importMetadata.data_period_end = metadata.data_period_end

    const result = await importVehicles(formData, validMappings, importMetadata)

    setIsLoading(false)
    setImportResult(result)
    setStep('complete')

    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
  }

  const handleNewImport = () => {
    setFile(null)
    setParseResult(null)
    setMappings([])
    setStep('upload')
    setImportResult(null)
    setSelectedCounties([])
    setMetadata({
      prospect_type: '',
      data_period_start: '',
      data_period_end: ''
    })
  }

  const toggleCounty = (countyValue: string) => {
    setSelectedCounties(prev => {
      if (prev.includes(countyValue)) {
        return prev.filter(c => c !== countyValue)
      } else {
        return [...prev, countyValue]
      }
    })
  }

  const steps = [
    { key: 'upload', label: 'Ladda upp', icon: Upload },
    { key: 'map', label: 'Mappa kolumner', icon: FileSpreadsheet },
    { key: 'review', label: 'Importera', icon: ArrowRight },
    { key: 'complete', label: 'Klart', icon: Check },
  ]

  const currentStepIndex = steps.findIndex(s => s.key === step)

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((s, index) => {
          const isActive = s.key === step
          const isComplete = index < currentStepIndex
          const Icon = s.icon

          return (
            <div key={s.key} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                    isComplete && "border-green-500 bg-green-500 text-white",
                    isActive && "border-blue-500 bg-blue-500 text-white",
                    !isActive && !isComplete && "border-gray-300 text-gray-400"
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium hidden sm:block",
                    isActive && "text-blue-600",
                    isComplete && "text-green-600",
                    !isActive && !isComplete && "text-gray-400"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-12 sm:w-24 mx-2",
                    index < currentStepIndex ? "bg-green-500" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Välj fil</CardTitle>
            <CardDescription>
              Ladda upp en Excel- eller CSV-fil med fordonsdata. Systemet kommer automatiskt
              försöka matcha kolumnerna mot rätt fält.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileDropzone
              onFileAccepted={handleFileAccepted}
              isLoading={isLoading}
              acceptedFile={file}
              onClear={handleClearFile}
            />
          </CardContent>
        </Card>
      )}

      {step === 'map' && parseResult && (
        <div className="space-y-6">
          {/* Import Metadata */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-600" />
                Import-metadata
              </CardTitle>
              <CardDescription>
                Ange information om denna datahämtning för att enklare kunna filtrera i Playground
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    Län
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-between",
                          selectedCounties.length > 0 && "border-blue-500 bg-blue-50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {selectedCounties.length > 0
                            ? `${selectedCounties.length} län valda`
                            : 'Välj län...'
                          }
                        </div>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <div className="space-y-1 max-h-[300px] overflow-y-auto">
                        {SWEDISH_COUNTIES.map(county => (
                          <label
                            key={county.value}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedCounties.includes(county.value)}
                              onCheckedChange={() => toggleCounty(county.value)}
                            />
                            <span className="text-sm">{county.label}</span>
                          </label>
                        ))}
                      </div>
                      {selectedCounties.length > 0 && (
                        <div className="border-t mt-2 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-gray-500"
                            onClick={() => setSelectedCounties([])}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Rensa val
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  {selectedCounties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedCounties.map(county => {
                        const countyInfo = SWEDISH_COUNTIES.find(c => c.value === county)
                        return (
                          <span
                            key={county}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                          >
                            {countyInfo?.label || county}
                            <button
                              onClick={() => toggleCounty(county)}
                              className="hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    Prospekt-typ
                  </Label>
                  <Select
                    value={metadata.prospect_type}
                    onValueChange={(value) => setMetadata({ ...metadata, prospect_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Välj typ..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PROSPECT_TYPES.map(type => (
                        <SelectItem key={type.value || 'empty'} value={type.value || 'none'}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    Dataperiod från
                  </Label>
                  <Input
                    type="date"
                    value={metadata.data_period_start}
                    onChange={(e) => setMetadata({ ...metadata, data_period_start: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    Dataperiod till
                  </Label>
                  <Input
                    type="date"
                    value={metadata.data_period_end}
                    onChange={(e) => setMetadata({ ...metadata, data_period_end: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mappa kolumner</CardTitle>
              <CardDescription>
                Granska och justera hur Excel-kolumnerna ska mappas till systemets fält.
                Minst Reg.nr eller Chassinummer måste vara mappat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ColumnMapper
                mappings={mappings}
                onMappingsChange={setMappings}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-gray-500" />
                Förhandsvisning av data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ImportPreview data={parseResult} />
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleClearFile}>
              Tillbaka
            </Button>
            <Button onClick={handleStartImport} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importerar...
                </>
              ) : (
                <>
                  Starta import
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <div className="text-center">
                <p className="text-lg font-medium">Importerar data...</p>
                <p className="text-sm text-gray-500 mt-1">
                  Detta kan ta några sekunder beroende på filstorlek
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'complete' && importResult && (
        <div className="space-y-6">
          <Card className={cn(
            importResult.success
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          )}>
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4">
                <div className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full",
                  importResult.success ? "bg-green-100" : "bg-red-100"
                )}>
                  {importResult.success ? (
                    <Check className="h-8 w-8 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  )}
                </div>
                <div className="text-center">
                  <p className={cn(
                    "text-xl font-semibold",
                    importResult.success ? "text-green-900" : "text-red-900"
                  )}>
                    {importResult.success ? 'Import slutförd!' : 'Import misslyckades'}
                  </p>
                  <p className={cn(
                    "text-sm mt-1",
                    importResult.success ? "text-green-700" : "text-red-700"
                  )}>
                    {importResult.message}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {importResult.stats && (
            <Card>
              <CardHeader>
                <CardTitle>Importstatistik</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {importResult.stats.totalRows}
                    </p>
                    <p className="text-sm text-gray-500">Totala rader</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">
                      {importResult.stats.newVehicles}
                    </p>
                    <p className="text-sm text-green-600">Nya fordon</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">
                      {importResult.stats.duplicateVehicles}
                    </p>
                    <p className="text-sm text-blue-600">Dubbletter</p>
                  </div>
                  {importResult.stats.errors > 0 && (
                    <div className="rounded-lg bg-red-50 p-4 text-center">
                      <p className="text-2xl font-bold text-red-700">
                        {importResult.stats.errors}
                      </p>
                      <p className="text-sm text-red-600">Fel</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {importResult.errors && importResult.errors.length > 0 && (
            <Collapsible open={showErrors} onOpenChange={setShowErrors}>
              <Card className="border-amber-200">
                <CardHeader>
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <CardTitle className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="h-5 w-5" />
                      {importResult.errors.length} varningar/fel
                    </CardTitle>
                    {showErrors ? (
                      <ChevronUp className="h-5 w-5 text-amber-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-amber-600" />
                    )}
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <li
                          key={index}
                          className="text-sm text-amber-700 bg-amber-50 rounded px-3 py-2"
                        >
                          {error}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          <div className="flex justify-center">
            <Button onClick={handleNewImport} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Importera ny fil
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
