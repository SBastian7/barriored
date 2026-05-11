const BLOCKED_WORDS: string[] = [
  // Colombian Spanish profanity
  'puta', 'puto', 'mierda', 'hijueputa', 'verga', 'culo', 'pendejo', 'pendeja',
  'marica', 'gonorrea', 'malparido', 'malparida', 'maldito', 'maldita', 'carajo',
  'coño', 'joder', 'cabron', 'cabrona', 'idiota', 'imbecil', 'estupido', 'estupida',
  'animal', 'bestia', 'zorra', 'hp', 'ptm', 'verraco', 'maricada', 'chinga',
  'chingada', 'putada', 'mamarracho', 'huevon', 'huevona', 'capullo', 'gilipollas',
  'polla', 'pajero', 'pajera', 'boludo', 'boluda', 'pelotudo', 'pelotuda',
  'sorete', 'culero', 'culera', 'maricon', 'pinga', 'gonorrhea',
  // Spam phrases (multi-word must come before single-word to avoid double-matching)
  'gana dinero rapido', 'gana dinero', 'trabaja desde casa', 'inversion segura',
  'gratis garantizado', 'ganar dinero', 'ingresos pasivos', 'multinivel',
  'click aqui', 'haz clic aqui', 'oferta limitada',
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip combining diacritic marks
    .replace(/(.)\1+/g, '$1')          // collapse repeated chars (puuuta → puta, mieeerdaaaa → mierda)
}

export function checkContent(
  title: string,
  content: string
): { flagged: boolean; matches: string[] } {
  const combined = normalize(`${title} ${content}`)
  const matches: string[] = []

  for (const word of BLOCKED_WORDS) {
    if (matches.includes(word)) continue
    const normalizedWord = normalize(word)
    const escaped = normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const matched = normalizedWord.includes(' ')
      ? combined.includes(normalizedWord)                          // multi-word: substring match
      : new RegExp(`\\b${escaped}\\b`).test(combined)             // single word: whole-word match

    if (matched) matches.push(word)
  }

  return { flagged: matches.length > 0, matches }
}
