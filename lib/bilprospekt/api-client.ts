/**
 * Bilprospekt API client for server-side use (cron jobs, server actions).
 * Handles authentication, segmented fetching, and 9,000 record limit.
 */

const BASE_URL = 'https://www.bilprospekt.se'
const MAX_RECORDS = 9000
const MAX_PAGES = 180 // 9000 / 50
const PAGE_SIZE = 50

// Regions to sync
export const SYNC_REGIONS = [
  { code: '25', name: 'Norrbotten' },
  { code: '24', name: 'Västerbotten' },
  { code: '22', name: 'Västernorrland' },
  { code: '23', name: 'Jämtland' },
]

// Year range segments for breaking down large result sets
const YEAR_SEGMENTS = [
  { from: 2023, to: 2026, label: '2023-2026' },
  { from: 2020, to: 2022, label: '2020-2022' },
  { from: 2017, to: 2019, label: '2017-2019' },
  { from: 2014, to: 2016, label: '2014-2016' },
  { from: 2010, to: 2013, label: '2010-2013' },
  { from: 2005, to: 2009, label: '2005-2009' },
  { from: 2000, to: 2004, label: '2000-2004' },
  { from: 1950, to: 1999, label: '<2000' },
]

// Top brands to subdivide by if year segments are still too large
const TOP_BRANDS = [
  'VOLVO', 'VOLKSWAGEN', 'TOYOTA', 'BMW', 'AUDI', 'MERCEDES-BENZ',
  'SKODA', 'KIA', 'FORD', 'HYUNDAI', 'NISSAN', 'PEUGEOT',
  'RENAULT', 'MAZDA', 'OPEL', 'SUBARU', 'SUZUKI', 'MITSUBISHI',
  'HONDA', 'CITROËN', 'TESLA', 'SEAT', 'SAAB', 'FIAT',
]

let sessionCookies = ''
let isAuthenticated = false

async function login(): Promise<void> {
  const email = process.env.BILPROSPEKT_EMAIL
  const password = process.env.BILPROSPEKT_PASSWORD

  if (!email || !password) {
    throw new Error('BILPROSPEKT_EMAIL and BILPROSPEKT_PASSWORD environment variables are required')
  }

  const body = new URLSearchParams({ email, password })

  const resp = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    redirect: 'manual',
  })

  const setCookies: string[] = []
  resp.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      for (const part of value.split(/,(?=\s*\w+=)/)) {
        const cookiePart = part.trim().split(';')[0]
        if (cookiePart && !setCookies.includes(cookiePart)) {
          setCookies.push(cookiePart)
        }
      }
    }
  })

  if (setCookies.length > 0) {
    sessionCookies = setCookies.join('; ')
    isAuthenticated = true
  } else {
    isAuthenticated = false
    throw new Error(`Bilprospekt login failed (status ${resp.status})`)
  }
}

async function ensureAuth(): Promise<void> {
  if (!isAuthenticated) {
    await login()
    return
  }
  try {
    const resp = await fetch(`${BASE_URL}/user/checkSession`, {
      headers: { Cookie: sessionCookies },
    })
    const text = await resp.text()
    const t = text.trim().toLowerCase()
    if (resp.status === 401 || resp.status === 403 || t === 'logged out' || t === '"logged out"') {
      await login()
    }
  } catch {
    await login()
  }
}

async function apiGet(path: string): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    await ensureAuth()
    const resp = await fetch(`${BASE_URL}${path}`, {
      headers: { Cookie: sessionCookies },
    })
    const text = await resp.text()
    const t = text.trim().toLowerCase()
    if (resp.status === 401 || t === 'logged out' || t === '"logged out"') {
      await login()
      continue
    }
    if (resp.status >= 400) {
      throw new Error(`HTTP ${resp.status}: ${text.substring(0, 200)}`)
    }
    return JSON.parse(text)
  }
  throw new Error(`Failed after 2 auth retries: ${path}`)
}

