import { auth } from "@/lib/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password")
  const isPublicPage = pathname === "/"
  const isApiRoute = pathname.startsWith("/api")

  if (isApiRoute) return

  // Public landing page: logged-in users go to /files
  if (isPublicPage && isLoggedIn) {
    return Response.redirect(new URL("/files", req.nextUrl))
  }

  // Auth pages: logged-in users go to /files
  if (isAuthPage && isLoggedIn) {
    return Response.redirect(new URL("/files", req.nextUrl))
  }

  // Protected pages: not logged in → /login
  if (!isLoggedIn && !isAuthPage && !isPublicPage) {
    return Response.redirect(new URL("/login", req.nextUrl))
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
