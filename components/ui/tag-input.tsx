'use client'

import { useState, KeyboardEvent } from 'react'
import { X, Plus } from 'lucide-react'
import { Badge } from './badge'
import { Input } from './input'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
  variant?: 'default' | 'success' | 'destructive'
}

export function TagInput({
  value,
  onChange,
  placeholder = 'Skriv och tryck Enter...',
  className,
  variant = 'default'
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toUpperCase()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInputValue('')
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag if input is empty and backspace is pressed
      removeTag(value[value.length - 1])
    } else if (e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    // Split by comma, newline, or semicolon
    const tags = pasted.split(/[,;\n]/).map(s => s.trim().toUpperCase()).filter(Boolean)
    const newTags = tags.filter(tag => !value.includes(tag))
    if (newTags.length > 0) {
      onChange([...value, ...newTags])
    }
  }

  const badgeVariant = variant === 'success'
    ? 'default'
    : variant === 'destructive'
    ? 'destructive'
    : 'secondary'

  const badgeClassName = variant === 'success'
    ? 'bg-green-100 text-green-800 hover:bg-green-200'
    : variant === 'destructive'
    ? 'bg-red-100 text-red-800 hover:bg-red-200'
    : ''

  return (
    <div className={cn('space-y-2', className)}>
      {/* Tags display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge
              key={tag}
              variant={badgeVariant}
              className={cn('gap-1 pr-1 text-sm', badgeClassName)}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input for new tags */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => addTag(inputValue)}
          disabled={!inputValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
