'use client'

import { useEffect, useState } from 'react'
import { useStore, type PageName } from '@/store'
import { useTheme } from 'next-themes'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard,
  Receipt,
  Tag,
  Repeat,
  Users,
  BarChart3,
  Search,
  Settings,
  User,
  LogOut,
  Menu,
  Sun,
  Moon,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DashboardPage } from '@/components/dashboard/dashboard-page'
import { ExpensesPage } from '@/components/expenses/expenses-page'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { CategoriesPage } from '@/components/categories/categories-page'
import { RecurringPage } from '@/components/recurring/recurring-page'
import { FamilyPage } from '@/components/family/family-page'
import { ReportsPage } from '@/components/reports/reports-page'
import { SearchPage } from '@/components/search/search-page'
import { ProfilePage } from '@/components/profile/profile-page'
import { SettingsPage } from '@/components/settings/settings-page'
import { NotificationPanel } from '@/components/layout/notification-panel'

// Grouped into logical sections instead of one flat list (#24).
// "Expenses" section covers Expenses + its sub-concerns (Categories, Recurring),
// "Family" section covers Family + Reports + Search.
const navGroups: { label: string; items: { icon: typeof LayoutDashboard; label: string; page: PageName }[] }[] = [
  {
    label: '',
    items: [{ icon: LayoutDashboard, label: 'Dashboard', page: 'dashboard' }],
  },
  {
    label: 'Expenses',
    items: [
      { icon: Receipt, label: 'All Expenses', page: 'expenses' },
      { icon: Tag, label: 'Categories', page: 'categories' },
      { icon: Repeat, label: 'Recurring', page: 'recurring' },
    ],
  },
  {
    label: 'Family',
    items: [
      { icon: Users, label: 'Members', page: 'family' },
      { icon: BarChart3, label: 'Reports', page: 'reports' },
      { icon: Search, label: 'Search', page: 'search' },
    ],
  },
  {
    label: '',
    items: [{ icon: Settings, label: 'Settings', page: 'settings' }],
  },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { currentPage, navigate, user, logout, currentFamily } = useStore()

  const handleNav = (page: PageName) => {
    navigate(page)
    onNavigate?.()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 pb-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="font-semibold">FamExpense</span>
        </div>
      </div>
      <div className="px-4 pt-2 pb-1">
        {currentFamily && (
          <p className="text-xs text-muted-foreground truncate">{currentFamily.name}</p>
        )}
      </div>
      <Separator className="mx-4 w-auto" />
      <ScrollArea className="flex-1 px-3 py-3">
        <nav role="navigation" aria-label="Main navigation" className="grid gap-4">
          {navGroups.map((group, gi) => (
            <div key={gi} className="grid gap-1">
              {group.label && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.page
                return (
                  <button
                    key={item.page}
                    onClick={() => handleNav(item.page)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent ${
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>
      <Separator className="mx-4 w-auto" />
      <div className="p-3 grid gap-1">
        <button
          onClick={() => handleNav('profile')}
          aria-current={currentPage === 'profile' ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent ${
            currentPage === 'profile'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="h-4 w-4" />
          Profile
        </button>
        <button
          onClick={() => {
            logout()
            onNavigate?.()
          }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  )
}

export function AppShell() {
  const { currentPage, sidebarOpen, toggleSidebar, user, loadNotifications, currentFamily, loadCategories } = useStore()
  const { theme, setTheme } = useTheme()
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    if (currentFamily) {
      loadCategories()
    }
  }, [currentFamily, loadCategories])

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':    return <DashboardPage />
      case 'expenses':     return <ExpensesPage />
      case 'add-expense':  return <ExpenseForm />
      case 'edit-expense': return <ExpenseForm />
      case 'categories':   return <CategoriesPage />
      case 'recurring':    return <RecurringPage />
      case 'family':       return <FamilyPage />
      case 'reports':      return <ReportsPage />
      case 'search':       return <SearchPage />
      case 'profile':      return <ProfilePage />
      case 'settings':     return <SettingsPage />
      default:             return <DashboardPage />
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Skip to content link — visually hidden until focused, helps keyboard users (#25) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-card lg:fixed lg:inset-y-0 lg:z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={toggleSidebar}>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent onNavigate={toggleSidebar} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {currentFamily && (
            <h2 className="font-semibold text-sm truncate">{currentFamily.name}</h2>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Theme Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>

            {/* Notifications */}
            <NotificationPanel open={notifOpen} onOpenChange={setNotifOpen} />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" aria-label="User menu">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col gap-1 p-2">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => useStore.getState().navigate('profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => useStore.getState().navigate('settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => useStore.getState().logout()} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="flex-1 overflow-y-auto" tabIndex={-1}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-4 lg:p-6"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
