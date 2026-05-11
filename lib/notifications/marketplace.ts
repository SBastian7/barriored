import { createAdminClient } from '@/lib/supabase/admin'
import { sendClassifiedSoldEmail } from '@/lib/email/resend'
import { sendPushToUsers } from '@/lib/notifications/community'

export async function notifyClassifiedSold(
  classifiedId: string,
  sellerId: string
): Promise<void> {
  const admin = createAdminClient()

  // Fetch classified title + community slug
  const { data: classified } = await (admin as any)
    .from('classifieds')
    .select('title, communities!inner(slug)')
    .eq('id', classifiedId)
    .single()

  if (!classified) return

  const title = classified.title as string
  const slug = (classified.communities as any).slug as string

  // Send email
  try {
    const { data: userData } = await admin.auth.admin.getUserById(sellerId)
    const email = userData?.user?.email
    if (email) {
      await sendClassifiedSoldEmail(email, title, slug)
    }
  } catch (err) {
    console.error(`[marketplace] sold email failed for ${classifiedId}:`, err)
  }

  // Send push notification
  try {
    await sendPushToUsers([sellerId], {
      title: `¡Vendido! ${title}`,
      body: 'Tu clasificado fue marcado como vendido. ¡Felicitaciones!',
      url: `https://barriored.co/${slug}/marketplace`,
    })
  } catch (err) {
    console.error(`[marketplace] sold push failed for ${classifiedId}:`, err)
  }
}
