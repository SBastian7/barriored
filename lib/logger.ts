type ErrorContext = {
  url?: string
  method?: string
  statusCode?: number
  [key: string]: unknown
}

export async function logError(error: unknown, context: ErrorContext = {}) {
  try {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined

    await fetch('/api/admin/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error_type: 'client',
        error_message: message,
        stack_trace: stack,
        request_url: context.url ?? (typeof window !== 'undefined' ? window.location.href : ''),
        request_method: context.method ?? 'GET',
        status_code: context.statusCode,
        browser: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }),
    })
  } catch {
    // Never let the logger throw
  }
}
