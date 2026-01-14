# Fordonlista Lead Management System - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bygga ett lead management system för biluppköp med AI-stöd som förhindrar dubbelringning och prioriterar leads.

**Architecture:** Next.js 14 App Router med Supabase för databas och autentisering. Excel-import med xlsx-biblioteket. AI-rekommendationer via OpenAI API. Server Actions för datahantering.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Supabase, OpenAI API, xlsx, Vercel

---

## Fas 1: Projektsetup

### Task 1: Skapa Supabase-projekt

**Mål:** Skapa nytt Supabase-projekt för Fordonlista

**Steg:**
1. Skapa projekt via Supabase MCP
2. Notera project ID och API-nycklar
3. Verifiera att projektet är aktivt

---

### Task 2: Initiera Next.js-projekt

**Files:**
- Create: `~/Desktop/fordonlista/package.json`
- Create: `~/Desktop/fordonlista/app/layout.tsx`
- Create: `~/Desktop/fordonlista/app/page.tsx`

**Step 1: Skapa Next.js projekt**

```bash
cd ~/Desktop/fordonlista
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

**Step 2: Installera dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr xlsx lucide-react date-fns
npm install openai
npx shadcn@latest init
```

**Step 3: Installera shadcn komponenter**

```bash
npx shadcn@latest add button card input label table dialog select badge tabs toast dropdown-menu
```

**Step 4: Commit**

```bash
git init
git add .
git commit -m "feat: initial Next.js setup with Tailwind and shadcn"
```

---

### Task 3: Konfigurera Supabase-klient

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `.env.local`

**Step 1: Skapa miljövariabler**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key
```

**Step 2: Skapa client-side Supabase**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 3: Skapa server-side Supabase**

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: configure Supabase client"
```

---

## Fas 2: Databasschema

### Task 4: Skapa leads-tabell

**Migration:** `create_leads_table`

```sql
-- Leads/Bilägare tabell
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Kontaktinfo
  phone VARCHAR(20),
  owner_info TEXT, -- "Man, 31, LYCKSELE"
  location VARCHAR(100),

  -- Status
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'to_call', 'called', 'interested', 'booked', 'bought', 'not_interested', 'do_not_call')),

  -- Metadata
  source VARCHAR(100), -- Var leadet kom ifrån
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_called_at TIMESTAMP WITH TIME ZONE,
  follow_up_date DATE,

  -- Unik constraint för att undvika dubletter
  UNIQUE(phone)
);

-- Index för snabb sökning
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_location ON leads(location);
```

---

### Task 5: Skapa vehicles-tabell

**Migration:** `create_vehicles_table`

```sql
-- Fordon kopplade till leads
CREATE TABLE vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  -- Fordonsinfo
  reg_nr VARCHAR(10) UNIQUE,
  make VARCHAR(50), -- SUBARU, RENAULT
  model VARCHAR(50), -- XV, MODUS
  model_series VARCHAR(50),
  vehicle_type VARCHAR(30), -- Personbil
  condition VARCHAR(20), -- Begagnad, Ny

  -- Teknisk info
  year INTEGER,
  mileage INTEGER, -- i km
  horsepower INTEGER,
  fuel_type VARCHAR(20), -- BENSIN, DIESEL, EL
  transmission VARCHAR(20), -- Manuell, Automat
  four_wheel_drive BOOLEAN DEFAULT FALSE,
  engine_cc INTEGER, -- Cylindervolym

  -- Status
  in_traffic BOOLEAN, -- I trafik eller avställd
  deregistered_date DATE, -- När avställd
  registration_date DATE,

  -- Finansiering
  financing_type VARCHAR(30),
  leasing_company VARCHAR(100),

  -- Vår bedömning
  is_interesting BOOLEAN DEFAULT TRUE,
  skip_reason TEXT, -- Varför vi inte är intresserade
  estimated_value INTEGER,

  -- AI-scoring
  ai_score DECIMAL(3,2), -- 0.00 - 1.00
  ai_reasoning TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_vehicles_lead ON vehicles(lead_id);
CREATE INDEX idx_vehicles_reg ON vehicles(reg_nr);
CREATE INDEX idx_vehicles_make ON vehicles(make);
CREATE INDEX idx_vehicles_interesting ON vehicles(is_interesting);
CREATE INDEX idx_vehicles_in_traffic ON vehicles(in_traffic);
```

