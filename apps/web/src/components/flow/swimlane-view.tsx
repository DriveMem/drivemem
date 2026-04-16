"use client"
import { useEffect, useRef, useState, useMemo } from "react"
import Link from "next/link"
import { Bot, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

// ── Types ──
interface FlowActivity {
  id: string
  action: string
  detail: string | null
  createdAt: string
  relatedFileIds: string[] | null
  metadata: Record<string, any> | null
}

interface ActivityFlowData {
  agents: Record<string, FlowActivity[]>
  flows: Array<{ from: string; to: string; fileCount: number; timestamp: string }>
  totalActivities: number
}

// ── Constants ──
const actionIcons: Record<string, string> = { search: '🔍', store: '📥', ask: '💬', compile: '📋' }
const actionVerbs: Record<string, string> = { search: 'Searched', store: 'Saved', ask: 'Asked', compile: 'Compiled' }

const LANE_COLORS = [
  { bg: 'rgba(79,91,213,0.08)', border: 'rgba(79,91,213,0.2)', accent: '#4F5BD5', text: '#4F5BD5' },
  { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', accent: '#10B981', text: '#10B981' },
  { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', accent: '#8B5CF6', text: '#8B5CF6' },
  { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', accent: '#F97316', text: '#F97316' },
  { bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)', accent: '#06B6D4', text: '#06B6D4' },
  { bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)', accent: '#EC4899', text: '#EC4899' },
]

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
}

// ── Swimlane Row ──
interface TimeRow {
  time: string
  date: string
  cells: (FlowActivity | null)[] // one per agent lane
}

// ── SVG Flow Lines ──
interface FlowLine {
  fromCol: number
  toCol: number
  fromRow: number
  toRow: number
  color: string
  fileCount: number
}

export function SwimlaneView({ data }: { data: ActivityFlowData }) {
  const agentNames = useMemo(() => Object.keys(data.agents), [data.agents])
  const containerRef = useRef<HTMLDivElement>(null)
  const [nodePositions, setNodePositions] = useState<Record<string, DOMRect>>({})
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null)

  // Build timeline rows: merge all activities, sort by time, create grid rows
  const { rows, activityToRow } = useMemo(() => {
    // Collect all activities with agent index
    const allActivities: { activity: FlowActivity; agentIdx: number; agent: string }[] = []
    agentNames.forEach((agent, idx) => {
      for (const a of data.agents[agent]) {
        allActivities.push({ activity: a, agentIdx: idx, agent })
      }
    })
    // Sort by createdAt
    allActivities.sort((a, b) => new Date(a.activity.createdAt).getTime() - new Date(b.activity.createdAt).getTime())

    const rows: TimeRow[] = []
    const activityToRow: Record<string, number> = {}

    for (const { activity, agentIdx } of allActivities) {
      // Each activity gets its own row for clean layout
      const cells: (FlowActivity | null)[] = new Array(agentNames.length).fill(null)
      cells[agentIdx] = activity
      rows.push({
        time: formatTime(activity.createdAt),
        date: formatDate(activity.createdAt),
        cells,
      })
      activityToRow[activity.id] = rows.length - 1
    }

    return { rows, activityToRow }
  }, [data.agents, agentNames])

  // Build flow lines from the flows data
  const flowLines = useMemo<FlowLine[]>(() => {
    // Map agent names to column indices
    const agentIdx: Record<string, number> = {}
    agentNames.forEach((name, i) => { agentIdx[name] = i })

    // For each flow, find the closest activity pair
    // from agent's store activities -> to agent's search/compile activities
    return data.flows.map((flow) => {
      const fromCol = agentIdx[flow.from] ?? -1
      const toCol = agentIdx[flow.to] ?? -1
      if (fromCol === -1 || toCol === -1) return null

      // Find last store from 'from' agent before flow timestamp
      const fromActivities = data.agents[flow.from] || []
      const toActivities = data.agents[flow.to] || []
      const flowTime = new Date(flow.timestamp).getTime()

      let fromActivity: FlowActivity | null = null
      for (const a of fromActivities) {
        if (a.action === 'store' && new Date(a.createdAt).getTime() <= flowTime) {
          fromActivity = a
        }
      }

      let toActivity: FlowActivity | null = null
      for (const a of toActivities) {
        if ((a.action === 'search' || a.action === 'compile' || a.action === 'ask') && new Date(a.createdAt).getTime() >= (fromActivity ? new Date(fromActivity.createdAt).getTime() : 0)) {
          toActivity = a
          break
        }
      }

      if (!fromActivity || !toActivity) {
        // Fallback: use first activities
        fromActivity = fromActivities[fromActivities.length - 1]
        toActivity = toActivities[0]
      }
      if (!fromActivity || !toActivity) return null

      const fromRow = activityToRow[fromActivity.id] ?? 0
      const toRow = activityToRow[toActivity.id] ?? 0
      const color = LANE_COLORS[fromCol % LANE_COLORS.length].accent

      return { fromCol, toCol, fromRow, toRow, color, fileCount: flow.fileCount }
    }).filter(Boolean) as FlowLine[]
  }, [data.flows, agentNames, data.agents, activityToRow])

  // Measure node positions for SVG lines
  useEffect(() => {
    if (!containerRef.current) return
    const measure = () => {
      const container = containerRef.current
      if (!container) return
      setContainerRect(container.getBoundingClientRect())
      const positions: Record<string, DOMRect> = {}
      container.querySelectorAll('[data-node-id]').forEach((el) => {
        const id = el.getAttribute('data-node-id')!
        positions[id] = el.getBoundingClientRect()
      })
      setNodePositions(positions)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [rows])

  if (agentNames.length === 0) {
    return (
      <div className="text-center py-16 animate-fade-in-up">
        <div className="text-4xl mb-4">🔀</div>
        <p className="text-gray-400 font-medium mb-2">No agent activity yet</p>
        <p className="text-sm text-gray-500 mb-6">Connect an agent to see information flow between your AI tools.</p>
        <Link href="/developers">
          <Button variant="default" size="sm" className="gap-1.5">
            <Bot className="w-4 h-4" />
            Connect an agent
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop: Swimlane Grid */}
      <div className="hidden md:block relative" ref={containerRef}>
        {/* SVG Overlay for flow lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: 'visible' }}>
          <defs>
            {flowLines.map((line, i) => (
              <marker
                key={`arrow-${i}`}
                id={`arrowhead-${i}`}
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill={line.color} opacity="0.6" />
              </marker>
            ))}
          </defs>
          {flowLines.map((line, i) => {
            const fromId = rows[line.fromRow]?.cells[line.fromCol]?.id
            const toId = rows[line.toRow]?.cells[line.toCol]?.id
            if (!fromId || !toId || !containerRect) return null
            const fromRect = nodePositions[fromId]
            const toRect = nodePositions[toId]
            if (!fromRect || !toRect) return null

            const x1 = fromRect.left + fromRect.width / 2 - containerRect.left
            const y1 = fromRect.top + fromRect.height / 2 - containerRect.top
            const x2 = toRect.left + toRect.width / 2 - containerRect.left
            const y2 = toRect.top + toRect.height / 2 - containerRect.top

            // Bezier curve
            const midY = (y1 + y2) / 2
            const dx = Math.abs(x2 - x1) * 0.3
            const path = `M ${x1} ${y1} C ${x1 + (x2 > x1 ? dx : -dx)} ${midY}, ${x2 + (x2 > x1 ? -dx : dx)} ${midY}, ${x2} ${y2}`

            return (
              <g key={`flow-${i}`}>
                <path
                  d={path}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="2"
                  strokeDasharray="6 3"
                  opacity="0.4"
                  markerEnd={`url(#arrowhead-${i})`}
                />
                {/* File count label on line */}
                <text
                  x={(x1 + x2) / 2}
                  y={midY - 8}
                  textAnchor="middle"
                  className="fill-gray-500"
                  fontSize="10"
                  fontWeight="500"
                >
                  {line.fileCount} file{line.fileCount !== 1 ? 's' : ''}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Grid Layout */}
        <div
          className="grid gap-0"
          style={{
            gridTemplateColumns: `80px repeat(${agentNames.length}, 1fr)`,
          }}
        >
          {/* Header Row */}
          <div className="sticky top-0 z-20 bg-background border-b border-white/[0.06] p-2 text-xs font-medium text-gray-400">
            Time
          </div>
          {agentNames.map((agent, idx) => {
            const color = LANE_COLORS[idx % LANE_COLORS.length]
            return (
              <div
                key={agent}
                className="sticky top-0 z-20 bg-background border-b border-white/[0.06] p-3 text-center"
                style={{ borderBottomColor: color.accent, borderBottomWidth: '2px' }}
              >
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color.accent }}
                  />
                  <span className="text-sm font-semibold text-gray-100 truncate" style={{ color: color.text }}>
                    🤖 {agent}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {data.agents[agent].length} action{data.agents[agent].length !== 1 ? 's' : ''}
                </div>
              </div>
            )
          })}

          {/* Data Rows */}
          {rows.map((row, rowIdx) => {
            // Show date separator if date changes
            const prevDate = rowIdx > 0 ? rows[rowIdx - 1].date : null
            const showDate = row.date !== prevDate

            return (
              <div key={rowIdx} className="contents">
                {/* Time cell */}
                <div className="border-r border-white/[0.06] p-2 flex flex-col justify-center">
                  {showDate && (
                    <div className="text-[10px] text-gray-400/60 font-medium mb-0.5">
                      {row.date}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 font-mono">
                    {row.time}
                  </div>
                </div>

                {/* Agent cells */}
                {row.cells.map((activity, colIdx) => {
                  const color = LANE_COLORS[colIdx % LANE_COLORS.length]
                  return (
                    <div
                      key={colIdx}
                      className="p-2 min-h-[60px] flex items-center justify-center"
                      style={{
                        backgroundColor: activity ? color.bg : 'transparent',
                        borderLeft: `1px solid ${color.border}`,
                      }}
                    >
                      {activity && (
                        <div
                          data-node-id={activity.id}
                          className="group w-full rounded-lg p-3 transition-all duration-200 cursor-default hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
                          style={{
                            backgroundColor: 'var(--background)',
                            border: `1px solid ${color.border}`,
                            boxShadow: `0 1px 3px ${color.accent}15`,
                          }}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-base">{actionIcons[activity.action] || '📌'}</span>
                            <span className="text-xs font-semibold" style={{ color: color.accent }}>
                              {actionVerbs[activity.action] || activity.action}
                            </span>
                          </div>
                          <div className="text-xs text-foreground/80 truncate" title={activity.detail || ''}>
                            {activity.detail ? `"${activity.detail}"` : '—'}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Flow Legend */}
        {data.flows.length > 0 && (
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-400 px-2">
            <span className="flex items-center gap-1.5">
              <svg width="24" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" /><polygon points="20,1 24,4 20,7" fill="currentColor" /></svg>
              Information flow
            </span>
            {agentNames.map((agent, idx) => (
              <span key={agent} className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: LANE_COLORS[idx % LANE_COLORS.length].accent }} />
                {agent}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Mobile: Fallback to card list */}
      <div className="md:hidden space-y-4">
        {agentNames.map((agent, idx) => {
          const activities = data.agents[agent]
          const color = LANE_COLORS[idx % LANE_COLORS.length]
          return (
            <div
              key={agent}
              className="rounded-xl border p-4"
              style={{ borderColor: color.border, backgroundColor: color.bg }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color.accent }} />
                <span className="font-semibold text-sm">🤖 {agent}</span>
                <span className="text-xs text-gray-400">{activities.length} action{activities.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0">{actionIcons[a.action] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-400">{actionVerbs[a.action] || a.action}</span>{' '}
                      <span className="font-medium truncate">&quot;{a.detail || '...'}&quot;</span>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                      {formatTime(a.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Mobile flow summary */}
        {data.flows.length > 0 && (
          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-semibold mb-2">🔀 Information Flow</h3>
            <div className="space-y-1.5">
              {data.flows.map((flow, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="font-medium text-foreground">{flow.from}</span>
                  <span>→</span>
                  <span className="font-medium text-foreground">{flow.to}</span>
                  <span>({flow.fileCount} file{flow.fileCount !== 1 ? 's' : ''})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
