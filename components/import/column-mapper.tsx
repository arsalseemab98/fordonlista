'use client'

import { useState } from 'react'
import { ColumnMapping } from '@/lib/import/excel-parser'
import { cn } from '@/lib/utils'
import { Check, AlertCircle, ChevronDown, Sparkles } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Alla tillgängliga fält för mappning
const AVAILABLE_FIELDS = [
  { value: 'reg_nr', label: 'Reg.nr', required: true },
  { value: 'chassis_nr', label: 'Chassinummer', required: false },
  { value: 'owner_info', label: 'Ägarinfo', required: false },
  { value: 'make', label: 'Märke', required: false },
  { value: 'model', label: 'Modell', required: false },
  { value: 'mileage', label: 'Miltal', required: false },
  { value: 'year', label: 'Årsmodell', required: false },
  { value: 'fuel_type', label: 'Drivmedel', required: false },
  { value: 'transmission', label: 'Växellåda', required: false },
  { value: 'in_traffic', label: 'I trafik', required: false },
  { value: 'horsepower', label: 'Hästkrafter', required: false },
  { value: 'registration_date', label: 'Reg.datum', required: false },
  { value: 'vehicle_type', label: 'Fordonstyp', required: false },
  { value: 'condition', label: 'Skick', required: false },
  { value: 'four_wheel_drive', label: 'Fyrhjulsdrift', required: false },
  { value: 'engine_cc', label: 'Cylindervolym', required: false },
  { value: 'model_series', label: 'Modellserie', required: false },
]

interface ColumnMapperProps {
  mappings: ColumnMapping[]
  onMappingsChange: (mappings: ColumnMapping[]) => void
}

export function ColumnMapper({ mappings, onMappingsChange }: ColumnMapperProps) {
  const handleMappingChange = (index: number, newField: string | null) => {
    const updated = [...mappings]
    updated[index] = {
      ...updated[index],
      mappedField: newField === 'none' ? null : newField,
      autoDetected: false
    }
    onMappingsChange(updated)
  }

  // Hitta använda fält
  const usedFields = new Set(mappings.map(m => m.mappedField).filter(Boolean))

  // Kontrollera om reg_nr eller chassis_nr är mappat
  const hasRequiredField = mappings.some(m =>
    m.mappedField === 'reg_nr' || m.mappedField === 'chassis_nr'
  )

  const autoDetectedCount = mappings.filter(m => m.autoDetected && m.mappedField).length
  const unmappedCount = mappings.filter(m => !m.mappedField).length

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Status bar */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
          <div className="flex items-center gap-4">
            {autoDetectedCount > 0 && (
              <Badge variant="secondary" className="gap-1.5 bg-blue-100 text-blue-700">
                <Sparkles className="h-3 w-3" />
                {autoDetectedCount} auto-detekterade
              </Badge>
            )}
            {unmappedCount > 0 && (
              <Badge variant="outline" className="text-gray-500">
                {unmappedCount} ej mappade
              </Badge>
            )}
          </div>
          {!hasRequiredField && (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Reg.nr eller chassinummer krävs</span>
            </div>
          )}
        </div>

        {/* Mapping table */}
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Excel-kolumn
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Mappat till
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                  Exempelvärden
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mappings.map((mapping, index) => (
                <tr
                  key={index}
                  className={cn(
                    "transition-colors",
                    mapping.mappedField ? "bg-white" : "bg-gray-50/50"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {mapping.excelColumn}
                      </span>
                      {mapping.autoDetected && mapping.mappedField && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Sparkles className="h-4 w-4 text-blue-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Auto-detekterad matchning
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={mapping.mappedField || 'none'}
                      onValueChange={(value) => handleMappingChange(index, value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Välj fält..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-gray-400">Importera ej</span>
                        </SelectItem>
                        {AVAILABLE_FIELDS.map((field) => {
                          const isUsed = usedFields.has(field.value) && mapping.mappedField !== field.value
                          return (
                            <SelectItem
                              key={field.value}
                              value={field.value}
                              disabled={isUsed}
                            >
                              <span className={cn(isUsed && "text-gray-400")}>
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {mapping.sampleValues.slice(0, 3).map((value, vIndex) => (
                        <span
                          key={vIndex}
                          className="inline-flex max-w-[150px] truncate rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {value}
                        </span>
                      ))}
                      {mapping.sampleValues.length === 0 && (
                        <span className="text-xs text-gray-400 italic">Tomt</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  )
}
