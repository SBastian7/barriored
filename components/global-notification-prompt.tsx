'use client'

import { usePathname } from 'next/navigation'
import { PushNotificationPrompt } from '@/components/community/push-notification-prompt'

export function GlobalNotificationPrompt() {
  const pathname = usePathname()

  // Don't show on auth pages
  const isAuthPage = pathname?.startsWith('/auth')

  if (isAuthPage) {
    return null
  }

  return <PushNotificationPrompt />
}