---

### Task 6: Skapa call_logs-tabell

**Migration:** `create_call_logs_table`

```sql
-- Samtalshistorik
CREATE TABLE call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,

  -- Samtalsinfo
  called_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  result VARCHAR(30) CHECK (result IN ('no_answer', 'busy', 'not_interested', 'interested', 'booked', 'wrong_number', 'call_back')),
  notes TEXT,

  -- Uppföljning
  follow_up_date DATE,
  follow_up_notes TEXT,

  -- Bokningsinfo (om intresserad)
  booking_date TIMESTAMP WITH TIME ZONE,
  booking_location TEXT
);

-- Index
CREATE INDEX idx_call_logs_lead ON call_logs(lead_id);
CREATE INDEX idx_call_logs_date ON call_logs(called_at);
CREATE INDEX idx_call_logs_result ON call_logs(result);
```

---

### Task 7: Skapa ai_patterns-tabell

**Migration:** `create_ai_patterns_table`

```sql
-- AI-inlärda mönster och preferenser
CREATE TABLE ai_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Mönstertyp
  pattern_type VARCHAR(30) CHECK (pattern_type IN ('preferred_make', 'avoid_make', 'max_mileage', 'min_year', 'problem_model', 'success_pattern')),

  -- Mönsterdata
  make VARCHAR(50),
  model VARCHAR(50),
  condition_key VARCHAR(50), -- t.ex. "mileage_threshold", "year_threshold"
  condition_value TEXT,

  -- Statistik
  occurrence_count INTEGER DEFAULT 1,
  success_rate DECIMAL(3,2), -- För bilar ni köpt

  -- Metadata
  learned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT
);

-- Index
CREATE INDEX idx_ai_patterns_type ON ai_patterns(pattern_type);
CREATE INDEX idx_ai_patterns_make ON ai_patterns(make);
```

---

### Task 8: Skapa preferences-tabell

**Migration:** `create_preferences_table`

```sql
-- Användarpreferenser och inställningar
CREATE TABLE preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default preferenser
INSERT INTO preferences (key, value) VALUES
  ('preferred_makes', '["VOLVO", "TOYOTA", "VOLKSWAGEN", "SKODA", "BMW", "AUDI"]'),
  ('avoid_makes', '["FIAT", "ALFA ROMEO", "LANCIA"]'),
  ('max_mileage', '150000'),
  ('min_year', '2010'),
  ('prioritize_deregistered', 'true'),
  ('daily_call_target', '20');
```

---

## Fas 3: Excel Import

### Task 9: Skapa Excel parser

**Files:**
- Create: `lib/excel-parser.ts`

**Step 1: Implementera parser**

