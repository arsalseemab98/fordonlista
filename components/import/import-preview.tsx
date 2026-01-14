'use client'

import { ParseResult } from '@/lib/import/excel-parser'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

interface ImportPreviewProps {
  data: ParseResult
}

export function ImportPreview({ data }: ImportPreviewProps) {
  const previewRows = data.rows.slice(0, 5)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Förhandsvisning</h3>
        <Badge variant="outline">
          Visar {previewRows.length} av {data.totalRows} rader
        </Badge>
      </div>

      <ScrollArea className="rounded-lg border border-gray-200">
        <div className="min-w-max">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {data.headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {previewRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="bg-white">
                  {data.headers.map((header, colIndex) => (
                    <td
                      key={colIndex}
                      className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                    >
                      {row[header] !== null && row[header] !== undefined
                        ? String(row[header])
                        : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
