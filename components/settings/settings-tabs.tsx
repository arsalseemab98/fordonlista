'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Settings,
  FileSpreadsheet,
  Code,
  Brain,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Check,
  Mail,
  Plug,
  Eye,
  EyeOff,
  Info,
  Star,
  Ban,
  AlertTriangle,
  ClipboardPaste
} from 'lucide-react'
import { TagInput } from '@/components/ui/tag-input'
import { toast } from 'sonner'
import {
  saveColumnMapping,
  deleteColumnMapping,
  saveValuePattern,
  deleteValuePattern,
  savePreferences,
  saveCarInfoTokens,
  saveBiluppgifterSettings,
  saveBiluppgifterCookies
} from '@/app/actions/settings'
import { useRouter } from 'next/navigation'

interface ColumnMapping {
  id: string
  target_field: string
  source_patterns: string[]
  description?: string
  is_active: boolean
}

interface ValuePattern {
  id: string
  field_name: string
  pattern: string
  description?: string
  transformation?: string
  is_active: boolean
}

interface Preferences {
  id: string
  preferred_makes: string[]
  excluded_makes: string[]
  preferred_models: string[]
  excluded_models: string[]
  min_mileage: number
  max_mileage: number
  min_year: number
  max_year: number
  prefer_deregistered: boolean
  ai_enabled: boolean
  letter_cost: number
  filters_enabled: boolean
}

interface ApiTokens {
  id: string
  service_name: string
  refresh_token?: string
  bearer_token?: string
  updated_at?: string
}

interface BiluppgifterSettings {
  id: string
  service_name: string
  refresh_token?: string
  bearer_token?: string // Used to store API URL
  updated_at?: string
}

interface SettingsTabsProps {
  columnMappings: ColumnMapping[]
  valuePatterns: ValuePattern[]
  preferences: Preferences | null
  carInfoTokens: ApiTokens | null
  biluppgifterSettings: BiluppgifterSettings | null
}

export function SettingsTabs({ columnMappings, valuePatterns, preferences, carInfoTokens, biluppgifterSettings }: SettingsTabsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('general')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="general" className="gap-2">
          <Settings className="h-4 w-4" />
          Allmänt
        </TabsTrigger>
        <TabsTrigger value="columns" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Kolumner
        </TabsTrigger>
        <TabsTrigger value="patterns" className="gap-2">
          <Code className="h-4 w-4" />
          Mönster
        </TabsTrigger>
        <TabsTrigger value="ai" className="gap-2">
          <Brain className="h-4 w-4" />
          AI
        </TabsTrigger>
        <TabsTrigger value="integrations" className="gap-2">
          <Plug className="h-4 w-4" />
          Integrationer
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-6">
        <GeneralSettings preferences={preferences} />
      </TabsContent>

      <TabsContent value="columns" className="mt-6">
        <ColumnMappingSettings mappings={columnMappings} />
      </TabsContent>

      <TabsContent value="patterns" className="mt-6">
        <ValuePatternSettings patterns={valuePatterns} />
      </TabsContent>

      <TabsContent value="ai" className="mt-6">
        <AISettings preferences={preferences} />
      </TabsContent>

      <TabsContent value="integrations" className="mt-6">
        <IntegrationsSettings carInfoTokens={carInfoTokens} biluppgifterSettings={biluppgifterSettings} />
      </TabsContent>
    </Tabs>
  )
}

