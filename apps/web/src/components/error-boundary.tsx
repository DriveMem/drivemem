"use client"

import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-lg font-semibold">出了点问题</h2>
          <p className="text-sm text-muted-foreground">
            {this.state.error?.message || "未知错误"}
          </p>
          <Button
            variant="outline"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            重试
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
