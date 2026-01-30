'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Settings2, Eye, EyeOff, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type ColumnDefinition,
  type ColumnGroup,
  LEAD_COLUMNS,
  LEAD_COLUMN_GROUPS,
  getMergedColumns,
  saveColumns,
  COLUMN_VERSION,
} from '@/lib/table-columns'

export interface DynamicTableProps<T> {
  data: T[]
  columns?: ColumnDefinition[]
  columnGroups?: ColumnGroup[]
  storageKey: string
  defaultColumns?: string[]
  onRowClick?: (item: T) => void
  selectionEnabled?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  getItemId: (item: T) => string
  renderCell: (columnId: string, item: T, index: number) => React.ReactNode
  emptyState?: React.ReactNode
  rowClassName?: (item: T, index: number) => string
  headerClassName?: string
  // Optional: Show selection bar above table
  renderSelectionBar?: (selectedCount: number, clearSelection: () => void) => React.ReactNode
}

export function DynamicTable<T>({
  data,
  columns = LEAD_COLUMNS,
  columnGroups = LEAD_COLUMN_GROUPS,
  storageKey,
  defaultColumns,
  onRowClick,
  selectionEnabled = true,
  selectedIds: externalSelectedIds,
  onSelectionChange,
  getItemId,
  renderCell,
  emptyState,
  rowClassName,
  headerClassName,
  renderSelectionBar,
}: DynamicTableProps<T>) {
  // Column visibility state - initialize from localStorage
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    if (defaultColumns) {
      // If default columns are provided, use those for initial state
      const defaultSet = new Set(defaultColumns)
      return getMergedColumns(storageKey, columns.map(c => ({
        ...c,
        default: defaultSet.has(c.id)
      })), COLUMN_VERSION)
    }
    return getMergedColumns(storageKey, columns, COLUMN_VERSION)
  })

  // Internal selection state (used if not controlled externally)
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set())

  // Use external or internal selection state
  const selectedIds = externalSelectedIds ?? internalSelectedIds
  const setSelectedIds = onSelectionChange ?? setInternalSelectedIds

  // Persist column visibility to localStorage
  useEffect(() => {
    saveColumns(storageKey, visibleColumns, COLUMN_VERSION)
  }, [visibleColumns, storageKey])

  const toggleColumn = useCallback((columnId: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(columnId)) {
        newSet.delete(columnId)
      } else {
        newSet.add(columnId)
      }
      return newSet
    })
  }, [])

  const showAllColumns = useCallback(() => {
    setVisibleColumns(new Set(columns.map(c => c.id)))
  }, [columns])

  const hideAllColumns = useCallback(() => {
    // Always keep first column (usually reg_number) visible
    setVisibleColumns(new Set([columns[0]?.id || 'reg_number']))
  }, [columns])

  const resetToDefaults = useCallback(() => {
    if (defaultColumns) {
      setVisibleColumns(new Set(defaultColumns))
    } else {
      setVisibleColumns(new Set(columns.filter(c => c.default).map(c => c.id)))
    }
  }, [columns, defaultColumns])

  const isColumnVisible = (columnId: string) => visibleColumns.has(columnId)

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map(item => getItemId(item))))
    }
  }, [data, selectedIds.size, setSelectedIds, getItemId])

  const handleSelectOne = useCallback((id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }, [selectedIds, setSelectedIds])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [setSelectedIds])

  // Get visible columns in order
  const visibleColumnsList = columns.filter(c => isColumnVisible(c.id))

  return (
    <div className="space-y-4">
      {/* Column visibility dropdown and selection bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Column visibility dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="w-4 h-4" />
                Kolumner ({visibleColumns.size})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-[400px] overflow-y-auto">
              <DropdownMenuLabel>Visa kolumner</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="flex gap-1 px-2 py-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={showAllColumns}>
                  <Eye className="w-3 h-3 mr-1" /> Alla
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={hideAllColumns}>
                  <EyeOff className="w-3 h-3 mr-1" /> Inga
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetToDefaults}>
                  Standard
                </Button>
              </div>
              <DropdownMenuSeparator />
              {columnGroups.map(group => (
                <div key={group.id}>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">{group.label}</DropdownMenuLabel>
                  {columns.filter(c => c.group === group.id).map(column => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={isColumnVisible(column.id)}
                      onCheckedChange={() => toggleColumn(column.id)}
                      disabled={column.id === columns[0]?.id} // First column always visible
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Selection count */}
          {selectionEnabled && selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} markerade
            </span>
          )}
        </div>

        {/* Custom selection bar */}
        {renderSelectionBar && selectedIds.size > 0 && (
          renderSelectionBar(selectedIds.size, clearSelection)
        )}
      </div>

      {/* Selection bar (default) */}
      {selectionEnabled && selectedIds.size > 0 && !renderSelectionBar && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <span className="text-sm text-blue-700">
            {selectedIds.size} rad{selectedIds.size > 1 ? 'er' : ''} markerade
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Avmarkera
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {data.length === 0 && emptyState ? (
            emptyState
          ) : (
            <Table>
              <TableHeader>
                <TableRow className={cn("bg-muted/50", headerClassName)}>
                  {selectionEnabled && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={data.length > 0 && selectedIds.size === data.length}
                        onCheckedChange={handleSelectAll}
                        aria-label="Välj alla"
                      />
                    </TableHead>
                  )}
                  {visibleColumnsList.map(column => (
                    <TableHead key={column.id}>
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, index) => {
                  const itemId = getItemId(item)
                  return (
                    <TableRow
                      key={itemId}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedIds.has(itemId) && "bg-blue-50",
                        rowClassName?.(item, index)
                      )}
                      onClick={() => onRowClick?.(item)}
                    >
                      {selectionEnabled && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(itemId)}
                            onCheckedChange={() => handleSelectOne(itemId)}
                            aria-label={`Välj rad ${index + 1}`}
                          />
                        </TableCell>
                      )}
                      {visibleColumnsList.map(column => (
                        <TableCell key={column.id} className="text-sm">
                          {renderCell(column.id, item, index)}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Re-export types and columns for convenience
export { LEAD_COLUMNS, LEAD_COLUMN_GROUPS, type ColumnDefinition, type ColumnGroup }
