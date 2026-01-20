# Fordonlista - Vehicle Lead Management System

## Project Info
- **Website:** https://fordonlista.vercel.app
- **Type:** Next.js 16 App Router (Full-stack)
- **Hosting:** Vercel
- **Repo:** https://github.com/arsalseemab98/fordonlista.git
- **Description:** Swedish vehicle lead management system for car dealers - import Excel files, track leads, manage calls, send letters

## Tech Stack
- **Framework:** Next.js 16.1.1 with Turbopack
- **Database:** Supabase (PostgreSQL)
- **UI:** Tailwind CSS + shadcn/ui components
- **Language:** TypeScript

## Main Pages
| Route | Description |
|-------|-------------|
| `/playground` | Huvudsida - visa leads med aktiviteter (Ring, Brev), status-filter, bulk actions |
| `/to-call` | Leads queue for calling (new, callback, no_answer statuses) |
| `/leads` | All leads with status management |
| `/leads/[id]` | Lead detail page with call logging |
| `/brev` | Letter management - export CSV for mailing |
| `/historik` | Call history and completed leads |
| `/import` | Excel file import wizard |
| `/settings` | App settings (letter cost, etc.) |
| `/ai` | AI patterns and learning |

## Playground Page - Detaljerad
Visar leads med status `pending_review` eller `new`. Max 200 leads, uppdateras var 30 sek.

### Aktiviteter (Activity Badges)
| Ikon | Namn | Villkor | Databas-fält |
|------|------|---------|--------------|
| 📞 PhoneCall (grön) | Ring Nx | `call_logs.length > 0` | `call_logs` relation |
| 📄 FileText (orange) | Brev | `sent_to_brev_at != null` | `sent_to_brev_at` |
| ✉️ MailCheck (amber) | Brev skickat | `letter_sent === true` | `letter_sent` |

### Status Filter (UI)
```typescript
const LEAD_STATUS_TYPES = [
  { value: 'all', label: 'Alla' },
  { value: 'no_activity', label: '⚪ Ingen anmärkning' }, // sent_to_call_at IS NULL AND sent_to_brev_at IS NULL
  { value: 'new', label: '🟢 Ny' },           // Ingen aktivitet (call_logs.length === 0)
  { value: 'called', label: '🟡 Ringd' },     // call_logs.length > 0
  { value: 'letter_sent', label: '🔴 Brev skickat' }, // letter_sent === true
]
```

### "Sent to" Fält (spårning)
- `sent_to_call_at` - Timestamp när lead skickades till ringlista
- `sent_to_brev_at` - Timestamp när lead skickades till brevlista

### Letter Status (letter_sent fält)
- `null` = Ingen status / ej i brev-flöde
- `false` = Markerad för brev (väntar)
- `true` = Brev skickat

### Quick Actions per Lead
- 📞 Logga samtal med resultat
- ❌ Inget svar (snabb-logga)
- ✅ Intresserad (snabb-logga)
- ❌ Ej intresserad (snabb-logga)
- 🕐 Ring tillbaka (dialog)
- ✉️ Markera för brev / Ta bort från brevlista

### Bulk Actions
- Skicka till brevlista (`sent_to_brev_at`)
- Skicka till ringlista (`sent_to_call_at`)
- Uppdatera län/prospekttyp
- Hämta car.info data
- Bulk delete

## Key Features
- **Excel Import:** Import vehicle data from Excel files with column mapping
- **Filter Presets:** Save/load filter configurations on all pages
- **Call Logging:** Track calls with results (interested, not interested, callback, etc.)
- **Letter Export:** Export leads to CSV for physical mail campaigns
- **Car.info Integration:** Fetch vehicle details from car.info API
- **AI Scoring:** Score vehicles based on learned patterns

## Database Tables (Supabase)
- `leads` - Main lead records (phone, owner, location, status)
- `vehicles` - Vehicle data (reg_nr, make, model, mileage, year)
- `call_logs` - Call history with results
- `filter_presets` - Saved filter configurations per page
- `ai_patterns` - Learned AI patterns for scoring
- `column_mappings` - Excel column mapping rules
- `value_patterns` - Value transformation rules
- `preferences` - App settings

## Lead Status (databas)
```typescript
type LeadStatus =
  | 'new'              // Ny lead
  | 'pending_review'   // Väntar på granskning
  | 'to_call'          // I ringlistan
  | 'called'           // Har ringts
  | 'interested'       // Intresserad
  | 'booked'           // Bokad visning
  | 'bought'           // Köpt fordon
  | 'not_interested'   // Ej intresserad
  | 'do_not_call'      // Ring ej
  | 'callback'         // Ring tillbaka
  | 'no_answer'        // Inget svar
```

## Call Results (samtal-resultat)
| Svenska | Databas-värde |
|---------|---------------|
| Inget svar | `no_answer` |
| Upptaget | `busy` |
| Intresserad | `interested` |
| Ej intresserad | `not_interested` |
| Ring tillbaka | `call_back` |
| Bokad visning | `booked` |
| Fel nummer | `wrong_number` |

## Filter Presets System
FilterPresets component available on all main pages:
- Save current filters with custom name
- Set default preset (auto-loads on page visit)
- Quick-load saved presets

## Environment Variables
Located in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
CARINFO_API_KEY=
```
