"use client"

export default function TeamWorkspacePage() {
  return (
    <div className="px-6 sm:px-8 py-8 sm:py-12 max-w-4xl">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
        Team Workspace
      </h1>
      <p className="text-gray-600 leading-relaxed mb-4">
        Create shared knowledge spaces for your team. Each workspace has its own isolated knowledge base, member management, and permissions.
      </p>

      {/* 创建团队空间 */}
      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">创建团队空间</h2>
      <ol className="space-y-2 text-gray-600 list-decimal list-inside">
        <li>打开 DriveMem，点击侧边栏顶部的 Workspace Switcher</li>
        <li>点击 &quot;Create Workspace&quot;</li>
        <li>输入团队名称和描述</li>
        <li>点击创建 — 你自动成为 Owner</li>
      </ol>

      {/* 邀请成员 */}
      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">邀请成员</h2>
      <ol className="space-y-2 text-gray-600 list-decimal list-inside">
        <li>进入 Workspace → Members 页面（侧边栏 Settings → Members）</li>
        <li>输入成员邮箱</li>
        <li>选择角色：Admin / Member / Viewer</li>
        <li>点击邀请 — 对方收到邮件后加入</li>
      </ol>

      {/* 权限说明 */}
      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">权限说明</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="text-left px-5 py-3 font-semibold text-gray-600">角色</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">能力</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-5 py-3 font-medium text-gray-900">Owner</td><td className="px-5 py-3 text-gray-600">所有权限 + 删除 Workspace</td></tr>
            <tr><td className="px-5 py-3 font-medium text-gray-900">Admin</td><td className="px-5 py-3 text-gray-600">邀请/移除成员 + 管理权限 + 上传知识</td></tr>
            <tr><td className="px-5 py-3 font-medium text-gray-900">Member</td><td className="px-5 py-3 text-gray-600">上传/编辑知识 + 搜索 + 发起 Handoff</td></tr>
            <tr><td className="px-5 py-3 font-medium text-gray-900">Viewer</td><td className="px-5 py-3 text-gray-600">只读（搜索/阅读知识 + 接收 Handoff）</td></tr>
          </tbody>
        </table>
      </div>

      {/* 切换 Workspace */}
      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">切换 Workspace</h2>
      <p className="text-gray-600 leading-relaxed mb-4">
        侧边栏顶部下拉菜单，点击切换。个人空间和团队空间并存。
      </p>

      {/* 知识隔离 */}
      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">知识隔离</h2>
      <p className="text-gray-600 leading-relaxed mb-4">
        每个 Workspace 的知识库完全独立。团队 A 的文件对团队 B 不可见。
      </p>
    </div>
  )
}
