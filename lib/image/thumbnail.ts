/**
 * Returns the thumbnail variant of a Supabase Storage image URL.
 * Only transforms URLs ending in `.webp` (new uploads with Sharp optimization).
 * Falls back to the original URL for older images.
 */
export function getThumbUrl(url: string): string {
  if (url.endsWith('.webp')) {
    return url.slice(0, -5) + '-thumb.webp'
  }
  return url
}
