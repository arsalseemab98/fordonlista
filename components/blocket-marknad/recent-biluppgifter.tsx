'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Database,
  User,
  MapPin,
  Phone,
  Car,
  Calendar,
  CreditCard,
  Users,
  Clock,
  ChevronDown,
  ChevronRight,
  Home,
  FileText
} from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { sv } from 'date-fns/locale'

export interface RecentBiluppgifterItem {
  // Biluppgifter data
  regnummer: string
  blocket_id: number | null
  mileage_km: number | null
  mileage_mil: number | null
  num_owners: number | null
  annual_tax: number | null
  inspection_until: string | null
  owner_name: string | null
  owner_age: number | null
  owner_city: string | null
  owner_address: string | null
  owner_postal_code: string | null
  owner_postal_city: string | null
  owner_phone: string | null
  owner_vehicles: Array<{ regnr: string; model?: string; year?: number; status?: string }> | null
  address_vehicles: Array<{ regnr: string; model?: string; year?: number; status?: string }> | null
  mileage_history: Array<{ date: string; mileage_km: number; mileage_mil?: number }> | null
  owner_history: Array<{ date: string; type: string; name?: string; details?: string }> | null
  is_dealer: boolean | null
  fetched_at: string | null
  // Blocket annons data
  blocket_annons?: {
    marke: string | null
    modell: string | null
    arsmodell: number | null
    pris: number | null
    miltal: number | null
    stad: string | null
    region: string | null
    saljare_typ: string | null
    url: string | null
  } | null
}

interface RecentBiluppgifterProps {
  items: RecentBiluppgifterItem[]
}

export function RecentBiluppgifter({ items }: RecentBiluppgifterProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const toggleRow = (regnr: string) => {
    setExpandedRow(expandedRow === regnr ? null : regnr)
  }

  const formatPrice = (price: number | null) => {
    if (!price) return '-'
    return new Intl.NumberFormat('sv-SE').format(price) + ' kr'
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: sv })
    } catch {
      return date
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Senaste hämtade biluppgifter
          <Badge variant="secondary" className="ml-2">{items.length} bilar</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Inga biluppgifter hämtade än. Kör scriptet för att hämta data.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Regnr</TableHead>
                  <TableHead>Bil</TableHead>
                  <TableHead>Pris</TableHead>
                  <TableHead>Ägare</TableHead>
                  <TableHead>Ålder</TableHead>
                  <TableHead>Ort</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Antal ägare</TableHead>
                  <TableHead>Hämtad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <>
                    <TableRow
                      key={item.regnummer}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRow(item.regnummer)}
                    >
                      <TableCell>
                        {expandedRow === item.regnummer ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-bold">
                        {item.regnummer}
                      </TableCell>
                      <TableCell>
                        {item.blocket_annons ? (
                          <div>
                            <div className="font-medium">
                              {item.blocket_annons.marke} {item.blocket_annons.modell}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.blocket_annons.arsmodell}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatPrice(item.blocket_annons?.pris || null)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {item.is_dealer ? (
                            <Badge variant="outline" className="text-xs">Handlare</Badge>
                          ) : null}
                          <span className={item.owner_name ? '' : 'text-muted-foreground'}>
                            {item.owner_name || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.owner_age ? `${item.owner_age} år` : '-'}
                      </TableCell>
                      <TableCell>
                        {item.owner_city || item.owner_postal_city || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.owner_phone || '-'}
                      </TableCell>
                      <TableCell>
                        {item.num_owners || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(item.fetched_at)}
                      </TableCell>
                    </TableRow>

                    {/* Expanded details */}
                    {expandedRow === item.regnummer && (
                      <TableRow>
                        <TableCell colSpan={10} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Ägarinfo */}
                            <div className="space-y-2">
                              <h4 className="font-semibold flex items-center gap-2">
                                <User className="h-4 w-4" /> Ägaruppgifter
                              </h4>
                              <div className="text-sm space-y-1">
                                <p><strong>Namn:</strong> {item.owner_name || '-'}</p>
                                <p><strong>Ålder:</strong> {item.owner_age ? `${item.owner_age} år` : '-'}</p>
                                <p className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {item.owner_address || '-'}
                                </p>
                                <p>
                                  {item.owner_postal_code} {item.owner_postal_city}
                                </p>
                                {item.owner_phone && (
                                  <p className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    <a href={`tel:${item.owner_phone}`} className="text-blue-600 hover:underline">
                                      {item.owner_phone}
                                    </a>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Fordonsinfo */}
                            <div className="space-y-2">
                              <h4 className="font-semibold flex items-center gap-2">
                                <Car className="h-4 w-4" /> Fordonsdata
                              </h4>
                              <div className="text-sm space-y-1">
                                <p><strong>Miltal:</strong> {item.mileage_mil ? `${item.mileage_mil.toLocaleString()} mil` : '-'}</p>
                                <p><strong>Antal ägare:</strong> {item.num_owners || '-'}</p>
                                <p className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3" />
                                  <strong>Årsskatt:</strong> {item.annual_tax ? `${item.annual_tax.toLocaleString()} kr` : '-'}
                                </p>
                                <p className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <strong>Besiktning:</strong> {item.inspection_until || '-'}
                                </p>
                              </div>
                            </div>

                            {/* Relaterade fordon */}
                            <div className="space-y-2">
                              <h4 className="font-semibold flex items-center gap-2">
                                <Home className="h-4 w-4" /> Relaterade fordon
                              </h4>
                              <div className="text-sm space-y-2">
                                {item.owner_vehicles && item.owner_vehicles.length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      Ägarens fordon ({item.owner_vehicles.length} st):
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {item.owner_vehicles.slice(0, 5).map((v, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                          {v.regnr}
                                        </Badge>
                                      ))}
                                      {item.owner_vehicles.length > 5 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{item.owner_vehicles.length - 5} till
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {item.address_vehicles && item.address_vehicles.length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      På samma adress ({item.address_vehicles.length} st):
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {item.address_vehicles.slice(0, 5).map((v, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                          {v.regnr}
                                        </Badge>
                                      ))}
                                      {item.address_vehicles.length > 5 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{item.address_vehicles.length - 5} till
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {(!item.owner_vehicles || item.owner_vehicles.length === 0) &&
                                 (!item.address_vehicles || item.address_vehicles.length === 0) && (
                                  <p className="text-muted-foreground">Inga relaterade fordon</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Milhistorik */}
                          {item.mileage_history && item.mileage_history.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="font-semibold flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4" /> Milhistorik (besiktningar)
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {item.mileage_history.slice(0, 6).map((h, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {h.date}: {h.mileage_mil || Math.round(h.mileage_km / 10)} mil
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Ägarhistorik */}
                          {item.owner_history && item.owner_history.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="font-semibold flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4" /> Ägarhistorik ({item.owner_history.length} ägare)
                              </h4>
                              <div className="space-y-1 text-sm">
                                {item.owner_history.slice(0, 5).map((h, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <Badge variant={h.type === 'Bilhandlare' ? 'default' : 'outline'} className="text-xs">
                                      {h.type}
                                    </Badge>
                                    <span className="text-muted-foreground">{h.date}:</span>
                                    <span>{h.name || 'Okänd'}</span>
                                  </div>
                                ))}
                                {item.owner_history.length > 5 && (
                                  <p className="text-muted-foreground text-xs">
                                    +{item.owner_history.length - 5} tidigare ägare
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Blocket-länk */}
                          {item.blocket_annons?.url && (
                            <div className="mt-4 pt-4 border-t">
                              <a
                                href={item.blocket_annons.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                Se annons på Blocket
                              </a>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
