'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Car,
  User,
  Calendar,
  Gauge,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Users,
  Home,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  DollarSign,
  FileText
} from 'lucide-react'
import { lookupByRegnummer } from '@/app/blocket-marknad/actions'
import { BiluppgifterResult } from '@/lib/biluppgifter/fetch-biluppgifter'

interface VehicleLookupProps {
  segmentData: {
    brands: { brand: string; count: number; avgPrice: number; avgMileage: number }[]
    models: { brand: string; model: string; count: number; avgPrice: number; avgMileage: number }[]
  }
}

export function VehicleLookup({ segmentData }: VehicleLookupProps) {
  const [regnummer, setRegnummer] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    blocketData?: {
      id: number
      marke: string
      modell: string
      arsmodell: number
      miltal: number
      pris: number
      stad: string | null
      saljare_typ: string
    }
    biluppgifterData?: BiluppgifterResult
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!regnummer.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await lookupByRegnummer(regnummer)

      if (!response.success) {
        setError(response.error || 'Kunde inte hämta data')
      } else {
        setResult({
          blocketData: response.blocketData,
          biluppgifterData: response.biluppgifterData
        })
      }
    } catch (err) {
      setError('Något gick fel')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('sv-SE') + ' kr'
  }

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('sv-SE')
  }

  // Calculate market comparison
  const getMarketComparison = () => {
    if (!result?.blocketData) return null

    const { marke, modell, pris, miltal } = result.blocketData

    // Find matching model
    let matchData = segmentData.models.find(
      m => m.brand === marke?.toUpperCase() && m.model === modell?.toUpperCase()
    )

    // Fallback to brand
    if (!matchData) {
      const brandData = segmentData.brands.find(b => b.brand === marke?.toUpperCase())
      if (brandData) {
        matchData = { ...brandData, model: 'Alla modeller' }
      }
    }

    if (!matchData) return null

    const priceDiff = pris - matchData.avgPrice
    const mileageDiff = miltal - matchData.avgMileage

    return {
      avgPrice: matchData.avgPrice,
      avgMileage: matchData.avgMileage,
      priceDiff,
      mileageDiff,
      priceStatus: priceDiff < -10000 ? 'under' : priceDiff > 10000 ? 'over' : 'normal',
      mileageStatus: mileageDiff < -2000 ? 'under' : mileageDiff > 2000 ? 'over' : 'normal'
    }
  }

  const marketComparison = result?.blocketData ? getMarketComparison() : null

  // Calculate inspection status
  const getInspectionStatus = () => {
    if (!result?.biluppgifterData?.inspection_until) return null

    const inspDate = new Date(result.biluppgifterData.inspection_until)
    const today = new Date()
    const daysLeft = Math.ceil((inspDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    return {
      date: result.biluppgifterData.inspection_until,
      daysLeft,
      status: daysLeft < 0 ? 'expired' : daysLeft < 30 ? 'soon' : 'ok'
    }
  }

  const inspectionStatus = result?.biluppgifterData ? getInspectionStatus() : null

  // Check mileage discrepancy
  const getMileageCheck = () => {
    if (!result?.blocketData?.miltal || !result?.biluppgifterData?.mileage) return null

    const blocketMil = result.blocketData.miltal
    const buMil = Math.round(result.biluppgifterData.mileage / 10)
    const diff = blocketMil - buMil

    return {
      blocketMil,
      buMil,
      diff,
      status: Math.abs(diff) < 2000 ? 'ok' : Math.abs(diff) < 5000 ? 'warning' : 'error'
    }
  }

  const mileageCheck = result ? getMileageCheck() : null

  return (
    <Card className="border-2 border-green-300 bg-green-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-green-600" />
          Sök bil - Blocket + Biluppgifter
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Mata in regnummer för att se marknadsdata och fordonshistorik
        </p>
      </CardHeader>
      <CardContent>
        {/* Search Input */}
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="ABC123"
            value={regnummer}
            onChange={(e) => setRegnummer(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="text-lg font-mono uppercase"
            maxLength={6}
          />
          <Button onClick={handleSearch} disabled={loading || !regnummer.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="ml-2">Sök</span>
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <p className="text-red-700 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              {error}
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Vehicle Header */}
            {result.biluppgifterData && (
              <div className="p-4 bg-white rounded-lg border">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  {result.biluppgifterData.regnr}
                </h3>
                <p className="text-muted-foreground">
                  {result.blocketData
                    ? `${result.blocketData.marke} ${result.blocketData.modell} ${result.blocketData.arsmodell}`
                    : 'Finns ej på Blocket just nu'}
                </p>
              </div>
            )}

            {/* Status Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Besiktning */}
              <div className={`p-3 rounded-lg border ${
                inspectionStatus?.status === 'expired' ? 'bg-red-50 border-red-300' :
                inspectionStatus?.status === 'soon' ? 'bg-yellow-50 border-yellow-300' :
                'bg-green-50 border-green-300'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Besiktning</span>
                </div>
                {inspectionStatus ? (
                  <>
                    <p className="text-lg font-bold">{formatDate(inspectionStatus.date)}</p>
                    <p className="text-xs">
                      {inspectionStatus.status === 'expired' ? (
                        <span className="text-red-600">⚠️ UTGÅNGEN</span>
                      ) : inspectionStatus.status === 'soon' ? (
                        <span className="text-yellow-600">{inspectionStatus.daysLeft} dagar kvar</span>
                      ) : (
                        <span className="text-green-600">✓ {inspectionStatus.daysLeft} dagar kvar</span>
                      )}
                    </p>
                  </>
                ) : <p className="text-muted-foreground">-</p>}
              </div>

              {/* Antal ägare */}
              <div className={`p-3 rounded-lg border ${
                (result.biluppgifterData?.num_owners || 0) > 4 ? 'bg-yellow-50 border-yellow-300' :
                'bg-white'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Ägare</span>
                </div>
                <p className="text-lg font-bold">{result.biluppgifterData?.num_owners || '-'} st</p>
                <p className="text-xs text-muted-foreground">
                  {(result.biluppgifterData?.num_owners || 0) > 4 ? '⚠️ Många ägare' : 'antal tidigare'}
                </p>
              </div>

              {/* Årsskatt */}
              <div className="p-3 rounded-lg border bg-white">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-medium">Årsskatt</span>
                </div>
                <p className="text-lg font-bold">
                  {result.biluppgifterData?.annual_tax
                    ? formatPrice(result.biluppgifterData.annual_tax)
                    : '-'}
                </p>
                <p className="text-xs text-muted-foreground">per år</p>
              </div>

              {/* Ägarens ålder */}
              <div className="p-3 rounded-lg border bg-white">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Ägare</span>
                </div>
                <p className="text-lg font-bold">
                  {result.biluppgifterData?.owner_age
                    ? `${result.biluppgifterData.owner_age} år`
                    : '-'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.biluppgifterData?.owner_city || '-'}
                </p>
              </div>
            </div>

            {/* Mileage Verification */}
            {mileageCheck && (
              <div className={`p-4 rounded-lg border ${
                mileageCheck.status === 'error' ? 'bg-red-50 border-red-300' :
                mileageCheck.status === 'warning' ? 'bg-yellow-50 border-yellow-300' :
                'bg-green-50 border-green-300'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-5 h-5" />
                  <span className="font-medium">Mätarställning - Verifiering</span>
                  {mileageCheck.status === 'ok' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {mileageCheck.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                  {mileageCheck.status === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Blocket-annons</p>
                    <p className="text-xl font-bold">{mileageCheck.blocketMil.toLocaleString()} mil</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Biluppgifter</p>
                    <p className="text-xl font-bold">{mileageCheck.buMil.toLocaleString()} mil</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Skillnad</p>
                    <p className={`text-xl font-bold ${
                      mileageCheck.status === 'ok' ? 'text-green-600' :
                      mileageCheck.status === 'warning' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {mileageCheck.diff > 0 ? '+' : ''}{mileageCheck.diff.toLocaleString()} mil
                    </p>
                  </div>
                </div>
                {mileageCheck.status !== 'ok' && (
                  <p className="mt-2 text-sm text-center">
                    {mileageCheck.status === 'warning'
                      ? '⚠️ Liten avvikelse - kolla senaste besiktningsdatum'
                      : '🔴 STOR AVVIKELSE - Möjlig mätarmanipulation!'}
                  </p>
                )}
              </div>
            )}

            {/* Market Comparison (if on Blocket) */}
            {result.blocketData && marketComparison && (
              <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Jämfört med marknaden</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Price comparison */}
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Pris vs snitt</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{formatPrice(result.blocketData.pris)}</p>
                      <Badge className={
                        marketComparison.priceStatus === 'under' ? 'bg-green-100 text-green-700' :
                        marketComparison.priceStatus === 'over' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {marketComparison.priceDiff > 0 ? '+' : ''}{Math.round(marketComparison.priceDiff / 1000)}k
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Snitt: {formatPrice(marketComparison.avgPrice)}
                    </p>
                  </div>

                  {/* Mileage comparison */}
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Mil vs snitt</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{result.blocketData.miltal.toLocaleString()}</p>
                      <Badge className={
                        marketComparison.mileageStatus === 'under' ? 'bg-green-100 text-green-700' :
                        marketComparison.mileageStatus === 'over' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {marketComparison.mileageDiff > 0 ? '+' : ''}{Math.round(marketComparison.mileageDiff / 1000)}k
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Snitt: {marketComparison.avgMileage.toLocaleString()} mil
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Other vehicles on address */}
            {result.biluppgifterData?.address_vehicles && result.biluppgifterData.address_vehicles.length > 0 && (
              <div className="p-4 rounded-lg border bg-purple-50 border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <Home className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Andra bilar på adressen</span>
                  <Badge variant="secondary">{result.biluppgifterData.address_vehicles.length} st</Badge>
                </div>
                <div className="space-y-2">
                  {result.biluppgifterData.address_vehicles.slice(0, 5).map((v, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white rounded">
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono">{v.regnr}</span>
                        <span className="text-muted-foreground">{v.description}</span>
                      </div>
                      {v.status && (
                        <Badge variant={v.status === 'I Trafik' ? 'default' : 'secondary'}>
                          {v.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary / Recommendation */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 border">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Sammanfattning
              </h4>
              <ul className="text-sm space-y-1">
                {inspectionStatus?.status === 'expired' && (
                  <li className="text-red-600">🔴 Besiktning utgången - måste besiktas!</li>
                )}
                {inspectionStatus?.status === 'soon' && (
                  <li className="text-yellow-600">⚠️ Besiktning snart - {inspectionStatus.daysLeft} dagar kvar</li>
                )}
                {mileageCheck?.status === 'error' && (
                  <li className="text-red-600">🔴 Stor mil-avvikelse - undersök!</li>
                )}
                {(result.biluppgifterData?.num_owners || 0) > 4 && (
                  <li className="text-yellow-600">⚠️ Många ägare ({result.biluppgifterData?.num_owners}) - kolla historik</li>
                )}
                {marketComparison?.priceStatus === 'under' && (
                  <li className="text-green-600">✅ Pris under marknad - potentiellt fynd!</li>
                )}
                {marketComparison?.priceStatus === 'over' && (
                  <li className="text-red-600">🔴 Pris över marknad - förhandla ner</li>
                )}
                {marketComparison?.mileageStatus === 'under' && (
                  <li className="text-green-600">✅ Låg mätarställning - bra värde</li>
                )}
                {!result.blocketData && (
                  <li className="text-blue-600">ℹ️ Bilen finns inte på Blocket just nu</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
