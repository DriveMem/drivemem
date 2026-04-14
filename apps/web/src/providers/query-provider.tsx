'use client'

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { toast } from 'sonner'
import { classifyError } from '@/components/ui/network-error'

let lastQueryErrorToastAt = 0

function handleGlobalError(error: unknown) {
  const type = classifyError(error)
  // Only show toast for network errors（api.ts fetch layer already handles it; this is react-query fallback）
  if (type === "unknown") return
  const now = Date.now()
  if (now - lastQueryErrorToastAt < 3000) return
  lastQueryErrorToastAt = now
  const messages: Record<string, string> = {
    offline: "Network connection failed. Please check your network and try again",
    server: "Service temporarily unavailable, please try again later",
    timeout: "Request timed out. Please check your network and try again",
  }
  toast.error(messages[type] || "Request failed, please try again")
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
