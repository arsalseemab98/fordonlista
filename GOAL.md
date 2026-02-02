# Fordonlista - Mål & Vision

## Syfte

Fordonlista är en **fordonsdata-aggregator** som samlar in och korsrefererar data från tre huvudkällor för att skapa en komplett bild av den svenska begagnatbilmarknaden:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   BILPROSPEKT   │     │     BLOCKET     │     │  BILUPPGIFTER   │
│                 │     │                 │     │                 │
│ • Ägarbyte-data │     │ • Aktiva annon- │     │ • Fordonsdata   │
│ • Regnummer     │     │   ser           │     │ • Ägarhistorik  │
│ • Prospekttyp   │     │ • Priser        │     │ • Mätarställning│
│ • Region        │     │ • Handlare/     │     │ • Besiktning    │
│ • Innehavstid   │     │   Privat        │     │ • Telefonnummer │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │      FORDONLISTA        │
                    │                         │
                    │  Aggregerad fordonsdata │
                    │  + Analys & Insights    │
                    └─────────────────────────┘
```

---

## Datakällor

### 1. Bilprospekt (MCP)
- **Vad:** Registerdata om fordonsägare
- **Data:** Regnummer, ägare (namn, adress), köpdatum, prospekttyp
- **Uppdatering:** Veckovis
- **Användning:** Identifiera potentiella säljare baserat på innehavstid, fordonstyp

### 2. Blocket Scraper
- **Vad:** Aktiva bilannonser på Blocket
- **Data:** Pris, märke, modell, miltal, bilder, säljare (handlare/privat), region
- **Uppdatering:** Kontinuerligt (var 15 min light scrape, 2x/dag full scrape)
- **Användning:** Marknadspriser, utbud, konkurrensanalys

### 3. Biluppgifter.se
- **Vad:** Detaljerad fordons- och ägarinfo
- **Data:** Mätarställning (verifierad), antal ägare, besiktning, skatt, ägarhistorik, telefon
- **Uppdatering:** On-demand (cron 09-19)
- **Användning:** Verifiera annonsdata, hitta kontaktinfo, identifiera bilhandlare

---

## Analyzer - Brainstorm

### A. Prisanalys

#### A1. Marknadspris-kalkylator
- **Input:** Märke, modell, årsmodell, miltal
- **Output:** Uppskattat marknadsvärde baserat på Blocket-data
- **Features:**
  - Percentiler (billig/medel/dyr)
  - Prisutveckling över tid
  - Regional prisskillnad

#### A2. Prissättnings-advisor
- **För säljare:** "Din bil är prissatt 15% under marknad"
- **För köpare:** "Denna annons är 20% dyrare än liknande bilar"

#### A3. Prishistorik per bil
- Spåra prisändringar på samma annons
- Visa "dagar på marknaden" vs pris

---

### B. Fordonsanalys

#### B1. Miltal-verifiering
- **Jämför:** Blocket-miltal vs Biluppgifter (besiktning)
- **Flagga:** Avvikelser > 2000 mil
- **Risk-score:** Potentiell miltalsmanipulation

#### B2. Miltals-prediktor
- Baserat på mätarhistorik (besiktningar)
- Beräkna mil/år
- Flagga onormalt låga/höga värden

#### B3. Besiktnings-analys
- Bilar med utgången besiktning
- Kommande besiktningar (inom 30/60/90 dagar)
- Historik av godkända/underkända

---

### C. Säljare-analys

#### C1. Bilhandlare-profiler
- Vilka handlare finns i varje region?
- Genomsnittspris per handlare
- Antal aktiva annonser
- Säljtid (hur snabbt säljer de?)

#### C2. Privat vs Handlare
- Prisskillnad för samma biltyp
- Vilka bilar säljer handlare vs privatpersoner?
- Omsättningshastighet

#### C3. "Dold handlare"-detektion
- Privatpersoner som säljer många bilar
- Matcha mot known_dealers
- Flagga misstänkta återförsäljare

---

### D. Lead-analys

#### D1. Lead Scoring
- Poängsätt leads baserat på:
  - Innehavstid (längre = mer sannolikt att sälja?)
  - Fordonsålder
  - Miltalsökning
  - Region (närhet till ditt område)

#### D2. Timing-prediktor
- När är bästa tiden att kontakta?
- Historisk data: när säljer folk sina bilar?
- Säsongsmönster

#### D3. Konverteringsanalys
- Vilka leads blev kunder?
- Vilka egenskaper hade framgångsrika leads?
- ROI per prospekttyp

---

### E. Marknadsanalys

#### E1. Utbuds-dashboard
- Totalt antal bilar per region
- Fördelning: märke, modell, årsmodell
- Trend över tid (ökar/minskar utbudet?)

#### E2. Konkurrens-analys
- Vilka märken/modeller är översålda?
- Vilka har lite konkurrens?
- Gap-analys: efterfrågan vs utbud

#### E3. Säsongsmönster
- Vilka bilar säljer bäst på vintern/sommaren?
- Prisfluktuationer under året
- Bästa tid att köpa/sälja

---

### F. Ägar-analys

#### F1. Ägarprofiler
- Typisk ägare per biltyp
- Ålder, region, antal bilar
- Genomsnittlig innehavstid

#### F2. Flerbilsägare
- Personer med 2+ fordon
- Potentiella storköpare/säljare
- Adresser med många fordon

#### F3. Ägarkedja
- Spåra bilens ägarhistorik
- Identifiera "snabba flips" (korta innehavstider)
- Handelarmönster

---

### G. Anomali-detektion

#### G1. Misstänkt data
- Orimligt lågt miltal för ålder
- Stora prishopp
- Saknad ägarhistorik

#### G2. Bluffannonser
- Samma bilder på flera annonser
- Orealistiskt låga priser
- Mönster från kända bluffare

#### G3. Marknadsmani­pulation
- Plötsliga prisökningar
- Koordinerade prisändringar
- Kartellbeteende?

---

## Teknisk Plan

### Fas 1: Data-aggregering (✅ Klar)
- [x] Bilprospekt MCP-integration
- [x] Blocket scraper
- [x] Biluppgifter API
- [x] Known dealers-system

### Fas 2: Data-kvalitet
- [ ] Miltal-verifiering (Blocket vs Biluppgifter)
- [ ] Duplicate detection
- [ ] Data cleaning/normalisering

### Fas 3: Basic Analyzers
- [ ] Prisanalys-modul
- [ ] Säljare-statistik
- [ ] Lead scoring v1

### Fas 4: Advanced Analyzers
- [ ] ML-baserad prissättning
- [ ] Timing-prediktor
- [ ] Anomali-detektion

### Fas 5: Dashboard & Visualisering
- [ ] Interaktiva grafer
- [ ] Kartor (regional analys)
- [ ] Exportfunktioner

---

## Prioriterade Analyzers (Nästa steg)

### 1. **Pris-analyzer** (Hög prioritet)
```
Input: Blocket-annons
Output:
- Marknadspris-range (låg/medel/hög)
- Jämförelse med liknande bilar
- Rekommendation (bra deal? / överprissatt?)
```

### 2. **Miltal-verifierare** (Hög prioritet)
```
Input: Blocket-annons + Biluppgifter
Output:
- Match: ✅ Miltal stämmer
- Varning: ⚠️ Avvikelse på X mil
- Risk: 🚨 Möjlig manipulation
```

### 3. **Lead Scorer** (Medium prioritet)
```
Input: Bilprospekt-prospect
Output:
- Score 0-100
- Faktorer som påverkar
- Rekommenderad åtgärd (ring/brev/skip)
```

### 4. **Handlare-dashboard** (Medium prioritet)
```
Input: Region
Output:
- Lista på handlare
- Annonser per handlare
- Genomsnittspris
- Marknadsandel
```

---

## KPIs att tracka

| Metric | Beskrivning | Mål |
|--------|-------------|-----|
| Data coverage | % av Blocket-annonser med Biluppgifter | 80% |
| Dealer match rate | % ägare som matchar known_dealers | 90%+ |
| Price accuracy | MAE på prisprediktioner | < 10% |
| Lead conversion | Leads som blir kunder | 5%+ |
| Data freshness | Tid sedan senaste uppdatering | < 24h |

---

## Nästa Actions

1. **Skapa `/analyzer` route** - Ny sida för analyser
2. **Implementera pris-analyzer** - Börja med enkel statistik
3. **Lägg till miltal-verifiering** - Flagga avvikelser i UI
4. **Dashboard för handlare** - Visa statistik per dealer

---

*Senast uppdaterad: 2026-02-02*
