export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">AI Drive</h1>
          <p className="mt-2 text-sm text-muted-foreground">让 AI 记住你的一切</p>
        </div>
        {children}
      </div>
    </div>
  )
}
