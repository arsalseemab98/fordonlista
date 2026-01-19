'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseExcelBuffer, extractMileage, extractBoolean, extractDate, extractYear, extractLocation, ParseResult, ColumnMapping } from '@/lib/import/excel-parser'

export interface ImportResult {
  success: boolean
  message: string
  stats?: {
    totalRows: number
    newLeads: number
    newVehicles: number
    duplicateVehicles: number
    updatedVehicles: number
    errors: number
  }
  errors?: string[]
}

interface MappedData {
  reg_nr?: string
  chassis_nr?: string
  owner_info?: string
  make?: string
  model?: string
  mileage?: number | null
  year?: number | null
  fuel_type?: string
  transmission?: string
  in_traffic?: boolean | null
  horsepower?: number | null
  registration_date?: string | null
  vehicle_type?: string
  condition?: string
  four_wheel_drive?: boolean | null
  engine_cc?: number | null
  model_series?: string
  extra_data?: Record<string, string | number | boolean | null>
}

// Patterns för boolean-extraktion
const IN_TRAFFIC_TRUE = [/^ja$/i, /^yes$/i, /^1$/, /^true$/i, /^i trafik$/i]
const IN_TRAFFIC_FALSE = [/^nej$/i, /^no$/i, /^0$/, /^false$/i, /^avställd$/i, /^ur trafik$/i]
const FOUR_WD_TRUE = [/^ja$/i, /^yes$/i, /^1$/, /^true$/i, /^4wd$/i, /^awd$/i, /^4x4$/i]
const FOUR_WD_FALSE = [/^nej$/i, /^no$/i, /^0$/, /^false$/i, /^2wd$/i, /^fwd$/i, /^rwd$/i]

export async function parseExcelFile(formData: FormData): Promise<{ success: boolean; data?: ParseResult; error?: string }> {
  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'Ingen fil vald' }
    }

    const buffer = await file.arrayBuffer()
    const result = parseExcelBuffer(buffer)

    if (result.totalRows === 0) {
      return { success: false, error: 'Excel-filen är tom eller kunde inte läsas' }
    }

    return { success: true, data: result }
  } catch (error) {
    console.error('Parse error:', error)
    return { success: false, error: 'Kunde inte läsa Excel-filen. Kontrollera formatet.' }
  }
}

export interface ImportMetadata {
  county?: string
  prospect_type?: string
  data_period_start?: string
  data_period_end?: string
}