async function apiPost(path: string, body: unknown): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    await ensureAuth()
    const resp = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookies,
      },
      body: JSON.stringify(body),
    })
    const text = await resp.text()
    const t = text.trim().toLowerCase()
    if (resp.status === 401 || t === 'logged out' || t === '"logged out"') {
      await login()
      continue
    }
    if (resp.status >= 400) {
      throw new Error(`HTTP ${resp.status}: ${text.substring(0, 200)}`)
    }
    return JSON.parse(text)
  }
  throw new Error(`Failed after 2 auth retries: ${path}`)
}

/**
 * Get the latest data update date from Bilprospekt.
 */
export async function getUpdateDate(): Promise<string | null> {
  const result = await apiGet('/prospect/getUpdateDate')
  if (typeof result === 'string') return result
  if (result && typeof result === 'object' && 'date' in result) {
    return String((result as Record<string, unknown>).date)
  }
  return result ? String(result) : null
}

/**
 * Build search body with optional year range and brand filters.
 */
function buildSearchBody(params: {
  region: string
  yearFrom?: number
  yearTo?: number
  brand?: string
  page?: number
  pageSize?: number
}): Record<string, unknown> {
  const car: Record<string, unknown> = {
    carType: [{ val: 'PB', children: [] }],
    possessionTime: { from: null, to: 180 },
  }

  if (params.yearFrom || params.yearTo) {
    car.carYear = {
      from: params.yearFrom ?? null,
      to: params.yearTo ?? null,
    }
  }

  if (params.brand) {
    car.brands = [{ val: params.brand.toUpperCase(), children: [] }]
  }

  return {
    car,
    regions: { regions: [{ val: params.region, children: [] }] },
    diverse: {
      type: {
        dealer: [{ val: 0 }],
        government: [{ val: 1 }],
        leasing_company: [{ val: 1 }],
        scrap: [{ val: 0 }],
        rental: [{ val: 1 }],
        filial: [{ val: 1 }],
      },
    },
    extraFilters: {},
    page: params.page ?? 0,
    pageSize: params.pageSize ?? PAGE_SIZE,
    sort: { direction: 'asc', type: '' },
  }
}

/**
 * Extract registration numbers from search result data.
 */
function extractRegNumbers(data: unknown): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  const walk = (val: unknown) => {
    if (!val) return
    if (Array.isArray(val)) {
      for (const item of val) walk(item)
      return
    }
    if (typeof val === 'object') {
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (/reg[_-]?number|registration[_-]?number|regnr/i.test(k)) {
          const s = String(v).trim()
          if (s && !seen.has(s)) {
            seen.add(s)
            out.push(s)
          }
        }
        walk(v)
      }
    }
  }

  walk(data)
  return out
}

export interface ProspectRecord {
  bp_id: number
  reg_number: string
  brand: string
  model: string | null
  fuel: string | null
  color: string | null
  car_year: number | null
  date_acquired: string | null
  owner_name: string | null
  owner_type: string | null
  owner_gender: string | null
  owner_birth_year: number | null
  address: string | null
  zip: string | null
  municipality: string | null
  region: string | null
  region_code: string | null
  kaross: string | null
  transmission: string | null
  engine_power: number | null
  weight: number | null
  leasing: boolean
  credit: boolean
  seller_name: string | null
  chassis: string | null
  in_service: string | null
  cylinder_volume: number | null
  fwd: string | null
  new_or_old: string | null
  bp_aprox_mileage: number | null
}

