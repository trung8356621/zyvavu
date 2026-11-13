import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Forward per-request `preview_theme` query to a request header so layout/template
 * resolvers can scope Customizer iframe previews without a shared cookie that
 * would leak into other tabs or the normal public frontend.
 */
export function middleware(request: NextRequest) {
  const preview = request.nextUrl.searchParams.get('preview_theme')
  if (!preview) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-zyvavu-preview-theme', preview)
  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    /*
     * Public/frontend routes only. Admin chrome and APIs stay untouched.
     */
    '/((?!admin|api|_next/static|_next/image|favicon.ico|pattern-preview).*)',
  ],
}