```typescript
// lib/excel-parser.ts
import * as XLSX from 'xlsx'

export interface ExcelRow {
  ownerInfo: string
  regNr: string
  make: string
  model: string
  vehicleType: string
  condition: string
  purchasePlace: string
  modelDesignation: string
  tradeName: string
  modelSeries: string
  horsepower: number | null
  fourWheelDrive: boolean
  maxTrailerWeight: number | null
  responsible: string
  ownershipTime: string
  registrationDate: string | null
  financing: string
  leasingCompany: string
  inTraffic: boolean
  fuelType: string
  environmentClass: string
  transmission: string
  engineCC: number | null
  mileage: number | null
}

export function parseExcelFile(buffer: ArrayBuffer): ExcelRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

  // Hitta header-raden
  const headerRow = rawData[0] || []
  const dataRows = rawData.slice(1)

  return dataRows
    .filter(row => row.length > 0 && row[1]) // Måste ha reg.nr
    .map(row => ({
      ownerInfo: row[0] || '',
      regNr: (row[1] || '').toString().toUpperCase().trim(),
      make: (row[2] || '').toString().toUpperCase(),
      model: (row[3] || '').toString().toUpperCase(),
      vehicleType: row[4] || '',
      condition: row[5] || '',
      purchasePlace: row[6] || '',
      modelDesignation: row[7] || '',
      tradeName: row[8] || '',
      modelSeries: row[9] || '',
      horsepower: parseNumber(row[10]),
      fourWheelDrive: row[11]?.toString().toLowerCase() === 'ja',
      maxTrailerWeight: parseNumber(row[12]),
      responsible: row[13] || '',
      ownershipTime: row[14] || '',
      registrationDate: parseDate(row[15]),
      financing: row[16] || '',
      leasingCompany: row[17] || '',
      inTraffic: row[18]?.toString().toLowerCase() !== 'avställd',
      fuelType: row[19] || '',
      environmentClass: row[20] || '',
      transmission: row[21] || '',
      engineCC: parseNumber(row[22]),
      mileage: parseMileage(row[23])
    }))
}

function parseNumber(value: any): number | null {
  if (!value) return null
  const num = parseInt(value.toString().replace(/\D/g, ''), 10)
  return isNaN(num) ? null : num
}

function parseMileage(value: any): number | null {
  if (!value) return null
  // Hantera "97960 km" format
  const match = value.toString().match(/(\d+)\s*km/i)
  if (match) return parseInt(match[1], 10)
  return parseNumber(value)
}

function parseDate(value: any): string | null {
  if (!value) return null
  // Hantera Excel datum eller sträng
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }
  return value.toString()
}

export function extractLocation(ownerInfo: string): string {
  // "Man, 31, LYCKSELE" -> "LYCKSELE"
  const parts = ownerInfo.split(',')
  return parts[parts.length - 1]?.trim() || ''
}
```

**Step 2: Commit**

```bash
git add lib/excel-parser.ts
git commit -m "feat: add Excel parser for vehicle data import"
```

---

### Task 10: Skapa import Server Action

**Files:**
- Create: `app/actions/import.ts`

**Step 1: Implementera import action**

```typescript
// app/actions/import.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { parseExcelFile, extractLocation, ExcelRow } from '@/lib/excel-parser'
import { revalidatePath } from 'next/cache'

export interface ImportResult {
  success: boolean
  imported: number
  duplicates: number
  errors: string[]
  duplicateRegNrs: string[]
}

export async function importExcelFile(formData: FormData): Promise<ImportResult> {
  const file = formData.get('file') as File
  if (!file) {
    return { success: false, imported: 0, duplicates: 0, errors: ['Ingen fil vald'], duplicateRegNrs: [] }
  }

  const buffer = await file.arrayBuffer()
  const rows = parseExcelFile(buffer)

  const supabase = await createClient()

  let imported = 0
  let duplicates = 0
  const errors: string[] = []
  const duplicateRegNrs: string[] = []

  for (const row of rows) {
    try {
      // Kolla om fordon redan finns
      const { data: existingVehicle } = await supabase
        .from('vehicles')
        .select('id, lead_id')
        .eq('reg_nr', row.regNr)
        .single()

      if (existingVehicle) {
        duplicates++
        duplicateRegNrs.push(row.regNr)
        continue
      }

      // Skapa eller hitta lead baserat på owner_info
      const location = extractLocation(row.ownerInfo)

      // Skapa ny lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          owner_info: row.ownerInfo,
          location: location,
          status: 'new',
          source: 'excel_import'
        })
        .select()
        .single()

      if (leadError) {
        errors.push(`Lead error för ${row.regNr}: ${leadError.message}`)
        continue
      }

      // Skapa fordon
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          lead_id: lead.id,
          reg_nr: row.regNr,
          make: row.make,
          model: row.model,
          model_series: row.modelSeries,
          vehicle_type: row.vehicleType,
          condition: row.condition,
          horsepower: row.horsepower,
          fuel_type: row.fuelType,
          transmission: row.transmission,
          four_wheel_drive: row.fourWheelDrive,
          engine_cc: row.engineCC,
          mileage: row.mileage,
          in_traffic: row.inTraffic,
          registration_date: row.registrationDate
        })

      if (vehicleError) {
        errors.push(`Vehicle error för ${row.regNr}: ${vehicleError.message}`)
        continue
      }

      imported++
    } catch (err) {
      errors.push(`Fel vid import av ${row.regNr}: ${err}`)
    }
  }

  revalidatePath('/leads')

  return {
    success: errors.length === 0,
    imported,
    duplicates,
    errors,
    duplicateRegNrs
  }
}
```

