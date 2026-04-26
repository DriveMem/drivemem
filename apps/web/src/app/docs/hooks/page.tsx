export const metadata = {
  title: "Claude Code Hooks — DriveMem Docs",
  description: "Automatically capture knowledge from every Claude Code session with DriveMem hooks.",
}

export default function HooksPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Claude Code Hooks</h1>
      <p className="mt-3 text-lg text-gray-600">
        Automatically capture knowledge from every Claude Code session — no manual steps needed.
      </p>

      {/* How it works */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-gray-900">How it works</h2>
        <p className="mt-2 text-gray-600">
          Claude Code supports <strong>lifecycle hooks</strong> — scripts that run automatically at key moments.
          DriveMem uses the <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">SessionEnd</code> hook
          to harvest your session transcript every time a Claude Code session finishes.
        </p>
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-700 space-y-2">
          <p>1. You finish a Claude Code session (or it times out)</p>
          <p>2. Claude Code triggers the <code className="bg-gray-100 px-1 py-0.5 rounded">SessionEnd</code> hook</p>
          <p>3. DriveMem reads the session transcript (last ~10K chars)</p>
          <p>4. The knowledge is stored in your DriveMem knowledge base</p>
          <p>5. Next time any AI tool asks DriveMem, it can recall this context</p>
        </div>
      </section>

      {/* Quick setup */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-gray-900">Quick Setup</h2>
        <p className="mt-2 text-gray-600">
          One command — that&apos;s it. Make sure you&apos;ve already run{" "}
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">npx drivemem setup</code> first.
        </p>
        <pre className="mt-4 bg-gray-900 text-gray-100 rounded-xl p-4 text-sm overflow-x-auto">
          <code>npx drivemem setup claude-code</code>
        </pre>
        <p className="mt-3 text-sm text-gray-500">
          This adds a <code className="bg-gray-100 px-1 py-0.5 rounded">SessionEnd</code> hook to{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded">~/.claude/settings.json</code>.
        </p>
      </section>

      {/* Manual setup */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-gray-900">Manual Configuration</h2>
        <p className="mt-2 text-gray-600">
          If you prefer to configure manually, add the following to{" "}
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">~/.claude/settings.json</code>:
        </p>
        <pre className="mt-4 bg-gray-900 text-gray-100 rounded-xl p-4 text-sm overflow-x-auto">
          <code>{`{
  "hooks": {
    "SessionEnd": [
      {
        "type": "command",
        "command": "npx -y drivemem hook-session-end"
      }
    ]
  }
}`}</code>
        </pre>
        <p className="mt-3 text-sm text-gray-500">
          Make sure <code className="bg-gray-100 px-1 py-0.5 rounded">DRIVEMEM_API_KEY</code> is set in your
          environment, or that you&apos;ve already configured DriveMem via{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded">npx drivemem setup</code>.
        </p>
      </section>

      {/* Key properties */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-gray-900">Design Principles</h2>
        <ul className="mt-3 space-y-2 text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">⚡</span>
            <span><strong>Fast</strong> — executes in under 2 seconds, never blocks Claude Code</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">🔇</span>
            <span><strong>Silent</strong> — all errors are handled gracefully (exit 0), your workflow is never interrupted</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">🔑</span>
            <span><strong>Auto-detect</strong> — finds your API key from environment, Cursor config, or Claude Desktop config</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">📦</span>
            <span><strong>Lightweight</strong> — captures only the last ~10K characters of the transcript</span>
          </li>
        </ul>
      </section>

      {/* Uninstall */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-gray-900">Removing the Hook</h2>
        <p className="mt-2 text-gray-600">
          Edit <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">~/.claude/settings.json</code> and
          remove the DriveMem entry from <code className="bg-gray-100 px-1 py-0.5 rounded">hooks.SessionEnd</code>.
        </p>
      </section>
    </div>
  )
}
