import { checkContent } from '@/lib/moderation/keywords'

describe('checkContent', () => {
  it('returns clean for normal content', () => {
    const result = checkContent('Vendo bicicleta usada', 'En buen estado, precio negociable')
    expect(result.flagged).toBe(false)
    expect(result.matches).toHaveLength(0)
  })

  it('detects a single profanity term (soft flag)', () => {
    const result = checkContent('Trabajo disponible', 'puta oferta de trabajo')
    expect(result.flagged).toBe(true)
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0]).toBe('puta')
  })

  it('detects multiple terms', () => {
    const result = checkContent('mierda de producto', 'vendedor imbecil')
    expect(result.flagged).toBe(true)
    expect(result.matches.length).toBeGreaterThanOrEqual(2)
  })

  it('normalizes accents before matching', () => {
    const result = checkContent('Título normal', 'esto es una pútá locura')
    expect(result.flagged).toBe(true)
    expect(result.matches).toContain('puta')
  })

  it('normalizes repeated characters before matching', () => {
    const result = checkContent('Título', 'mieeerdaaaa de servicio')
    expect(result.flagged).toBe(true)
    expect(result.matches).toContain('mierda')
  })

  it('does not flag partial word matches', () => {
    // "canal" contains "anal" — should NOT flag if only whole-word matching
    const result = checkContent('Canal de WhatsApp', 'Únete al canal de noticias')
    expect(result.flagged).toBe(false)
  })

  it('detects multi-word spam phrases', () => {
    const result = checkContent('Trabaja desde casa', 'Gana dinero desde tu hogar')
    expect(result.flagged).toBe(true)
  })

  it('does not return duplicate matches', () => {
    const result = checkContent('puta puta puta', 'mierda de servicio')
    const uniqueMatches = new Set(result.matches)
    expect(uniqueMatches.size).toBe(result.matches.length)
  })
})
