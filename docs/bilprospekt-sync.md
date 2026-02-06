# Bilprospekt Sync - Dokumentation

## Översikt

Bilprospekt-synken hämtar fordonsdata (prospekt) från bilprospekt.se och sparar det i `bilprospekt_prospects`-tabellen i Supabase. Systemet hanterar 100 000+ poster uppdelat i regioner, årsintervall och märken.

---

## Dataflöde

```
Bilprospekt.se API
       │
       ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Cron Sync       │     │  CLI Import       │     │  Manuell Sync    │
│  (automatisk)    │     │  (engångs)        │     │  (via UI)        │
│  Mon-Thu 15-19   │     │  node script      │     │  Knapp i /bilp.  │
└────────┬─────────┘     └────────┬──────────┘     └────────┬─────────┘
         │                        │                          │
         ▼                        ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    bilprospekt_prospects (Supabase)                  │
│  bp_id, reg_number, brand, model, bp_aprox_mileage, ...            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
           ┌──────────────┐          ┌──────────────┐
           │ Biluppgifter │          │ Skicka till   │
           │ (berika data)│          │ Ring / Brev   │
           └──────────────┘          └──────────────┘
```

---

## Scripts & Filer

### 1. Automatisk Cron Sync (huvudscript)

**Fil:** `app/api/cron/bilprospekt-sync/route.ts`
**Schema:** Var 5:e minut, Mon-Thu, 14:00-17:55 UTC (15:00-18:55 svensk tid)
**Vercel cron:** `*/5 14-17 * * 1-4`

#### Vad den gör:

1. **Orchestrator-läge** (första körningen):
   - Anropar `getUpdateDate()` mot bilprospekt.se
   - Jämför med vår sparade datum i `preferences.bilprospekt_updated_at`
   - Om ny data finns: skapar en `bilprospekt_sync_log`-post och planerar segment
   - `planSegments()` delar upp datan i hanterbara delar:
     - 4 regioner (Norrbotten, Västerbotten, Västernorrland, Jämtland)
     - 8 årsintervall (2023-2026, 2020-2022, ... , <2000)
     - Om ett segment > 9000 poster: delas vidare per bilmärke
   - Sparar alla segment i `bilprospekt_sync_segments` med status `pending`

2. **Worker-läge** (efterföljande körningar var 5:e min):
   - Plockar ETT pending-segment åt gången
   - Hämtar data från Bilprospekt API (max 9000 poster, sidindelat á 50)
   - Upsertar till `bilprospekt_prospects` i batchar om 100
   - Markerar segmentet som `completed`

3. **Slutförande:**
   - När alla segment är klara uppdateras `bilprospekt_sync_log` och `preferences.bilprospekt_updated_at`
   - Sidorna `/bilprospekt`, `/playground`, `/prospekt-typer` revalideras

#### Begränsningar:
- Max 5 min per körning (Vercel-gräns)
- Max 9000 poster per API-sökning (Bilprospekt-gräns)
- ~150ms paus mellan sidor för att inte överbelasta API:et

---

### 2. API-klient

**Fil:** `lib/bilprospekt/api-client.ts`

#### Funktioner:

| Funktion | Beskrivning |
|----------|-------------|
| `login()` | Loggar in på bilprospekt.se med email/lösenord, sparar session-cookies |
| `ensureAuth()` | Kontrollerar session, re-autentiserar vid behov |
| `getUpdateDate()` | Hämtar senaste datauppdateringsdatum från Bilprospekt |
| `getCount(params)` | Räknar träffar för ett filter (region/år/märke) |
| `fetchSegment(params)` | Hämtar upp till 9000 prospekt med pagination |
| `planSegments()` | Planerar alla segment för hela synken |
| `parseProspect(item)` | Mappar API-svar till `ProspectRecord` |

#### Konfiguration:

```typescript
SYNC_REGIONS = [
  { code: '25', name: 'Norrbotten' },
  { code: '24', name: 'Västerbotten' },
  { code: '22', name: 'Västernorrland' },
  { code: '23', name: 'Jämtland' },
]

YEAR_SEGMENTS = [
  2023-2026, 2020-2022, 2017-2019, 2014-2016,
  2010-2013, 2005-2009, 2000-2004, <2000
]

TOP_BRANDS = [VOLVO, VOLKSWAGEN, TOYOTA, BMW, AUDI, MERCEDES-BENZ, ...]
```

#### Data som hämtas per prospekt:

