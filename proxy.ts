import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Route definitions
const publicRoutes = ['/login', '/register', '/auth/unauthorized', '/catalog']
const adminRoutes = ['/admin','/dashboard']
const cashierRoutes = ['/pos']
const customerRoutes = ['/catalog']

// export async function proxy(req: NextRequest) {
export default async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const path = req.nextUrl.pathname

  // Skip middleware for static files and API routes
  if (
    path.startsWith('/_next/') ||
    path.startsWith('/api/') ||
    path.startsWith('/favicon.ico') ||
    path.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return res
  }

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Check auth status
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Handle unauthenticated users
  if (!user) {
    // Allow access to public routes
    if (publicRoutes.some(route => path.startsWith(route)) || path === '/') {
      // Redirect root to catalog for unauthenticated users
      if (path === '/') {
        return NextResponse.redirect(new URL('/catalog', req.url))
      }
      return res
    }
    // Redirect to login for protected routes
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Get user role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'customer'

  // Check access based on role
  let hasAccess = false

  switch (userRole) {
    case 'admin':
      // Admin has access to everything
      hasAccess = true
      break
    case 'cashier':
      // Cashier can access pos, catalog, and public routes
      hasAccess =
        cashierRoutes.some(route => path.startsWith(route)) ||
        customerRoutes.some(route => path.startsWith(route)) ||
        publicRoutes.some(route => path.startsWith(route)) ||
        path === '/'
      break
    case 'customer':
      // Customer can only access customer routes and public routes
      hasAccess =
        customerRoutes.some(route => path.startsWith(route)) ||
        publicRoutes.some(route => path.startsWith(route)) ||
        path === '/'
      break
    default:
      hasAccess = false
  }

  // Redirect unauthorized access
  if (!hasAccess) {
    return NextResponse.redirect(new URL('/auth/unauthorized', req.url))
  }

  // Handle root path - redirect to appropriate dashboard
  if (path === '/') {
    switch (userRole) {
      case 'admin':
        return NextResponse.redirect(new URL('/dashboard', req.url))
      case 'cashier':
        return NextResponse.redirect(new URL('/pos', req.url))
      case 'customer':
      default:
        return NextResponse.redirect(new URL('/catalog', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
