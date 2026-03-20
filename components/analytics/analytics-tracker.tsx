'use client'

import { useEffect } from 'react'

interface AnalyticsTrackerProps {
  businessId: string
  eventType?: 'profile_view' | 'whatsapp_click'
}

export function AnalyticsTracker({ businessId, eventType = 'profile_view' }: AnalyticsTrackerProps) {
  useEffect(() => {
    if (eventType === 'profile_view') {
      // Check sessionStorage to prevent duplicate tracking
      const storageKey = `viewed_${businessId}`
      const alreadyTracked = sessionStorage.getItem(storageKey)

      if (!alreadyTracked) {
        // Track the view
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, eventType: 'profile_view' })
        }).then(() => {
          // Mark as tracked for this session
          sessionStorage.setItem(storageKey, 'true')
        }).catch((error) => {
          console.error('Failed to track analytics:', error)
        })
      }
    }
  }, [businessId, eventType])

  return null // This component renders nothing
}

// Helper function for WhatsApp click tracking
export async function trackWhatsAppClick(businessId: string): Promise<void> {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, eventType: 'whatsapp_click' })
    })
  } catch (error) {
    console.error('Failed to track WhatsApp click:', error)
  }
}