| Fält | Källa | Beskrivning |
|------|-------|-------------|
| `bp_id` | Bilprospekt | Unikt ID |
| `reg_number` | Bilprospekt | Registreringsnummer |
| `brand`, `model` | Bilprospekt | Märke och modell |
| `car_year` | Bilprospekt | Årsmodell |
| `fuel`, `color`, `kaross` | Bilprospekt | Fordonsdata |
| `owner_name`, `owner_type` | Bilprospekt | Ägarinfo (privat/företag) |
| `owner_gender`, `owner_birth_year` | Bilprospekt | Ägardetaljer |
| `municipality`, `region` | Bilprospekt | Plats |
| `bp_aprox_mileage` | Bilprospekt | **Ungefärlig mätarställning i mil** |
| `date_acquired` | Bilprospekt | Datum fordonet förvärvades |
| `transmission`, `engine_power` | Bilprospekt | Motor/växellåda |
| `leasing`, `credit` | Bilprospekt | Finansieringstyp |
| `seller_name` | Bilprospekt | Inköpsplats |

---

### 3. CLI Import-script (manuell engångsimport)

**Fil:** `scripts/import-bilprospekt.cjs`
**Körning:** `node scripts/import-bilprospekt.cjs <json-fil>`

#### Vad den gör:
- Läser en JSON-fil som exporterats från Bilprospekt MCP-verktyget
- Mappar data till DB-schema (inklusive `bp_aprox_mileage`)
- Deduplicerar på `bp_id`
- Upsertar till Supabase i batchar om 100 via REST API
- Om en batch misslyckas: försöker rad för rad som fallback

#### Användning:
```bash
# 1. Kör en sökning via Bilprospekt MCP och spara JSON-outputen
# 2. Importera till databasen
node scripts/import-bilprospekt.cjs /path/to/mcp-output.json
```

---

### 4. Server Actions (UI-åtgärder)

**Fil:** `app/bilprospekt/actions.ts`

| Funktion | Trigger | Beskrivning |
|----------|---------|-------------|
| `fetchBiluppgifterForProspect()` | UI: Klick | Hämtar riktig miltal + ägardata från biluppgifter.se |
| `fetchBiluppgifterForProspects()` | UI: Bulk | Batch-hämtning av biluppgifter |
| `sendProspectToCall()` | UI: Knapp | Skapar lead + fordon, skickar till ringlistan |
| `sendProspectToBrev()` | UI: Knapp | Skapar lead + fordon, skickar till brevlistan |
| `triggerBilprospektSync()` | UI: Sync-knapp | Triggar manuell sync via cron-endpoint |

---

## Mätarställning - Två källor

| Kolumn | Källa | Typ | Beskrivning |
|--------|-------|-----|-------------|
| `bp_aprox_mileage` | Bilprospekt | Uppskattning | Ca-värde i mil, fylls vid sync |
| `mileage` | Biluppgifter.se | Riktig | Besiktningsdata, fylls vid manuell hämtning |

**I UI:t:**
- **"Ca mil"** = `bp_aprox_mileage` (visas alltid, fylls automatiskt vid sync)
- **"Mil (BU)"** = `mileage` (kräver manuell hämtning via biluppgifter-knappen)

---

## Databastabeller

### `bilprospekt_prospects`
Huvudtabell med alla prospekt. Upsert på `bp_id`.

### `bilprospekt_sync_log`
Logg över alla sync-körningar (start, slut, status, antal poster).

### `bilprospekt_sync_segments`
Segment-kö för sync: varje rad = en region + årsintervall + ev. märke.

---

## Miljövariabler

```
BILPROSPEKT_EMAIL=<email>         # Inloggning till bilprospekt.se
BILPROSPEKT_PASSWORD=<password>   # Lösenord till bilprospekt.se
```

Dessa sätts i Vercel Environment Variables och i `~/.claude/settings.json` för MCP-servern.

---

## Felsökning

### Synken startar inte
- Kontrollera att det finns ny data: `getUpdateDate()` vs `preferences.bilprospekt_updated_at`
- Kolla `bilprospekt_sync_log` för senaste körning
- Kontrollera Vercel cron-schema i `vercel.json`

### Segment fastnar i "processing"
- Om ett segment har status `processing` längre än 5 min = kraschat
- Nästa cron-tick skippar (väntar). Manuellt: ändra status till `pending` i DB

### 0 poster hämtade
- Kontrollera att `BILPROSPEKT_EMAIL`/`PASSWORD` är korrekta
- Kolla om session-cookies funkar via `ensureAuth()`
- Bilprospekt kan ha ändrat API-format

### Ca mil visar "-"
- Fältet `aprox_mileage` saknas i API-svaret för vissa fordon
- Äldre data (importerat innan 2026-02-06) har inte fältet - fylls vid nästa sync
