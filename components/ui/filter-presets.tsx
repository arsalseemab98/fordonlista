'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Save, Bookmark, Trash2, Star, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { FilterPreset } from '@/lib/types/database'
import {
  getFilterPresets,
  saveFilterPreset,
  deleteFilterPreset,
  updateFilterPreset
} from '@/app/actions/filter-presets'

type FilterValue = string | string[] | boolean | number | null | undefined

interface FilterPresetsProps {
  page: 'playground' | 'historik' | 'leads' | 'to-call' | 'brev'
  currentFilters: { [key: string]: FilterValue }
  onLoadPreset: (filters: { [key: string]: FilterValue }) => void
}

export function FilterPresets({ page, currentFilters, onLoadPreset }: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [loading, setLoading] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [setAsDefault, setSetAsDefault] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load presets on mount
  useEffect(() => {
    loadPresets()
  }, [page])

  const loadPresets = async () => {
    setLoading(true)
    try {
      const data = await getFilterPresets(page)
      setPresets(data)
    } catch (error) {
      console.error('Error loading presets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast.error('Ange ett namn för filter-preseten')
      return
    }

    setSaving(true)
    try {
      const result = await saveFilterPreset({
        name: presetName.trim(),
        page,
        filters: currentFilters,
        is_default: setAsDefault
      })

      if (result.success) {
        toast.success('Filter sparad!')
        setShowSaveDialog(false)
        setPresetName('')
        setSetAsDefault(false)
        loadPresets()
      } else {
        toast.error(result.error || 'Kunde inte spara filter')
      }
    } catch (error) {
      toast.error('Ett fel uppstod')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePreset = async (id: string, name: string) => {
    if (!confirm(`Vill du verkligen ta bort "${name}"?`)) return

    try {
      const result = await deleteFilterPreset(id)
      if (result.success) {
        toast.success('Filter borttagen')
        loadPresets()
      } else {
        toast.error(result.error || 'Kunde inte ta bort filter')
      }
    } catch (error) {
      toast.error('Ett fel uppstod')
    }
  }

  const handleSetDefault = async (id: string, name: string) => {
    try {
      const result = await updateFilterPreset(id, { is_default: true })
      if (result.success) {
        toast.success(`"${name}" är nu standardfilter`)
        loadPresets()
      } else {
        toast.error(result.error || 'Kunde inte uppdatera')
      }
    } catch (error) {
      toast.error('Ett fel uppstod')
    }
  }

  const handleLoadPreset = (preset: FilterPreset) => {
    onLoadPreset(preset.filters)
    toast.success(`Filter "${preset.name}" aktiverad`)
  }

  // Check if current filters have any values
  const hasActiveFilters = Object.values(currentFilters).some(v =>
    v !== null && v !== undefined && v !== '' && v !== 'all' && v !== 'newest'
  )

  return (
    <div className="flex items-center gap-2">
      {/* Load preset dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Bookmark className="h-4 w-4" />
            Filter
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : presets.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-gray-500">
              Inga sparade filter
            </div>
          ) : (
            <>
              {presets.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  className="flex items-center justify-between"
                  onClick={(e) => {
                    e.preventDefault()
                    handleLoadPreset(preset)
                  }}
                >
                  <span className="flex items-center gap-2">
                    {preset.is_default && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                    {preset.name}
                  </span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {!preset.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleSetDefault(preset.id, preset.name)
                        }}
                        title="Sätt som standard"
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDeletePreset(preset.id, preset.name)
                      }}
                      title="Ta bort"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowSaveDialog(true)}
            disabled={!hasActiveFilters}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Spara nuvarande filter...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save preset dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Spara filter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Namn</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="T.ex. 'Stockholm + Avställda'"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="set-default"
                checked={setAsDefault}
                onCheckedChange={(checked) => setSetAsDefault(checked === true)}
              />
              <Label htmlFor="set-default" className="text-sm font-normal">
                Sätt som standardfilter (laddas automatiskt)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSavePreset} disabled={saving || !presetName.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Spara
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
