'use client'

import { useEffect, useState } from 'react'
import { useStore, formatCurrency } from '@/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DollarSign,
  CreditCard,
  AlertCircle,
  TrendingUp,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Plus,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { format, formatDistanceToNow as formatDistanceToNowFn } from 'date-fns'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6']

function AnimatedNumber({ value, prefix = '$' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const duration = 800
    const startTime = Date.now()
    const step = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(value * eased)
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value])
  return <span>{prefix}{display.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
}

function StatCard({
  title,
  value,
  icon: Icon,
  colorClass,
  delay = 0,
}: {
  title: string
  value: number
  icon: typeof DollarSign
  colorClass: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs lg:text-sm text-muted-foreground font-medium">{title}</p>
              <p className="text-xl lg:text-2xl font-bold tracking-tight">
                <AnimatedNumber value={value} />
              </p>
            </div>
            <div className={`flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl ${colorClass}`}>
              <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-medium">{formatCurrency(item.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const {
    loadReportSummary,
    loadCategoryReport,
    loadTrendData,
    loadActivities,
    loadExpenses,
    reportSummary,
    categoryReport,
    trendData,
    activities,
    expenses,
  } = useStore()

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([
        loadReportSummary().catch(() => {}),
        loadCategoryReport().catch(() => {}),
        loadTrendData(6).catch(() => {}),
        loadActivities().catch(() => {}),
        loadExpenses().catch(() => {}),
      ])
      setLoading(false)
    }
    loadAll()
  }, [loadReportSummary, loadCategoryReport, loadTrendData, loadActivities, loadExpenses])

  const unpaidExpenses = expenses
    .filter((e) => e.paidStatus === 'unpaid')
    .sort((a, b) => (a.dueDate || a.expenseDate).localeCompare(b.dueDate || b.expenseDate))
    .slice(0, 5)

  const recentExpenses = [...expenses]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your family expenses</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Expenses"
          value={reportSummary?.totalExpenses ?? 0}
          icon={DollarSign}
          colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          delay={0}
        />
        <StatCard
          title="Total Paid"
          value={reportSummary?.totalPaid ?? 0}
          icon={CreditCard}
          colorClass="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
          delay={0.1}
        />
        <StatCard
          title="Unpaid"
          value={reportSummary?.totalUnpaid ?? 0}
          icon={AlertCircle}
          colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          delay={0.2}
        />
        <StatCard
          title="This Month"
          value={reportSummary?.thisMonthSpending ?? 0}
          icon={TrendingUp}
          colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          delay={0.3}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Expenses by Category</CardTitle>
              <CardDescription>Where your money goes</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {categoryReport.length === 0 ? (
                <div className="flex items-center justify-center h-52 text-muted-foreground text-sm">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categoryReport}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="totalAmount"
                      nameKey="categoryName"
                    >
                      {categoryReport.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => <span className="text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Spending Trend</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {trendData.length === 0 ? (
                <div className="flex items-center justify-center h-52 text-muted-foreground text-sm">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={trendData} barGap={4}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="paid" name="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="unpaid" name="Unpaid" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Bills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4.5 w-4.5 text-amber-500" />
                <CardTitle className="text-base">Upcoming Bills</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {unpaidExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">All caught up! No unpaid bills.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="grid gap-2">
                    {unpaidExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{expense.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {expense.category?.name || 'Uncategorized'}
                            {expense.dueDate && ` · Due ${format(new Date(expense.dueDate), 'MMM d')}`}
                          </p>
                        </div>
                        <p className="text-sm font-semibold ml-3 shrink-0">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Latest actions in your family</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Receipt className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No activity yet</p>
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="grid gap-3">
                    {activities.slice(0, 8).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-muted p-1.5">
                          {activity.action.includes('add') ? (
                            <Plus className="h-3 w-3 text-emerald-500" />
                          ) : activity.action.includes('pay') ? (
                            <CreditCard className="h-3 w-3 text-teal-500" />
                          ) : (
                            <Receipt className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {activity.userName} · {formatDistanceToNow(activity.createdAt)}
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

      {/* Recent Expenses Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Receipt className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No expenses recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                    {recentExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium truncate max-w-[160px]">{expense.title}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">
                            {expense.category?.name || '—'}
                          </p>
                        </td>
                        <td className="py-2.5 pr-3 hidden sm:table-cell">
                          {expense.category && (
                            <Badge variant="secondary" className="text-xs">
                              {expense.category.name}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-medium tabular-nums">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="py-2.5 text-muted-foreground hidden md:table-cell">
                          {format(new Date(expense.expenseDate), 'MMM d, yyyy')}
                        </td>
                        <td className="py-2.5">
                          <Badge
                            variant={expense.paidStatus === 'paid' ? 'default' : 'secondary'}
                            className={
                              expense.paidStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'
                            }
                          >
                            {expense.paidStatus === 'paid' ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function formatDistanceToNow(dateStr: string): string {
  try {
    return formatDistanceToNowFn(new Date(dateStr), { addSuffix: true })
  } catch {
    return ''
  }
}