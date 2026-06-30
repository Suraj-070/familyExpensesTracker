'use client'

import { useEffect, useState } from 'react'
import { useStore, formatCurrency } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DollarSign, CreditCard, AlertCircle, TrendingUp,
  CalendarClock, Receipt, Plus,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts'

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6']

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let raf: number
    const duration = 600
    const start = Date.now()
    const step = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      setDisplay(value * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span>${display.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
}

function StatCard({ title, value, icon: Icon, colorClass, sub, delay = 0 }: {
  title: string; value: number; icon: typeof DollarSign
  colorClass: string; sub?: string; delay?: number
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card>
        <CardContent className="p-4 lg:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">{title}</p>
              <p className="text-xl lg:text-2xl font-bold tracking-tight tabular-nums">
                <AnimatedNumber value={value} />
              </p>
              {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </div>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-medium mb-1 text-popover-foreground">{label}</p>}
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-medium text-popover-foreground">{formatCurrency(item.value)}</span>
        </div>
      ))}
    </div>
  )
}

function safeDistance(d: string) {
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }) } catch { return '' }
}

export function DashboardPage() {
  const {
    loadReportSummary, loadCategoryReport, loadTrendData, loadActivities, loadExpenses,
    reportSummary, categoryReport, trendData, activities, expenses, navigate, currentFamily,
  } = useStore()

  // Three states: 'waiting' (no family yet), 'loading', 'done'
  const [status, setStatus] = useState<'waiting' | 'loading' | 'done'>('waiting')

  useEffect(() => {
    if (!currentFamily) {
      setStatus('waiting')
      return
    }
    setStatus('loading')
    Promise.all([
      loadReportSummary().catch(() => {}),
      loadCategoryReport().catch(() => {}),
      loadTrendData(6).catch(() => {}),
      loadActivities().catch(() => {}),
      loadExpenses().catch(() => {}),
    ]).finally(() => setStatus('done'))
  }, [currentFamily?.id])

  const unpaidExpenses = expenses
    .filter(e => e.paidStatus === 'unpaid')
    .sort((a, b) => (a.dueDate || a.expenseDate).localeCompare(b.dueDate || b.expenseDate))
    .slice(0, 5)

  const recentExpenses = [...expenses]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  const changePercent = reportSummary?.changePercent ?? 0
  const changeSub = changePercent >= 0
    ? `+${changePercent.toFixed(1)}% vs last month`
    : `${changePercent.toFixed(1)}% vs last month`

  // No family yet — show prompt
  if (status === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          <Receipt className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-1">No family yet</h2>
          <p className="text-muted-foreground text-sm">Create or join a family to start tracking expenses</p>
        </div>
        <Button onClick={() => navigate('family')}>Go to Family</Button>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Overview of your family expenses</p>
        </div>
        <Button onClick={() => navigate('add-expense')} size="sm">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Expenses" value={reportSummary?.totalExpenses ?? 0} icon={DollarSign}
          colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" delay={0} />
        <StatCard title="Total Paid" value={reportSummary?.totalPaid ?? 0} icon={CreditCard}
          colorClass="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" delay={0.08} />
        <StatCard title="Unpaid" value={reportSummary?.totalUnpaid ?? 0} icon={AlertCircle}
          colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" delay={0.16} />
        <StatCard title="This Month" value={reportSummary?.thisMonthSpending ?? 0} icon={TrendingUp}
          colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          sub={changeSub} delay={0.24} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By Category</CardTitle>
              <CardDescription>Where your money goes</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {categoryReport.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryReport} cx="50%" cy="50%" innerRadius={45} outerRadius={80}
                      paddingAngle={3} dataKey="totalAmount" nameKey="categoryName">
                      {categoryReport.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Legend verticalAlign="bottom" iconType="circle" iconSize={8}
                      formatter={(v: string) => <span className="text-xs">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Trend</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {trendData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trendData} barGap={2}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Bar dataKey="paid" name="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="unpaid" name="Unpaid" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base">Upcoming Bills</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {unpaidExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">All clear! No unpaid bills.</p>
                </div>
              ) : (
                <ScrollArea className="h-52 pr-2">
                  <div className="grid gap-2">
                    {unpaidExpenses.map(e => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{e.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {e.category?.name || 'Uncategorized'}
                            {e.dueDate && ` · Due ${format(new Date(e.dueDate), 'MMM d')}`}
                          </p>
                        </div>
                        <p className="text-sm font-semibold ml-3 shrink-0 tabular-nums">{formatCurrency(e.amount)}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Latest family actions</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Receipt className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No activity yet</p>
                </div>
              ) : (
                <ScrollArea className="h-52 pr-2">
                  <div className="grid gap-3">
                    {activities.slice(0, 8).map(a => (
                      <div key={a.id} className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-muted p-1.5 shrink-0">
                          <Receipt className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{a.details || a.action}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {a.user?.name || 'Someone'} · {safeDistance(a.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent expenses table */}
      {recentExpenses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Expenses</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('expenses')}>View all</Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="text-left pb-2 font-medium">Title</th>
                    <th className="text-left pb-2 font-medium hidden sm:table-cell">Category</th>
                    <th className="text-right pb-2 font-medium">Amount</th>
                    <th className="text-left pb-2 font-medium hidden md:table-cell">Date</th>
                    <th className="text-left pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExpenses.map(e => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                      <td className="py-2.5 pr-3">
                        <p className="font-medium truncate max-w-[140px]">{e.title}</p>
                        <p className="text-xs text-muted-foreground sm:hidden">{e.category?.name || '—'}</p>
                      </td>
                      <td className="py-2.5 pr-3 hidden sm:table-cell">
                        {e.category && (
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md"
                            style={{ backgroundColor: e.category.color + '20', color: e.category.color }}>
                            {e.category.name}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-semibold tabular-nums pr-3">{formatCurrency(e.amount)}</td>
                      <td className="py-2.5 text-muted-foreground text-xs hidden md:table-cell">
                        {format(new Date(e.expenseDate), 'MMM d, yyyy')}
                      </td>
                      <td className="py-2.5">
                        <Badge variant="secondary" className={e.paidStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]'}>
                          {e.paidStatus === 'paid' ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
