import * as XLSX from 'xlsx'

// Fix mojibake - UTF-8 text incorrectly decoded as Latin-1/Windows-1252
function fixEncoding(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return text as string

  // Common Swedish character mojibake patterns (UTF-8 → Latin-1)
  // Using string replacements to avoid regex parsing issues with special chars
  const replacements: [string, string][] = [
    ['Ã…', 'Å'],
    ['Ã¤', 'ä'],
    ['Ã¶', 'ö'],
    ['Ã¥', 'å'],
    ['Ã„', 'Ä'],
    ['Ã–', 'Ö'],
    ['Ã©', 'é'],
    ['Ã¨', 'è'],
    ['Ã¼', 'ü'],
    ['Ã±', 'ñ'],
    ['Â°', '°'],
    ['Â´', '´'],
    ['Â§', '§'],
    ['Ã ', 'à'],
    ['Ã¢', 'â'],
    ['Ã®', 'î'],
    ['Ã´', 'ô'],
    ['Ã»', 'û'],
  ]

  let result = text
  for (const [search, replacement] of replacements) {
    // Use split/join for global replacement without regex
    result = result.split(search).join(replacement)
  }

  return result
}

// Fix encoding for all string values in a row
function fixRowEncoding(row: (string | number | boolean | null | undefined)[]): (string | number | boolean | null | undefined)[] {
  return row.map(cell => {
    if (typeof cell === 'string') {
      return fixEncoding(cell)
    }
    return cell
  })
}

export interface ParsedRow {
  [key: string]: string | number | boolean | null
}

export interface ColumnMapping {
  excelColumn: string
  excelIndex: number
  mappedField: string | null
  sampleValues: string[]
  autoDetected: boolean
}

export interface ParseResult {
  headers: string[]
  rows: ParsedRow[]
  suggestedMappings: ColumnMapping[]
  totalRows: number
}

// Kända fältnamn och deras möjliga kolumnnamn
const FIELD_PATTERNS: Record<string, RegExp[]> = {
  reg_nr: [/reg.*nr/i, /registration/i, /regnr/i, /reg\.nr/i],
  chassis_nr: [/chassi/i, /vin/i, /chassis/i, /frame/i],
  owner_info: [/brukare/i, /ägare/i, /owner/i, /innehavare/i],
  make: [/märke/i, /make/i, /brand/i, /fabrikat/i],
  model: [/^modell$/i, /^model$/i],
  mileage: [/mil(?:tal)?/i, /^km$/i, /mileage/i, /körsträcka/i],
  year: [/^år$/i, /year/i, /årsmodell/i, /modellår/i],
  fuel_type: [/drivmedel/i, /fuel/i, /bränsle/i],
  transmission: [/växel/i, /transmission/i, /gear/i],
  in_traffic: [/trafik/i, /status/i, /i trafik/i],
  horsepower: [/hästkraft/i, /^hk$/i, /^hp$/i, /horsepower/i],
  registration_date: [/registrering.*datum/i, /reg.*datum/i],
  vehicle_type: [/^typ$/i, /fordonstyp/i, /vehicle.*type/i],
  condition: [/^köpt$/i, /skick/i, /condition/i, /begagnad/i],
  four_wheel_drive: [/fyrhjulsdrift/i, /4wd/i, /awd/i, /4x4/i],
  engine_cc: [/cylinder/i, /motor/i, /cc$/i],
  model_series: [/modellserie/i, /serie/i],
}

