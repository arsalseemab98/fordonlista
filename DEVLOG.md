# Fordonlista - Development Log

## Project Overview
Swedish vehicle lead management system for car dealers.

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
