import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session'

const ADMIN_LOGIN = '/admin/login'
const DSA_LOGIN = '/login'

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null

  // The admin area has its own login, entirely separate from the DSA one.
  if (pathname.startsWith('/admin')) {
    if (pathname === ADMIN_LOGIN) {
      if (session?.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
      return NextResponse.next()
    }

    if (session?.role !== 'ADMIN') {
      const login = new URL(ADMIN_LOGIN, request.url)
      // Preserve where they were headed so login can return them there.
      if (pathname !== '/admin') login.searchParams.set('next', `${pathname}${search}`)
      return NextResponse.redirect(login)
    }
  }

  if (pathname.startsWith('/dsa')) {
    if (session?.role !== 'DSA') {
      // The page guard re-checks approval status against the database; the
      // cookie alone only proves the session is a DSA session.
      return NextResponse.redirect(new URL(DSA_LOGIN, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/dsa/:path*'],
}
