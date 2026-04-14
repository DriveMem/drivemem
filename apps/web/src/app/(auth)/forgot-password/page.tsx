"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm text-center">
      <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="mb-4 text-xl font-semibold">Forgot password</h2>
      <p className="text-sm text-muted-foreground mb-6">
        MVP phase does not support self-service password reset.
        <br />
        Please contact the support team for help.
      </p>
      <Link href="/login">
        <Button variant="outline" className="w-full">Back to sign in</Button>
      </Link>
    </div>
  )
}
