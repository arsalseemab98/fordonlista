'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'
import { Upload, FileSpreadsheet, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileDropzoneProps {
  onFileAccepted: (file: File) => void
  isLoading?: boolean
  acceptedFile?: File | null
  onClear?: () => void
}

export function FileDropzone({ onFileAccepted, isLoading, acceptedFile, onClear }: FileDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileAccepted(acceptedFiles[0])
    }
  }, [onFileAccepted])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: isLoading
  })

  if (acceptedFile) {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <FileSpreadsheet className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">{acceptedFile.name}</p>
              <p className="text-sm text-green-600">
                {(acceptedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          {onClear && !isLoading && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="text-green-600 hover:text-green-700 hover:bg-green-100"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
          {isLoading && (
            <Loader2 className="h-5 w-5 animate-spin text-green-600" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "cursor-pointer rounded-xl border-2 border-dashed p-8 transition-all",
        isDragActive && !isDragReject && "border-blue-400 bg-blue-50",
        isDragReject && "border-red-400 bg-red-50",
        !isDragActive && "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4 text-center">
        <div className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
          isDragActive && !isDragReject && "bg-blue-100",
          isDragReject && "bg-red-100",
          !isDragActive && "bg-gray-100"
        )}>
          <Upload className={cn(
            "h-7 w-7 transition-colors",
            isDragActive && !isDragReject && "text-blue-600",
            isDragReject && "text-red-600",
            !isDragActive && "text-gray-400"
          )} />
        </div>
        <div>
          <p className="text-lg font-medium text-gray-700">
            {isDragActive
              ? isDragReject
                ? 'Endast Excel-filer (.xlsx, .xls) tillåtna'
                : 'Släpp filen här...'
              : 'Dra och släpp din Excel-fil här'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            eller klicka för att bläddra
          </p>
        </div>
        <p className="text-xs text-gray-400">
          Stödjer .xlsx, .xls och .csv
        </p>
      </div>
    </div>
  )
}
