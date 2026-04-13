'use client'

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { toast } from 'sonner'
import { classifyError } from '@/components/ui/network-error'

let lastQueryErrorToastAt = 0

function handleGlobalError(error: unknown) {
  const type = classifyError(error)
  // 只对网络类错误弹 toast（api.ts 已对 fetch 层弹过，这里为 react-query 兜底）
  if (type === "unknown") return
  const now = Date.now()
  if (now - lastQueryErrorToastAt < 3000) return
  lastQueryErrorToastAt = now
  const messages: Record<string, string> = {
    offline: "网络连接失败，请检查网络后重试",
    server: "服务暂时不可用，请稍后重试",
    timeout: "请求超时，请检查网络后重试",
  }
  toast.error(messages[type] || "请求失败，请重试")
}

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => handleGlobalError(error),
    }),
    mutationCache: new MutationCache({
      onError: (error) => handleGlobalError(error),
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (failureCount, error) => {
          if (error instanceof Error && 'status' in error && (error as any).status === 401) return false
          return failureCount < 2
        },
      },
    },
  })
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