function parseProspect(item: Record<string, unknown>, regNumbers: string[], index: number): ProspectRecord | null {
  const bpId = item.id || item.prospectId || item.prospect_id
  if (!bpId) return null

  const regNumber = regNumbers[index] || item.reg_number || item.regNumber || ''
  if (!regNumber) return null

  const car = (item.car || {}) as Record<string, unknown>
  const owner = (item.owner || item.prospect || {}) as Record<string, unknown>
  const location = (item.location || owner) as Record<string, unknown>

  return {
    bp_id: Number(bpId),
    reg_number: String(regNumber),
    brand: String(car.brand || item.brand || '').toUpperCase(),
    model: car.model ? String(car.model) : (item.model ? String(item.model) : null),
    fuel: car.fuel ? String(car.fuel) : (item.fuel ? String(item.fuel) : null),
    color: car.color ? String(car.color) : (item.color ? String(item.color) : null),
    car_year: car.carYear ? Number(car.carYear) : (item.car_year ? Number(item.car_year) : null),
    date_acquired: car.dateAcquired ? String(car.dateAcquired) : (item.date_acquired ? String(item.date_acquired) : null),
    owner_name: owner.name ? String(owner.name) : (item.owner_name ? String(item.owner_name) : null),
    owner_type: owner.type ? String(owner.type) : (item.owner_type ? String(item.owner_type) : null),
    owner_gender: owner.gender ? String(owner.gender) : (item.owner_gender ? String(item.owner_gender) : null),
    owner_birth_year: owner.birthYear ? Number(owner.birthYear) : (item.owner_birth_year ? Number(item.owner_birth_year) : null),
    address: owner.address ? String(owner.address) : (item.address ? String(item.address) : null),
    zip: owner.zip ? String(owner.zip) : (item.zip ? String(item.zip) : null),
    municipality: location.municipality ? String(location.municipality) : (item.municipality ? String(item.municipality) : null),
    region: location.region ? String(location.region) : (item.region ? String(item.region) : null),
    region_code: location.regionCode ? String(location.regionCode) : (item.region_code ? String(item.region_code) : null),
    kaross: car.kaross ? String(car.kaross) : (item.kaross ? String(item.kaross) : null),
    transmission: car.transmission ? String(car.transmission) : (item.transmission ? String(item.transmission) : null),
    engine_power: car.enginePower ? Number(car.enginePower) : (item.engine_power ? Number(item.engine_power) : null),
    weight: car.weight ? Number(car.weight) : (item.weight ? Number(item.weight) : null),
    leasing: Boolean(car.leasing || item.leasing),
    credit: Boolean(car.credit || item.credit),
    seller_name: car.sellerName ? String(car.sellerName) : (item.seller_name ? String(item.seller_name) : null),
    chassis: car.chassis ? String(car.chassis) : (item.chassis ? String(item.chassis) : null),
    in_service: car.inService ? String(car.inService) : (item.in_service ? String(item.in_service) : null),
    cylinder_volume: car.cylinderVolume ? Number(car.cylinderVolume) : (item.cylinder_volume ? Number(item.cylinder_volume) : null),
    fwd: car.fourWheel ? String(car.fourWheel) : (item.fwd ? String(item.fwd) : null),
    new_or_old: car.newOrOld ? String(car.newOrOld) : (item.new_or_old ? String(item.new_or_old) : null),
    bp_aprox_mileage: item.aprox_mileage ? parseInt(String(item.aprox_mileage), 10) || null : (car.aproxMileage ? parseInt(String(car.aproxMileage), 10) || null : null),
  }
}

/**
 * Get prospect count for a specific search.
 */
export async function getCount(params: {
  region: string
  yearFrom?: number
  yearTo?: number
  brand?: string
}): Promise<number> {
  const body = buildSearchBody({ ...params, page: 0, pageSize: 1 })
  const result = await apiPost('/prospect/search', body) as Record<string, unknown>
  return Number(result.total || result.count || result.totalCount || 0)
}

/**
 * Fetch prospects for a specific segment (region + year range + optional brand).
 * Handles pagination up to MAX_RECORDS (9,000).
 */
