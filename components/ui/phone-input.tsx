'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Phone } from 'lucide-react'

const PREFIX = '+57'

type PhoneInputProps = {
  value: string
  onChange: (fullNumber: string) => void
  placeholder?: string
  error?: string
  className?: string
}

export function PhoneInput({ value, onChange, placeholder = '300 123 4567', error, className }: PhoneInputProps) {
  // Parse local number from full value (handles both "57XXXXXXXXXX" and "+57XXXXXXXXXX")
  function parseLocal(val: string): string {
    if (!val) return ''
    if (val.startsWith(PREFIX)) return val.slice(PREFIX.length)
    const codeWithoutPlus = PREFIX.replace('+', '')
    if (val.startsWith(codeWithoutPlus)) return val.slice(codeWithoutPlus.length)
    return val
  }

  const [localNumber, setLocalNumber] = useState(() => parseLocal(value))

  // Sync when value prop changes (e.g., form restoration from sessionStorage)
  useEffect(() => {
    setLocalNumber(parseLocal(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleLocalChange(raw: string) {
    const digits = raw.replace(/\D/g, '')
    setLocalNumber(digits)
    // Emit without + sign for validation compatibility (57XXXXXXXXXX format)
    onChange(PREFIX.replace('+', '') + digits)
  }

  // Format display: 300 123 4567
  const displayNumber = localNumber.replace(/(\d{3})(\d{3})(\d{0,4})/, (_, a, b, c) => {
    let result = a
    if (b) result += ' ' + b
    if (c) result += ' ' + c
    return result
  })

  return (
    <div className={cn('space-y-1', className)}>
      <div className={cn(
        'flex border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all focus-within:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-within:translate-x-[-1px] focus-within:translate-y-[-1px]',
        error && 'border-red-500'
      )}>
        {/* Static Colombia prefix */}
        <div className="flex items-center gap-1.5 h-full px-3 border-r-2 border-black bg-black/5 font-bold text-sm min-w-22.5">
          <span className="text-lg">🇨🇴</span>
          <span className="font-black">+57</span>
        </div>

        {/* Phone number input */}
        <div className="flex items-center flex-1 gap-2 px-3">
          <Phone className="h-4 w-4 text-black/40 shrink-0" />
          <input
            type="tel"
            value={displayNumber}
            onChange={(e) => handleLocalChange(e.target.value)}
            placeholder={placeholder}
            className="w-full py-3 bg-transparent outline-none font-bold text-base tracking-wide placeholder:text-black/30 placeholder:font-normal"
            maxLength={14}
          />
        </div>
      </div>
      {error && (
        <p className="text-xs font-bold text-red-500 uppercase tracking-wider">{error}</p>
      )}
    </div>
  )
}
