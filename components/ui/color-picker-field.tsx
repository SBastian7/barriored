'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface ColorPickerFieldProps {
  label: string
  value: string
  onChange: (color: string) => void
  defaultColor?: string
}

export function ColorPickerField({
  label,
  value,
  onChange,
  defaultColor = '#1E40AF',
}: ColorPickerFieldProps) {
  const [hexInput, setHexInput] = useState(value || defaultColor)
  const [error, setError] = useState('')

  // Sync hex input with value prop
  useEffect(() => {
    setHexInput(value || defaultColor)
  }, [value, defaultColor])

  // Validate hex format
  const validateHex = (hex: string): boolean => {
    return /^#[0-9A-F]{6}$/i.test(hex)
  }

  // Handle color picker change
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value.toUpperCase()
    setHexInput(color)
    setError('')
    onChange(color)
  }

  // Handle hex input change
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let hex = e.target.value.toUpperCase()

    // Auto-add # if missing
    if (!hex.startsWith('#')) {
      hex = '#' + hex
    }

    setHexInput(hex)

    // Validate and update
    if (validateHex(hex)) {
      setError('')
      onChange(hex)
    } else if (hex.length === 7) {
      setError('Formato inválido (usa #RRGGBB)')
    }
  }

  // Handle blur - fallback to default if invalid
  const handleBlur = () => {
    if (!validateHex(hexInput)) {
      setHexInput(value || defaultColor)
      onChange(value || defaultColor)
      setError('')
    }
  }

  return (
    <div className="space-y-2">
      <Label className="uppercase tracking-widest font-bold text-xs">
        {label}
      </Label>

      <div className="flex items-center gap-4">
        {/* Native color picker */}
        <input
          type="color"
          value={hexInput}
          onChange={handleColorChange}
          className="h-12 w-12 border-2 border-black rounded-md cursor-pointer"
        />

        {/* Hex input */}
        <Input
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          onBlur={handleBlur}
          placeholder="#1E40AF"
          className="brutalist-input w-[120px] uppercase"
          maxLength={7}
        />

        {/* Preview swatch */}
        <div
          className="h-12 w-12 border-2 border-black rounded-md"
          style={{ backgroundColor: validateHex(hexInput) ? hexInput : defaultColor }}
        />
      </div>

      {error && (
        <p className="text-xs font-bold text-red-500 uppercase tracking-wider">
          {error}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Formato hexadecimal (ej: #1E40AF)
      </p>
    </div>
  )
}
