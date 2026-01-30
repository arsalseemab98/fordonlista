// Centralized column definitions for all lead/vehicle tables

export interface ColumnDefinition {
  id: string
  label: string
  group: string
  default: boolean
}

export interface ColumnGroup {
  id: string
  label: string
}

// Column groups
export const LEAD_COLUMN_GROUPS: ColumnGroup[] = [
  { id: 'basic', label: 'Grundläggande' },
  { id: 'vehicle', label: 'Fordon' },
  { id: 'owner', label: 'Ägare' },
  { id: 'biluppgifter', label: 'Biluppgifter' },
  { id: 'meta', label: 'Övrigt' },
]

// All columns available for lead tables
export const LEAD_COLUMNS: ColumnDefinition[] = [
  // Basic columns
  { id: 'reg_number', label: 'Reg.nr', group: 'basic', default: true },
  { id: 'brand', label: 'Märke', group: 'basic', default: true },
  { id: 'model', label: 'Modell', group: 'basic', default: true },
  { id: 'car_year', label: 'År', group: 'basic', default: true },
  { id: 'fuel', label: 'Bränsle', group: 'basic', default: true },
  { id: 'mileage', label: 'Mil', group: 'basic', default: true },

  // Vehicle columns
  { id: 'color', label: 'Färg', group: 'vehicle', default: false },
  { id: 'kaross', label: 'Kaross', group: 'vehicle', default: false },
  { id: 'transmission', label: 'Växel', group: 'vehicle', default: false },
  { id: 'horsepower', label: 'HK', group: 'vehicle', default: false },
  { id: 'engine_cc', label: 'CC', group: 'vehicle', default: false },
  { id: 'four_wheel_drive', label: '4WD', group: 'vehicle', default: false },
  { id: 'in_traffic', label: 'I trafik', group: 'vehicle', default: false },

  // Owner columns
  { id: 'owner_name', label: 'Ägare', group: 'owner', default: true },
  { id: 'owner_age', label: 'Ålder', group: 'owner', default: false },
  { id: 'phone', label: 'Telefon', group: 'owner', default: true },
  { id: 'location', label: 'Ort', group: 'owner', default: true },
  { id: 'county', label: 'Län', group: 'owner', default: false },
  { id: 'possession', label: 'Innehav', group: 'owner', default: false },

  // Biluppgifter columns
  { id: 'antal_agare', label: 'Ägare #', group: 'biluppgifter', default: false },
  { id: 'skatt', label: 'Skatt/år', group: 'biluppgifter', default: false },
  { id: 'besiktning_till', label: 'Besiktning', group: 'biluppgifter', default: false },
  { id: 'owner_history', label: 'Ägarhist.', group: 'biluppgifter', default: true },
  { id: 'address_vehicles', label: 'Adressfordon', group: 'biluppgifter', default: true },
  { id: 'mileage_history', label: 'Milhistorik', group: 'biluppgifter', default: false },
  { id: 'valuation_company', label: 'Värd. F', group: 'biluppgifter', default: false },
  { id: 'valuation_private', label: 'Värd. P', group: 'biluppgifter', default: false },
  { id: 'senaste_avstallning', label: 'Avställd', group: 'biluppgifter', default: false },
  { id: 'senaste_pastallning', label: 'Påställd', group: 'biluppgifter', default: false },
  { id: 'senaste_agarbyte', label: 'Ägarbyte', group: 'biluppgifter', default: false },
  { id: 'antal_foretagsannonser', label: 'Företag ann.', group: 'biluppgifter', default: false },
  { id: 'antal_privatannonser', label: 'Privat ann.', group: 'biluppgifter', default: false },

  // Meta columns
  { id: 'status', label: 'Status', group: 'meta', default: true },
  { id: 'source', label: 'Källa', group: 'meta', default: false },
  { id: 'prospekt_type', label: 'Prospekt-typ', group: 'meta', default: false },
  { id: 'activity', label: 'Aktivitet', group: 'meta', default: false },
  { id: 'bp_date', label: 'BP Datum', group: 'meta', default: false },
  { id: 'data_date', label: 'Datum', group: 'meta', default: false },
  { id: 'last_contact', label: 'Senaste kontakt', group: 'meta', default: false },
  { id: 'created_at', label: 'Skapad', group: 'meta', default: false },
  { id: 'actions', label: 'Åtgärd', group: 'meta', default: true },
]

// Default visible columns
export const DEFAULT_LEAD_COLUMNS = LEAD_COLUMNS.filter(c => c.default).map(c => c.id)

// Storage keys and versioning
export const STORAGE_KEYS = {
  leads: 'leadsTableColumns',
  historik: 'historikTableColumns',
  toCall: 'toCallTableColumns',
  brev: 'brevTableColumns',
  vehicles: 'vehiclesTableColumns',
} as const

export const COLUMN_VERSION = 1 // Increment when changing default columns

// Helper to get columns by group
export function getColumnsByGroup(groupId: string): ColumnDefinition[] {
  return LEAD_COLUMNS.filter(c => c.group === groupId)
}

// Helper to get column definition by id
export function getColumnById(columnId: string): ColumnDefinition | undefined {
  return LEAD_COLUMNS.find(c => c.id === columnId)
}

// Helper function to merge saved columns with new defaults (for new columns added after user saved)
export function getMergedColumns(
  storageKey: string,
  columns: ColumnDefinition[] = LEAD_COLUMNS,
  currentVersion: number = COLUMN_VERSION
): Set<string> {
  if (typeof window === 'undefined') {
    return new Set(columns.filter(c => c.default).map(c => c.id))
  }

  const versionKey = `${storageKey}Version`
  const savedVersion = localStorage.getItem(versionKey)
  const saved = localStorage.getItem(storageKey)

  // If no saved version or old version, add any new default columns
  if (!savedVersion || parseInt(savedVersion) < currentVersion) {
    const savedArray: string[] = saved ? JSON.parse(saved) : []
    const savedSet = new Set<string>(savedArray)

    // Add any new default columns that weren't in the old saved set
    const newDefaults = columns.filter(c => c.default && !savedSet.has(c.id))
    newDefaults.forEach(c => savedSet.add(c.id))

    // Update storage with merged columns and new version
    localStorage.setItem(storageKey, JSON.stringify(Array.from(savedSet)))
    localStorage.setItem(versionKey, String(currentVersion))

    return savedSet
  }

  // Current version - use saved as-is
  if (saved) {
    try {
      const savedArray: string[] = JSON.parse(saved)
      return new Set<string>(savedArray)
    } catch {
      // Fall back to defaults
    }
  }

  return new Set(columns.filter(c => c.default).map(c => c.id))
}

// Helper to save columns to localStorage
export function saveColumns(storageKey: string, columns: Set<string>, version: number = COLUMN_VERSION) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(columns)))
    localStorage.setItem(`${storageKey}Version`, String(version))
  }
}
