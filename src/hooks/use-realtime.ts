'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store'
import { RealtimeChannel } from '@supabase/supabase-js'

/**
 * useRealtimeFamily — subscribes to Supabase Realtime postgres_changes
 * for the current family's expenses, categories, and activity_logs.
 *
 * When any change comes in, it refreshes the relevant store slice.
 * This makes new expenses appear instantly for all family members without polling.
 *
 * Usage: drop <RealtimeProvider /> inside AppShell (already done below),
 * or call this hook once at the top-level authenticated component.
 */
export function useRealtimeFamily() {
  const { currentFamily, loadExpenses, loadActivities, loadCategories, loadNotifications } = useStore()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!currentFamily?.id) return

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`family:${currentFamily.id}`)
      // Expenses table changes
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'Expense',
          filter: `familyId=eq.${currentFamily.id}`,
        },
        () => {
          loadExpenses()
        }
      )
      // Activity log changes (for the activity feed)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ActivityLog',
          filter: `familyId=eq.${currentFamily.id}`,
        },
        () => {
          loadActivities()
        }
      )
      // Category changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Category',
          filter: `familyId=eq.${currentFamily.id}`,
        },
        () => {
          loadCategories()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to family ${currentFamily.id}`)
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [currentFamily?.id, loadExpenses, loadActivities, loadCategories, loadNotifications])
}

/**
 * useRealtimeNotifications — subscribes to the current user's Notification rows.
 * Calls loadNotifications() whenever a new notification is inserted.
 */
export function useRealtimeNotifications(userId: string | undefined) {
  const { loadNotifications } = useStore()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${userId}`,
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId, loadNotifications])
}