**Step 2: Commit**

```bash
git add app/actions/import.ts
git commit -m "feat: add Excel import server action with duplicate detection"
```

---

## Fas 4: UI Komponenter

### Task 11: Skapa Dashboard Layout

**Files:**
- Create: `app/layout.tsx` (uppdatera)
- Create: `components/sidebar.tsx`
- Create: `components/header.tsx`

**Step 1: Implementera sidebar**

```typescript
// components/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Car,
  Phone,
  Upload,
  Settings,
  Brain
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Fordon', href: '/vehicles', icon: Car },
  { name: 'Att ringa', href: '/to-call', icon: Phone },
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'AI Insikter', href: '/ai', icon: Brain },
  { name: 'Inställningar', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">Fordonlista</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/sidebar.tsx
git commit -m "feat: add sidebar navigation component"
```

---

### Task 12: Skapa Import-sida med Drag & Drop

**Files:**
- Create: `app/import/page.tsx`
- Create: `components/file-dropzone.tsx`

**Step 1: Implementera dropzone**

```typescript
// components/file-dropzone.tsx
'use client'

import { useCallback, useState } from 'react'
import { Upload, FileSpreadsheet, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  onFileSelect: (file: File) => void
  accept?: string
  disabled?: boolean
}

export function FileDropzone({ onFileSelect, accept = '.xlsx,.xls', disabled }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true)
    } else if (e.type === 'dragleave') {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      setSelectedFile(files[0])
      onFileSelect(files[0])
    }
  }, [onFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      setSelectedFile(files[0])
      onFileSelect(files[0])
    }
  }, [onFileSelect])

  const clearFile = () => {
    setSelectedFile(null)
  }

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {selectedFile ? (
        <div className="flex items-center justify-center gap-3">
          <FileSpreadsheet className="h-8 w-8 text-green-600" />
          <span className="font-medium">{selectedFile.name}</span>
          <button onClick={clearFile} className="text-gray-500 hover:text-red-500">
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <>
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Dra och släpp Excel-fil här, eller{' '}
            <label className="cursor-pointer text-blue-600 hover:underline">
              bläddra
              <input
                type="file"
                className="hidden"
                accept={accept}
                onChange={handleFileInput}
                disabled={disabled}
              />
            </label>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            .xlsx eller .xls filer
          </p>
        </>
      )}
    </div>
  )
}
```

**Step 2: Implementera import-sida**

```typescript
// app/import/page.tsx
'use client'

import { useState } from 'react'
import { FileDropzone } from '@/components/file-dropzone'
import { importExcelFile, ImportResult } from '@/app/actions/import'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    const importResult = await importExcelFile(formData)
    setResult(importResult)
    setLoading(false)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Importera Excel</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Ladda upp fordonslista</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileDropzone onFileSelect={setFile} disabled={loading} />

          <Button
            onClick={handleImport}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importerar...
              </>
            ) : (
              'Importera'
            )}
          </Button>

          {result && (
            <div className="space-y-3">
              <Alert variant={result.success ? 'default' : 'destructive'}>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Importerade {result.imported} fordon
                </AlertDescription>
              </Alert>

              {result.duplicates > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {result.duplicates} dubletter hoppades över: {result.duplicateRegNrs.slice(0, 5).join(', ')}
                    {result.duplicateRegNrs.length > 5 && ` och ${result.duplicateRegNrs.length - 5} till...`}
                  </AlertDescription>
                </Alert>
              )}

              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {result.errors.length} fel: {result.errors[0]}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add components/file-dropzone.tsx app/import/page.tsx
git commit -m "feat: add Excel import page with drag & drop"
```

