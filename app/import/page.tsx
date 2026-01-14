'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileDropzone } from '@/components/import/file-dropzone'
import { ColumnMapper } from '@/components/import/column-mapper'
import { ImportPreview } from '@/components/import/import-preview'
import { parseExcelFile, importVehicles, ImportResult } from '@/app/actions/import'
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
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

type ImportStep = 'upload' | 'map' | 'review' | 'complete'

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showErrors, setShowErrors] = useState(false)

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
    const result = await importVehicles(formData, validMappings)

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
  }

  const steps = [
    { key: 'upload', label: 'Ladda upp', icon: Upload },
    { key: 'map', label: 'Mappa kolumner', icon: FileSpreadsheet },
    { key: 'review', label: 'Importera', icon: ArrowRight },
    { key: 'complete', label: 'Klart', icon: Check },
  ]

  const currentStepIndex = steps.findIndex(s => s.key === step)

  return (
    <div className="flex flex-col">
      <Header
        title="Importera data"
        description="Ladda upp och importera fordon från Excel- eller CSV-filer"
      />

      <div className="flex-1 p-6 space-y-6 max-w-4xl mx-auto w-full">
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
    </div>
  )
}
