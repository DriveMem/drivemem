"use client"
import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-lg font-semibold">出了点问题</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">{this.state.error?.message || "页面遇到了一个错误"}</p>
          <Button onClick={() => this.setState({ hasError: false })}>重试</Button>
        </div>
      )
    }
    return this.props.children
  }
}
