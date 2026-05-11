// lib/moderation/marketplace-keywords.ts

export const PROHIBITED_KEYWORDS = [
  // Drogas
  'cocaína', 'cocaine', 'heroína', 'heroin', 'marihuana', 'cannabis',
  'éxtasis', 'mdma', 'bazuco', 'pasta base', 'pepas', 'perico',
  // Armas
  'arma de fuego', 'pistola', 'revólver', 'revolver', 'granada',
  'explosivo', 'munición', 'municion', 'cargador', 'fusil', 'silenciador',
  // Bienes robados
  'robado', 'hurtado', 'sin papeles', 'raspado', 'recuperado',
  // Contenido explícito
  'prepago', 'acompañante sexual', 'escort', 'webcam adultos',
]

export function checkProhibitedKeywords(text: string): string | null {
  const lower = text.toLowerCase()
  for (const keyword of PROHIBITED_KEYWORDS) {
    if (lower.includes(keyword)) return keyword
  }
  return null
}
