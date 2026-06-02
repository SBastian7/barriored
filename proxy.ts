import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/dashboard', '/admin', '/profile']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through static/API routes immediately — no auth needed
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/sw.js') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json'
  ) {
    return NextResponse.next()
  }

  // Auth routes: redirect already-logged-in users away
  if (pathname.startsWith('/auth')) {
    const { supabase, response } = await createMiddlewareClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('community_id, communities(slug)')
        .eq('id', user.id)
        .single()

      const communitySlug = (profile?.communities as any)?.slug
      return NextResponse.redirect(
        new URL(communitySlug ? `/${communitySlug}` : '/', request.url)
      )
    }
    return response
  }

  // Protected routes: require authentication
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const { supabase, response } = await createMiddlewareClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('returnUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Admin guard: allow super admins, admins, and moderators
    if (pathname.startsWith('/admin')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_super_admin')
        .eq('id', user.id)
        .single()

      const allowed =
        profile?.is_super_admin ||
        profile?.role === 'admin' ||
        profile?.role === 'moderator'

      if (!allowed) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    return response
  }

  // All other routes (root, community pages) — pass through without auth calls
  return NextResponse.next()
}

async function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { supabase, response }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
