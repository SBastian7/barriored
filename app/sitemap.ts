import { createClient } from '@/lib/supabase/server'

export default async function sitemap() {
  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://barriored.co'

  const { data: communities } = await supabase
    .from('communities').select('slug').eq('is_active', true) as { data: any }

  const { data: businesses } = await supabase
    .from('businesses').select('slug, community_id, updated_at, communities(slug)')
    .eq('status', 'approved') as { data: any }

  const communityUrls = (communities ?? []).map((c: any) => ({
    url: `${siteUrl}/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const businessUrls = (businesses ?? []).map((b: any) => ({
    url: `${siteUrl}/${(b.communities as any)?.slug}/business/${b.slug}`,
    lastModified: b.updated_at ? new Date(b.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    ...communityUrls,
    ...businessUrls,
  ]
}
