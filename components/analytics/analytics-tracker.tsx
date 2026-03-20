'use client'

import { useEffect } from 'react'

interface AnalyticsTrackerProps {
  businessId: string
  eventType?: 'profile_view' | 'whatsapp_click'
}

export function AnalyticsTracker({ businessId, eventType = 'profile_view' }: AnalyticsTrackerProps) {
  useEffect(() => {
    if (eventType === 'profile_view') {
      try {
        // Check sessionStorage to prevent duplicate tracking
        const storageKey = `viewed_${businessId}`
        const alreadyTracked = sessionStorage.getItem(storageKey)

        if (!alreadyTracked) {
          // Track the view
          fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ businessId, eventType: 'profile_view' })
          }).then((response) => {
            if (response.ok) {
              // Mark as tracked for this session only on success
              sessionStorage.setItem(storageKey, 'true')
            } else {
              console.warn('Analytics tracking failed with status:', response.status)
            }
          }).catch((error) => {
            console.error('Failed to track analytics:', error)
          })
        }
      } catch (storageError) {
        // sessionStorage not available (SSR/incognito mode)
        console.debug('sessionStorage unavailable, tracking anyway:', storageError)

        // Track without deduplication if sessionStorage fails
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, eventType: 'profile_view' })
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
