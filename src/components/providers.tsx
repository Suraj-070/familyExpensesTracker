'use client'

import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useStore } from '@/store'
import { useRealtimeFamily, useRealtimeNotifications } from '@/hooks/use-realtime'

/** Inner component — must be inside the store context */
function RealtimeSync() {
  const { user, isAuthenticated } = useStore()
  useRealtimeFamily()
  useRealtimeNotifications(isAuthenticated ? user?.id : undefined)
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <RealtimeSync />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
