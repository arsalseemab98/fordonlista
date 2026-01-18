import { createClient } from '@/lib/supabase/server'
import * as cheerio from 'cheerio'

export interface CarInfoResult {
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
  mileage_mil?: number
  mileage_km?: number
  antal_agare?: number
  valuation_company?: number
  valuation_company_formatted?: string
  valuation_private?: number
  valuation_private_formatted?: string
  total_in_sweden?: number
  senaste_avställning?: string
  senaste_påställning?: string
  första_registrering?: string
  besiktning_till?: string
  vehicle_history?: Array<{ date: string; event: string; details?: string }>
  error?: string
}

function parseSwedishNumber(text: string): number | undefined {
  if (!text) return undefined
  const cleaned = text.replace(/[^\d-]/g, '')
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? undefined : num
}

function extractStatus(text: string): string {
  const lowerText = text.toLowerCase()
  // Check negative statuses FIRST (avställd, exporterad, avregistrerad)
  // before checking "i trafik" since text may contain both
  if (lowerText.includes('avställd')) return 'avställd'
  if (lowerText.includes('exporterad')) return 'exporterad'
  if (lowerText.includes('avregistrerad')) return 'avregistrerad'
  if (lowerText.includes('i trafik')) return 'i_trafik'
  return 'okänd'
}

