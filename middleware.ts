import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/api', '/_next', '/favicon.ico', '/manifest.json', '/sw.js']
const PROTECTED_ROUTES = ['/dashboard', '/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle Auth routes (Login/Signup)
  if (pathname.startsWith('/auth')) {
    const { supabase, response } = await createMiddlewareClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // If user is already logged in, redirect to their community or home
      const { data: profile } = await supabase
        .from('profiles')
        .select('community_id, communities(slug)')
        .eq('id', user.id)
        .single()

      const communitySlug = (profile?.communities as any)?.slug
      if (communitySlug) {
        return NextResponse.redirect(new URL(`/${communitySlug}`, request.url))
      }
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // Skip other public/static routes
  if (['/api', '/_next', '/favicon.ico', '/manifest.json', '/sw.js'].some((route) => pathname.startsWith(route))) {
    return updateSession(request)
  }

  // Auth guard for protected routes
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const { supabase, response } = await createMiddlewareClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('returnUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Admin guard
    if (pathname.startsWith('/admin')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    return response
  }

  // Community resolution: /[community]/*
  // Landing page (root /) passes through
  if (pathname === '/') {
    return updateSession(request)
  }

  // Extract community slug from first path segment
  const segments = pathname.split('/').filter(Boolean)
  const communitySlug = segments[0]

  if (communitySlug) {
    const { supabase, response } = await createMiddlewareClient(request)
    const { data: community } = await supabase
      .from('communities')
      .select('id, slug, is_active')
      .eq('slug', communitySlug)
      .eq('is_active', true)
      .single()

    if (!community) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Inject community ID in header for downstream consumption
    response.headers.set('x-community-id', community.id)
    response.headers.set('x-community-slug', community.slug)
    return response
  }

  return updateSession(request)
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

async function updateSession(request: NextRequest) {
  const { response } = await createMiddlewareClient(request)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
