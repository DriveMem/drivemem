import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // 对非静态资源的响应，移除 s-maxage，防止 CDN 缓存旧 HTML
  if (!request.nextUrl.pathname.startsWith('/_next/static')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.delete('CDN-Cache-Control')
    response.headers.delete('Cloudflare-CDN-Cache-Control')
  }
  
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
