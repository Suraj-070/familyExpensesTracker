'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { AppShell } from '@/components/layout/app-shell'
import { LoginPage } from '@/components/auth/login-page'
import { SignupPage } from '@/components/auth/signup-page'
import { ForgotPasswordPage } from '@/components/auth/forgot-password-page'
import { Loader2, Wallet } from 'lucide-react'

export default function Home() {
  const { initAuth, isAuthenticated, currentPage } = useStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initAuth().finally(() => setLoading(false))
  }, [initAuth])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
          <Wallet className="h-7 w-7" />
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    if (currentPage === 'signup') return <SignupPage />
    if (currentPage === 'forgot') return <ForgotPasswordPage />
    return <LoginPage />
  }

  return <AppShell />
}