export async function fetchCarInfo(regNumber: string): Promise<CarInfoResult> {
  // Clean registration number
  const cleanRegNr = regNumber.toUpperCase().replace(/[^A-Z0-9]/g, '')

  // Get tokens from database
  const supabase = await createClient()
  const { data: tokens } = await supabase
    .from('api_tokens')
    .select('refresh_token, bearer_token')
    .eq('service_name', 'car_info')
    .single()

  if (!tokens?.refresh_token || !tokens?.bearer_token) {
    return {
      reg_number: cleanRegNr,
      error: 'Car.info tokens saknas. Gå till Inställningar > Integrationer för att lägga till tokens.'
    }
  }

  // Fetch from car.info
  const url = `https://www.car.info/sv-se/license-plate/S/${cleanRegNr}`

  const response = await fetch(url, {
    headers: {
      'Host': 'www.car.info',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Referer': 'https://www.car.info/sv-se',
      'Cache-Control': 'max-age=0',
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
      'Priority': 'u=0, i',
      'Cookie': `refreshToken=${tokens.refresh_token}; BEARER=${tokens.bearer_token}`
    },
    cache: 'no-store'
  })

  if (response.status === 404) {
    return {
      reg_number: cleanRegNr,
      error: 'Fordonet hittades inte'
    }
  }

  if (response.status === 429) {
    return {
      reg_number: cleanRegNr,
      error: 'För många förfrågningar. Vänta en stund.'
    }
  }

  if (response.status === 403) {
    const errorBody = await response.text().catch(() => '')
    const isBlocked = errorBody.includes('blocked') || errorBody.includes('forbidden') || errorBody.includes('access denied')
    return {
      reg_number: cleanRegNr,
      error: isBlocked
        ? 'Car.info blockerar förfrågan (403). IP-adress kan vara blockerad. Prova att uppdatera tokens.'
        : 'Car.info nekade åtkomst (403). Tokens kan ha gått ut - uppdatera i Inställningar.'
    }
  }

  if (!response.ok) {
    return {
      reg_number: cleanRegNr,
      error: `Fel från car.info: ${response.status}`
    }
  }

  const html = await response.text()

  // Extract tokens from Set-Cookie response header and save them
  // Car.info rotates both BEARER (short-lived, ~2min) and refreshToken (long-lived)
  // We capture BOTH to stay in sync with how the browser maintains the session
  const setCookieHeader = response.headers.get('set-cookie')
  if (setCookieHeader) {
    const bearerMatch = setCookieHeader.match(/BEARER=([^;]+)/)
    const refreshMatch = setCookieHeader.match(/refreshToken=([^;]+)/)

    // Build update object with any new tokens
    const updates: Record<string, string> = {}
    if (bearerMatch && bearerMatch[1]) {
      updates.bearer_token = bearerMatch[1]
    }
    if (refreshMatch && refreshMatch[1]) {
      updates.refresh_token = refreshMatch[1]
    }

    // Update tokens in database asynchronously (don't await to not slow down response)
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      void (async () => {
        try {
          await supabase
            .from('api_tokens')
            .update(updates)
            .eq('service_name', 'car_info')
          const tokenTypes = Object.keys(updates).filter(k => k !== 'updated_at').join(', ')
          console.log(`Auto-refreshed tokens: ${tokenTypes}`)
        } catch (err) {
          console.error('Failed to auto-refresh tokens:', err)
        }
      })()
    }
  }

  // Check for error messages in the HTML
  if (html.includes('HBP210')) {
    return {
      reg_number: cleanRegNr,
      error: 'Car.info blockerar förfrågan (HBP210). Prova igen om några minuter eller uppdatera tokens.'
    }
  }

  if (html.includes('fetch failed') || html.includes('ECONNREFUSED')) {
    return {
      reg_number: cleanRegNr,
      error: 'Kunde inte ansluta till car.info. Försök igen senare.'
    }
  }

  // Check if we got a login page instead of car data
  if (html.includes('Logga in') && !html.includes('application/ld+json')) {
    return {
      reg_number: cleanRegNr,
      error: 'Tokens har gått ut. Uppdatera i Inställningar > Integrationer.'
    }
  }

  const $ = cheerio.load(html)

  // Extract data from page
  const result: CarInfoResult = {
    reg_number: cleanRegNr
  }

  // Try to extract JSON-LD structured data first
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const jsonText = $(el).html()
      if (jsonText) {
        const jsonData = JSON.parse(jsonText)
        const vehicle = jsonData.mainEntity || jsonData
        if (vehicle && (vehicle['@type'] === 'Car' || vehicle['@type'] === 'Vehicle')) {
          result.make = vehicle.brand?.name || vehicle.manufacturer
          result.model = vehicle.model || vehicle.name
          result.year = parseInt(vehicle.vehicleModelDate) || undefined
          result.color = vehicle.color
          result.fuel_type = vehicle.vehicleEngine?.fuelType
          result.antal_agare = parseInt(vehicle.numberOfPreviousOwners) || undefined

          const mileageValue = vehicle.mileageFromOdometer?.value
          if (mileageValue && typeof mileageValue === 'string') {
            const milMatch = mileageValue.match(/([\d\s]+)\s*mil/i)
            if (milMatch) {
              const milNum = parseInt(milMatch[1].replace(/\s/g, ''))
              result.mileage_mil = milNum
              result.mileage_km = milNum * 10
            }
          }

          if (vehicle.offers) {
            const lowPrice = parseInt(vehicle.offers.lowPrice)
            const highPrice = parseInt(vehicle.offers.highPrice)
            if (lowPrice) {
              result.valuation_company = lowPrice
              result.valuation_company_formatted = `${lowPrice.toLocaleString('sv-SE')} kr`
            }
            if (highPrice) {
              result.valuation_private = highPrice
              result.valuation_private_formatted = `${highPrice.toLocaleString('sv-SE')} kr`
            }
          }
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  })

  // Extract make/model from title
  const pageTitle = $('title').text()
  const titleMatch = pageTitle.match(/^[A-Z0-9]+\s*-\s*(.+)$/)
  if (titleMatch) {
    result.make_model = titleMatch[1].trim()

    // Try to extract model from title if not found in JSON-LD
    // Title format is typically: "REG123 - Volvo V70 2.0 180hk Automat 2015"
    if (!result.model && result.make) {
      const makeModelPart = titleMatch[1].split(/\d+\s*hk/i)[0].trim()
      const modelMatch = makeModelPart.replace(new RegExp(`^${result.make}\\s*`, 'i'), '').trim()
      if (modelMatch && modelMatch.length > 0) {
        result.model = modelMatch
      }
    }

    const hkMatch = titleMatch[1].match(/(\d+)\s*hk/i)
    if (hkMatch) {
      result.horsepower = parseInt(hkMatch[1])
    }

    if (titleMatch[1].toLowerCase().includes('manuell')) {
      result.transmission = 'Manuell'
    } else if (titleMatch[1].toLowerCase().includes('automat')) {
      result.transmission = 'Automat'
    }
  }

  // Extract status and color from meta description
  const metaDescription = $('meta[name="description"]').attr('content') || ''
  const pageText = $('body').text()
  result.status = extractStatus(metaDescription || pageText)

  if (!result.color && metaDescription) {
    const colorMatch = metaDescription.match(/är en (\w+)\s/i)
    if (colorMatch && colorMatch[1]) {
      result.color = colorMatch[1].charAt(0).toUpperCase() + colorMatch[1].slice(1).toLowerCase()
    }
  }

  // Extract CO2
  const co2Match = html.match(/(\d+)\s*(?:&nbsp;)?g\/km/i)
  if (co2Match) {
    result.co2_gkm = parseInt(co2Match[1])
  }

  // Extract fordonsskatt
  const skattMatch = html.match(/([\d\s]+)\s*SEK<\/span>[\s\S]*?Fordonsskatt/i)
  if (skattMatch) {
    const skattValue = parseSwedishNumber(skattMatch[1])
    if (skattValue) {
      result.skatt = skattValue
      result.skatt_formatted = `${skattValue.toLocaleString('sv-SE')} kr/år`
    }
  }

  // Extract featured info items
  $('.featured_info_item').each((_, el) => {
    const value = $(el).find('.text-truncate').first().text().trim()
    const label = $(el).find('.text-muted').text().trim().toLowerCase()

    if (label.includes('fordonsskatt') && !result.skatt) {
      result.skatt = parseSwedishNumber(value)
      result.skatt_formatted = value
    }
    if (label.includes('i trafik sedan') || label.includes('första reg')) {
      result.första_registrering = value
    }
    if ((label.includes('besiktning') || label.includes('besiktigas')) && !result.besiktning_till) {
      result.besiktning_till = value
    }
  })

  // Extract specification rows
  $('.sprow').each((_, el) => {
    const label = $(el).find('.sptitle').text().trim().toLowerCase()
    const value = $(el).text().replace($(el).find('.sptitle').text(), '').trim()

    if (label.includes('växellåda') && !result.transmission) {
      result.transmission = value
    }
    if (label.includes('co2') && !result.co2_gkm) {
      result.co2_gkm = parseSwedishNumber(value)
    }
    if (label.includes('hästkraft') && !result.horsepower) {
      result.horsepower = parseSwedishNumber(value)
    }
    if (label.includes('modell') && !result.model) {
      result.model = value
    }
    if ((label.includes('avställd') || label.includes('avställning')) && !result.senaste_avställning) {
      result.senaste_avställning = value
    }
    if ((label.includes('påställd') || label.includes('påställning') || label.includes('i trafik sedan')) && !result.senaste_påställning) {
      result.senaste_påställning = value
    }
    if (label.includes('ägare') && !result.antal_agare) {
      result.antal_agare = parseSwedishNumber(value)
    }
    if ((label.includes('besiktning') || label.includes('kontrollbesiktning')) && !result.besiktning_till) {
      result.besiktning_till = value
    }
  })

  // Additional extraction from page text for dates
  if (!result.senaste_avställning) {
    const avställdMatch = pageText.match(/avställd\s*(?:sedan\s*)?(\d{4}-\d{2}-\d{2}|\d{1,2}\s+\w+\s+\d{4})/i)
    if (avställdMatch) {
      result.senaste_avställning = avställdMatch[1]
    }
  }
  if (!result.senaste_påställning) {
    const påställdMatch = pageText.match(/(?:påställd|i trafik sedan)\s*(?:sedan\s*)?(\d{4}-\d{2}-\d{2}|\d{1,2}\s+\w+\s+\d{4})/i)
    if (påställdMatch) {
      result.senaste_påställning = påställdMatch[1]
    }
  }

  // Extract besiktning (inspection) date from page text
  if (!result.besiktning_till) {
    const besiktningMatch = pageText.match(/(?:besiktigas?\s*(?:senast)?|nästa\s*besiktning|besiktning\s*till)\s*[:\s]*(\d{4}-\d{2}-\d{2}|\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{4})/i)
    if (besiktningMatch) {
      result.besiktning_till = besiktningMatch[1]
    }
  }

  // Try to extract valuation
  $('[data-valuation], .valuation, .price-estimate').each((_, el) => {
    const text = $(el).text()
    const value = parseSwedishNumber(text)
    if (value && value > 10000) {
      if (text.toLowerCase().includes('företag')) {
        result.valuation_company = value
        result.valuation_company_formatted = `${value.toLocaleString('sv-SE')} SEK`
      } else if (text.toLowerCase().includes('privat')) {
        result.valuation_private = value
        result.valuation_private_formatted = `${value.toLocaleString('sv-SE')} SEK`
      }
    }
  })

  // Extract vehicle history
  const history: Array<{ date: string; event: string; details?: string }> = []
  $('.history-item, .timeline-item, [data-history]').each((_, el) => {
    const date = $(el).find('.date, [data-date]').text().trim()
    const event = $(el).find('.event, .title, [data-event]').text().trim()
    const details = $(el).find('.details, .description').text().trim()
    if (date && event) {
      history.push({ date, event, details: details || undefined })
    }
  })
  if (history.length > 0) {
    result.vehicle_history = history
  }

  // Look for total in Sweden
  const totalMatch = pageText.match(/(\d[\d\s]*)\s*(st|stycken|bilar|fordon)\s*(i sverige|registrerade)/i)
  if (totalMatch) {
    result.total_in_sweden = parseSwedishNumber(totalMatch[1])
  }

  return result
}
