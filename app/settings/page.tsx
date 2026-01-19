import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { SettingsTabs } from '@/components/settings/settings-tabs'

async function getSettings() {
  const supabase = await createClient()

  const [
    { data: columnMappings },
    { data: valuePatterns },
    { data: preferences },
    { data: carInfoTokens }
  ] = await Promise.all([
    supabase.from('column_mappings').select('*').order('target_field'),
    supabase.from('value_patterns').select('*').order('field_name'),
    supabase.from('preferences').select('*').limit(1).maybeSingle(),
    supabase.from('api_tokens').select('*').eq('service_name', 'car_info').maybeSingle()
  ])

  return {
    columnMappings: columnMappings || [],
    valuePatterns: valuePatterns || [],
    preferences: preferences || null,
    carInfoTokens: carInfoTokens || null
  }
}

export default async function SettingsPage() {
  const { columnMappings, valuePatterns, preferences, carInfoTokens } = await getSettings()

  return (
    <div className="flex flex-col">
      <Header
        title="Inställningar"
        description="Konfigurera systemet och anpassa importregler"
      />

      <div className="flex-1 p-6">
        <SettingsTabs
          columnMappings={columnMappings}
          valuePatterns={valuePatterns}
          preferences={preferences}
          carInfoTokens={carInfoTokens}
        />
      </div>
    </div>
  )
}
