// lib/moderation/marketplace-keywords.ts

export const PROHIBITED_KEYWORDS = [
  // Drogas
  'cocaína', 'cocaine', 'heroína', 'heroin', 'marihuana', 'cannabis',
  'éxtasis', 'mdma', 'bazuco', 'pasta base', 'pepas', 'perico',
  // Armas
  'arma de fuego', 'pistola', 'revólver', 'revolver', 'granada',
  'explosivo', 'munición', 'municion', 'fusil', 'silenciador',
  // Bienes robados
  'robado', 'hurtado', 'sin papeles', 'raspado', 'recuperado',
  // Contenido explícito
  'prepago', 'acompañante sexual', 'escort', 'webcam adultos',
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip combining diacritic marks
    .replace(/(.)\1+/g, '$1')          // collapse repeated chars
}

export function checkProhibitedKeywords(text: string): string | null {
  const combined = normalize(text)
  for (const keyword of PROHIBITED_KEYWORDS) {
    const normalizedKeyword = normalize(keyword)
    const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const matched = normalizedKeyword.includes(' ')
      ? combined.includes(normalizedKeyword)                          // multi-word: substring match
      : new RegExp(`\\b${escaped}\\b`).test(combined)             // single word: whole-word match

    if (matched) return keyword
  }
  return null
}