function GeneralSettings({ preferences }: { preferences: Preferences | null }) {
  const router = useRouter()
  const [filtersEnabled, setFiltersEnabled] = useState(
    preferences?.filters_enabled ?? true
  )
  const [preferredMakes, setPreferredMakes] = useState<string[]>(
    preferences?.preferred_makes || []
  )
  const [excludedMakes, setExcludedMakes] = useState<string[]>(
    preferences?.excluded_makes || []
  )
  const [preferredModels, setPreferredModels] = useState<string[]>(
    preferences?.preferred_models || []
  )
  const [excludedModels, setExcludedModels] = useState<string[]>(
    preferences?.excluded_models || []
  )
  const [minMileage, setMinMileage] = useState(preferences?.min_mileage || 0)
  const [maxMileage, setMaxMileage] = useState(preferences?.max_mileage || 200000)
  const [minYear, setMinYear] = useState(preferences?.min_year || 2010)
  const [maxYear, setMaxYear] = useState(preferences?.max_year || new Date().getFullYear())
  const [preferDeregistered, setPreferDeregistered] = useState(
    preferences?.prefer_deregistered || false
  )
  const [letterCost, setLetterCost] = useState(preferences?.letter_cost || 12.00)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    const result = await savePreferences({
      preferred_makes: preferredMakes,
      excluded_makes: excludedMakes,
      preferred_models: preferredModels,
      excluded_models: excludedModels,
      min_mileage: minMileage,
      max_mileage: maxMileage,
      min_year: minYear,
      max_year: maxYear,
      prefer_deregistered: preferDeregistered,
      ai_enabled: preferences?.ai_enabled ?? true,
      letter_cost: letterCost,
      filters_enabled: filtersEnabled
    })
    setIsSaving(false)

    if (result.success) {
      toast.success('Inställningar sparade')
      router.refresh()
    } else {
      toast.error('Kunde inte spara inställningar')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filterinställningar</CardTitle>
        <CardDescription>
          Konfigurera vilka fordon du är intresserad av att köpa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master toggle for filters */}
        <div className="flex items-center justify-between rounded-lg border p-4 bg-gray-50">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Aktivera filter</Label>
            <p className="text-xs text-gray-500">
              Slå av för att visa alla fordon utan filtrering
            </p>
          </div>
          <Switch
            checked={filtersEnabled}
            onCheckedChange={setFiltersEnabled}
          />
        </div>

        <div className={filtersEnabled ? '' : 'opacity-50 pointer-events-none'}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-green-600" />
            <Label>Föredragna märken</Label>
          </div>
          <TagInput
            value={preferredMakes}
            onChange={setPreferredMakes}
            placeholder="Skriv märke och tryck Enter..."
            variant="success"
          />
          <p className="text-xs text-gray-500">
            Dessa märken får högre prioritet. Tryck Enter eller klicka + för att lägga till.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-red-600" />
            <Label>Exkluderade märken</Label>
          </div>
          <TagInput
            value={excludedMakes}
            onChange={setExcludedMakes}
            placeholder="Skriv märke och tryck Enter..."
            variant="destructive"
          />
          <p className="text-xs text-gray-500">
            Dessa märken visas med varning eller filtreras bort.
          </p>
        </div>

        {/* Model preferences */}
        <div className="border-t pt-6 mt-6">
          <h3 className="text-sm font-medium mb-4 text-gray-700">Modellfilter (valfritt)</h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-green-600" />
                <Label>Föredragna modeller</Label>
              </div>
              <TagInput
                value={preferredModels}
                onChange={setPreferredModels}
                placeholder="T.ex. V70, XC90, 3-Serie..."
                variant="success"
              />
              <p className="text-xs text-gray-500">
                Specifika modeller som får extra prioritet.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-red-600" />
                <Label>Exkluderade modeller</Label>
              </div>
              <TagInput
                value={excludedModels}
                onChange={setExcludedModels}
                placeholder="T.ex. Smart, Aygo..."
                variant="destructive"
              />
              <p className="text-xs text-gray-500">
                Specifika modeller som du inte är intresserad av.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="min-mileage">Min miltal (km)</Label>
            <Input
              id="min-mileage"
              type="number"
              value={minMileage}
              onChange={(e) => setMinMileage(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-mileage">Max miltal (km)</Label>
            <Input
              id="max-mileage"
              type="number"
              value={maxMileage}
              onChange={(e) => setMaxMileage(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-year">Min årsmodell</Label>
            <Input
              id="min-year"
              type="number"
              value={minYear}
              onChange={(e) => setMinYear(parseInt(e.target.value) || 0)}
              placeholder="2010"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-year">Max årsmodell</Label>
            <Input
              id="max-year"
              type="number"
              value={maxYear}
              onChange={(e) => setMaxYear(parseInt(e.target.value) || new Date().getFullYear())}
              placeholder={new Date().getFullYear().toString()}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Prioritera avställda fordon</Label>
            <p className="text-xs text-gray-500">
              Visar avställda fordon högre i listan
            </p>
          </div>
          <Switch
            checked={preferDeregistered}
            onCheckedChange={setPreferDeregistered}
          />
        </div>

        {/* Letter Cost Setting */}
        <div className="space-y-2 rounded-lg border p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-amber-600" />
            <Label htmlFor="letter-cost" className="text-amber-900">Brevkostnad (SEK)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="letter-cost"
              type="number"
              step="0.50"
              min="0"
              value={letterCost}
              onChange={(e) => setLetterCost(parseFloat(e.target.value) || 0)}
              className="w-32"
            />
            <span className="text-sm text-amber-700">kr per brev</span>
          </div>
          <p className="text-xs text-amber-600">
            Används för att räkna ut total kostnad vid brevutskick. Standardvärde: 12 kr.
          </p>
        </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Sparar...' : 'Spara inställningar'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPreferredMakes([])
              setExcludedMakes([])
              setPreferredModels([])
              setExcludedModels([])
              setMinMileage(0)
              setMaxMileage(200000)
              setMinYear(2010)
              setMaxYear(new Date().getFullYear())
              setPreferDeregistered(false)
              setLetterCost(12.00)
              toast.info('Filter återställda - klicka Spara för att bekräfta')
            }}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Rensa filter
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ColumnMappingSettings({ mappings }: { mappings: ColumnMapping[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<ColumnMapping>>({})

  const handleEdit = (mapping: ColumnMapping) => {
    setEditingId(mapping.id)
    setEditData({
      target_field: mapping.target_field,
      source_patterns: mapping.source_patterns,
      description: mapping.description,
      is_active: mapping.is_active
    })
  }

  const handleSave = async () => {
    if (!editingId || !editData.target_field) return

    const result = await saveColumnMapping({
      id: editingId,
      target_field: editData.target_field,
      source_patterns: editData.source_patterns || [],
      description: editData.description,
      is_active: editData.is_active ?? true
    })

    if (result.success) {
      toast.success('Mappning sparad')
      setEditingId(null)
      setEditData({})
      router.refresh()
    } else {
      toast.error('Kunde inte spara')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna mappning?')) return

    const result = await deleteColumnMapping(id)
    if (result.success) {
      toast.success('Mappning borttagen')
      router.refresh()
    } else {
      toast.error('Kunde inte ta bort')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kolumnmappningar</CardTitle>
        <CardDescription>
          Definiera hur Excel-kolumner ska matchas mot systemfält. Använd regex-mönster.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fält</TableHead>
              <TableHead>Sök-mönster (regex)</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((mapping) => (
              <TableRow key={mapping.id}>
                <TableCell className="font-medium">
                  {editingId === mapping.id ? (
                    <Input
                      value={editData.target_field || ''}
                      onChange={(e) => setEditData({ ...editData, target_field: e.target.value })}
                      className="w-32"
                    />
                  ) : (
                    mapping.target_field
                  )}
                </TableCell>
                <TableCell>
                  {editingId === mapping.id ? (
                    <Input
                      value={editData.source_patterns?.join(', ') || ''}
                      onChange={(e) => setEditData({
                        ...editData,
                        source_patterns: e.target.value.split(',').map(s => s.trim())
                      })}
                      placeholder="reg.*nr, regnr, registration..."
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {mapping.source_patterns.map((p, i) => (
                        <Badge key={i} variant="outline" className="font-mono text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === mapping.id ? (
                    <Switch
                      checked={editData.is_active ?? true}
                      onCheckedChange={(checked) => setEditData({ ...editData, is_active: checked })}
                    />
                  ) : (
                    <Badge variant={mapping.is_active ? 'default' : 'secondary'}>
                      {mapping.is_active ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === mapping.id ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={handleSave}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(mapping)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(mapping.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function ValuePatternSettings({ patterns }: { patterns: ValuePattern[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<ValuePattern>>({})

  const handleEdit = (pattern: ValuePattern) => {
    setEditingId(pattern.id)
    setEditData({
      field_name: pattern.field_name,
      pattern: pattern.pattern,
      description: pattern.description,
      is_active: pattern.is_active
    })
  }

  const handleSave = async () => {
    if (!editingId || !editData.field_name || !editData.pattern) return

    const result = await saveValuePattern({
      id: editingId,
      field_name: editData.field_name,
      pattern: editData.pattern,
      description: editData.description,
      is_active: editData.is_active ?? true
    })

    if (result.success) {
      toast.success('Mönster sparat')
      setEditingId(null)
      setEditData({})
      router.refresh()
    } else {
      toast.error('Kunde inte spara')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort detta mönster?')) return

    const result = await deleteValuePattern(id)
    if (result.success) {
      toast.success('Mönster borttaget')
      router.refresh()
    } else {
      toast.error('Kunde inte ta bort')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Värdemönster</CardTitle>
        <CardDescription>
          Regex-mönster för att extrahera och tolka värden från Excel-data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fält</TableHead>
              <TableHead>Regex-mönster</TableHead>
              <TableHead>Beskrivning</TableHead>
              <TableHead className="w-[100px]">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patterns.map((pattern) => (
              <TableRow key={pattern.id}>
                <TableCell className="font-medium">
                  {editingId === pattern.id ? (
                    <Input
                      value={editData.field_name || ''}
                      onChange={(e) => setEditData({ ...editData, field_name: e.target.value })}
                      className="w-32"
                    />
                  ) : (
                    pattern.field_name
                  )}
                </TableCell>
                <TableCell>
                  {editingId === pattern.id ? (
                    <Input
                      value={editData.pattern || ''}
                      onChange={(e) => setEditData({ ...editData, pattern: e.target.value })}
                      className="font-mono text-xs"
                    />
                  ) : (
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {pattern.pattern}
                    </code>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {editingId === pattern.id ? (
                    <Input
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    />
                  ) : (
                    pattern.description
                  )}
                </TableCell>
                <TableCell>
                  {editingId === pattern.id ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={handleSave}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(pattern)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(pattern.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function AISettings({ preferences }: { preferences: Preferences | null }) {
  const router = useRouter()
  const [aiEnabled, setAiEnabled] = useState(preferences?.ai_enabled ?? true)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    const result = await savePreferences({
      preferred_makes: preferences?.preferred_makes || [],
      excluded_makes: preferences?.excluded_makes || [],
      max_mileage: preferences?.max_mileage || 200000,
      min_year: preferences?.min_year || 2010,
      prefer_deregistered: preferences?.prefer_deregistered || false,
      ai_enabled: aiEnabled
    })
    setIsSaving(false)

    if (result.success) {
      toast.success('AI-inställningar sparade')
      router.refresh()
    } else {
      toast.error('Kunde inte spara')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-funktioner</CardTitle>
        <CardDescription>
          Konfigurera hur AI ska hjälpa dig prioritera leads
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Aktivera AI-prioritering</Label>
            <p className="text-xs text-gray-500">
              Låt AI analysera och poängsätta leads baserat på dina preferenser
            </p>
          </div>
          <Switch
            checked={aiEnabled}
            onCheckedChange={setAiEnabled}
          />
        </div>

        {aiEnabled && (
          <div className="space-y-4 rounded-lg bg-blue-50 p-4">
            <h4 className="font-medium text-blue-900">AI kommer att:</h4>
            <ul className="space-y-2 text-sm text-blue-700">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Prioritera leads baserat på dina föredragna märken
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Varna för fordon med högt miltal eller uteslutna märken
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Lära sig från dina samtalsresultat över tid
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Ge rekommendationer på vem du ska ringa först
              </li>
            </ul>
          </div>
        )}

        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Sparar...' : 'Spara inställningar'}
        </Button>
      </CardContent>
    </Card>
  )
}

function IntegrationsSettings({ carInfoTokens, biluppgifterSettings }: { carInfoTokens: ApiTokens | null, biluppgifterSettings: BiluppgifterSettings | null }) {
  const router = useRouter()
  const [refreshToken, setRefreshToken] = useState(carInfoTokens?.refresh_token || '')
  const [bearerToken, setBearerToken] = useState(carInfoTokens?.bearer_token || '')
  const [showRefreshToken, setShowRefreshToken] = useState(false)
  const [showBearerToken, setShowBearerToken] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Biluppgifter state
  const [biluppgifterUrl, setBiluppgifterUrl] = useState(biluppgifterSettings?.bearer_token || 'http://localhost:3456')
  const [isSavingBiluppgifter, setIsSavingBiluppgifter] = useState(false)
  const [isTestingBiluppgifter, setIsTestingBiluppgifter] = useState(false)
  const [biluppgifterTestResult, setBiluppgifterTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Biluppgifter cookies state
  const [buSession, setBuSession] = useState('')
  const [buCfClearance, setBuCfClearance] = useState('')
  const [buAntiforgery, setBuAntiforgery] = useState('')
  const [isSavingCookies, setIsSavingCookies] = useState(false)
  const [cookieSaveResult, setCookieSaveResult] = useState<{ success: boolean; message: string } | null>(null)

  // .env file paste state
  const [envContent, setEnvContent] = useState('')
  const [isSavingEnv, setIsSavingEnv] = useState(false)
  const [envSaveResult, setEnvSaveResult] = useState<{ success: boolean; message: string } | null>(null)

  // Browser connection status
  const [browserConnectionStatus, setBrowserConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'not_logged_in' | 'no_tab' | 'error'>('idle')

  const handleSave = async () => {
    if (!refreshToken || !bearerToken) {
      toast.error('Båda tokens krävs')
      return
    }

    setIsSaving(true)
    const result = await saveCarInfoTokens({
      refresh_token: refreshToken,
      bearer_token: bearerToken
    })
    setIsSaving(false)

    if (result.success) {
      toast.success('Tokens sparade')
      router.refresh()
    } else {
      toast.error(result.error || 'Kunde inte spara tokens')
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/carinfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg_number: 'ABC123' })
      })

      const data = await response.json()

      if (data.error) {
        setTestResult({ success: false, message: data.error })
      } else {
        setTestResult({ success: true, message: 'Anslutningen fungerar!' })
      }
    } catch {
      setTestResult({ success: false, message: 'Kunde inte ansluta till API' })
    }

    setIsTesting(false)
  }

  const handleSaveBiluppgifter = async () => {
    if (!biluppgifterUrl) {
      toast.error('API URL krävs')
      return
    }

    setIsSavingBiluppgifter(true)
    const result = await saveBiluppgifterSettings({
      api_url: biluppgifterUrl
    })
    setIsSavingBiluppgifter(false)

    if (result.success) {
      toast.success('Biluppgifter API URL sparad')
      router.refresh()
    } else {
      toast.error(result.error || 'Kunde inte spara inställningar')
    }
  }

  const handleTestBiluppgifter = async () => {
    setIsTestingBiluppgifter(true)
    setBiluppgifterTestResult(null)

    try {
      const response = await fetch(`${biluppgifterUrl}/health`)

      if (response.ok) {
        setBiluppgifterTestResult({ success: true, message: 'Anslutningen fungerar!' })
      } else {
        setBiluppgifterTestResult({ success: false, message: `HTTP ${response.status}: ${response.statusText}` })
      }
    } catch {
      setBiluppgifterTestResult({ success: false, message: 'Kunde inte ansluta. Kontrollera att biluppgifter-api körs.' })
    }

    setIsTestingBiluppgifter(false)
  }

  const handleSaveCookies = async () => {
    if (!buSession || !buCfClearance) {
      toast.error('Session och cf_clearance cookies krävs')
      return
    }

    setIsSavingCookies(true)
    setCookieSaveResult(null)

    const result = await saveBiluppgifterCookies({
      session: buSession,
      cf_clearance: buCfClearance,
      antiforgery: buAntiforgery || undefined
    })

    setIsSavingCookies(false)

    if (result.success) {
      setCookieSaveResult({ success: true, message: 'Cookies sparade!' })
      toast.success('Cookies sparade till databasen')
      router.refresh()
    } else {
      setCookieSaveResult({ success: false, message: result.error || 'Kunde inte spara cookies' })
      toast.error(result.error || 'Kunde inte spara cookies')
    }
  }

  // Bookmarklet code for extracting cookies from biluppgifter.se
  const bookmarkletCode = `javascript:(function(){const cookies={};document.cookie.split(';').forEach(c=>{const[k,v]=c.trim().split('=');cookies[k]=v;});const result={session:cookies.session||'',cf_clearance:cookies.cf_clearance||'',antiforgery:Object.keys(cookies).find(k=>k.startsWith('.AspNetCore.Antiforgery'))?cookies[Object.keys(cookies).find(k=>k.startsWith('.AspNetCore.Antiforgery'))]:''}; const text='session: '+result.session+'\\ncf_clearance: '+result.cf_clearance+'\\nantiforgery: '+result.antiforgery; navigator.clipboard.writeText(JSON.stringify(result)).then(()=>alert('Cookies kopierade till urklipp!\\n\\n'+text)).catch(()=>prompt('Kopiera dessa cookies:',JSON.stringify(result)));})();`

  const handlePasteJson = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const parsed = JSON.parse(text)

      if (parsed.session) setBuSession(parsed.session)
      if (parsed.cf_clearance) setBuCfClearance(parsed.cf_clearance)
      if (parsed.antiforgery) setBuAntiforgery(parsed.antiforgery)

      toast.success('Cookies klistrade in!')
    } catch {
      toast.error('Kunde inte tolka JSON från urklipp')
    }
  }

  const handleTestBrowserConnection = () => {
    setBrowserConnectionStatus('checking')

    // Open biluppgifter.se in a new tab for the user to verify login
    const newWindow = window.open('https://biluppgifter.se', '_blank')

    // After a short delay, update status based on whether window opened
    setTimeout(() => {
      if (newWindow) {
        setBrowserConnectionStatus('connected')
        toast.success('biluppgifter.se öppnad! Kontrollera att du är inloggad (ser "Logga ut" längst upp).')
      } else {
        setBrowserConnectionStatus('error')
        toast.error('Popup blockerad. Tillåt popups för denna sida.')
      }
    }, 1000)
  }

  const handleSaveEnvFile = async () => {
    if (!envContent.trim()) {
      toast.error('Klistra in .env-innehåll först')
      return
    }

    // Parse the env content
    const lines = envContent.trim().split('\n')
    const envVars: Record<string, string> = {}

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim()
        const value = trimmed.substring(eqIndex + 1).trim()
        envVars[key] = value
      }
    }

    if (!envVars.BILUPPGIFTER_SESSION && !envVars.BILUPPGIFTER_CF_CLEARANCE) {
      toast.error('Ingen BILUPPGIFTER_SESSION eller BILUPPGIFTER_CF_CLEARANCE hittades')
      return
    }

    setIsSavingEnv(true)
    setEnvSaveResult(null)

    try {
      const response = await fetch('/api/biluppgifter-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envContent: envContent.trim() })
      })

      const data = await response.json()

      if (data.success) {
        setEnvSaveResult({ success: true, message: 'Cookies sparade till .env-filen! Starta om servern.' })
        toast.success('Cookies sparade! Starta om biluppgifter-api.')
        setEnvContent('')
      } else {
        setEnvSaveResult({ success: false, message: data.error || 'Kunde inte spara' })
        toast.error(data.error || 'Kunde inte spara till .env-filen')
      }
    } catch {
      setEnvSaveResult({ success: false, message: 'Nätverksfel vid sparande' })
      toast.error('Kunde inte kontakta servern')
    }

    setIsSavingEnv(false)
  }

  return (
    <div className="space-y-6">
      {/* Biluppgifter Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-blue-600" />
            Biluppgifter.se (Lokal API)
          </CardTitle>
          <CardDescription>
            Hämta miltal, ägare, besiktning m.m. från biluppgifter.se via lokal server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Important: Must run locally */}
          {typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && (
            <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">⚠️ Kör appen lokalt för biluppgifter</p>
                  <p className="text-sm text-red-700 mt-1">
                    Du är på Vercel ({window.location.hostname}) men API:t körs på din dator.
                    Öppna <strong>localhost:3000</strong> istället.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText('cd ~/Desktop/fordonlista && npm run dev')
                        toast.success('Kommando kopierat! Klistra in i Terminal, sen öppna localhost:3000')
                      }}
                      className="gap-2 bg-red-600 hover:bg-red-700"
                    >
                      <ClipboardPaste className="h-4 w-4" />
                      Kopiera: npm run dev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open('http://localhost:3000/settings', '_blank')}
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Öppna localhost:3000
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Start Instructions - One click */}
          <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-blue-900">1. Starta biluppgifter-api</p>
                <p className="text-sm text-blue-700 mt-1">Öppna Terminal, klistra in kommandot och tryck Enter</p>
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText('cd ~/Desktop/biluppgifter-api && source venv/bin/activate && uvicorn server:app --port 3456')
                  toast.success('Kommando kopierat! Klistra in i Terminal.')
                }}
                className="gap-2 bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                <ClipboardPaste className="h-4 w-4" />
                Kopiera kommando
              </Button>
            </div>
          </div>

          {/* Start Next.js locally */}
          <div className="rounded-lg border-2 border-purple-300 bg-purple-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-purple-900">2. Starta fordonlista lokalt</p>
                <p className="text-sm text-purple-700 mt-1">I en ny Terminal-flik, starta Next.js</p>
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText('cd ~/Desktop/fordonlista && npm run dev')
                  toast.success('Kommando kopierat! Klistra in i ny Terminal-flik.')
                }}
                className="gap-2 bg-purple-600 hover:bg-purple-700 shrink-0"
              >
                <ClipboardPaste className="h-4 w-4" />
                Kopiera kommando
              </Button>
            </div>
          </div>

          {/* Cookie Instructions */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">3. Uppdatera cookies (vid 403-fel)</p>
                  <p className="text-sm text-amber-700 mt-1">cf_clearance löper ut var ~2 timme</p>
                  <ol className="text-sm text-amber-700 mt-2 space-y-0.5 list-decimal list-inside">
                    <li>Öppna <a href="https://biluppgifter.se" target="_blank" rel="noopener noreferrer" className="underline font-medium">biluppgifter.se</a> → F12 → Console</li>
                    <li>Klistra in scriptet → Enter</li>
                    <li>Fyll i cookies → Kopiera → Klistra i .env</li>
                  </ol>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const script = `(async function(){const get=n=>{const m=document.cookie.match(new RegExp('(^| )'+n+'=([^;]+)'));return m?m[2]:null;};let s=get('session'),c=get('cf_clearance');if(!s||!c){try{const all=await cookieStore.getAll();s=s||all.find(x=>x.name==='session')?.value;c=c||all.find(x=>x.name==='cf_clearance')?.value;}catch(e){}}const found=s&&c;const m=document.createElement('div');m.innerHTML='<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:system-ui"><div style="background:white;padding:24px;border-radius:12px;max-width:600px;width:90%"><h2 style="margin:0 0 16px;color:#1e40af">🍪 '+(found?'Cookies hittade!':'Kopiera Cookies')+'</h2><p style="color:#666;margin-bottom:16px">'+(found?'✅ Cookies hämtade automatiskt!':'⚠️ HttpOnly cookies - kopiera från <b>Application → Cookies</b>')+'</p><div style="margin-bottom:12px"><label style="font-weight:bold;color:'+(s?'#16a34a':'#333')+'">session: '+(s?'✓':'')+'</label><input id="cs" value="'+(s||'')+'" style="width:100%;padding:8px;border:1px solid '+(s?'#16a34a':'#ddd')+';border-radius:4px;font-family:monospace;font-size:12px;background:'+(s?'#f0fdf4':'#fff')+'" placeholder="Klistra in från Application → Cookies"></div><div style="margin-bottom:12px"><label style="font-weight:bold;color:'+(c?'#16a34a':'#d97706')+'">cf_clearance: '+(c?'✓':'')+'</label><input id="cc" value="'+(c||'')+'" style="width:100%;padding:8px;border:1px solid '+(c?'#16a34a':'#ddd')+';border-radius:4px;font-family:monospace;font-size:12px;background:'+(c?'#f0fdf4':'#fff')+'" placeholder="Klistra in från Application → Cookies"></div><div style="background:#f1f5f9;padding:12px;border-radius:8px;margin-bottom:16px"><label style="font-weight:bold;color:#333;display:block;margin-bottom:8px">📋 .env format:</label><textarea id="eo" readonly style="width:100%;height:60px;padding:8px;border:1px solid #ddd;border-radius:4px;font-family:monospace;font-size:11px;resize:none;background:#fff"></textarea></div><div style="display:flex;gap:8px"><button id="bc" style="flex:1;padding:12px;background:#2563eb;color:white;border:none;border-radius:6px;font-weight:bold;cursor:pointer">📋 Kopiera .env</button><button id="bx" style="padding:12px 24px;background:#e5e7eb;border:none;border-radius:6px;cursor:pointer">Stäng</button></div></div></div>';document.body.appendChild(m);const u=()=>{document.getElementById('eo').value='BILUPPGIFTER_SESSION='+document.getElementById('cs').value+'\\nBILUPPGIFTER_CF_CLEARANCE='+document.getElementById('cc').value;};u();document.getElementById('cs').oninput=u;document.getElementById('cc').oninput=u;document.getElementById('bc').onclick=()=>{navigator.clipboard.writeText(document.getElementById('eo').value);alert('✅ Kopierat!\\n\\nKlistra in i:\\n~/Desktop/biluppgifter-api/.env\\n\\nOch starta om servern!');};document.getElementById('bx').onclick=()=>m.remove();})();`;
                  navigator.clipboard.writeText(script)
                  toast.success('Script kopierat! Klistra in i Console på biluppgifter.se')
                }}
                className="gap-2 shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                <ClipboardPaste className="h-4 w-4" />
                Kopiera script
              </Button>
            </div>
          </div>

          {/* .env Paste Section */}
          <div className="rounded-lg border-2 border-green-300 bg-green-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardPaste className="h-5 w-5 text-green-600" />
              <p className="font-semibold text-green-900">Klistra in .env-innehåll</p>
            </div>
            <p className="text-sm text-green-700">
              Klistra in hela .env-innehållet från cookie-scriptet här:
            </p>
            <textarea
              value={envContent}
              onChange={(e) => setEnvContent(e.target.value)}
              placeholder={`BILUPPGIFTER_SESSION=CfDJ8...
BILUPPGIFTER_CF_CLEARANCE=0qzhiG8...`}
              className="w-full h-24 p-3 border border-green-300 rounded-md font-mono text-xs bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />

            {envSaveResult && (
              <div className={`rounded-lg p-3 ${envSaveResult.success ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-700'}`}>
                {envSaveResult.success ? <Check className="inline h-4 w-4 mr-2" /> : <X className="inline h-4 w-4 mr-2" />}
                {envSaveResult.message}
              </div>
            )}

            <Button
              onClick={handleSaveEnvFile}
              disabled={isSavingEnv || !envContent.trim()}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4" />
              {isSavingEnv ? 'Sparar...' : 'Spara till .env'}
            </Button>
          </div>

          {/* API URL & Test */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="biluppgifter-url">API URL</Label>
              <Input
                id="biluppgifter-url"
                type="text"
                placeholder="http://localhost:3456"
                value={biluppgifterUrl}
                onChange={(e) => setBiluppgifterUrl(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            {/* Test Result */}
            {biluppgifterTestResult && (
              <div className={`rounded-lg p-3 ${biluppgifterTestResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {biluppgifterTestResult.success ? <Check className="inline h-4 w-4 mr-2" /> : <X className="inline h-4 w-4 mr-2" />}
                {biluppgifterTestResult.message}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleSaveBiluppgifter} disabled={isSavingBiluppgifter} className="gap-2">
                <Save className="h-4 w-4" />
                {isSavingBiluppgifter ? 'Sparar...' : 'Spara URL'}
              </Button>
              <Button variant="outline" onClick={handleTestBiluppgifter} disabled={isTestingBiluppgifter}>
                {isTestingBiluppgifter ? 'Testar...' : 'Testa anslutning'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Car.info Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img src="https://www.car.info/favicon.ico" alt="" className="h-5 w-5" />
            Car.info Integration
          </CardTitle>
          <CardDescription>
            Hämta utökad fordonsinformation från car.info. Kräver inloggning på car.info.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex gap-2">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-blue-900">Så här hittar du dina tokens:</p>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Logga in på <a href="https://www.car.info" target="_blank" rel="noopener noreferrer" className="underline">car.info</a></li>
                  <li>Öppna DevTools (Cmd+Option+I på Mac, F12 på Windows)</li>
                  <li>Gå till Application → Cookies → www.car.info</li>
                  <li>Kopiera värdena för <code className="bg-blue-100 px-1 rounded">refreshToken</code> och <code className="bg-blue-100 px-1 rounded">BEARER</code></li>
                </ol>
              </div>
            </div>
          </div>

          {/* Refresh Token */}
          <div className="space-y-2">
            <Label htmlFor="refresh-token">Refresh Token</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="refresh-token"
                  type={showRefreshToken ? 'text' : 'password'}
                  placeholder="cd8bca103676383a..."
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowRefreshToken(!showRefreshToken)}
                >
                  {showRefreshToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Bearer Token */}
          <div className="space-y-2">
            <Label htmlFor="bearer-token">Bearer Token (JWT)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="bearer-token"
                  type={showBearerToken ? 'text' : 'password'}
                  placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
                  value={bearerToken}
                  onChange={(e) => setBearerToken(e.target.value)}
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowBearerToken(!showBearerToken)}
                >
                  {showBearerToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`rounded-lg p-3 ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {testResult.success ? <Check className="inline h-4 w-4 mr-2" /> : <X className="inline h-4 w-4 mr-2" />}
              {testResult.message}
            </div>
          )}

          {/* Last Updated */}
          {carInfoTokens?.updated_at && (
            <p className="text-xs text-gray-500">
              Senast uppdaterad: {new Date(carInfoTokens.updated_at).toLocaleString('sv-SE')}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Sparar...' : 'Spara tokens'}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={isTesting}>
              {isTesting ? 'Testar...' : 'Testa anslutning'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
