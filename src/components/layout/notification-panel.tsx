'use client'

import { useState, useMemo } from 'react'
import { useStore, type Notification } from '@/store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip'
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle, Circle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
}

type FilterType = 'all' | Notification['type']

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'info', label: 'Info' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
  { key: 'error', label: 'Error' },
]

export function NotificationPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useStore()
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = useMemo(
    () => (filter === 'all' ? notifications : notifications.filter((n) => n.type === filter)),
    [notifications, filter]
  )

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark notifications')
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => onOpenChange(true)}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-4.5 w-4.5" />
              Notifications
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs">
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </SheetHeader>

          {/* Type filter tabs — #15 */}
          <div className="flex gap-1 px-4 pt-3 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Separator className="mt-3" />
          <ScrollArea className="h-[calc(100vh-10rem)]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Bell className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
                </p>
              </div>
            ) : (
              <div className="grid">
                {filtered.map((notif) => {
                  const Icon = iconMap[notif.type] || Info
                  return (
                    <div
                      key={notif.id}
                      className={`group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50 ${
                        !notif.isRead ? 'bg-accent/20' : ''
                      }`}
                    >
                      <button
                        onClick={() => { if (!notif.isRead) markNotificationRead(notif.id) }}
                        className="flex items-start gap-3 flex-1 min-w-0 text-left"
                      >
                        <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${
                          notif.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          notif.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                          notif.type === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notif.isRead ? 'font-medium' : 'font-normal'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </button>
                      {!notif.isRead ? (
                        <div className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                      ) : (
                        <button
                          onClick={() => toast.info('Marking as unread will be available soon')}
                          className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          aria-label="Mark as unread"
                          title="Mark as unread"
                        >
                          <Circle className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}
