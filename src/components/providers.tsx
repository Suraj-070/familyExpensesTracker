'use client'

import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from '@tanstack/react-query'
import { useState, type ReactNode, useEffect } from 'react'
import { useStore } from '@/store'
import { useRealtimeFamily, useRealtimeNotifications } from '@/hooks/use-realtime'

/** Inner component — must be inside the store context */
function RealtimeSync() {
  const { user, isAuthenticated } = useStore()
  useRealtimeFamily()
  useRealtimeNotifications(isAuthenticated ? user?.id : undefined)
  return null
}

const CACHE_KEY = 'famexpense-query-cache'
const MAX_CACHE_AGE = 1000 * 60 * 60 * 24 // 24 hours

/**
 * Creates a QueryClient and immediately hydrates it from localStorage if a
 * valid cache exists. Running this inside useState's lazy initializer means
 * it executes exactly once, before first render, and does NOT touch refs
 * during render (which React 19 now warns about/disallows).
 */
function createHydratedQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: MAX_CACHE_AGE,
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
    },
  })

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { dehydratedState, timestamp } = JSON.parse(raw)
        const age = Date.now() - timestamp
        if (age < MAX_CACHE_AGE && dehydratedState) {
          hydrate(queryClient, dehydratedState)
        } else {
          localStorage.removeItem(CACHE_KEY)
        }
      }
    } catch {
      // Corrupted cache — ignore and start fresh, never let a bad cache crash the app
      localStorage.removeItem(CACHE_KEY)
    }
  }

  return queryClient
}

/**
 * Persists the QueryClient's cache to localStorage on every change (debounced).
 * This is a pure side effect — runs in useEffect, no render-time ref access.
 */
function usePersistQueryCache(queryClient: QueryClient) {
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null

    const save = () => {
      try {
        const dehydratedState = dehydrate(queryClient, {
          shouldDehydrateQuery: (query) => query.state.status === 'success',
        })
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ dehydratedState, timestamp: Date.now() })
        )
      } catch {
        // localStorage full or unavailable (e.g. private browsing) — fail silently
      }
    }

    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(save, 1000)
    })

    return () => {
      unsubscribe()
      if (timeout) clearTimeout(timeout)
    }
  }, [queryClient])
}

export function Providers({ children }: { children: ReactNode }) {
  // Lazy initializer — runs once on mount, not during every render, and is
  // the React-sanctioned place to do this kind of one-time setup work.
  const [queryClient] = useState(createHydratedQueryClient)

  usePersistQueryCache(queryClient)

  return (
    // @ts-expect-error — next-themes' published types don't declare `children`
    // correctly for React 19, but it works fine at runtime.
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <RealtimeSync />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
