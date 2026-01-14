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

export async function importVehicles(
  formData: FormData,
  mappings: ColumnMapping[]
): Promise<ImportResult> {
  const supabase = await createClient()
  const errors: string[] = []

  let newLeads = 0
  let newVehicles = 0
  let duplicateVehicles = 0
  let updatedVehicles = 0

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
      if (m.mappedField) {
        fieldMap[m.excelColumn] = m.mappedField
      }
    })

    // Bearbeta varje rad
    for (let i = 0; i < parseResult.rows.length; i++) {
      const row = parseResult.rows[i]

      try {
        // Mappa data
        const mapped: MappedData = {}

        for (const [excelCol, value] of Object.entries(row)) {
          const field = fieldMap[excelCol]
          if (!field || value === null || value === undefined) continue

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

        // Kontrollera duplicat
        let existingVehicle = null

        // Prioritera chassinummer för duplikat-detektion
        if (mapped.chassis_nr) {
          const { data } = await supabase
            .from('vehicles')
            .select('id, lead_id')
            .eq('chassis_nr', mapped.chassis_nr)
            .single()
          existingVehicle = data
        }

        // Om ingen chassi-match, försök reg.nr
        if (!existingVehicle && mapped.reg_nr) {
          const { data } = await supabase
            .from('vehicles')
            .select('id, lead_id')
            .eq('reg_nr', mapped.reg_nr)
            .single()
          existingVehicle = data
        }

        if (existingVehicle) {
          // Uppdatera befintligt fordon
          const { error: updateError } = await supabase
            .from('vehicles')
            .update({
              make: mapped.make,
              model: mapped.model,
              mileage: mapped.mileage,
              year: mapped.year,
              fuel_type: mapped.fuel_type,
              in_traffic: mapped.in_traffic,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingVehicle.id)

          if (updateError) {
            errors.push(`Rad ${i + 2}: Kunde inte uppdatera fordon - ${updateError.message}`)
          } else {
            updatedVehicles++
            duplicateVehicles++
          }
          continue
        }

        // Skapa ny lead
        const location = extractLocation(mapped.owner_info || null)

        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .insert({
            owner_info: mapped.owner_info,
            location: location,
            status: 'new',
            source: 'excel_import'
          })
          .select('id')
          .single()

        if (leadError || !lead) {
          errors.push(`Rad ${i + 2}: Kunde inte skapa lead - ${leadError?.message}`)
          continue
        }

        newLeads++

        // Skapa fordon kopplat till lead
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .insert({
            lead_id: lead.id,
            reg_nr: mapped.reg_nr,
            chassis_nr: mapped.chassis_nr,
            make: mapped.make,
            model: mapped.model,
            mileage: mapped.mileage,
            year: mapped.year,
            fuel_type: mapped.fuel_type,
            in_traffic: mapped.in_traffic
          })

        if (vehicleError) {
          errors.push(`Rad ${i + 2}: Kunde inte skapa fordon - ${vehicleError.message}`)
        } else {
          newVehicles++
        }

      } catch (rowError) {
        errors.push(`Rad ${i + 2}: ${rowError instanceof Error ? rowError.message : 'Okänt fel'}`)
      }
    }

    // Spara import-historik
    await supabase.from('import_history').insert({
      filename: file.name,
      total_rows: parseResult.totalRows,
      new_leads: newLeads,
      new_vehicles: newVehicles,
      duplicate_vehicles: duplicateVehicles,
      updated_vehicles: updatedVehicles,
      errors: errors.length,
      error_details: errors.length > 0 ? errors : null
    })

    revalidatePath('/')
    revalidatePath('/leads')
    revalidatePath('/vehicles')

    return {
      success: true,
      message: `Import klar! ${newVehicles} nya fordon, ${duplicateVehicles} dubbletter (${updatedVehicles} uppdaterade)`,
      stats: {
        totalRows: parseResult.totalRows,
        newLeads,
        newVehicles,
        duplicateVehicles,
        updatedVehicles,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    }

  } catch (error) {
    console.error('Import error:', error)
    return {
      success: false,
      message: 'Ett fel uppstod under importen',
      errors: [error instanceof Error ? error.message : 'Okänt fel']
    }
  }
}
