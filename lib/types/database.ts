export type LeadStatus =
  | 'new'
  | 'pending_review'
  | 'to_call'
  | 'called'
  | 'interested'
  | 'booked'
  | 'bought'
  | 'not_interested'
  | 'do_not_call'
  | 'callback'
  | 'no_answer'

export type CallResult =
  | 'no_answer'
  | 'busy'
  | 'not_interested'
  | 'interested'
  | 'booked'
  | 'wrong_number'
  | 'call_back'

export type ProspectType = 'avställda' | 'nyköpt_bil' | 'låg_miltal' | 'alla' | null

export interface Lead {
  id: string
  phone: string | null
  owner_info: string | null
  location: string | null
  status: LeadStatus
  source: string | null
  county: string | null
  prospect_type: ProspectType
  data_period_start: string | null
  data_period_end: string | null
  extra_data: Record<string, string | number | boolean | null> | null
  created_at: string
  updated_at: string
  last_called_at: string | null
  follow_up_date: string | null
  // Letter tracking
  letter_sent: boolean | null
  letter_sent_date: string | null
  // Timestamps for when lead was sent to call/brev list
  sent_to_call_at: string | null
  sent_to_brev_at: string | null
}

export interface Vehicle {
  id: string
  lead_id: string
  reg_nr: string
  chassis_nr: string | null
  make: string | null
  model: string | null
  model_series: string | null
  vehicle_type: string | null
  condition: string | null
  year: number | null
  mileage: number | null
  horsepower: number | null
  fuel_type: string | null
  transmission: string | null
  four_wheel_drive: boolean
  engine_cc: number | null
  in_traffic: boolean
  deregistered_date: string | null
  registration_date: string | null
  financing_type: string | null
  leasing_company: string | null
  is_interesting: boolean
  skip_reason: string | null
  estimated_value: number | null
  ai_score: number | null
  ai_reasoning: string | null
  created_at: string
  updated_at: string
  // Car.info fields
  color: string | null
  skatt: number | null
  co2_gkm: number | null
  antal_agare: number | null
  valuation_company: number | null
  valuation_private: number | null
  total_in_sweden: number | null
  vehicle_history: Array<{ date: string; event: string; details?: string }> | null
  senaste_avställning: string | null
  senaste_påställning: string | null
  första_registrering: string | null
  besiktning_till: string | null
  antal_foretagsannonser: number | null
  antal_privatannonser: number | null
  carinfo_fetched_at: string | null
}

export interface CallLog {
  id: string
  lead_id: string
  vehicle_id: string | null
  called_at: string
  result: CallResult
  notes: string | null
  follow_up_date: string | null
  follow_up_notes: string | null
  booking_date: string | null
  booking_location: string | null
}

export interface ColumnMapping {
  id: string
  field_name: string
  display_name: string
  column_patterns: string[]
  is_active: boolean
  is_required: boolean
  sort_order: number
  created_at: string
}

export interface ValuePattern {
  id: string
  field_name: string
  pattern: string
  transformation: 'number' | 'multiply_1000' | 'boolean_true' | 'boolean_false' | 'text'
  output_value: string | null
  priority: number
  is_active: boolean
}

export interface Preference {
  id: string
  key: string
  value: unknown
  updated_at: string
}

export interface AIPattern {
  id: string
  pattern_type: 'preferred_make' | 'avoid_make' | 'max_mileage' | 'min_year' | 'problem_model' | 'success_pattern'
  make: string | null
  model: string | null
  condition_key: string | null
  condition_value: string | null
  occurrence_count: number
  success_rate: number | null
  learned_at: string
  last_updated: string
  is_active: boolean
  notes: string | null
}

// Extended types with relations
export interface VehicleWithLead extends Vehicle {
  lead: Lead
}

export interface LeadWithVehicles extends Lead {
  vehicles: Vehicle[]
}

export interface LeadWithVehiclesAndCalls extends Lead {
  vehicles: Vehicle[]
  call_logs: CallLog[]
}
