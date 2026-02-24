'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Phone } from 'lucide-react'

const COUNTRY_PREFIXES = [
  { code: '+57', country: 'CO', flag: '🇨🇴', label: 'Colombia' },
  { code: '+58', country: 'VE', flag: '🇻🇪', label: 'Venezuela' },
  { code: '+593', country: 'EC', flag: '🇪🇨', label: 'Ecuador' },
  { code: '+51', country: 'PE', flag: '🇵🇪', label: 'Peru' },
  { code: '+1', country: 'US', flag: '🇺🇸', label: 'Estados Unidos' },
]

type PhoneInputProps = {
  value: string
  onChange: (fullNumber: string) => void
  placeholder?: string
  error?: string
  className?: string
}

export function PhoneInput({ value, onChange, placeholder = '300 123 4567', error, className }: PhoneInputProps) {
  // Parse prefix and local number from full value
  const parseValue = useCallback((val: string) => {
    for (const p of COUNTRY_PREFIXES) {
      const code = p.code.replace('+', '')
      if (val.startsWith(code)) {
        return { prefix: p.code, local: val.slice(code.length) }
      }
    }
    return { prefix: '+57', local: val }
  }, [])

  const parsed = parseValue(value)
  const [prefix, setPrefix] = useState(parsed.prefix)
  const [localNumber, setLocalNumber] = useState(parsed.local)
  const [showDropdown, setShowDropdown] = useState(false)

  const selectedCountry = COUNTRY_PREFIXES.find(p => p.code === prefix) ?? COUNTRY_PREFIXES[0]

  function handleLocalChange(raw: string) {
    const digits = raw.replace(/\D/g, '')
    setLocalNumber(digits)
    onChange(prefix.replace('+', '') + digits)
  }

  function handlePrefixChange(newPrefix: string) {
    setPrefix(newPrefix)
    setShowDropdown(false)
    onChange(newPrefix.replace('+', '') + localNumber)
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
        {/* Prefix selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 h-full px-3 border-r-2 border-black bg-black/5 hover:bg-black/10 transition-colors font-bold text-sm min-w-[90px]"
          >
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="font-black">{selectedCountry.code}</span>
            <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[180px]">
              {COUNTRY_PREFIXES.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => handlePrefixChange(p.code)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-left text-sm font-bold hover:bg-secondary/50 transition-colors',
                    p.code === prefix && 'bg-primary/10'
                  )}
                >
                  <span className="text-lg">{p.flag}</span>
                  <span className="font-black">{p.code}</span>
                  <span className="text-black/50 text-xs uppercase tracking-wider ml-auto">{p.label}</span>
                </button>
              ))}
            </div>
          )}
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
