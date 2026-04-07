export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#4F5BD5] via-[#3D49C4] to-[#2E38A8] relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        {/* Gradient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <h1 className="text-5xl font-bold text-white mb-3">AI Drive</h1>
          <p className="text-lg text-white/70 mb-12">让 AI 记住你的一切</p>

          <div className="space-y-6 max-w-sm">
            <div className="flex items-start gap-4">
              <span className="text-2xl">🧠</span>
              <div>
                <p className="text-white font-medium">智能理解</p>
                <p className="text-sm text-white/60">AI 自动解析你的文件内容</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-2xl">💬</span>
              <div>
                <p className="text-white font-medium">随时对话</p>
                <p className="text-sm text-white/60">用自然语言和你的文件对话</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="text-white font-medium">数据安全</p>
                <p className="text-sm text-white/60">你的文件只属于你</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