---

## Fas 5: Lead & Samtalshantering

### Task 13: Skapa Leads-lista

**Files:**
- Create: `app/leads/page.tsx`
- Create: `components/leads-table.tsx`

*(Kod för leads-tabell med filtrering, status-uppdatering, etc.)*

---

### Task 14: Skapa Samtalslogg-dialog

**Files:**
- Create: `components/call-dialog.tsx`
- Create: `app/actions/calls.ts`

*(Kod för att logga samtal med resultat och anteckningar)*

---

## Fas 6: AI-funktioner

### Task 15: Skapa AI-prioritering

**Files:**
- Create: `lib/ai/prioritize.ts`
- Create: `app/actions/ai.ts`

**Step 1: Implementera prioriteringslogik**

```typescript
// lib/ai/prioritize.ts
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI()

export interface PrioritizedLead {
  leadId: string
  vehicleId: string
  regNr: string
  make: string
  model: string
  mileage: number
  score: number
  reasoning: string
}

export async function getPrioritizedLeads(limit: number = 10): Promise<PrioritizedLead[]> {
  const supabase = await createClient()

  // Hämta preferenser
  const { data: prefs } = await supabase
    .from('preferences')
    .select('key, value')

  const preferences = Object.fromEntries(
    prefs?.map(p => [p.key, p.value]) || []
  )

  // Hämta leads som inte ringts
  const { data: leads } = await supabase
    .from('vehicles')
    .select(`
      id,
      reg_nr,
      make,
      model,
      mileage,
      year,
      in_traffic,
      lead:leads!inner(
        id,
        status,
        phone,
        last_called_at
      )
    `)
    .eq('is_interesting', true)
    .in('lead.status', ['new', 'to_call'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (!leads || leads.length === 0) return []

  // Använd AI för att ranka
  const prompt = `
Du är en expert på att värdera begagnade bilar för ett bilföretag i Sverige.

Preferenser:
- Föredragna märken: ${preferences.preferred_makes || '[]'}
- Undvik märken: ${preferences.avoid_makes || '[]'}
- Max miltal: ${preferences.max_mileage || '150000'} km
- Min årsmodell: ${preferences.min_year || '2010'}
- Prioritera nyligen avställda: ${preferences.prioritize_deregistered || 'true'}

Ranka följande fordon från 1-10 baserat på hur intressanta de är att köpa.
Ge högre poäng till:
- Föredragna märken
- Lågt miltal relativt ålder
- Avställda fordon (kan vara motiverade säljare)
- Populära modeller

Fordon att ranka:
${leads.map(v => `- ${v.reg_nr}: ${v.make} ${v.model}, ${v.mileage || 'okänt'} km, ${v.year || 'okänt'} år, ${v.in_traffic ? 'I trafik' : 'Avställd'}`).join('\n')}

