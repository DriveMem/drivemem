import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
// import Google from "next-auth/providers/google"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const API_BASE = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = loginSchema.parse(credentials)

        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })

        if (!res.ok) return null

        const user = await res.json()
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          accessToken: user.token, // plain JWT from backend (方案 C)
        }
      },
    }),
    // Google({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // Store the plain JWT from backend (方案 C)
        if ((user as any).accessToken) {
          token.accessToken = (user as any).accessToken
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      // Expose accessToken to client for API calls (方案 C)
      ;(session as any).accessToken = token.accessToken as string | undefined
      return session
    },
  },
})
