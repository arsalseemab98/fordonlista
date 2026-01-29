import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as cheerio from 'cheerio'

export const runtime = 'edge'

interface BiluppgifterResponse {
  regnr: string
  success: boolean
  // Vehicle data
  mileage?: number
  mileage_unit?: string
  num_owners?: number
  annual_tax?: number
  inspection_until?: string
  // Owner data from vehicle page
  owner_name?: string
  owner_city?: string
  owner_profile_id?: string
  // Owner profile data (detailed)
  owner_age?: number
  owner_address?: string
  owner_postal_code?: string
  owner_postal_city?: string
  owner_phone?: string
  // Other vehicles
  owner_vehicles?: Array<{ regnr: string; description: string }>
  address_vehicles?: Array<{ regnr: string; description: string; status?: string }>
  // Error
  error?: string
}

const BASE_URL = 'https://biluppgifter.se'

async function fetchPage(path: string, cookies: Record<string, string>): Promise<{ html: string; error?: string }> {
  const cookieString = Object.entries(cookies)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Host': 'biluppgifter.se',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': `${BASE_URL}/`,
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'DNT': '1',
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cookie': cookieString,
      },
      cache: 'no-store',
    })

    if (response.status === 403) {
      return { html: '', error: 'Cloudflare blockerar förfrågan. Uppdatera cookies i Inställningar.' }
    }

    if (!response.ok) {
      return { html: '', error: `HTTP ${response.status}: ${response.statusText}` }
    }

    const html = await response.text()

    // Check for Cloudflare challenge page
    if (html.includes('challenge-platform') || html.includes('cf-browser-verification')) {
      return { html: '', error: 'Cloudflare challenge krävs. Uppdatera cf_clearance cookie.' }
    }

    return { html }
  } catch (error) {
    console.error('Fetch error:', error)
    return { html: '', error: 'Kunde inte ansluta till biluppgifter.se' }
  }
}

function parseVehicleData(html: string, regnr: string): BiluppgifterResponse {
  const $ = cheerio.load(html)
  const result: BiluppgifterResponse = {
    regnr,
    success: true,
  }

  // Parse label-value pairs from sections
  $('section').each((_, section) => {
    $(section).find('li').each((_, li) => {
      const label = $(li).find('span.label').text().trim().toLowerCase()
      const value = $(li).find('span.value').text().trim()

      if (!label || !value) return

      // Mätarställning (Mileage)
      if (label.includes('mätarställning') || label.includes('miltal')) {
        const kmMatch = value.match(/([\d\s]+)\s*km/i)
        const milMatch = value.match(/([\d\s]+)\s*mil/i)

        if (kmMatch) {
          result.mileage = parseInt(kmMatch[1].replace(/\s/g, ''), 10)
          result.mileage_unit = 'km'
        } else if (milMatch) {
          const mil = parseInt(milMatch[1].replace(/\s/g, ''), 10)
          result.mileage = mil * 10 // Convert mil to km
          result.mileage_unit = 'mil'
        }
      }

      // Antal ägare (Number of owners)
      if (label.includes('antal ägare') || label.includes('ägare')) {
        const numMatch = value.match(/(\d+)/)
        if (numMatch) {
          result.num_owners = parseInt(numMatch[1], 10)
        }
      }

      // Fordonsskatt (Annual tax)
      if (label.includes('skatt') || label.includes('fordonsskatt')) {
        const taxMatch = value.match(/([\d\s]+)\s*kr/i)
        if (taxMatch) {
          result.annual_tax = parseInt(taxMatch[1].replace(/\s/g, ''), 10)
        }
      }

      // Besiktning (Inspection)
      if (label.includes('besiktning') || label.includes('kontroll')) {
        const dateMatch = value.match(/(\d{4}-\d{2}(?:-\d{2})?)/)
        if (dateMatch) {
          result.inspection_until = dateMatch[1]
        }
      }
    })
  })

  // Parse owner info from owner-history section
  const ownerSection = $('#owner-history')
  if (ownerSection.length) {
    const introP = ownerSection.find('p').first()
    const ownerLink = introP.find('a[href*="/brukare/"]')

    if (ownerLink.length) {
      result.owner_name = ownerLink.text().trim()
      const href = ownerLink.attr('href') || ''
      const profileMatch = href.match(/\/brukare\/([^/]+)/)
      if (profileMatch) {
        result.owner_profile_id = profileMatch[1]
      }

      // Extract city
      introP.find('em').each((_, em) => {
        const text = $(em).text().trim()
        if (text.startsWith('från ')) {
          result.owner_city = text.replace('från ', '')
        }
      })
    }
  }

  return result
}