export function parseExcelBuffer(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Konvertera till JSON med header
  const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })

  if (rawData.length === 0) {
    return { headers: [], rows: [], suggestedMappings: [], totalRows: 0 }
  }

  // Första raden är headers - fix encoding
  const headers = (rawData[0] || []).map((h, i) =>
    h ? fixEncoding(String(h).trim()) : `Kolumn ${i + 1}`
  )

  // Resten är data - fix encoding for all rows
  const dataRows = rawData.slice(1)
    .map(row => fixRowEncoding(row as (string | number | boolean | null | undefined)[]))
    .filter(row =>
      row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
    )

  // Bygg parsed rows
  const rows: ParsedRow[] = dataRows.map(row => {
    const parsed: ParsedRow = {}
    headers.forEach((header, index) => {
      const value = row[index]
      // Apply encoding fix to string values
      parsed[header] = typeof value === 'string' ? fixEncoding(value) : (value ?? null)
    })
    return parsed
  })

  // Auto-detektera kolumnmappningar
  const suggestedMappings: ColumnMapping[] = headers.map((header, index) => {
    const sampleValues = dataRows
      .slice(0, 5)
      .map(row => row[index])
      .filter(v => v !== null && v !== undefined)
      .map(v => fixEncoding(String(v)))

    // Försök matcha mot kända fält
    let mappedField: string | null = null
    let autoDetected = false

    for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(header))) {
        mappedField = field
        autoDetected = true
        break
      }
    }

    // Om ingen header-match, försök gissa baserat på innehåll
    if (!mappedField && sampleValues.length > 0) {
      mappedField = guessFieldFromValues(sampleValues)
      autoDetected = mappedField !== null
    }

    return {
      excelColumn: header,
      excelIndex: index,
      mappedField,
      sampleValues,
      autoDetected
    }
  })

  return {
    headers,
    rows,
    suggestedMappings,
    totalRows: rows.length
  }
}

function guessFieldFromValues(values: string[]): string | null {
  const sample = values[0]

  // Reg.nr pattern: 3 bokstäver + 3 siffror (eller varianter)
  if (/^[A-Z]{3}\d{3}$/i.test(sample)) {
    return 'reg_nr'
  }

  // Chassinummer: 17 tecken alfanumeriskt
  if (/^[A-HJ-NPR-Z0-9]{17}$/i.test(sample)) {
    return 'chassis_nr'
  }

  // Miltal: siffror följt av "km" eller bara stora siffror
  if (/\d+\s*km/i.test(sample) || /^\d{4,6}$/.test(sample)) {
    return 'mileage'
  }

  // År: 4 siffror mellan 1990-2030
  if (/^(19[89]\d|20[0-3]\d)$/.test(sample)) {
    return 'year'
  }

  // Datum: YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(sample)) {
    return 'registration_date'
  }

  return null
}

// Extrahera miltal från olika format
export function extractMileage(value: string | number | null): number | null {
  if (value === null || value === undefined) return null

  const str = String(value).trim()

  // "97960 km" eller "97 960 km"
  const kmMatch = str.match(/(\d[\d\s]*)\s*km/i)
  if (kmMatch) {
    return parseInt(kmMatch[1].replace(/\s/g, ''), 10)
  }

  // "12 mil" -> 12000 km (svenska mil)
  const milMatch = str.match(/^(\d+(?:[.,]\d+)?)\s*mil\b/i)
  if (milMatch) {
    const mil = parseFloat(milMatch[1].replace(',', '.'))
    return Math.round(mil * 1000) // 1 svensk mil = 10 km, men i bilsammanhang ofta 1000 km
  }

  // Bara siffror (antar km)
  const numMatch = str.match(/^(\d{4,6})$/)
  if (numMatch) {
    return parseInt(numMatch[1], 10)
  }

  return null
}

// Extrahera boolean (i trafik, fyrhjulsdrift, etc)
export function extractBoolean(value: string | number | null, truePatterns: RegExp[], falsePatterns: RegExp[]): boolean | null {
  if (value === null || value === undefined) return null

  const str = String(value).toLowerCase().trim()

  for (const pattern of truePatterns) {
    if (pattern.test(str)) return true
  }

  for (const pattern of falsePatterns) {
    if (pattern.test(str)) return false
  }

  return null
}

// Extrahera år
export function extractYear(value: string | number | null): number | null {
  if (value === null || value === undefined) return null

  const str = String(value).trim()

  const match = str.match(/(19[89]\d|20[0-3]\d)/)
  if (match) {
    return parseInt(match[1], 10)
  }

  return null
}

// Extrahera datum
export function extractDate(value: string | number | null): string | null {
  if (value === null || value === undefined) return null

  const str = String(value).trim()

  // ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str
  }

  // DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`
  }

  return null
}

// Extrahera location från ägarinfo ("Man, 31, LYCKSELE" -> "LYCKSELE")
export function extractLocation(ownerInfo: string | null): string | null {
  if (!ownerInfo) return null

  const parts = ownerInfo.split(',')
  const location = parts[parts.length - 1]?.trim()

  // Returnera om det ser ut som en plats (versaler eller första bokstav stor)
  if (location && /^[A-ZÅÄÖ][A-ZÅÄÖa-zåäö\s-]+$/.test(location)) {
    return location
  }

  return null
}
