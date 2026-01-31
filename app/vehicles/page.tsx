import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { VehiclesView } from '@/components/vehicles/vehicles-view'

// Revalidate every 30 seconds
export const revalidate = 30

async function getVehicles() {
  const supabase = await createClient()

  const { data: vehicles, count, error } = await supabase
    .from('vehicles')
    .select(`
      id,
      lead_id,
      reg_nr,
      chassis_nr,
      make,
      model,
      mileage,
      year,
      fuel_type,
      color,
      transmission,
      horsepower,
      in_traffic,
      four_wheel_drive,
      engine_cc,
      is_interesting,
      ai_score,
      antal_agare,
      skatt,
      besiktning_till,
      mileage_history,
      owner_history,
      owner_vehicles,
      address_vehicles,
      owner_gender,
      owner_type,
      biluppgifter_fetched_at,
      leads (
        id,
        phone,
        owner_info,
        location,
        status,
        county,
        owner_age,
        owner_gender,
        owner_type,
        created_at
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

export default async function VehiclesPage() {
  const { vehicles, count } = await getVehicles()

  return (
    <div className="flex flex-col">
      <Header
        title="Fordon"
        description={`${count} fordon i systemet`}
      />

      <div className="flex-1 p-6">
        <VehiclesView vehicles={vehicles} count={count} />
      </div>
    </div>
  )
}
