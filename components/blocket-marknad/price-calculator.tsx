'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calculator, Rocket, Clock, DollarSign, TrendingDown, TrendingUp, Minus, Search } from 'lucide-react'

interface MarketData {
  count: number
  avgPrice: number
  avgMileage: number
  minPrice: number
  maxPrice: number
  pricePerMil: number
}

interface PriceRecommendation {
  fastSale: { min: number; max: number }
  normalSale: { min: number; max: number }
  maxPrice: { min: number; max: number }
  marketPrice: number
  yourCarVsMarket: string
  mileageDiff: number
}

// Popular brands in the segment
const BRANDS = [
  'VOLKSWAGEN', 'VOLVO', 'FORD', 'AUDI', 'BMW', 'TOYOTA', 'PEUGEOT',
  'RENAULT', 'KIA', 'SKODA', 'MERCEDES-BENZ', 'CITROEN', 'HYUNDAI',
  'SUBARU', 'NISSAN', 'MAZDA', 'OPEL', 'MITSUBISHI', 'SEAT', 'SUZUKI'
]

// Popular models per brand
const MODELS: Record<string, string[]> = {
  'VOLKSWAGEN': ['GOLF', 'PASSAT', 'POLO', 'TIGUAN', 'CADDY', 'TOURAN', 'TRANSPORTER', 'T-ROC'],
  'VOLVO': ['V60', 'V40', 'V70', 'XC60', 'XC90', 'S60', 'V40 CROSS COUNTRY', 'V60 CROSS COUNTRY'],
  'FORD': ['FOCUS', 'FIESTA', 'MONDEO', 'KUGA', 'S-MAX', 'TRANSIT CONNECT'],
  'AUDI': ['A4', 'A3', 'A6', 'Q5', 'Q3', 'A1'],
  'BMW': ['3-SERIE', '5-SERIE', '1-SERIE', 'X1', 'X3', '320'],
  'TOYOTA': ['AURIS', 'AVENSIS', 'RAV4', 'YARIS', 'COROLLA', 'AYGO', 'C-HR'],
  'PEUGEOT': ['308', '208', '3008', '508', 'PARTNER', '2008'],
  'RENAULT': ['CLIO', 'MEGANE', 'CAPTUR', 'KADJAR', 'SCENIC'],
  'KIA': ['CEED', 'SPORTAGE', 'OPTIMA', 'NIRO', 'PICANTO', 'RIO'],
  'SKODA': ['OCTAVIA', 'FABIA', 'SUPERB', 'KODIAQ', 'YETI'],
  'MERCEDES-BENZ': ['C-KLASS', 'E-KLASS', 'A-KLASS', 'GLC', 'CLA'],
  'CITROEN': ['C3', 'C4', 'BERLINGO', 'C5'],
  'HYUNDAI': ['I30', 'I20', 'TUCSON', 'I40', 'KONA'],
  'SUBARU': ['XV', 'OUTBACK', 'FORESTER', 'IMPREZA'],
  'NISSAN': ['QASHQAI', 'JUKE', 'LEAF', 'X-TRAIL', 'MICRA'],
  'MAZDA': ['CX-3', 'CX-5', '3', '6', 'CX-30'],
  'OPEL': ['ASTRA', 'CORSA', 'INSIGNIA', 'MOKKA'],
  'MITSUBISHI': ['OUTLANDER', 'ASX', 'ECLIPSE CROSS'],
  'SEAT': ['LEON', 'IBIZA', 'ATECA', 'ARONA'],
  'SUZUKI': ['SWIFT', 'VITARA', 'SX4', 'JIMNY']
}

interface PriceCalculatorProps {
  segmentData: {
    brands: { brand: string; count: number; avgPrice: number; avgMileage: number }[]
    models: { brand: string; model: string; count: number; avgPrice: number; avgMileage: number }[]
  }
}

