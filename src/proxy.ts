import { NextResponse, type NextRequest } from 'next/server'
import { installationStatus } from '@/lib/installation/status'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (pathname === '/setup' || pathname === '/api/setup' || pathname === '/maintenance') return NextResponse.next()
  let status
  try { status = await installationStatus() }
  catch { status = 'DATABASE_UNAVAILABLE' }
  if (status === 'INSTALLED') return NextResponse.next()
  if (status === 'DATABASE_UNAVAILABLE') {
    return NextResponse.rewrite(new URL('/maintenance', request.url), { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } })
  }
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'setup.required' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.redirect(new URL('/setup', request.url), { headers: { 'Cache-Control': 'no-store' } })
}
export const config = { matcher: ['/((?!_next/|favicon.ico|icon.png).*)'] }
