"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, Network } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { useRouter } from "next/navigation"

interface Insight {
  id: string
  sourceFileId: string
  relatedFileId: string
  sourceFileName: string
  relatedFileName: string
  type: string
  title: string
  description: string
  similarityScore?: number
}

interface GraphNode {
  id: string
  name: string
  x: number
  y: number
  vx: number
  vy: number
}

interface GraphEdge {
  source: string
  target: string
  type: string
  title: string
}

const TYPE_COLORS: Record<string, string> = {
  relation: "#3b82f6",
  contradiction: "#ef4444",
  trend: "#10b981",
}

export default function GraphPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [nodeCount, setNodeCount] = useState(0)
  const [edgeCount, setEdgeCount] = useState(0)
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<GraphNode[]>([])
  const edgesRef = useRef<GraphEdge[]>([])
  const animRef = useRef<number>(0)
  const dragRef = useRef<{ node: GraphNode; offsetX: number; offsetY: number } | null>(null)
  const router = useRouter()

  useEffect(() => {
    apiFetch("/api/insights?limit=50")
      .then((data: any) => setInsights(data?.insights || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (insights.length === 0) return

    const nodeMap = new Map<string, GraphNode>()
    const edges: GraphEdge[] = []

    for (const ins of insights) {
      if (!nodeMap.has(ins.sourceFileId)) {
        nodeMap.set(ins.sourceFileId, {
          id: ins.sourceFileId,
          name: ins.sourceFileName,
          x: 300 + Math.random() * 400,
          y: 200 + Math.random() * 300,
          vx: 0,
          vy: 0,
        })
      }
      if (!nodeMap.has(ins.relatedFileId)) {
        nodeMap.set(ins.relatedFileId, {
          id: ins.relatedFileId,
          name: ins.relatedFileName,
          x: 300 + Math.random() * 400,
          y: 200 + Math.random() * 300,
          vx: 0,
          vy: 0,
        })
      }
      edges.push({
        source: ins.sourceFileId,
        target: ins.relatedFileId,
        type: ins.type,
        title: ins.title,
      })
    }

    nodesRef.current = Array.from(nodeMap.values())
    setNodeCount(nodesRef.current.length)
    edgesRef.current = edges
    setEdgeCount(edges.length)

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      canvas.style.width = rect.width + "px"
      canvas.style.height = rect.height + "px"
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const simulate = () => {
      const nodes = nodesRef.current
      const w = canvas.width / window.devicePixelRatio
      const h = canvas.height / window.devicePixelRatio
      const centerX = w / 2
      const centerY = h / 2

      // Force simulation
      for (const n of nodes) {
        // Gravity toward center
        n.vx += (centerX - n.x) * 0.001
        n.vy += (centerY - n.y) * 0.001
      }

      // Repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x
          const dy = nodes[j].y - nodes[i].y
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          const force = 800 / (dist * dist)
          nodes[i].vx -= (dx / dist) * force
          nodes[i].vy -= (dy / dist) * force
          nodes[j].vx += (dx / dist) * force
          nodes[j].vy += (dy / dist) * force
        }
      }

      // Edge attraction
      for (const e of edgesRef.current) {
        const a = nodes.find((n) => n.id === e.source)
        const b = nodes.find((n) => n.id === e.target)
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const force = (dist - 150) * 0.005
        a.vx += (dx / dist) * force
        a.vy += (dy / dist) * force
        b.vx -= (dx / dist) * force
        b.vy -= (dy / dist) * force
      }

      // Apply velocity with damping
      for (const n of nodes) {
        if (dragRef.current?.node.id === n.id) continue
        n.vx *= 0.9
        n.vy *= 0.9
        n.x += n.vx
        n.y += n.vy
        n.x = Math.max(40, Math.min(w - 40, n.x))
        n.y = Math.max(40, Math.min(h - 40, n.y))
      }

      // Draw
      ctx.clearRect(0, 0, w, h)

      // Edges
      for (const e of edgesRef.current) {
        const a = nodes.find((n) => n.id === e.source)
        const b = nodes.find((n) => n.id === e.target)
        if (!a || !b) continue
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = TYPE_COLORS[e.type] || "#a1a1aa"
        ctx.lineWidth = hoveredEdge === e ? 2.5 : 1.5
        ctx.globalAlpha = 0.6
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      // Nodes
      for (const n of nodes) {
        const isHovered = hoveredNode?.id === n.id
        ctx.beginPath()
        ctx.arc(n.x, n.y, isHovered ? 8 : 6, 0, Math.PI * 2)
        ctx.fillStyle = isHovered ? "#5E6AD2" : "#1A1D24"
        ctx.strokeStyle = "#ffffff30"
        ctx.lineWidth = isHovered ? 2 : 1
        ctx.fill()
        ctx.stroke()

        // Label
        ctx.font = `${isHovered ? "bold " : ""}11px system-ui, sans-serif`
        ctx.fillStyle = "#E0E0E4"
        ctx.textAlign = "center"
        const label = n.name.length > 20 ? n.name.slice(0, 18) + "…" : n.name
        ctx.fillText(label, n.x, n.y - 12)
      }

      animRef.current = requestAnimationFrame(simulate)
    }

    animRef.current = requestAnimationFrame(simulate)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener("resize", resize)
    }
  }, [insights, hoveredNode, hoveredEdge])

  const getNodeAt = useCallback((x: number, y: number) => {
    for (const n of nodesRef.current) {
      const dx = n.x - x
      const dy = n.y - y
      if (dx * dx + dy * dy < 100) return n
    }
    return null
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (dragRef.current) {
      dragRef.current.node.x = x + dragRef.current.offsetX
      dragRef.current.node.y = y + dragRef.current.offsetY
      dragRef.current.node.vx = 0
      dragRef.current.node.vy = 0
      return
    }

    const node = getNodeAt(x, y)
    setHoveredNode(node)
    canvasRef.current!.style.cursor = node ? "pointer" : "default"
  }, [getNodeAt])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const node = getNodeAt(x, y)
    if (node) {
      dragRef.current = { node, offsetX: node.x - x, offsetY: node.y - y }
    }
  }, [getNodeAt])

  const handleMouseUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const node = getNodeAt(x, y)
    if (node) {
      router.push(`/files/${node.id}/preview`)
    }
  }, [getNodeAt, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Network className="h-12 w-12" />
        <p className="text-sm font-medium">No knowledge connections yet</p>
        <p className="text-xs">Upload more files and AI will discover relationships between them</p>
      </div>
    )
  }

  // Legend
  const legendItems = [
    { type: "relation", label: "Related", color: TYPE_COLORS.relation },
    { type: "contradiction", label: "Contradiction", color: TYPE_COLORS.contradiction },
    { type: "trend", label: "Trend", color: TYPE_COLORS.trend },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div>
          <h1 className="text-lg font-semibold">Knowledge Graph</h1>
          <p className="text-xs text-muted-foreground">
            {nodeCount} files · {edgeCount} connections
          </p>
        </div>
        <div className="flex items-center gap-3">
          {legendItems.map((l) => (
            <div key={l.type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-0.5 rounded" style={{ backgroundColor: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 relative bg-transparent">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
        />
        {hoveredNode && (
          <div className="absolute top-4 left-4 bg-white border border-white/[0.06] rounded-lg px-3 py-2 shadow-sm pointer-events-none">
            <p className="text-sm font-medium">{hoveredNode.name}</p>
            <p className="text-xs text-muted-foreground">Click to view file</p>
          </div>
        )}
      </div>
    </div>
  )
}