export function PriceCalculator({ segmentData }: PriceCalculatorProps) {
  const [brand, setBrand] = useState<string>('')
  const [model, setModel] = useState<string>('')
  const [year, setYear] = useState<string>('')
  const [mileage, setMileage] = useState<string>('')
  const [result, setResult] = useState<PriceRecommendation | null>(null)
  const [marketData, setMarketData] = useState<MarketData | null>(null)

  const availableModels = brand ? (MODELS[brand] || []) : []

  const calculatePrice = () => {
    if (!brand || !year || !mileage) return

    const yearNum = parseInt(year)
    const mileageNum = parseInt(mileage)

    // Find matching model data
    let matchData = segmentData.models.find(
      m => m.brand === brand && m.model === model
    )

    // Fallback to brand data if model not found
    if (!matchData) {
      const brandData = segmentData.brands.find(b => b.brand === brand)
      if (brandData) {
        matchData = {
          brand: brandData.brand,
          model: model || 'Alla modeller',
          count: brandData.count,
          avgPrice: brandData.avgPrice,
          avgMileage: brandData.avgMileage
        }
      }
    }

    if (!matchData) {
      // Use segment average
      matchData = {
        brand: brand,
        model: model || 'Okänd',
        count: 0,
        avgPrice: 100000,
        avgMileage: 14000
      }
    }

    // Calculate price adjustment based on mileage difference
    const mileageDiff = matchData.avgMileage - mileageNum
    const pricePerMil = 5 // ~5 kr per mil value change
    const mileageAdjustment = mileageDiff * pricePerMil

    // Calculate price adjustment based on year
    // Newer = higher price, older = lower price
    const avgYear = 2014 // Segment average
    const yearDiff = yearNum - avgYear
    const pricePerYear = 8000 // ~8k per year
    const yearAdjustment = yearDiff * pricePerYear

    // Base market price
    const basePrice = matchData.avgPrice
    const adjustedPrice = basePrice + mileageAdjustment + yearAdjustment

    // Ensure price is reasonable
    const marketPrice = Math.max(20000, Math.min(200000, adjustedPrice))

    // Calculate recommendations
    const recommendation: PriceRecommendation = {
      marketPrice: Math.round(marketPrice / 1000) * 1000,
      fastSale: {
        min: Math.round((marketPrice * 0.85) / 1000) * 1000,
        max: Math.round((marketPrice * 0.92) / 1000) * 1000
      },
      normalSale: {
        min: Math.round((marketPrice * 0.95) / 1000) * 1000,
        max: Math.round((marketPrice * 1.02) / 1000) * 1000
      },
      maxPrice: {
        min: Math.round((marketPrice * 1.05) / 1000) * 1000,
        max: Math.round((marketPrice * 1.15) / 1000) * 1000
      },
      yourCarVsMarket: mileageDiff > 0 ? 'bättre' : mileageDiff < 0 ? 'sämre' : 'samma',
      mileageDiff: Math.abs(mileageDiff)
    }

    setMarketData({
      count: matchData.count,
      avgPrice: matchData.avgPrice,
      avgMileage: matchData.avgMileage,
      minPrice: Math.round(matchData.avgPrice * 0.5),
      maxPrice: Math.round(matchData.avgPrice * 1.5),
      pricePerMil: pricePerMil
    })

    setResult(recommendation)
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('sv-SE') + ' kr'
  }

  return (
    <Card className="border-2 border-blue-300 bg-blue-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          Prisverktyg - Vad ska bilen kosta?
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Mata in bilens uppgifter för att få prisrekommendation
        </p>
      </CardHeader>
      <CardContent>
        {/* Input Form */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="brand">Märke</Label>
            <Select value={brand} onValueChange={(v) => { setBrand(v); setModel(''); setResult(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Välj märke" />
              </SelectTrigger>
              <SelectContent>
                {BRANDS.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="model">Modell</Label>
            <Select value={model} onValueChange={(v) => { setModel(v); setResult(null); }} disabled={!brand}>
              <SelectTrigger>
                <SelectValue placeholder="Välj modell" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="year">Årsmodell</Label>
            <Input
              id="year"
              type="number"
              placeholder="T.ex. 2015"
              min="2000"
              max="2018"
              value={year}
              onChange={(e) => { setYear(e.target.value); setResult(null); }}
            />
          </div>

          <div>
            <Label htmlFor="mileage">Mätarställning (mil)</Label>
            <Input
              id="mileage"
              type="number"
              placeholder="T.ex. 12000"
              value={mileage}
              onChange={(e) => { setMileage(e.target.value); setResult(null); }}
            />
          </div>
        </div>

        <Button onClick={calculatePrice} className="w-full mb-6" disabled={!brand || !year || !mileage}>
          <Search className="w-4 h-4 mr-2" />
          Beräkna pris
        </Button>

        {/* Results */}
        {result && marketData && (
          <div className="space-y-4">
            {/* Market info */}
            <div className="p-4 bg-white rounded-lg border">
              <p className="text-sm text-muted-foreground mb-2">Marknadsdata för {brand} {model || ''}</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{marketData.count}</p>
                  <p className="text-xs text-muted-foreground">bilar ute</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatPrice(marketData.avgPrice)}</p>
                  <p className="text-xs text-muted-foreground">snittpris</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{marketData.avgMileage.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">snitt mil</p>
                </div>
              </div>

              {/* Your car vs market */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm">
                  Din bil ({mileage} mil) har{' '}
                  <span className={result.yourCarVsMarket === 'bättre' ? 'text-green-600 font-bold' : result.yourCarVsMarket === 'sämre' ? 'text-red-600 font-bold' : ''}>
                    {result.mileageDiff.toLocaleString()} mil {result.yourCarVsMarket === 'bättre' ? 'MINDRE' : result.yourCarVsMarket === 'sämre' ? 'MER' : 'samma'}
                  </span>
                  {' '}än snittet
                  {result.yourCarVsMarket === 'bättre' && ' = Högre värde'}
                  {result.yourCarVsMarket === 'sämre' && ' = Lägre värde'}
                </p>
              </div>
            </div>

            {/* Price recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fast sale */}
              <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Rocket className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-800">Snabb försäljning</span>
                </div>
                <p className="text-xs text-green-700 mb-3">Säljs inom 1-7 dagar</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatPrice(result.fastSale.min)}
                </p>
                <p className="text-sm text-green-600">
                  till {formatPrice(result.fastSale.max)}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-green-700">
                  <TrendingDown className="w-3 h-3" />
                  <span>8-15% under marknad</span>
                </div>
              </div>

              {/* Normal sale */}
              <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-blue-800">Normal försäljning</span>
                </div>
                <p className="text-xs text-blue-700 mb-3">Säljs inom 2-4 veckor</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatPrice(result.normalSale.min)}
                </p>
                <p className="text-sm text-blue-600">
                  till {formatPrice(result.normalSale.max)}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-blue-700">
                  <Minus className="w-3 h-3" />
                  <span>Marknadspris</span>
                </div>
              </div>

              {/* Max price */}
              <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <span className="font-bold text-purple-800">Max pris</span>
                </div>
                <p className="text-xs text-purple-700 mb-3">Kan ta 1-2 månader</p>
                <p className="text-3xl font-bold text-purple-600">
                  {formatPrice(result.maxPrice.min)}
                </p>
                <p className="text-sm text-purple-600">
                  till {formatPrice(result.maxPrice.max)}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-purple-700">
                  <TrendingUp className="w-3 h-3" />
                  <span>5-15% över marknad</span>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Rekommendation:</strong> För att sälja snabbt, lägg ut bilen för{' '}
                <strong>{formatPrice(result.fastSale.max)}</strong>.
                {result.yourCarVsMarket === 'bättre' && ' Din bil har låg mil vilket är positivt!'}
                {result.yourCarVsMarket === 'sämre' && ' Tänk på att din bil har högre mil än snittet.'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
