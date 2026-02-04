# Fordonlista - Task Tracker

## Legend
- [ ] Pending
- [x] Completed
- [~] In Progress

---

## Completed Features

- [x] Excel file import wizard
- [x] Vehicle playground page with filtering
- [x] To-call queue management
- [x] Lead detail page with call logging
- [x] Letter export (CSV for mailing)
- [x] Filter presets system (save/load)
- [x] Car.info API integration
- [x] AI patterns page
- [x] History page for completed leads
- [x] Settings page
- [x] "Ingen anmärkning" filter på playground (default, visar orörda leads)
- [x] Prospekttyper & perioder sida med filtrering (/prospekt-typer)
- [x] Soft delete (deleted_at) på leads med papperskorg-sida
- [x] Prospekttyper som single source of truth (DB + lead-derived, alla sidor)
- [x] Lågmil prospekttyp tillagd i databasen
- [x] Brev kostnadsanalys - månadsvis tabell med brev, kostnad, konverteringar, konv.grad
- [x] Mileage history - senaste 4 års besiktningsavläsningar från car.info
- [x] Mil/år-kolumn i playground med färgkodning (blå=lågmil, röd=högmil)
- [x] Mätarhistorik-popover vid klick på miltalskolumnen
- [x] Deduplicering av mätarhistorik (en avläsning per år, bara besiktningsdatum)
- [x] Mil/år-filter i playground (lågmil, normal, högmil, ingen data)
- [x] Sortering efter mil/år (stigande/fallande) i playground
- [x] Car.info-status i aktivitetsfilter (hämtad / ej hämtad)
- [x] Dödsbo prospekttyp tillagd med arkivdata (20 + 32 brev)
- [x] Lågmil arkivdata (251 brev, Norrbotten)
- [x] Bilprospekt-datumfält i playground (blockerar skicka utan datum)
- [x] Bilprospekt-datum badge i header (playground, brev, to-call, prospekt-typer)
- [x] Bilprospekt-sida (/bilprospekt) med MCP-integration och Supabase-tabell
- [x] Bilprospekt-filter (region, märke, modell, bränsle, årsmodell, innehavstid, prospekttyp)
- [x] Bilprospekt dedikerad tabell (bilprospekt_prospects) med 27 kolumner
- [x] Biluppgifter API-integration för miltal-hämtning
- [x] Bulk miltal-hämtning med rate limiting (5 åt gången, 1s delay)

---

## Pending Tasks

### High Priority - Biluppgifter & Handlare Integration

#### Steg 1: Extrahera alla bilhandlare

- [x] 1.1 Hämta unika handlarnamn från Blocket (`saljare_namn` där `saljare_typ = 'handlare'`) → 219 handlare
- [x] 1.2 Skapa `known_dealers` tabell i Supabase (blocket_name, biluppgifter_name, address, phone, vehicle_count, region)
- [~] 1.3 Berika handlare med biluppgifter-data (auto-enrichment i cron v2, hämtar vid varje bil)
- [~] 1.4 Koppla Blocket-namn till biluppgifter-namn (namesMatch() fuzzy matching implementerad)

#### Steg 2: Kedjad ägarhistorik-sökning

- [x] 2.1 Ladda known_dealers i cron-scriptet vid start (loadKnownDealers())
- [x] 2.2 Implementera kedjad sökning: hoppa alla kända handlare i owner_history (findLeadInChain())
- [x] 2.3 Detektera förmedling: Blocket säger handlare men biluppgifter ägare ≠ handlarnamn (determineOwnerType())

#### Steg 3: Datamodell

- [x] 3.1 Lägg till `owner_type` kolumn (privat, handlare, foretag, formedling) ✅
- [x] 3.2 Lägg till `dealer_since` kolumn (datum handlaren fick bilen) ✅
- [x] 3.3 Sluta spara owner_vehicles för handlare (onödig data) ✅
- [ ] 3.4 Visa owner_type i fordonlista UI

---

### Flöde

```
Bil hämtas från biluppgifter
        │
        ▼
Kolla Blocket saljare_typ
        │
   ┌────┴────────┐
   │             │
 privat        handlare
   │             │
   ▼             ▼
 PRIVAT     Jämför Blocket saljare_namn
 lead=ägare  med biluppgifter owner_name
                 │
            ┌────┴────┐
            │         │
         MATCHAR    MATCHAR EJ
            │         │
            ▼         ▼
        HANDLARE   FÖRMEDLING
        Ägarbyte    Inget ägarbyte
        har skett   lead=nuvarande ägare
            │
            ▼
    Gå igenom owner_history
    Hoppa alla kända handlare
            │
            ▼
    Första icke-handlare:
    - Privatperson → lead
    - Företag → företag-lead
```

### Data som sparas per typ

**Privat:** namn, ålder, adress, telefon, fordon

**Förmedling:** nuvarande ägare (lead), blocket-säljare (förmedlaren), `owner_type: 'formedling'`

**Handlare:**
- Handlarnamn (Blocket + biluppgifter)
- Handlaradress, telefon
- `dealer_since` (datum handlaren fick bilen)
- INTE owner_vehicles
- `previous_owner` = första icke-handlare i kedjan

---

### Medium Priority

- [ ]

### Low Priority

- [ ]

---

## Backlog / Ideas

- [ ] Retroaktivt uppdatera befintliga 184 biluppgifter med ny logik (owner_type, dealer_since)
- [ ] Öka BATCH_SIZE för snabbare hämtning (nu 10, resterande ~6500)
- [x] Randomiserade delays (3-8s) för att undvika biluppgifter.se rate limiting

---

## Bugs to Fix

- [ ]

---

## Notes

Add tasks as they come up. Mark completed with [x].
