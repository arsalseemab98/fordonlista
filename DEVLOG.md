# Fordonlista - Development Log

## Project Overview
Swedish vehicle lead management system for car dealers.

---

## 2026-02-04 - Bilprospekt Full Import (Norrbotten, alla 58 PB-märken)

**Type:** Data Import & Script

**Description:**
Importerade alla 58 personbilsmärken från Bilprospekt till `bilprospekt_prospects` i Supabase för Norrbotten (region 250000). Totalt **110 076 rader** över **58 märken**.

**Nytt script: `scripts/fetch-and-import.cjs`**
- Loggar in direkt mot Bilprospekt API (https://www.bilprospekt.se)
- Bygger samma sökbody som MCP-servern
- Hanterar paginering automatiskt (pageSize 500)
- Mappar prospekt → DB-schema med deduplicering (bp_id)
- Upsert till Supabase i batchar om 100
- Stöd för `--yearFrom`/`--yearTo` för att dela stora märken

**Användning:**
```bash
node scripts/fetch-and-import.cjs VOLVO --yearFrom 2000 --yearTo 2010
```

**Stora märken (år-uppdelning):**
- VOLVO: 28 032 (6 queries)
- VOLKSWAGEN: 12 944 (3 queries)
- TOYOTA: 9 070 (2 queries)
- AUDI: 5 148 (2 queries)
- MERCEDES-BENZ: 3 878 (2 queries)

**Små märken (en query var):**
FISKER, LAMBORGHINI, LOTUS, LYNK & CO, MASERATI, MCLAREN, ROLLS-ROYCE, ASTON-MARTIN, FERRARI + alla från tidigare sessioner.

**Files Changed:**
- `scripts/fetch-and-import.cjs` (NY) - Standalone import-script

---

## 2026-01-29 - Biluppgifter Column Visibility Fix & Rate Limiting

**Type:** Bug Fix & Enhancement

**Problem 1: Biluppgifter columns not visible**
- Users couldn't see biluppgifter columns (ålder, telefon, adress, etc.) because localStorage cached old column preferences from before these columns were added.

**Solution:**
- Added version tracking (`STORAGE_VERSION_KEY`) to detect when new columns are added
- When version is outdated, automatically merges new default columns into saved preferences
- Users now see new columns immediately while keeping their other preferences

**Problem 2: Rate limiting for large datasets**
- Risk of getting banned from biluppgifter.se when fetching large amounts of data

**Solution:**
- Added robust rate limiting configuration:
  - `batchSize: 3` - Process 3 vehicles at a time
  - `delayBetweenBatches: 1500ms` - 1.5 seconds between batches
  - `largeBatchThreshold: 20` - Use slower rate for >20 vehicles
  - `largeBatchDelay: 2500ms` - 2.5 seconds for large batches
  - `maxRetries: 2` - Retry failed requests with 5s delay
- Added progress feedback in UI showing estimated time
- Console logging for debugging batch processing

**Files Changed:**
- `components/bilprospekt/bilprospekt-view.tsx`
  - Added `getMergedColumns()` helper with version-aware merging
  - Added `CURRENT_VERSION = 2` constant
  - Added `fetchProgress` state for UI feedback
  - Fixed toast to use `sonner` instead of non-existent `useToast` hook
- `lib/biluppgifter/fetch-biluppgifter.ts`
  - Added `RATE_LIMIT_CONFIG` object with configurable settings
  - Added retry logic for 403 rate limit errors
  - Added console logging for debugging

---

## 2026-01-29 - Bilprospekt Page & Biluppgifter API Integration

**Type:** Feature

**Description:**
Skapade ny Bilprospekt-sida som hämtar data från Bilprospekt MCP API och sparar i egen dedikerad Supabase-tabell. Integrerade biluppgifter-api för att hämta miltal från biluppgifter.se.

**Features:**
- Ny sida `/bilprospekt` med full filterfunktionalitet
- Filter: Region, Märke, Modell, Bränsle, Årsmodell (from/to), Innehavstid, Prospekttyp
- Dedikerad tabell `bilprospekt_prospects` med 27 kolumner
- Paginering (50 per sida)
- Bulk-val av prospekt
- Hämta miltal för markerade prospekt via biluppgifter-api
- Batch-hämtning med rate limiting (5 åt gången, 1s delay)
- Health check för biluppgifter-api status

**Database Changes:**
- Created `bilprospekt_prospects` table with columns:
  - bp_id (PK), reg_number, brand, model, fuel, color, car_year, date_acquired
  - owner_name, owner_type, owner_gender, owner_birth_year, address, zip
  - municipality, region, region_code, kaross, transmission, engine_power
  - mileage, weight, leasing, credit, seller_name, chassis, in_service
  - cylinder_volume, fwd, new_or_old, created_at, updated_at
- Added indexes on bp_id, reg_number, brand, region
- Added RLS policies for authenticated users

**Files Created:**
- `app/bilprospekt/page.tsx` - Server component
- `app/bilprospekt/actions.ts` - Server actions för miltal-hämtning
- `components/bilprospekt/bilprospekt-view.tsx` - Client view med filter och tabell
- `lib/biluppgifter/fetch-biluppgifter.ts` - API client för biluppgifter-api

**Files Changed:**
- `components/layout/sidebar.tsx` - Added Bilprospekt navigation item

**External Dependencies:**
- biluppgifter-api (FastAPI server at localhost:3456)
  - Repo: `/Users/arsalseemab/Desktop/biluppgifter-api`
  - Endpoint: `GET /api/vehicle/{regnr}` for vehicle data with mileage

---

## 2026-01-27 - Bilprospekt Date Gate & Archive Data

**Type:** Feature

**Description:**
Lagt till Bilprospekt-datumfält i playground som blockerar skicka-knappar tills datum är angivet. Datumet visas som badge i headern på alla viktiga sidor. Nya arkivdata för Dödsbo och Lågmil insatta.

**Features:**
- Bilprospekt-datumväljare i playground (grönt=satt, amber=saknas)
- Blockerar "Skicka till ring" och "Skicka till brev" utan datum
- BP-datum badge i header (playground, prospekt-typer, brev, to-call)
- Server actions: `saveBilprospektDate()`, `getBilprospektDate()`
- Prospekttyp "Dödsbo" skapad
- Arkivdata: 20 + 32 dödsbo-brev (Norrbotten), 251 lågmil-brev (Norrbotten)

**Database Changes:**
- `preferences.bilprospekt_updated_at` DATE kolumn (migration `20260127150000`)
- Ny prospect_type: `dödsbo`
- 303 arkivleads insatta (prospekt_archive)

**Files Changed:**
- `app/actions/settings.ts` - saveBilprospektDate, getBilprospektDate, getPreferences uppdaterad
- `app/playground/page.tsx` - Skickar bilprospektDate till Header och PlaygroundView
- `app/prospekt-typer/page.tsx` - Hämtar och visar bilprospektDate i Header
- `app/brev/page.tsx` - Hämtar och visar bilprospektDate i Header
- `app/to-call/page.tsx` - Hämtar och visar bilprospektDate i Header
- `components/layout/header.tsx` - Valfri BP-datum badge
- `components/playground/playground-view.tsx` - Datumväljare + gate-logik

---

## 2026-01-27 - Mil/yr Filter, Sorting & Car.info Status

**Type:** Feature

**Description:**
Lagt till mil/år-filter, sortering och car.info-statusfilter i playground.

**Features:**
- Mil/år-filter: Lågmil (<800), Normal (800-2500), Högmil (>2500), Ingen data
- Sortering: Mil/år stigande/fallande (client-side, nulls sist)
- Aktivitetsfilter: "Car.info hämtad" och "Ej car.info" (baserat på carinfo_fetched_at)
- Gemensam `getVehicleMilPerYear()` hjälpfunktion

**Files Changed:**
- `components/playground/playground-view.tsx` - Filter, sortering, statusfilter, hjälpfunktion

---

## 2026-01-27 - Mileage History & Mil/yr Column

**Type:** Feature

**Description:**
Lagt till mätarhistorik från besiktningar (senaste 4 åren) i car.info-integrationen. Ny synlig "Mil/år" kolumn i playground-tabellen med färgkodning för att identifiera lågmil/högmil-fordon att ringa.

**Features:**
- Extraherar mätarställningar från besiktningshändelser i fordonshistorik
- Matchar mönster: `(\d+) mil` (×10 till km) och `(\d+) km`
- Filtrerar till senaste 4 åren, en avläsning per år (senaste besiktningen)
- Använder BARA riktiga besiktningsdatum, aldrig dagens datum
- Ny "Mil/år" kolumn med färgkodning:
  - Blå (< 800 mil/år) = Lågmil
  - Grå (800-2500 mil/år) = Normal
  - Röd (> 2500 mil/år) = Högmil
- Klickbar popover på miltalskolumnen visar besiktningshistorik + snitt km/år
- Mätarhistorik i car.info-sökdialogen

**Database Changes:**
- `vehicles.mileage_history` JSONB kolumn tillagd (migration `20260127140000`)

**Files Changed:**
- `lib/carinfo/fetch-carinfo.ts` - Mätarhistorik-extraktion, deduplicering per år
- `app/api/carinfo/route.ts` - Samma extraktion (Edge runtime)
- `app/actions/vehicles.ts` - Sparar mileage_history till DB
- `app/playground/page.tsx` - Hämtar mileage_history i Supabase-query
- `components/playground/playground-view.tsx` - Mil/år kolumn + mätarhistorik popover
- `components/layout/carinfo-search.tsx` - Mätarhistorik-sektion i sökdialogen
- `lib/types/database.ts` - mileage_history fält i Vehicle interface

**Errors Encountered:**
- Duplicerade mätarställningar (samma km på olika datum) - Fixat med deduplicering per år
- Dagens datum användes som fallback - Borttaget, bara besiktningsdatum

---

## 2026-01-27 - Brev Cost Analytics & Prospect Types Single Source of Truth

**Type:** Feature

**Description:**
Lagt till månadsvis brevkostnadsanalys på /brev-sidan och fixat prospekttyper som single source of truth på alla sidor.

**Features:**
- Brevkostnadsanalys: kollapsbart kort med månadsvis tabell (Månad, Brev, Kostnad, Konverteringar, Konv.grad)
- Konverteringar = leads med letter_sent=true OCH status booked/interested/bought
- Prospekttyper: alla sidor använder nu `[...new Set([...savedProspectTypes, ...availableProspectTypes])]`
- Lågmil prospekttyp tillagd i databasen
- Soft delete migration applicerad (deleted_at kolumn)

**Database Changes:**
- `leads.deleted_at` timestamptz kolumn (migration `20260127120000`)
- Prospect type `lågmil` insatt i `prospect_types`

**Files Changed:**
- `app/brev/page.tsx` - Analytics query + månadsaggregering
- `components/letters/letter-list.tsx` - BrevMonthlyStats kort med tabell
- `components/playground/playground-view.tsx` - Prospect types single source of truth
- `components/prospekt-typer/prospekt-typer-view.tsx` - Prospect types single source of truth

---

## 2026-01-21 - Prospect Type Management System

**Type:** Feature

**Description:**
Lagt till möjlighet att skapa och hantera prospekttyper via UI. Prospekttyper sparas i en ny databastabell och kan skapas/raderas direkt från Prospekt-typer sidan.

**Features:**
- Ny `prospect_types` tabell i databasen med fält för id, name, description, color, is_active, sort_order
- Server actions för CRUD-operationer: `getProspectTypes`, `createProspectType`, `deleteProspectType`, `updateProspectType`
- Soft delete (is_active = false) för att bevara referensintegritet
- Skydd mot radering av typer som används av leads
- UI-kort för att visa och hantera prospekttyper med expanderbar sektion
- Formulär för att skapa nya prospekttyper med namn, beskrivning och färg
- Färgväljare (color picker) för visuell markering

**Database Changes:**
- Created `prospect_types` table
- Inserted existing types: 'nyköpt_bil', 'avställd'
- Added indexes for name and is_active

**Files Created:**
- `app/prospekt-typer/actions.ts` - Server actions för prospekttyper

**Files Changed:**
- `app/prospekt-typer/page.tsx` - Hämtar och skickar savedProspectTypes till view
- `components/prospekt-typer/prospekt-typer-view.tsx` - UI för att hantera prospekttyper

---

## 2026-01-20 - Avställd Archive Data (212 leads)

**Type:** Data

**Description:**
Lagt till 212 arkiv-leads med prospect_type `avställd` för historisk statistik.

**Inserted Data Summary:**
| Rad | Antal | Regioner | Period Start | Period Slut | Skickad |
|-----|-------|----------|--------------|-------------|---------|
| R1 | 15 | NB 8, VB 7 | 2025-10-06 | 2025-10-13 | 2025-10-15 |
| R2 | 25 | NB 13, VB 12 | 2025-10-13 | 2025-10-20 | 2025-10-23 |
| R3 | 40 | NB 13, VB 12, VN 8, JL 7 | 2025-10-20 | 2025-10-27 | 2025-10-31 |
| R4 | 20 | NB 5, VB 5, VN 5, JL 5 | 2025-10-27 | 2025-11-03 | 2025-11-06 |
| R8 | 40 | NB 14, VB 14, GB 12 | 2025-11-10 | 2025-11-17 | 2025-11-19 |
| R9 | 42 | NB 14, VB 14, GB 14 | 2025-11-17 | 2025-11-24 | 2025-11-26 |
| R11 | 30 | VN 15, JL 15 | 2025-10-01 | 2025-10-20 | 2025-10-20 |

**Regioner:**
- NB = Norrbotten
- VB = Västerbotten
- VN = Västernorrland
- JL = Jämtland
- GB = Gävleborg

**Database Changes:**
- Inserted 212 leads with status `prospekt_archive`, prospect_type `avställd`

---

## 2026-01-20 - Archive Toggle & Cost Analysis (Enhanced)

**Type:** Feature

**Description:**
Lagt till arkiv-toggle och förbättrad kostnadsanalys på Prospekt-typer sidan med filter för år, månad och datum.

**Features:**
- **Arkiv-toggle:** Switch högst upp på sidan för att inkludera/exkludera `prospekt_archive` status
- **Kostnadsanalys påverkas av toggle:** Visar kostnader baserat på aktiva eller alla leads
- **Brevkostnad från preferences:** Hämtar `letter_cost` från preferences-tabellen (default 12 kr)
- **Kostnad per period/år/månad/datum:** Flikar för att visa kostnader på olika sätt

**Kostnadsfilter (baserat på sent_to_brev_at):**
- Per Period - dataperiodens startdatum
- Per År - grupperat per kalenderår
- Per Månad - grupperat per månad (t.ex. "januari 2025")
- Per Datum - exakt datum när brev skickades

**UI-komponenter:**
- Archive toggle med on/off label
- Kostnadsanalys-kort i lila/indigo gradient
- Kort för antal brev, kostnad per brev, total kostnad
- Fliknavigering (Per Period / Per År / Per Månad / Per Datum)
- Scrollbar lista med max-height för längre listor

**Files Changed:**
- `app/prospekt-typer/page.tsx` - Cost calculations respects toggle, added costByYear/Month/Date
- `components/prospekt-typer/prospekt-typer-view.tsx` - Added cost view tabs, filter state, new props

---

## 2026-01-20 - Prospekt Archive Status & Historical Data (Updated)

**Type:** Feature

**Description:**
Lagt till ny status `prospekt_archive` för att spara historiska Ring/Brev-data som ENDAST visas på Prospekt-typer sidan. Dessa leads exkluderas automatiskt från Historik, Leads och To-call sidorna.

**Features:**
- Ny `LeadStatus`: `prospekt_archive`
- Historik-sidan exkluderar prospekt_archive leads
- Leads-sidan exkluderar prospekt_archive leads (om inte explicit filtrerat)
- "Inlagt" kolumn (created_at) tillagt i Detaljerad översikt och detalj-modal
- 26 arkiv-leads skapade för historisk statistik (7 perioder × 5 län)

**Inserted Archive Data (26 leads):**
| Län | Period Start | Period Slut | Skickad |
|-----|--------------|-------------|---------|
| Norrbotten | 2025-10-06 | 2025-10-20 | 2025-10-27 |
| Västerbotten | 2025-10-06 | 2025-10-20 | 2025-10-27 |
| Norrbotten | 2025-10-20 | 2025-10-27 | 2025-11-01 |
| Västerbotten | 2025-10-20 | 2025-10-27 | 2025-11-01 |
| Västernorrland | 2025-10-20 | 2025-10-27 | 2025-11-01 |
| Jämtland | 2025-10-20 | 2025-10-27 | 2025-11-01 |
| Norrbotten | 2025-10-27 | 2025-11-03 | 2025-11-10 |
| Västerbotten | 2025-10-27 | 2025-11-03 | 2025-11-10 |
| Västernorrland | 2025-10-27 | 2025-11-03 | 2025-11-10 |
| Jämtland | 2025-10-27 | 2025-11-03 | 2025-11-10 |
| Norrbotten | 2025-11-03 | 2025-11-10 | 2025-11-13 |
| Västerbotten | 2025-11-03 | 2025-11-10 | 2025-11-13 |
| Västernorrland | 2025-11-03 | 2025-11-10 | 2025-11-13 |
| Jämtland | 2025-11-03 | 2025-11-10 | 2025-11-13 |
| Norrbotten | 2025-11-10 | 2025-11-17 | 2025-11-20 |
| Västerbotten | 2025-11-10 | 2025-11-17 | 2025-11-20 |
| Västernorrland | 2025-11-10 | 2025-11-17 | 2025-11-20 |
| Jämtland | 2025-11-10 | 2025-11-17 | 2025-11-20 |
| Gävleborg | 2025-11-10 | 2025-11-17 | 2025-11-20 |
| Norrbotten | 2025-11-17 | 2025-11-24 | 2025-11-27 |
| Västerbotten | 2025-11-17 | 2025-11-24 | 2025-11-27 |
| Västernorrland | 2025-11-17 | 2025-11-24 | 2025-11-27 |
| Jämtland | 2025-11-17 | 2025-11-24 | 2025-11-27 |
| Gävleborg | 2025-11-17 | 2025-11-24 | 2025-11-27 |
| Västernorrland | 2025-09-07 | 2025-10-20 | 2025-10-27 |
| Jämtland | 2025-09-07 | 2025-10-20 | 2025-10-27 |

**Län (5 st):**
- Norrbotten
- Västerbotten
- Västernorrland
- Jämtland
- Gävleborg

**Files Changed:**
- `lib/types/database.ts` - Added `prospekt_archive` to LeadStatus
- `app/historik/page.tsx` - Exclude prospekt_archive from counts and query
- `app/leads/page.tsx` - Exclude prospekt_archive from default view
- `app/prospekt-typer/page.tsx` - Added latestCreatedAt tracking and created_at to LeadDetail
- `components/prospekt-typer/prospekt-typer-view.tsx` - Added "Inlagt" column to both tables

**Database Changes:**
- Updated `leads_status_check` constraint to include `prospekt_archive`
- Inserted 26 leads with status `prospekt_archive`, prospect_type `nyköpt_bil`

---

## 2026-01-20 - Double-Click Navigation in Prospekt Page

**Type:** Enhancement

**Description:**
Lagt till dubbelklick-funktion på två ställen:
1. **Detaljerad översikt-tabellen** - Dubbelklick öppnar detalj-modal
2. **Detalj-modal** - Dubbelklick öppnar lead-detaljsida (`/leads/[id]`)

**Features:**
- Dubbelklick på rad i huvudtabellen → Öppnar detalj-modal med alla leads för den kombinationen
- Dubbelklick på rad i detalj-modal → Öppnar lead-detaljsida
- Cursor pointer och hover-effekt för bättre UX

**Files Changed:**
- `components/prospekt-typer/prospekt-typer-view.tsx` - Added onDoubleClick handlers

---

## 2026-01-20 - Prospekt Page Sent Counts & Detail Modal

**Type:** Enhancement

**Description:**
Lagt till statistik för skickade leads (Ring/Brev) med klickbar detaljvy.

**Features:**
- Nya kort: "Skickat till Ring" och "Skickat till Brev" med totalsiffror
- Per prospekttyp: visar Ring/Brev-antal med knappar
- Per tidsperiod: visar Ring/Brev-antal med knappar
- Detaljerad tabell: nya kolumner för Ring, Brev, Detaljer (ögon-ikon)
- Klickbar modal som visar lista på leads med:
  - Ägare, telefon, län, prospekttyp, period
  - Datum för när lead skickades till Ring/Brev

**Files Changed:**
- `app/prospekt-typer/page.tsx` - Added sent counts and lead details
- `components/prospekt-typer/prospekt-typer-view.tsx` - Added modal and clickable counts

---

## 2026-01-20 - Prospekt Page Enhancements

**Type:** Enhancement

**Description:**
Förbättrad prospekt-sida med:
- Visning av antal dagar mellan period start och slut
- Detektering av luckor (gaps) mellan dataperioder
- Filter som endast visar historiska datum (ej framtida)

**Features:**
- "Dagar" kolumn i detaljerad tabell med badge
- Varningskort i amber/orange för saknade perioder
- Utility-funktioner för datumberäkningar
- Automatisk filtrering av framtida datum

**Files Created:**
- `lib/time-period-utils.ts` - Utility functions (calculateDaysDifference, findMissingPeriods, isPastOrToday)

**Files Changed:**
- `app/prospekt-typer/page.tsx` - Added gap detection and days calculation
- `components/prospekt-typer/prospekt-typer-view.tsx` - Added gaps card and days column

---

## 2026-01-20 - Prospekttyper & Perioder Page

**Type:** Feature

**Description:**
Ny sida för att se och filtrera prospekttyper och tidsperioder.

**Features:**
- Översiktskort (totalt antal leads, perioder, kombinationer)
- Filter för prospekttyp och datumintervall
- Sammanfattning per prospekttyp med antal och andel
- Sammanfattning per tidsperiod
- Detaljerad tabell med alla kombinationer

**Files Created:**
- `app/prospekt-typer/page.tsx` - Server component
- `components/prospekt-typer/prospekt-typer-view.tsx` - Client view

**Files Changed:**
- `components/layout/sidebar.tsx` - Added navigation link
- `CLAUDE.md` - Added page documentation

---

## 2026-01-20 - TypeScript Build Error Fix

**Type:** Bugfix

**Description:**
Fixat TypeScript-fel som blockerade Vercel-deploy. `filteredLeads` useMemo använde `activityFilter` innan den var deklarerad.

**Ändring:**
Flyttade `filteredLeads` useMemo från rad 315 till efter `activityFilter` state-deklaration (rad 385).

**Files Changed:**
- `components/playground/playground-view.tsx`

---

## 2026-01-20 - Playground visar endast orörda leads

**Type:** Bugfix

**Description:**
Fixat så playground ENDAST visar leads som inte har skickats till ring eller brev.
Tidigare kunde samma lead visas i både playground OCH to-call/brev sidor.

**Ändring i Supabase query:**
```sql
WHERE status IN ('pending_review', 'new')
  AND sent_to_call_at IS NULL   -- Ej skickad till ring
  AND sent_to_brev_at IS NULL   -- Ej skickad till brev
```

**Nytt flöde:**
```
IMPORT → PLAYGROUND (orörda) → Skicka till RING/BREV → Försvinner från playground
```

**Files Changed:**
- `app/playground/page.tsx`

---

## 2026-01-20 - "Ingen anmärkning" Filter Implementerat

**Type:** Feature

**Description:**
Lagt till nytt aktivitetsfilter på playground-sidan för att visa "orörda" leads:
- Nytt filter-alternativ: "⚪ Ingen anmärkning" (default)
- Visar leads där `sent_to_call_at IS NULL AND sent_to_brev_at IS NULL`
- Uppdaterat getLeadStatus() för att returnera 'no_activity' status
- Filtret visar antal leads per status
- "Select all" fungerar med filtrerade leads

**Files Changed:**
- `components/playground/playground-view.tsx`
- `CLAUDE.md`
- `TDD.md`

---

## 2026-01-20 - CLAUDE.md Updated

**Type:** Documentation

**Description:**
Uppdaterade CLAUDE.md med detaljerad info om playground-sidan:
- Aktiviteter (Ring, Brev, Brev skickat) med ikoner och villkor
- Status filter system (all, new, called, letter_sent)
- Letter status (null/false/true)
- Quick actions och bulk actions
- Lead status typer
- Call results mappning

**Observation:**
Status-filtret saknar möjlighet att filtrera leads som inte har NÅGON aktivitet (varken ring eller brev).
Nuvarande "Ny" status visar alla utan call_logs, men inkluderar också de med brev-markering.

---

## 2026-01-20 - Project Initialized

### Current Features
- Excel import wizard with column mapping
- Vehicle playground with county/prospect filtering
- Call queue management (to-call page)
- Lead tracking with status management
- Letter export for mail campaigns
- Car.info API integration
- AI scoring patterns
- Filter presets system (save/load per page)

### Tech Stack
- Next.js 16.1.1 with Turbopack
- Supabase (PostgreSQL)
- Tailwind CSS + shadcn/ui
- TypeScript

### Database Tables
- `leads` - Main lead records
- `vehicles` - Vehicle data
- `call_logs` - Call history
- `filter_presets` - Saved filters
- `ai_patterns` - AI scoring patterns
- `column_mappings` - Excel mappings
- `value_patterns` - Value transformations
- `preferences` - App settings

---

## Log Format

### YYYY-MM-DD - Feature/Fix Title

**Type:** Feature | Bugfix | Refactor | Enhancement

**Description:**
What was implemented or fixed.

**Files Changed:**
- `path/to/file.tsx`

**Errors Encountered:**
- Error description and solution

---
