# Fordonlista - Mål & Vision

## Syfte

Fordonlista är en **marknadsanalys-plattform** för den svenska begagnatbilmarknaden. Vi aggregerar data från tre källor för att ge insikter om marknadstrender, prissättning och säljbeteenden.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   BILPROSPEKT   │     │     BLOCKET     │     │  BILUPPGIFTER   │
│                 │     │                 │     │                 │
│ • Ägarbyte-data │     │ • Aktiva annon- │     │ • Ägarhistorik  │
│ • Regnummer     │     │   ser           │     │ • Antal ägare   │
│ • Prospekttyp   │     │ • Priser        │     │ • Innehavstid   │
│ • Region        │     │ • Handlare/     │     │ • Ägartyp       │
│ • Innehavstid   │     │   Privat        │     │   (företag/     │
│                 │     │ • Liggtid       │     │    privatperson)│
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   MARKNADSANALYS        │
                    │                         │
                    │  • Pristrender          │
                    │  • Säljbeteende         │
                    │  • Handlarstatistik     │
                    │  • Regionala mönster    │
                    └─────────────────────────┘
```

---

## Datakällor

### 1. Bilprospekt (MCP)
- **Vad:** Registerdata om nya fordonsägare
- **Insikter:** Vem köper vilka bilar? När? Var?

### 2. Blocket Scraper
- **Vad:** Aktiva och sålda bilannonser
- **Insikter:** Marknadspriser, utbud, liggtider, säljare

### 3. Biluppgifter.se
- **Vad:** Detaljerad ägar- och fordonsinfo
- **Insikter:** Ägarhistorik, handlare-identifiering, innehavstider

---

## Analyzer - Fokusområden

### 1. MARKNADSANALYS

#### 1.1 Prisanalys
| Analys | Beskrivning | Frågor den svarar på |
|--------|-------------|---------------------|
| **Prisindex per segment** | Genomsnittspris för märke/modell/årsmodell | Vad kostar en Volvo V60 2019 i snitt? |
| **Prisutveckling över tid** | Hur priser förändras vecka/månad | Går priserna upp eller ner? |
| **Regional prisskillnad** | Jämför priser mellan regioner | Är bilar billigare i Norrland? |
| **Prisfördelning** | Percentiler (billig/medel/dyr) | Vad är ett "bra pris" vs "dyrt"? |
| **Pris vs Ålder/Miltal** | Korrelation pris-ålder-miltal | Hur mycket påverkar miltal priset? |

#### 1.2 Utbudsanalys
| Analys | Beskrivning | Frågor den svarar på |
|--------|-------------|---------------------|
| **Utbud per segment** | Antal bilar per märke/modell | Vilka bilar finns det mest av? |
| **Utbudstrend** | Ökar/minskar antal annonser | Är marknaden het eller sval? |
| **Säsongsvariation** | Utbud per månad/kvartal | När är det flest bilar till salu? |
| **Regionalt utbud** | Fördelning per län | Var finns bilarna? |
| **Handlare vs Privat** | Fördelning per säljarkategori | Vem säljer mest? |

#### 1.3 Liggtidsanalys
| Analys | Beskrivning | Frågor den svarar på |
|--------|-------------|---------------------|
| **Genomsnittlig liggtid** | Dagar från publicering till såld | Hur snabbt säljs bilar? |
| **Liggtid per segment** | Per märke/modell/prisintervall | Vilka bilar säljs snabbast? |
| **Liggtid vs Pris** | Korrelation | Säljer billigare bilar snabbare? |
| **Osålda bilar** | Annonser > 30/60/90 dagar | Vilka bilar fastnar? |

---

### 2. HANDLARE-ANALYS

#### 2.1 Handlarprofiler
| Analys | Beskrivning | Frågor den svarar på |
|--------|-------------|---------------------|
| **Handlare per region** | Antal och lista | Vilka handlare finns i Norrbotten? |
| **Marknadsandel** | % av utbudet per handlare | Vem dominerar marknaden? |
| **Sortiment** | Vilka märken/modeller per handlare | Vad säljer Bilia vs Din Bil? |
| **Prissättning** | Genomsnittspris per handlare | Vem är dyrast/billigast? |
| **Omsättning** | Nya annonser per vecka/månad | Hur aktiva är de? |

#### 2.2 Handlare vs Privat
| Analys | Beskrivning | Frågor den svarar på |
|--------|-------------|---------------------|
| **Prisskillnad** | Samma bil, olika säljare | Hur mycket dyrare är handlare? |
| **Sortimentskillnad** | Vilka bilar säljs var | Säljer privatpersoner äldre bilar? |
| **Liggtidskillnad** | Säljer handlare snabbare? | Vem säljer effektivast? |
| **Trendskillnad** | Utveckling över tid | Tar handlare över marknaden? |

#### 2.3 Handlarbeteende
| Analys | Beskrivning | Frågor den svarar på |
|--------|-------------|---------------------|
| **Inköpsmönster** | När köper handlare in bilar? | Vilka bilar väljer de? |
| **Prissättningsstrategi** | Hur sätter de priser? | Startar de högt och sänker? |
| **Lageromsättning** | Hur snabbt säljer de? | Vilka bilar blir liggare? |
| **Säsongsbeteende** | Variation över året | Köper de in mer inför våren? |

---

### 3. SÄLJBETEENDE-ANALYS

#### 3.1 Privatpersoners säljbeteende
| Analys | Beskrivning | Frågor den svarar på |
|--------|-------------|---------------------|
| **Innehavstid innan försäljning** | Hur länge äger folk bilar? | När säljer folk sina bilar? |
| **Säljcykel** | Tid från "tänker sälja" till såld | Hur lång är processen? |
| **Prissänkningar** | Hur ofta och hur mycket | Sänker säljare priserna? |
| **Säsongsmönster** | När säljer privatpersoner? | Säljs fler bilar på våren? |

#### 3.2 Ägarbytesmönster
| Analys | Beskrivning | Frågor den svarar på |
|--------|-------------|---------------------|
| **Ägarbyten per månad** | Volym och trend | Är marknaden aktiv? |
| **Ägarkedja** | Privat→Handlare→Privat | Hur flödar bilar? |
| **Snabba flips** | Korta innehavstider | Vilka bilar byter ägare ofta? |
| **Regional rörlighet** | Bilar som byter region | Flödar bilar norr→söder? |

#### 3.3 Köparbeteende (via Bilprospekt)
| Analys | Beskrivning | Frågor den svarar på |
|--------|-------------|---------------------|
| **Vem köper vad?** | Demografi per biltyp | Köper unga SUV eller småbilar? |
| **Köpmönster** | Årstid, region, fordonstyp | När köps mest? |
| **Uppgradering/Nedgradering** | Bilbyte-mönster | Byter folk upp sig eller ner? |

---

### 4. REGIONALA ANALYSER

#### 4.1 Regional marknadsöversikt
| Analys | Beskrivning | Frågor den svarar på |
|--------|-------------|---------------------|
| **Marknadsstorlek** | Antal bilar per region | Var är marknaden störst? |
| **Prisindex per region** | Relativt pris | Var är bilar billigast? |
| **Populära modeller** | Top 10 per region | Vad säljs i Norrland vs Stockholm? |
| **Handlartäthet** | Handlare per capita | Var finns mest konkurrens? |

#### 4.2 Regionala trender
| Analys | Beskrivning | Frågor den svarar på |
|--------|-------------|---------------------|
| **Tillväxt/Nedgång** | Förändring över tid | Vilka regioner växer? |
| **Prisrörelser** | Prisförändringar per region | Var stiger/sjunker priserna? |
| **Säsongspåverkan** | Regional säsongsvariation | Påverkas Norrland mer av vinter? |

---

### 5. TRENDANALYS & PROGNOSER

#### 5.1 Marknadstrender
| Analys | Beskrivning | Frågor den svarar på |
|--------|-------------|---------------------|
| **Elbilstrend** | Andel elbilar över tid | Hur snabbt växer elbilsmarknaden? |
| **SUV-trend** | Popularitet SUV vs sedan | Tar SUV över? |
| **Åldersfördelning** | Genomsnittlig ålder på sålda bilar | Säljs nyare eller äldre bilar? |
| **Premiumandel** | BMW/Audi/Mercedes vs budget | Går marknaden uppåt eller nedåt? |

#### 5.2 Prisprognoser
| Analys | Beskrivning | Frågor den svarar på |
|--------|-------------|---------------------|
| **Värdeminskning** | % per år per modell | Vilka bilar håller värdet? |
| **Säsongsprognos** | Förväntat pris per kvartal | När är bästa tid att köpa/sälja? |
| **Segmentprognos** | Förväntad prisutveckling | Kommer SUV-priser sjunka? |

---

## Teknisk Plan

### Fas 1: Data-aggregering ✅
- [x] Bilprospekt MCP-integration
- [x] Blocket scraper (aktiva + sålda)
- [x] Biluppgifter API
- [x] Known dealers-system

### Fas 2: Analyzer-infrastruktur
- [ ] `/analyzer` route med dashboard
- [ ] Databearbetning för aggregerad statistik
- [ ] Cache för tunga beräkningar
- [ ] Export-funktioner (CSV, PDF)

### Fas 3: Grundläggande Analyzers
- [ ] **Prisanalys-modul** - Prisindex, percentiler, trender
- [ ] **Handlare-dashboard** - Profiler, marknadsandel, sortiment
- [ ] **Regional översikt** - Karta med statistik per län

### Fas 4: Avancerade Analyzers
- [ ] **Säljbeteende-analys** - Innehavstid, prissänkningar
- [ ] **Liggtidsanalys** - Vad säljer snabbt/långsamt?
- [ ] **Trendanalys** - Elbil, SUV, premium

### Fas 5: Visualisering
- [ ] Interaktiva grafer (Chart.js / Recharts)
- [ ] Kartor (regional data)
- [ ] Jämförelseverktyg
- [ ] Automatiska rapporter

---

## Dashboard-mockup

```
┌─────────────────────────────────────────────────────────────────┐
│  FORDONLISTA ANALYZER                          [Region: Alla ▼] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐│
│  │ Aktiva       │ │ Sålda/vecka  │ │ Snitt-pris   │ │ Liggtid ││
│  │ annonser     │ │              │ │              │ │         ││
│  │   12,450     │ │    1,230     │ │   189,500 kr │ │ 28 dagar││
│  │   ↑ 5%       │ │    ↓ 3%     │ │   ↑ 2%      │ │ ↓ 2 dgr ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────┘│
│                                                                 │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│  │ PRISINDEX PER MÄRKE         │ │ UTBUD ÖVER TID              ││
│  │ ═══════════════════════════ │ │ ═══════════════════════════ ││
│  │ Volvo    ████████░░ 185k    │ │      ___                    ││
│  │ BMW      █████████░ 210k    │ │   __/   \__    __           ││
│  │ Audi     █████████░ 205k    │ │  /        \__/  \           ││
│  │ VW       ██████░░░░ 145k    │ │ /                \___       ││
│  │ Toyota   ███████░░░ 165k    │ │ Jan  Mar  Maj  Jul  Sep     ││
│  └─────────────────────────────┘ └─────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│  │ TOP HANDLARE (Norrland)     │ │ HANDLARE VS PRIVAT          ││
│  │ ═══════════════════════════ │ │ ═══════════════════════════ ││
│  │ 1. Bilia Luleå     45 bilar │ │                             ││
│  │ 2. Din Bil Umeå    38 bilar │ │ Handlare: 4,200 (34%)       ││
│  │ 3. Holmgrens       32 bilar │ │ ██████████░░░░░░░░░░░░░░░░  ││
│  │ 4. Motorbiten      28 bilar │ │                             ││
│  │ 5. Norrlands Bil   25 bilar │ │ Privat: 8,250 (66%)         ││
│  └─────────────────────────────┘ │ ████████████████████░░░░░░  ││
│                                  └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Prioriterade Nästa Steg

### 1. **Pris-analyzer** (Första modul)
- Prisindex per märke/modell
- Percentiler (P25/P50/P75)
- Regional jämförelse
- Trend över tid

### 2. **Handlare-dashboard**
- Lista alla kända handlare
- Antal annonser, genomsnittspris
- Sortiment per handlare
- Marknadsandel per region

### 3. **Utbuds-översikt**
- Totalt antal per region
- Trend (ökar/minskar)
- Fördelning märke/modell

---

## KPIs

| Metric | Beskrivning |
|--------|-------------|
| Täckning | % av marknaden vi trackar |
| Handlare | Antal identifierade handlare |
| Historik | Månader av prisdata |
| Precision | Kvalitet på aggregerad data |

---

*Senast uppdaterad: 2026-02-02*
