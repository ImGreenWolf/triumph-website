'use client'

import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockIcon,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { trackMemberLogin } from '@/lib/ga4/appEvents'

import PageClient from './page.client'

const loginHighlights = [
  { icon: CalendarCheck2, label: 'Prezenta' },
  { icon: CheckCircle2, label: 'Cotizatii' },
  { icon: ShieldCheck, label: 'Resurse' },
]

export default function Login() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.errors?.[0]?.message || 'Login failed')
      }
      const redirectTo = getSafeRedirect(
        new URLSearchParams(window.location.search).get('redirect'),
      )
      trackMemberLogin({ redirectTo })
      router.replace(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="halftone-background min-h-dvh overflow-hidden bg-[#0f172c] px-4 pb-6 pt-20 text-white sm:px-6 sm:pt-24 lg:px-8 lg:py-28">
      <PageClient />

      <main className="mx-auto grid min-h-[calc(100dvh-6.5rem)] max-w-6xl items-center gap-4 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-14">
        <section className="mx-auto w-full max-w-md text-center lg:mx-0 lg:max-w-2xl lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase text-white/75">
            <ShieldCheck className="size-3.5 text-[#56c9f5]" />
            Members area
          </div>

          <h1 className="mt-4 text-2xl font-bold leading-tight sm:text-4xl lg:mt-5 lg:max-w-xl lg:text-5xl">
            Acceseaza contul tau de membru
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/68 sm:text-base lg:mx-0 lg:max-w-lg">
            Vezi prezenta, cotizatiile si sedintele clubului intr-un singur loc.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2 lg:mt-10 lg:grid lg:max-w-xl lg:grid-cols-3 lg:justify-start">
            {loginHighlights.map((item) => (
              <div
                className="inline-flex h-8 items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] px-3 text-xs font-bold text-white/80 lg:h-auto lg:flex-col lg:items-start lg:rounded-md lg:p-4 lg:text-sm"
                key={item.label}
              >
                <item.icon className="size-4 text-[#56c9f5] lg:size-5" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-lg border border-white/15 bg-white p-5 text-[#0f172c] shadow-2xl shadow-black/25 sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-4 sm:mb-7">
            <div className="flex min-w-0 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Interact Bucuresti Triumph"
                className="size-11 shrink-0 object-contain"
                height={88}
                src="/logo.png"
                width={88}
              />
            </div>
            <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-[#0f172c] text-white">
              <LockIcon className="size-4" />
            </div>
          </div>

          <div className="mb-5 sm:mb-7">
            <h2 className="text-2xl font-bold leading-tight text-[#0f172c] sm:text-3xl">
              Member login
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5d697b]">
              Use your club account to continue to the members dashboard.
            </p>
          </div>

          <form className="flex flex-col space-y-5" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label className="text-[#344054]" htmlFor="email">
                Email address
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#697386]" />
                <Input
                  autoComplete="email"
                  className="h-12 border-[#cfd7e3] bg-white pl-10 text-[#0f172c] placeholder:text-[#8b95a5] focus-visible:border-[#00a2e0] focus-visible:ring-[#00a2e0]/15"
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#344054]" htmlFor="password">
                Password
              </Label>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#697386]" />
                <Input
                  autoComplete="current-password"
                  className="h-12 border-[#cfd7e3] bg-white pl-10 pr-11 text-[#0f172c] placeholder:text-[#8b95a5] focus-visible:border-[#00a2e0] focus-visible:ring-[#00a2e0]/15"
                  id="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[#697386] transition hover:bg-[#eef3f8] hover:text-[#0f172c]"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="flex justify-end">
              <Link
                className="text-sm font-semibold text-[#007fb3] transition hover:text-[#005f86]"
                href="/members/password-reset"
              >
                Reseteaza parola
              </Link>
            </div>
            <Button
              className="h-12 w-full bg-[#0f172c] text-white shadow-lg shadow-[#0f172c]/20 transition hover:bg-[#141e34]"
              disabled={loading}
              type="submit"
            >
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading && <ArrowRight className="size-4" />}
            </Button>
          </form>
        </section>
      </main>
    </div>
  )
}

function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/members'
  }

  return value
}
