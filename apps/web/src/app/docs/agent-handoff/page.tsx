"use client"

import { useState, useCallback } from "react"

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])
  return (
    <button
      onClick={copy}
      className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-xs font-medium transition-all
        bg-gray-700/60 hover:bg-gray-600 text-gray-300 hover:text-white backdrop-blur-sm"
      aria-label="Copy code"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  )
}

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <div className="relative group rounded-xl overflow-hidden bg-gray-950 border border-gray-800/60 mb-4">
      <CopyButton text={code} />
      <pre className="p-5 pr-20 overflow-x-auto text-sm leading-relaxed">
        <code className={`language-${lang} text-gray-100`}>{code}</code>
      </pre>
    </div>
  )
}

export default function AgentHandoffPage() {
  return (
    <div className="px-6 sm:px-8 py-8 sm:py-12 max-w-4xl">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
        Agent Handoff
      </h1>
      <p className="text-gray-600 leading-relaxed mb-4">
        Handoff 让你通过 AI 工具（Cursor、Claude、ChatGPT 等）把工作上下文完整传递给团队成员。接收方的 AI 瞬间获得你的完整工作理解。
      </p>

      {/* 发起 Handoff */}
      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">发起 Handoff</h2>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">方式 1：通过 AI 工具（MCP）</h3>
      <p className="text-gray-600 leading-relaxed mb-4">
        在你的 AI 工具中，对 agent 说：
      </p>
      <blockquote className="border-l-4 border-brand-200 pl-4 text-gray-600 italic mb-4">
        &quot;把这个任务传给张三，包括我做的决策和后续步骤&quot;
      </blockquote>
      <p className="text-gray-600 leading-relaxed mb-4">
        Agent 调用 <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">handoff_send</code> tool，DriveMem 自动打包你的工作上下文。
      </p>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">方式 2：通过 CLI</h3>
      <CodeBlock code={`drivemem handoff send \\
  --to alice@example.com \\
  --workspace <workspace-id> \\
  --task "完成定价方案设计" \\
  --next-steps "工程拆解,计费系统实现" \\
  --key-facts "Free/$9.9 Pro/$19 Team"`} />

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">方式 3：通过 SDK</h3>
      <CodeBlock lang="typescript" code={`await client.handoff.send({
  to_user_email: 'alice@example.com',
  workspace_id: 'ws_xxx',
  task: '完成定价方案设计',
  next_steps: ['工程拆解', '计费系统实现'],
  decisions: [{ decision: '三档定价', reason: '参考竞品 Notion/Mem.ai' }],
  key_facts: ['Free/$9.9 Pro/$19 Team']
});`} />

      {/* 智能完整性校验 */}
      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">智能完整性校验</h2>
      <p className="text-gray-600 leading-relaxed mb-4">
        DriveMem 不是简单转发。发送时系统自动评估：
      </p>
      <ul className="space-y-2 text-gray-600 list-disc list-inside mb-4">
        <li>任务目标是否清晰？</li>
        <li>后续步骤是否可执行？</li>
        <li>关键决策是否记录？</li>
      </ul>
      <p className="text-gray-600 leading-relaxed mb-4">
        <strong>信息不够？</strong> 系统自动向你的 agent 要求补充（最多 3 轮）。
      </p>

      {/* 接收 Handoff */}
      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">接收 Handoff</h2>
      <p className="text-gray-600 leading-relaxed mb-4">
        接收方的 agent 会在对话中通知：
      </p>
      <blockquote className="border-l-4 border-brand-200 pl-4 text-gray-600 italic mb-4">
        &quot;你的同事 [张三] 传递了工作给你。<br />
        <strong>任务</strong>：完成定价方案设计<br />
        <strong>核心决策</strong>：三档定价（Free/$9.9/$19）<br />
        <strong>后续要做</strong>：工程拆解 + 计费系统实现&quot;
      </blockquote>

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">接受</h3>
      <CodeBlock code="drivemem handoff accept <handoff_id>" />

      <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">要求补充</h3>
      <p className="text-gray-600 leading-relaxed mb-4">如果信息不够：</p>
      <CodeBlock code={`drivemem handoff request-more <handoff_id> \\
  --questions "竞品分析数据在哪？,免费额度上限是多少？"`} />
      <p className="text-gray-600 leading-relaxed mb-4">发送方会收到通知并补充。</p>

      {/* 状态流转 */}
      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">状态流转</h2>
      <CodeBlock code="draft → sent → received → request_more → supplementing → accepted" lang="text" />

      {/* MCP Tool Schema */}
      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">MCP Tool Schema</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Tool</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">说明</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-5 py-3 font-mono text-xs text-gray-700">handoff_send</td><td className="px-5 py-3 text-gray-600">发起交接（task + next_steps + context）</td></tr>
            <tr><td className="px-5 py-3 font-mono text-xs text-gray-700">handoff_accept</td><td className="px-5 py-3 text-gray-600">确认接收</td></tr>
            <tr><td className="px-5 py-3 font-mono text-xs text-gray-700">handoff_request_more</td><td className="px-5 py-3 text-gray-600">要求补充（附带具体问题）</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
