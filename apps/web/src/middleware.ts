import { auth } from "@/lib/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/signup") ||
    req.nextUrl.pathname.startsWith("/forgot-password") ||
    req.nextUrl.pathname.startsWith("/reset-password")
  const isLandingPage = req.nextUrl.pathname === "/"
  const isApiRoute = req.nextUrl.pathname.startsWith("/api")

  const isSharePage = req.nextUrl.pathname.startsWith("/share")
  const isPublicPage = req.nextUrl.pathname === "/download" ||
    req.nextUrl.pathname.startsWith("/docs") ||
    req.nextUrl.pathname === "/privacy" ||
    req.nextUrl.pathname === "/terms"

  // API routes always pass through
  if (isApiRoute) return

  // Share pages are public
  if (isSharePage) return

  // Public pages always pass through
  if (isPublicPage) return

  // Logged-in user on landing page → redirect to /dashboard (files)
  if (isLoggedIn && isLandingPage) {
    return Response.redirect(new URL("/dashboard", req.nextUrl))
  }

  // Logged-in user on auth pages → redirect to /dashboard
  if (isLoggedIn && isAuthPage) {
    return Response.redirect(new URL("/dashboard", req.nextUrl))
  }

  // Known app routes that require auth
  const appRoutes = ["/dashboard", "/chat", "/settings", "/timeline", "/files", "/search", "/trash"]
  const isAppRoute = appRoutes.some(r => req.nextUrl.pathname.startsWith(r))

  // /developers without auth → redirect to public docs
  if (!isLoggedIn && req.nextUrl.pathname.startsWith("/developers")) {
    return Response.redirect(new URL("/docs/quickstart", req.nextUrl))
  }

  // Landing page is public
  if (isLandingPage || isAuthPage) return

  // Only redirect to login for known app routes
  if (!isLoggedIn && isAppRoute) {
    const loginUrl = new URL("/login", req.nextUrl)
    loginUrl.searchParams.set("returnUrl", req.nextUrl.pathname)
    return Response.redirect(loginUrl)
  }

  // Unknown routes: let Next.js handle (will show 404)
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|screenshots|share|privacy|terms).*)"],
}