export async function importVehicles(
  formData: FormData,
  mappings: ColumnMapping[],
  metadata?: ImportMetadata
): Promise<ImportResult> {
  const supabase = await createClient()
  const errors: string[] = []

  let newLeads = 0
  let newVehicles = 0

  try {
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, message: 'Ingen fil vald' }
    }

    const buffer = await file.arrayBuffer()
    const parseResult = parseExcelBuffer(buffer)

    if (parseResult.totalRows === 0) {
      return { success: false, message: 'Ingen data att importera' }
    }

    // Skapa mapping dictionary
    const fieldMap: Record<string, string> = {}
    mappings.forEach(m => {
      if (m && m.mappedField && m.excelColumn) {
        fieldMap[m.excelColumn] = m.mappedField
      }
    })

    // ============================================
    // PHASE 1: Parse all data and extract identifiers
    // ============================================
    interface ProcessedRow {
      rowIndex: number
      mapped: MappedData
      extraData: Record<string, string | number | boolean | null>
    }

    const processedRows: ProcessedRow[] = []

    for (let i = 0; i < parseResult.rows.length; i++) {
      const row = parseResult.rows[i]

      try {
        const mapped: MappedData = {}
        const extraData: Record<string, string | number | boolean | null> = {}

        for (const [excelCol, value] of Object.entries(row)) {
          const field = fieldMap[excelCol]

          if (!field) {
            if (value !== null && value !== undefined && value !== '') {
              extraData[excelCol] = typeof value === 'object' ? JSON.stringify(value) : value
            }
            continue
          }

          if (value === null || value === undefined) continue

          switch (field) {
            case 'reg_nr':
              mapped.reg_nr = String(value).toUpperCase().replace(/\s/g, '')
              break
            case 'chassis_nr':
              mapped.chassis_nr = String(value).toUpperCase().replace(/\s/g, '')
              break
            case 'owner_info':
              mapped.owner_info = String(value)
              break
            case 'make':
              mapped.make = String(value).trim()
              break
            case 'model':
              mapped.model = String(value).trim()
              break
            case 'mileage':
              mapped.mileage = extractMileage(typeof value === 'boolean' ? null : value)
              break
            case 'year':
              mapped.year = extractYear(typeof value === 'boolean' ? null : value)
              break
            case 'fuel_type':
              mapped.fuel_type = String(value).trim()
              break
            case 'transmission':
              mapped.transmission = String(value).trim()
              break
            case 'in_traffic':
              mapped.in_traffic = extractBoolean(typeof value === 'boolean' ? null : value, IN_TRAFFIC_TRUE, IN_TRAFFIC_FALSE)
              break
            case 'horsepower':
              const hp = parseInt(String(value).replace(/\D/g, ''))
              mapped.horsepower = isNaN(hp) ? null : hp
              break
            case 'registration_date':
              mapped.registration_date = extractDate(typeof value === 'boolean' ? null : value)
              break
            case 'vehicle_type':
              mapped.vehicle_type = String(value).trim()
              break
            case 'condition':
              mapped.condition = String(value).trim()
              break
            case 'four_wheel_drive':
              mapped.four_wheel_drive = extractBoolean(typeof value === 'boolean' ? null : value, FOUR_WD_TRUE, FOUR_WD_FALSE)
              break
            case 'engine_cc':
              const cc = parseInt(String(value).replace(/\D/g, ''))
              mapped.engine_cc = isNaN(cc) ? null : cc
              break
            case 'model_series':
              mapped.model_series = String(value).trim()
              break
          }
        }

        // Kräv minst reg_nr eller chassis_nr
        if (!mapped.reg_nr && !mapped.chassis_nr) {
          errors.push(`Rad ${i + 2}: Saknar reg.nr eller chassinummer`)
          continue
        }

        processedRows.push({ rowIndex: i, mapped, extraData })
      } catch (rowError) {
        errors.push(`Rad ${i + 2}: ${rowError instanceof Error ? rowError.message : 'Okänt fel'}`)
      }
    }

    // ============================================
    // PHASE 2: Batch insert new leads (chunked for large imports)
    // No duplicate checking - handled in playground instead
    // ============================================
    const INSERT_CHUNK_SIZE = 500 // Supabase works best with smaller batches

    if (processedRows.length > 0) {
      const allInsertedLeads: { id: string }[] = []

      // Process leads in chunks
      for (let i = 0; i < processedRows.length; i += INSERT_CHUNK_SIZE) {
        const chunk = processedRows.slice(i, i + INSERT_CHUNK_SIZE)

        const leadsToInsert = chunk.map(row => {
          const location = extractLocation(row.mapped.owner_info || null)
          const hasExtraData = Object.keys(row.extraData).length > 0
          return {
            owner_info: row.mapped.owner_info,
            location: location,
            status: 'pending_review',
            source: 'excel_import',
            county: metadata?.county || null,
            prospect_type: metadata?.prospect_type || null,
            data_period_start: metadata?.data_period_start || null,
            data_period_end: metadata?.data_period_end || null,
            extra_data: hasExtraData ? row.extraData : null
          }
        })

        const { data: insertedLeads, error: leadsError } = await supabase
          .from('leads')
          .insert(leadsToInsert)
          .select('id')

        if (leadsError || !insertedLeads) {
          errors.push(`Kunde inte skapa leads (chunk ${Math.floor(i / INSERT_CHUNK_SIZE) + 1}): ${leadsError?.message}`)
        } else {
          allInsertedLeads.push(...insertedLeads)
        }
      }

      newLeads = allInsertedLeads.length

      // ============================================
      // PHASE 6: Batch insert new vehicles (chunked)
      // ============================================
      if (allInsertedLeads.length > 0) {
        for (let i = 0; i < allInsertedLeads.length; i += INSERT_CHUNK_SIZE) {
          const leadChunk = allInsertedLeads.slice(i, i + INSERT_CHUNK_SIZE)
          const rowChunk = processedRows.slice(i, i + INSERT_CHUNK_SIZE)

          const vehiclesToInsert = leadChunk.map((lead, index) => {
            const row = rowChunk[index]
            return {
              lead_id: lead.id,
              reg_nr: row.mapped.reg_nr,
              chassis_nr: row.mapped.chassis_nr,
              make: row.mapped.make,
              model: row.mapped.model,
              mileage: row.mapped.mileage,
              year: row.mapped.year,
              fuel_type: row.mapped.fuel_type,
              in_traffic: row.mapped.in_traffic
            }
          })

          const { data: insertedVehicles, error: vehiclesError } = await supabase
            .from('vehicles')
            .insert(vehiclesToInsert)
            .select('id')

          if (vehiclesError) {
            errors.push(`Kunde inte skapa fordon (chunk ${Math.floor(i / INSERT_CHUNK_SIZE) + 1}): ${vehiclesError.message}`)
          } else {
            newVehicles += insertedVehicles?.length || 0
          }
        }
      }
    }

    // Spara import-historik
    await supabase.from('import_history').insert({
      filename: file.name,
      total_rows: parseResult.totalRows,
      new_leads: newLeads,
      new_vehicles: newVehicles,
      duplicate_vehicles: 0, // No longer checked during import
      updated_vehicles: 0,   // No longer checked during import
      errors: errors.length,
      error_details: errors.length > 0 ? errors : null
    })

    revalidatePath('/')
    revalidatePath('/leads')
    revalidatePath('/vehicles')
    revalidatePath('/playground')

    return {
      success: true,
      message: `Import klar! ${newVehicles} fordon importerade. Kontrollera dubbletter i Playground.`,
      stats: {
        totalRows: parseResult.totalRows,
        newLeads,
        newVehicles,
        duplicateVehicles: 0, // No longer checked during import
        updatedVehicles: 0,   // No longer checked during import
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    }

  } catch (error) {
    console.error('Import error:', error)
    const errorMessage = error instanceof Error
      ? `${error.message}${error.stack ? `\n${error.stack}` : ''}`
      : 'Okänt fel'
    console.error('Full error details:', errorMessage)
    return {
      success: false,
      message: 'Ett fel uppstod under importen',
      errors: [error instanceof Error ? error.message : 'Okänt fel']
    }
  }
}
