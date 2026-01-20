# Fordonlista - Development Log

## Project Overview
Swedish vehicle lead management system for car dealers.

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
