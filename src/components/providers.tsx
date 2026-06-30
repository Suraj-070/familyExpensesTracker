'use client'

import { ThemeProvider } from 'next-themes'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
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

// 24 hours — how long cached data is kept in localStorage before being discarded
// even if never invalidated. Prevents stale data from living forever if the user
// never revisits a page.
const MAX_CACHE_AGE = 1000 * 60 * 60 * 24

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 60s — no refetch on remount within that window
            staleTime: 60 * 1000,
            // Cached data is kept in memory (and persisted to localStorage) for 24h
            gcTime: MAX_CACHE_AGE,
            retry: 1,
            // Refetch when the tab regains focus / network reconnects — keeps mobile
            // tab-switching behavior correct without a full reload
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      })
  )

  // localStorage-backed persister. Works identically on desktop and mobile web —
  // no native/device API needed, just the standard Web Storage API every browser has.
  // This is what makes pages render instantly on refresh: React Query rehydrates
  // the last-known data from localStorage before any network request completes,
  // then silently refetches in the background per the staleTime above.
  const [persister] = useState(() =>
    typeof window !== 'undefined'
      ? createSyncStoragePersister({
          storage: window.localStorage,
          key: 'famexpense-query-cache',
          // Avoid persisting absolutely everything forever — cap serialized size
          throttleTime: 1000,
        })
      : undefined
  )

  if (!persister) {
    // SSR fallback — no localStorage on the server, render without persistence
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: MAX_CACHE_AGE,
          // Only persist successful queries — never cache an error state
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => query.state.status === 'success',
          },
        }}
      >
        <RealtimeSync />
        {children}
      </PersistQueryClientProvider>
    </ThemeProvider>
  )
}
