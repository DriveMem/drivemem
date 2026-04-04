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

  // API routes always pass through
  if (isApiRoute) return

  // Share pages are public
  if (isSharePage) return

  // Logged-in user on landing page → redirect to /dashboard (files)
  if (isLoggedIn && isLandingPage) {
    return Response.redirect(new URL("/dashboard", req.nextUrl))
  }

  // Logged-in user on auth pages → redirect to /dashboard
  if (isLoggedIn && isAuthPage) {
    return Response.redirect(new URL("/dashboard", req.nextUrl))
  }

  // Landing page is public
  if (isLandingPage || isAuthPage) return

  // Everything else requires auth
  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl))
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|screenshots|share|privacy|terms).*)"],
}
