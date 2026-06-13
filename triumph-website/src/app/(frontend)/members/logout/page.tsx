'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ArrowLeft, CheckCircle2, Loader2, LogOut, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'

import PageClient from '../login/page.client'

type LogoutStatus = 'idle' | 'loading' | 'success' | 'error'

export default function LogoutPage() {
  const router = useRouter()
  const [status, setStatus] = useState<LogoutStatus>('idle')
  const [error, setError] = useState('')

  const isLoading = status === 'loading'
  const isSuccess = status === 'success'

  const handleLogout = async () => {
    setStatus('loading')
    setError('')

    try {
      const res = await fetch('/api/users/logout', {
        credentials: 'include',
        method: 'POST',
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message || 'Logout failed')
      }

      setStatus('success')
      router.refresh()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Logout failed')
    }
  }

  return (
    <div className="halftone-background relative min-h-screen overflow-hidden bg-[#0f172c] px-4 pb-12 pt-28 text-white sm:px-6 lg:px-8">
      <PageClient />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,162,224,0.24),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(247,168,27,0.18),transparent_34%)]" />
      <div className="absolute inset-0 bg-[url('/scren_texture.svg')] opacity-[0.08]" />
      <div className="absolute left-1/2 top-20 hidden h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-white/10 lg:block" />

      <main className="relative mx-auto grid min-h-[calc(100vh-10rem)] max-w-4xl place-items-center">
        <section className="w-full max-w-xl rounded-lg border border-white/15 bg-white/[0.96] p-5 text-[#0f172c] shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Interact Bucuresti Triumph"
              className="h-auto w-36 object-contain"
              height={90}
              src="/ClubLogo_Blue_Full.png"
              width={220}
            />
            <div className="inline-flex size-11 items-center justify-center rounded-md bg-[#0f172c] text-white">
              {isSuccess ? <CheckCircle2 className="size-5" /> : <LogOut className="size-5" />}
            </div>
          </div>

          {isSuccess ? (
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                Signed out
              </div>

              <h1 className="text-3xl font-semibold leading-tight">You have been logged out.</h1>
              <p className="mt-3 text-sm leading-6 text-[#526071]">
                Your member session has ended on this browser.
              </p>

              <Button
                asChild
                className="mt-8 h-12 w-full bg-[#0f172c] text-white shadow-lg shadow-[#0f172c]/20 transition hover:bg-[#141e34]"
              >
                <Link href="/members/login">Return to login</Link>
              </Button>
            </div>
          ) : (
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#00a2e0]/20 bg-[#00a2e0]/10 px-3 py-1 text-xs font-semibold uppercase text-[#017bb0]">
                <ShieldCheck className="size-3.5" />
                Secure sign out
              </div>

              <h1 className="text-3xl font-semibold leading-tight">
                Log out of your member account?
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#526071]">
                You will need to sign in again to access attendance, dues, and meeting tools.
              </p>

              {error && (
                <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Button
                  asChild
                  className="h-12 border-[#d7dde8] bg-white text-[#0f172c] shadow-none hover:bg-[#f4f7fb]"
                  variant="outline"
                >
                  <Link href="/members">
                    <ArrowLeft className="size-4" />
                    Back to dashboard
                  </Link>
                </Button>

                <Button
                  className="h-12 bg-[#0f172c] text-white shadow-lg shadow-[#0f172c]/20 transition hover:bg-[#141e34]"
                  disabled={isLoading}
                  onClick={handleLogout}
                  type="button"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                  {isLoading ? 'Logging out...' : 'Log out'}
                </Button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
