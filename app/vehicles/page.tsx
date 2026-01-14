import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Car, Star, ExternalLink, MapPin } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Vehicle {
  id: string
  reg_nr?: string
  chassis_nr?: string
  make?: string
  model?: string
  mileage?: number
  year?: number
  fuel_type?: string
  in_traffic?: boolean
  is_interesting?: boolean
  ai_score?: number
  lead_id: string
  leads?: {
    id: string
    phone?: string
    owner_info?: string
    location?: string
    status: string
  }
}

async function getVehicles() {
  const supabase = await createClient()

  const { data: vehicles, count, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      leads (
        id,
        phone,
        owner_info,
        location,
        status
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching vehicles:', error)
    return { vehicles: [], count: 0 }
  }

  return { vehicles: vehicles || [], count: count || 0 }
}

function formatMileage(mileage?: number): string {
  if (!mileage) return '-'
  return `${mileage.toLocaleString('sv-SE')} km`
}

export default async function VehiclesPage() {
  const { vehicles, count } = await getVehicles()

  return (
    <div className="flex flex-col">
      <Header
        title="Fordon"
        description={`${count} fordon i systemet`}
      />

      <div className="flex-1 p-6">
        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                  <Car className="h-7 w-7 text-gray-400" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">Inga fordon ännu</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Importera en Excel-fil för att lägga till fordon
                  </p>
                </div>
                <Link href="/import">
                  <Button>Importera Excel</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Reg.nr</TableHead>
                    <TableHead>Märke / Modell</TableHead>
                    <TableHead>År</TableHead>
                    <TableHead>Miltal</TableHead>
                    <TableHead>Drivmedel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ägare</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle: Vehicle) => (
                    <TableRow key={vehicle.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium bg-gray-100 px-2 py-0.5 rounded">
                            {vehicle.reg_nr || '-'}
                          </span>
                          {vehicle.is_interesting && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {vehicle.make} {vehicle.model}
                        </span>
                      </TableCell>
                      <TableCell>{vehicle.year || '-'}</TableCell>
                      <TableCell>
                        <span className={cn(
                          vehicle.mileage && vehicle.mileage > 200000
                            ? "text-orange-600"
                            : ""
                        )}>
                          {formatMileage(vehicle.mileage)}
                        </span>
                      </TableCell>
                      <TableCell>{vehicle.fuel_type || '-'}</TableCell>
                      <TableCell>
                        {vehicle.in_traffic ? (
                          <Badge className="bg-green-100 text-green-700">I trafik</Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            Avställd
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {vehicle.leads && (
                          <div className="text-sm">
                            {vehicle.leads.phone && (
                              <span className="text-gray-600">{vehicle.leads.phone}</span>
                            )}
                            {vehicle.leads.location && (
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <MapPin className="h-3 w-3" />
                                {vehicle.leads.location}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/leads/${vehicle.lead_id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
