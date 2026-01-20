# Fordonlista - Development Log

## Project Overview
Swedish vehicle lead management system for car dealers.

---

## 2026-01-20 - Prospekt Archive Status & Historical Data

**Type:** Feature

**Description:**
Lagt till ny status `prospekt_archive` för att spara historiska Ring/Brev-data som ENDAST visas på Prospekt-typer sidan. Dessa leads exkluderas automatiskt från Historik, Leads och To-call sidorna.

**Features:**
- Ny `LeadStatus`: `prospekt_archive`
- Historik-sidan exkluderar prospekt_archive leads
- Leads-sidan exkluderar prospekt_archive leads (om inte explicit filtrerat)
- 8 arkiv-leads skapade för historisk statistik (4 perioder × 2 län)

**Inserted Archive Data:**
| Län | Period Start | Period Slut | Skickad |
|-----|--------------|-------------|---------|
| Norrbotten | 2025-10-06 | 2025-10-20 | 2025-10-27 |
| Västerbotten | 2025-10-06 | 2025-10-20 | 2025-10-27 |
| Norrbotten | 2025-10-20 | 2025-10-27 | 2025-11-01 |
| Västerbotten | 2025-10-20 | 2025-10-27 | 2025-11-01 |
| Norrbotten | 2025-10-27 | 2025-11-03 | 2025-11-10 |
| Västerbotten | 2025-10-27 | 2025-11-03 | 2025-11-10 |
| Norrbotten | 2025-11-03 | 2025-11-10 | 2025-11-13 |
| Västerbotten | 2025-11-03 | 2025-11-10 | 2025-11-13 |

**Files Changed:**
- `lib/types/database.ts` - Added `prospekt_archive` to LeadStatus
- `app/historik/page.tsx` - Exclude prospekt_archive from counts and query
- `app/leads/page.tsx` - Exclude prospekt_archive from default view

**Database Changes:**
- Updated `leads_status_check` constraint to include `prospekt_archive`
- Inserted 8 leads with status `prospekt_archive`

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