export async function fetchSegment(params: {
  region: string
  yearFrom?: number
  yearTo?: number
  brand?: string
}): Promise<{ prospects: ProspectRecord[]; errors: string[] }> {
  const allProspects: ProspectRecord[] = []
  const errors: string[] = []

  // First page
  const firstBody = buildSearchBody({ ...params, page: 0, pageSize: PAGE_SIZE })
  const firstResult = await apiPost('/prospect/search', firstBody) as Record<string, unknown>

  const totalCount = Number(firstResult.total || firstResult.count || firstResult.totalCount || 0)
  const items = (firstResult.data || firstResult.prospects || firstResult.items || []) as Record<string, unknown>[]
  const regNumbers = extractRegNumbers(firstResult)

  for (let i = 0; i < items.length; i++) {
    const prospect = parseProspect(items[i], regNumbers, i)
    if (prospect && prospect.brand) {
      allProspects.push(prospect)
    }
  }

  const totalPages = Math.min(Math.ceil(totalCount / PAGE_SIZE), MAX_PAGES)

  // Remaining pages
  for (let page = 1; page < totalPages; page++) {
    try {
      const body = buildSearchBody({ ...params, page, pageSize: PAGE_SIZE })
      const result = await apiPost('/prospect/search', body) as Record<string, unknown>
      const pageItems = (result.data || result.prospects || result.items || []) as Record<string, unknown>[]
      const pageRegNumbers = extractRegNumbers(result)

      for (let i = 0; i < pageItems.length; i++) {
        const prospect = parseProspect(pageItems[i], pageRegNumbers, i)
        if (prospect && prospect.brand) {
          allProspects.push(prospect)
        }
      }

      await new Promise(resolve => setTimeout(resolve, 150))
    } catch (error) {
      errors.push(`Page ${page}: ${String(error)}`)
    }
  }

  return { prospects: allProspects, errors }
}

export interface SegmentDefinition {
  region_code: string
  region_name: string
  year_from: number | null
  year_to: number | null
  brand: string | null
  prospect_count: number
}

/**
 * Plan segments for all regions. Counts each region × year range,
 * subdivides by brand if > 9,000.
 * Returns a list of segments each guaranteed to be <= 9,000.
 */
export async function planSegments(): Promise<{ segments: SegmentDefinition[]; errors: string[] }> {
  const segments: SegmentDefinition[] = []
  const errors: string[] = []

  for (const region of SYNC_REGIONS) {
    for (const yearSeg of YEAR_SEGMENTS) {
      try {
        const count = await getCount({
          region: region.code,
          yearFrom: yearSeg.from,
          yearTo: yearSeg.to,
        })

        if (count === 0) continue

        if (count <= MAX_RECORDS) {
          // Fits in one segment
          segments.push({
            region_code: region.code,
            region_name: region.name,
            year_from: yearSeg.from,
            year_to: yearSeg.to,
            brand: null,
            prospect_count: count,
          })
        } else {
          // Too large — subdivide by brand
          let remainingCount = count
          for (const brand of TOP_BRANDS) {
            try {
              const brandCount = await getCount({
                region: region.code,
                yearFrom: yearSeg.from,
                yearTo: yearSeg.to,
                brand,
              })
              if (brandCount === 0) continue
              if (brandCount <= MAX_RECORDS) {
                segments.push({
                  region_code: region.code,
                  region_name: region.name,
                  year_from: yearSeg.from,
                  year_to: yearSeg.to,
                  brand,
                  prospect_count: brandCount,
                })
                remainingCount -= brandCount
              } else {
                // Even brand+year is > 9000 — take what we can (9000)
                segments.push({
                  region_code: region.code,
                  region_name: region.name,
                  year_from: yearSeg.from,
                  year_to: yearSeg.to,
                  brand,
                  prospect_count: MAX_RECORDS,
                })
                remainingCount -= MAX_RECORDS
                errors.push(`${region.name} ${yearSeg.label} ${brand}: ${brandCount} > ${MAX_RECORDS}, capped`)
              }
            } catch (error) {
              errors.push(`Count ${region.name} ${yearSeg.label} ${brand}: ${String(error)}`)
            }
          }
          // Note: some smaller brands might be missed, but top brands cover ~95%
          if (remainingCount > 1000) {
            errors.push(`${region.name} ${yearSeg.label}: ~${remainingCount} prospects from smaller brands not covered`)
          }
        }
      } catch (error) {
        errors.push(`Count ${region.name} ${yearSeg.label}: ${String(error)}`)
      }
    }
  }

  return { segments, errors }
}
