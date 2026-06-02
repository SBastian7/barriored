export type CategoryStyle = {
  bg: string
  text: string
  hex: string
  textHex: string
}

const SLUG_MAP: Record<string, CategoryStyle> = {
  tiendas:      { bg: 'bg-[#FBBF24]', text: 'text-black',  hex: '#FBBF24', textHex: '#0A0A0A' },
  restaurantes: { bg: 'bg-[#E11D48]', text: 'text-white',  hex: '#E11D48', textHex: '#ffffff' },
  belleza:      { bg: 'bg-[#EC4899]', text: 'text-white',  hex: '#EC4899', textHex: '#ffffff' },
  servicios:    { bg: 'bg-[#2563EB]', text: 'text-white',  hex: '#2563EB', textHex: '#ffffff' },
  salud:        { bg: 'bg-[#16A34A]', text: 'text-white',  hex: '#16A34A', textHex: '#ffffff' },
  tecnologia:   { bg: 'bg-[#0A0A0A]', text: 'text-white',  hex: '#0A0A0A', textHex: '#ffffff' },
  educacion:    { bg: 'bg-[#F97316]', text: 'text-white',  hex: '#F97316', textHex: '#ffffff' },
  talleres:     { bg: 'bg-[#F5E6CB]', text: 'text-black',  hex: '#F5E6CB', textHex: '#0A0A0A' },
  mascotas:     { bg: 'bg-[#84CC16]', text: 'text-black',  hex: '#84CC16', textHex: '#0A0A0A' },
  otros:        { bg: 'bg-white',     text: 'text-black',  hex: '#ffffff', textHex: '#0A0A0A' },
}

const FALLBACK: CategoryStyle[] = [
  { bg: 'bg-[#FBBF24]', text: 'text-black',  hex: '#FBBF24', textHex: '#0A0A0A' },
  { bg: 'bg-[#2563EB]', text: 'text-white',  hex: '#2563EB', textHex: '#ffffff' },
  { bg: 'bg-[#16A34A]', text: 'text-white',  hex: '#16A34A', textHex: '#ffffff' },
  { bg: 'bg-[#F97316]', text: 'text-white',  hex: '#F97316', textHex: '#ffffff' },
  { bg: 'bg-[#EC4899]', text: 'text-white',  hex: '#EC4899', textHex: '#ffffff' },
]

export function getCategoryStyle(slug: string, fallbackIndex = 0): CategoryStyle {
  return SLUG_MAP[slug] ?? FALLBACK[fallbackIndex % FALLBACK.length]
}
