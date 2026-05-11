import { normalizeColombianPhone } from '@/lib/twilio'

describe('normalizeColombianPhone', () => {
  it('adds +57 prefix to 10-digit Colombian mobile number', () => {
    expect(normalizeColombianPhone('3001234567')).toBe('+573001234567')
  })

  it('adds + to number already containing 57 country code', () => {
    expect(normalizeColombianPhone('573001234567')).toBe('+573001234567')
  })

  it('returns already-normalized E.164 number unchanged', () => {
    expect(normalizeColombianPhone('+573001234567')).toBe('+573001234567')
  })

  it('strips non-digit chars before normalizing', () => {
    expect(normalizeColombianPhone('(300) 123-4567')).toBe('+573001234567')
  })

  it('handles number stored with spaces', () => {
    expect(normalizeColombianPhone('300 123 4567')).toBe('+573001234567')
  })
})