Svara i JSON-format:
[{"reg_nr": "ABC123", "score": 8, "reasoning": "Kort förklaring"}]
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })

    const rankings = JSON.parse(response.choices[0].message.content || '[]')

    return leads
      .map(v => {
        const ranking = rankings.find((r: any) => r.reg_nr === v.reg_nr)
        return {
          leadId: (v.lead as any).id,
          vehicleId: v.id,
          regNr: v.reg_nr,
          make: v.make,
          model: v.model,
          mileage: v.mileage || 0,
          score: ranking?.score || 5,
          reasoning: ranking?.reasoning || 'Ingen AI-bedömning'
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  } catch (error) {
    console.error('AI prioritization error:', error)
    // Fallback utan AI
    return leads.slice(0, limit).map(v => ({
      leadId: (v.lead as any).id,
      vehicleId: v.id,
      regNr: v.reg_nr,
      make: v.make,
      model: v.model,
      mileage: v.mileage || 0,
      score: 5,
      reasoning: 'AI ej tillgänglig'
    }))
  }
}
```

**Step 2: Commit**

```bash
git add lib/ai/prioritize.ts
git commit -m "feat: add AI-powered lead prioritization"
```

---

### Task 16: Skapa AI-varningar

**Files:**
- Create: `lib/ai/warnings.ts`

```typescript
// lib/ai/warnings.ts
import { createClient } from '@/lib/supabase/server'

export interface Warning {
  type: 'duplicate_call' | 'problem_car' | 'low_priority' | 'high_mileage'
  severity: 'info' | 'warning' | 'error'
  message: string
}

export async function getWarningsForVehicle(vehicleId: string): Promise<Warning[]> {
  const supabase = await createClient()
  const warnings: Warning[] = []

  // Hämta fordon och lead
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select(`
      *,
      lead:leads(*)
    `)
    .eq('id', vehicleId)
    .single()

  if (!vehicle) return warnings

  // Kolla om redan ringd
  const { data: calls } = await supabase
    .from('call_logs')
    .select('*')
    .eq('lead_id', vehicle.lead_id)
    .order('called_at', { ascending: false })

  if (calls && calls.length > 0) {
    const lastCall = calls[0]
    const daysSince = Math.floor(
      (Date.now() - new Date(lastCall.called_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    warnings.push({
      type: 'duplicate_call',
      severity: daysSince < 7 ? 'error' : 'warning',
      message: `Ringd för ${daysSince} dagar sedan. Resultat: ${lastCall.result}`
    })
  }

  // Kolla miltal
  const { data: prefs } = await supabase
    .from('preferences')
    .select('value')
    .eq('key', 'max_mileage')
    .single()

  const maxMileage = parseInt(prefs?.value || '150000')

  if (vehicle.mileage && vehicle.mileage > maxMileage) {
    warnings.push({
      type: 'high_mileage',
      severity: 'warning',
      message: `Högt miltal: ${vehicle.mileage.toLocaleString()} km (gräns: ${maxMileage.toLocaleString()} km)`
    })
  }

  // Kolla kända problemmärken/modeller
  const { data: patterns } = await supabase
    .from('ai_patterns')
    .select('*')
    .eq('pattern_type', 'problem_model')
    .eq('make', vehicle.make)
    .eq('is_active', true)

  if (patterns && patterns.length > 0) {
    const pattern = patterns.find(p => !p.model || p.model === vehicle.model)
    if (pattern) {
      warnings.push({
        type: 'problem_car',
        severity: 'warning',
        message: pattern.notes || `${vehicle.make} ${vehicle.model} har kända problem`
      })
    }
  }

  return warnings
}
```

**Step 3: Commit**

```bash
git add lib/ai/warnings.ts
git commit -m "feat: add AI warnings for vehicles"
```

---

## Fas 7: Deploy

### Task 17: Konfigurera Vercel

**Step 1: Skapa vercel.json**

```json
{
  "framework": "nextjs",
  "regions": ["arn1"]
}
```

**Step 2: Deploy**

```bash
vercel --prod
```

---

## Sammanfattning

| Fas | Tasks | Beskrivning |
|-----|-------|-------------|
| 1 | 1-3 | Projektsetup (Supabase, Next.js, config) |
| 2 | 4-8 | Databasschema (leads, vehicles, calls, AI) |
| 3 | 9-10 | Excel import med dubblettdetektering |
| 4 | 11-12 | UI komponenter (sidebar, import-sida) |
| 5 | 13-14 | Lead & samtalshantering |
| 6 | 15-16 | AI-funktioner (prioritering, varningar) |
| 7 | 17 | Deploy till Vercel |

---

**Plan komplett och sparad. Två exekveringsalternativ:**

**1. Subagent-Driven (denna session)** - Jag kör en task i taget, du granskar mellan tasks

**2. Steg-för-steg (manuellt)** - Vi går igenom varje task tillsammans

**Vilket föredrar du?**
