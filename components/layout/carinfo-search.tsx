'use client'

import { useState, useCallback } from 'react'
import { Search, Loader2, Car, Calendar, Fuel, Gauge, Users, DollarSign, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface CarInfoData {
  reg_number: string
  status?: string
  make?: string
  model?: string
  make_model?: string
  year?: number
  color?: string
  horsepower?: number
  fuel_type?: string
  transmission?: string
  skatt?: number
  skatt_formatted?: string
  co2_gkm?: number
  mileage_km?: number
  mileage_mil?: number
  antal_agare?: number
  valuation_company?: number
  valuation_company_formatted?: string
  valuation_private?: number
  valuation_private_formatted?: string
  total_in_sweden?: number
  senaste_avställning?: string
  senaste_påställning?: string
  första_registrering?: string
  vehicle_history?: Array<{ date: string; event: string; details?: string }>
  mileage_history?: Array<{ date: string; mileage_km: number }>
  error?: string
}

export function CarInfoSearch() {
  const [searchValue, setSearchValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [carInfo, setCarInfo] = useState<CarInfoData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async () => {
    const regNr = searchValue.trim().toUpperCase().replace(/\s/g, '')
    if (!regNr || regNr.length < 2) return

    setIsLoading(true)
    setError(null)
    setCarInfo(null)

    try {
      const response = await fetch('/api/carinfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg_number: regNr })
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setCarInfo(data)
      }
      setIsOpen(true)
    } catch (err) {
      setError('Kunde inte hämta fordonsdata')
      setIsOpen(true)
    } finally {
      setIsLoading(false)
    }
  }, [searchValue])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return '-'
    return num.toLocaleString('sv-SE')
  }

  const formatCurrency = (num: number | undefined) => {
    if (num === undefined) return '-'
    return `${num.toLocaleString('sv-SE')} kr`
  }

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null
    const isInTraffic = status === 'i_trafik'
    return (
      <Badge
        variant={isInTraffic ? 'default' : 'secondary'}
        className={cn(
          isInTraffic ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
        )}
      >
        {isInTraffic ? (
          <><CheckCircle className="h-3 w-3 mr-1" /> I trafik</>
        ) : (
          <><XCircle className="h-3 w-3 mr-1" /> {status === 'avställd' ? 'Avställd' : status}</>
        )}
      </Badge>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Sök reg.nr..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            className="pl-9 w-[140px] md:w-[180px] h-9 uppercase"
            maxLength={7}
          />
        </div>
        <Button
          size="sm"
          onClick={handleSearch}
          disabled={isLoading || searchValue.trim().length < 2}
          className="h-9"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Car className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Car className="h-6 w-6" />
              <span className="font-mono text-xl">{carInfo?.reg_number || searchValue.toUpperCase()}</span>
              {carInfo && getStatusBadge(carInfo.status)}
            </DialogTitle>
          </DialogHeader>

          {error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <p className="text-lg font-medium text-gray-900">Kunde inte hämta data</p>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
            </div>
          ) : carInfo ? (
            <div className="space-y-6">
              {/* Vehicle Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoCard
                  icon={<Car className="h-5 w-5 text-blue-600" />}
                  label="Fordon"
                  value={carInfo.make && carInfo.model ? `${carInfo.make} ${carInfo.model}` : carInfo.make_model || '-'}
                />
                <InfoCard
                  icon={<Calendar className="h-5 w-5 text-purple-600" />}
                  label="Årsmodell"
                  value={carInfo.year?.toString() || '-'}
                />
                <InfoCard
                  icon={<div className="h-5 w-5 rounded-full border-2" style={{ backgroundColor: carInfo.color?.toLowerCase() || 'transparent' }} />}
                  label="Färg"
                  value={carInfo.color || '-'}
                />
                <InfoCard
                  icon={<Gauge className="h-5 w-5 text-orange-600" />}
                  label="Mätarställning"
                  value={carInfo.mileage_km ? `${formatNumber(carInfo.mileage_km)} km` : '-'}
                />
                <InfoCard
                  icon={<Fuel className="h-5 w-5 text-green-600" />}
                  label="Drivmedel"
                  value={carInfo.fuel_type || '-'}
                />
                <InfoCard
                  icon={<Users className="h-5 w-5 text-indigo-600" />}
                  label="Antal ägare"
                  value={carInfo.antal_agare?.toString() || '-'}
                />
              </div>

              {/* Technical Details */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-3">Tekniska detaljer</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Effekt:</span>
                    <span className="ml-2 font-medium">{carInfo.horsepower ? `${carInfo.horsepower} hk` : '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Växellåda:</span>
                    <span className="ml-2 font-medium">{carInfo.transmission || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">CO₂:</span>
                    <span className="ml-2 font-medium">{carInfo.co2_gkm ? `${carInfo.co2_gkm} g/km` : '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Skatt:</span>
                    <span className="ml-2 font-medium">{carInfo.skatt ? formatCurrency(carInfo.skatt) + '/år' : '-'}</span>
                  </div>
                </div>
              </div>

              {/* Valuations */}
              {(carInfo.valuation_company || carInfo.valuation_private) && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm text-gray-500 uppercase mb-3">Värdering</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm font-medium">Företag</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">
                        {formatCurrency(carInfo.valuation_company)}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-600 mb-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm font-medium">Privat</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900">
                        {formatCurrency(carInfo.valuation_private)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-3">Datum</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Första registrering:</span>
                    <span className="ml-2 font-medium">{carInfo.första_registrering || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Senaste påställning:</span>
                    <span className="ml-2 font-medium">{carInfo.senaste_påställning || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Senaste avställning:</span>
                    <span className="ml-2 font-medium">{carInfo.senaste_avställning || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              {carInfo.total_in_sweden && (
                <div className="border-t pt-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">Totalt antal i Sverige</p>
                    <p className="text-3xl font-bold text-gray-900">{formatNumber(carInfo.total_in_sweden)}</p>
                    <p className="text-xs text-gray-400">registrerade fordon av samma modell</p>
                  </div>
                </div>
              )}

              {/* Mileage History */}
              {carInfo.mileage_history && carInfo.mileage_history.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm text-gray-500 uppercase mb-3">Mätarhistorik (senaste 4 år)</h3>
                  <div className="space-y-2">
                    {carInfo.mileage_history.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 text-sm border-l-2 border-blue-200 pl-3 py-1">
                        <span className="text-gray-400 font-mono text-xs">{entry.date}</span>
                        <span className="font-medium">{entry.mileage_km.toLocaleString('sv-SE')} km</span>
                      </div>
                    ))}
                  </div>
                  {carInfo.mileage_history.length >= 2 && (() => {
                    const sorted = [...carInfo.mileage_history].sort((a, b) => a.date.localeCompare(b.date))
                    const oldest = sorted[0]
                    const newest = sorted[sorted.length - 1]
                    const diffKm = newest.mileage_km - oldest.mileage_km
                    const diffDays = (new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 60 * 60 * 24)
                    const perYear = diffDays > 0 ? Math.round((diffKm / diffDays) * 365) : 0
                    return (
                      <div className="mt-2 text-sm text-gray-500 bg-gray-50 rounded p-2">
                        Genomsnitt: ~{perYear.toLocaleString('sv-SE')} km/år
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Vehicle History */}
              {carInfo.vehicle_history && carInfo.vehicle_history.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm text-gray-500 uppercase mb-3">Fordonshistorik</h3>
                  <div className="space-y-2">
                    {carInfo.vehicle_history.map((event, idx) => (
                      <div key={idx} className="flex gap-3 text-sm border-l-2 border-gray-200 pl-3 py-1">
                        <span className="text-gray-400 font-mono text-xs">{event.date}</span>
                        <span className="font-medium">{event.event}</span>
                        {event.details && <span className="text-gray-500">{event.details}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-2 text-gray-600 mb-1">
        {icon}
        <span className="text-xs font-medium uppercase">{label}</span>
      </div>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}
