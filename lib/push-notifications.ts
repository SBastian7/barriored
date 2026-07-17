export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Este navegador no soporta notificaciones')
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    throw new Error('Permisos de notificación denegados')
  }

  const permission = await Notification.requestPermission()
  return permission
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    if (!vapidPublicKey) {
      console.error('VAPID public key not configured in environment')
      throw new Error('VAPID public key not configured')
    }

    console.log('VAPID key found, length:', vapidPublicKey.length)
    console.log('Service Worker state:', registration.active?.state)

    // Check for existing subscription first
    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      console.log('Existing subscription found, unsubscribing first')
      await existingSubscription.unsubscribe()
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    })

    console.log('Push subscription successful')

    // Save subscription to backend
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    })

    if (!response.ok) {
      console.error('Failed to save subscription to backend:', await response.text())
    }

    return subscription
  } catch (error) {
    console.error('Failed to subscribe to push:', error)
    throw error
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      return true
    }

    return false
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error)
    return false
  }
}
