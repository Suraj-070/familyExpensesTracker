'use client'

import { useEffect, useState } from 'react'
import { useStore, formatCurrency } from '@/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { DollarSign, CreditCard, AlertCircle, TrendingDown } from 'lucide-react'
import { format } from 'date-fns'

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6']

function TooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-medium mb-1">{label}</p>}
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

export function ReportsPage() {
  const {
    loadReportSummary,
    loadCategoryReport,
    loadTrendData,
    reportSummary,
    categoryReport,
    trendData,
  } = useStore()

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      loadReportSummary(),
      loadCategoryReport(),
      loadTrendData(12),
    ]).finally(() => setLoading(false))
  }, [loadReportSummary, loadCategoryReport, loadTrendData])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  const totalPaidPercent = reportSummary?.totalExpenses
    ? Math.round(((reportSummary.totalPaid || 0) / reportSummary.totalExpenses) * 100)
    : 0
  const totalUnpaidPercent = 100 - totalPaidPercent

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm">Detailed financial insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="text-lg font-bold">{formatCurrency(reportSummary?.totalExpenses ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="text-lg font-bold">{formatCurrency(reportSummary?.totalPaid ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Unpaid</p>
              <p className="text-lg font-bold">{formatCurrency(reportSummary?.totalUnpaid ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expenses by Category</CardTitle>
            <CardDescription>Distribution of spending</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {categoryReport.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryReport}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="totalAmount"
                    nameKey="categoryName"
                  >
                    {categoryReport.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<TooltipContent />} />
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paid vs Unpaid</CardTitle>
            <CardDescription>Payment status overview</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {(reportSummary?.totalPaid ?? 0) === 0 && (reportSummary?.totalUnpaid ?? 0) === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Paid', value: reportSummary?.totalPaid || 0 },
                      { name: 'Unpaid', value: reportSummary?.totalUnpaid || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <RechartsTooltip content={<TooltipContent />} />
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
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Spending Trend</CardTitle>
          <CardDescription>Spending over the past 12 months</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
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
                <RechartsTooltip content={<TooltipContent />} />
                <Bar dataKey="paid" name="Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unpaid" name="Unpaid" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detailed Breakdown Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {categoryReport.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="text-left pb-2 font-medium">Category</th>
                    <th className="text-right pb-2 font-medium">Amount</th>
                    <th className="text-right pb-2 font-medium">Percentage</th>
                    <th className="text-left pb-2 font-medium hidden sm:table-cell">Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryReport.map((cat, i) => (
                    <tr key={cat.categoryId} className="border-b last:border-0">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <span className="font-medium">{cat.categoryName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-medium tabular-nums">
                        {formatCurrency(cat.totalAmount)}
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground tabular-nums">
                        {cat.percentage.toFixed(1)}%
                      </td>
                      <td className="py-2.5 hidden sm:table-cell">
                        <div className="max-w-40 h-2 rounded-full bg-muted overflow-hidden ml-auto">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                              width: `${cat.percentage}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}