function parseOwnerProfile(html: string): Partial<BiluppgifterResponse> {
  const $ = cheerio.load(html)
  const result: Partial<BiluppgifterResponse> = {}

  // Parse profile info from sections
  $('section').each((_, section) => {
    const sectionText = $(section).text()

    // Person info section
    if (sectionText.includes('privatperson') || sectionText.includes('bor i') || sectionText.includes('år gammal')) {
      $(section).find('p').each((_, p) => {
        const text = $(p).text().trim()

        // Name, age, city pattern
        const personMatch = text.match(/^(.+?), en (\w+) som är (\d+) år.+bor i (.+?),/)
        if (personMatch) {
          result.owner_name = personMatch[1]
          result.owner_age = parseInt(personMatch[3], 10)
          result.owner_city = personMatch[4]
          return
        }

        // Address (street)
        if (/^[A-ZÅÄÖ].*\d/.test(text) && text.length < 100 && !result.owner_address) {
          result.owner_address = text
          return
        }

        // Postal code + city
        const postalMatch = text.match(/^(\d{5})\s+(.+)$/)
        if (postalMatch) {
          result.owner_postal_code = postalMatch[1]
          result.owner_postal_city = postalMatch[2]
          return
        }

        // Phone
        if (text.toLowerCase().includes('telefonnummer')) {
          if (!text.toLowerCase().includes('inga')) {
            // Extract phone number
            const phoneMatch = text.match(/(\d[\d\s-]+\d)/)
            if (phoneMatch) {
              result.owner_phone = phoneMatch[1].replace(/\s/g, '')
            }
          }
        }
      })
    }

    // Owner's vehicles
    const h2 = $(section).find('h2').text().toLowerCase()
    if (h2.includes('fordon') && !h2.includes('andra')) {
      result.owner_vehicles = parseVehicleLinks($, section)
    }

    // Other vehicles at address
    if (h2.includes('andra fordon')) {
      const noVehicles = $(section).find('p').first().text().toLowerCase()
      if (noVehicles.includes('inga')) {
        result.address_vehicles = []
      } else {
        result.address_vehicles = parseVehicleLinks($, section)
      }
    }
  })

  return result
}

function parseVehicleLinks($: cheerio.CheerioAPI, element: Parameters<typeof $>[0]): Array<{ regnr: string; description: string; status?: string }> {
  const vehicles: Array<{ regnr: string; description: string; status?: string }> = []

  $(element).find('a[href*="/fordon/"]').each((_, a) => {
    const text = $(a).text().trim()
    const href = $(a).attr('href') || ''
    const regnrMatch = href.match(/\/fordon\/([a-zA-Z0-9]+)/)
    const regnr = regnrMatch ? regnrMatch[1].toUpperCase() : ''

    if (regnr && text) {
      vehicles.push({
        regnr,
        description: text,
      })
    }
  })

  return vehicles
}

export async function POST(request: NextRequest) {
  try {
    const { reg_number, fetch_profile } = await request.json()

    if (!reg_number) {
      return NextResponse.json({ error: 'Registreringsnummer krävs' }, { status: 400 })
    }

    // Get cookies from database
    const supabase = await createClient()
    const { data: tokens } = await supabase
      .from('api_tokens')
      .select('refresh_token, bearer_token, access_token')
      .eq('service_name', 'biluppgifter')
      .maybeSingle()

    if (!tokens?.refresh_token) {
      return NextResponse.json({
        error: 'Biluppgifter cookies saknas. Gå till Inställningar > Integrationer för att lägga till.'
      }, { status: 401 })
    }

    // Parse cookies from stored JSON
    let cookies: Record<string, string> = {}
    try {
      cookies = JSON.parse(tokens.refresh_token)
    } catch {
      return NextResponse.json({
        error: 'Ogiltigt cookie-format. Uppdatera cookies i Inställningar.'
      }, { status: 400 })
    }

    const cleanRegNr = reg_number.toUpperCase().replace(/[^A-Z0-9]/g, '')

    // Fetch vehicle page
    const { html, error } = await fetchPage(`/fordon/${cleanRegNr.toLowerCase()}/`, cookies)

    if (error) {
      return NextResponse.json({
        regnr: cleanRegNr,
        success: false,
        error,
      })
    }

    // Check if vehicle not found
    if (html.includes('Fordonet hittades inte') || html.includes('404')) {
      return NextResponse.json({
        regnr: cleanRegNr,
        success: false,
        error: 'Fordonet hittades inte',
      })
    }

    // Parse vehicle data
    const result = parseVehicleData(html, cleanRegNr)

    // Optionally fetch owner profile for more details
    if (fetch_profile && result.owner_profile_id) {
      const { html: profileHtml, error: profileError } = await fetchPage(
        `/brukare/${result.owner_profile_id}/`,
        cookies
      )

      if (!profileError && profileHtml) {
        const profileData = parseOwnerProfile(profileHtml)
        Object.assign(result, profileData)
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Biluppgifter lookup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Ett fel uppstod vid sökning',
    }, { status: 500 })
  }
}

// Health check endpoint
export async function GET() {
  const supabase = await createClient()
  const { data: tokens } = await supabase
    .from('api_tokens')
    .select('refresh_token, updated_at')
    .eq('service_name', 'biluppgifter')
    .maybeSingle()

  if (!tokens?.refresh_token) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'Cookies ej konfigurerade',
    })
  }

  // Try to parse cookies
  try {
    const cookies = JSON.parse(tokens.refresh_token)
    const hasSession = !!cookies.session
    const hasCfClearance = !!cookies.cf_clearance

    return NextResponse.json({
      status: hasSession && hasCfClearance ? 'configured' : 'incomplete',
      has_session: hasSession,
      has_cf_clearance: hasCfClearance,
      updated_at: tokens.updated_at,
    })
  } catch {
    return NextResponse.json({
      status: 'invalid',
      message: 'Ogiltigt cookie-format',
    })
  }
}
