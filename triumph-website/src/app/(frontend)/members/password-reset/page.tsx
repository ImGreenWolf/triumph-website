'use client'

import {
  ArrowRight,
  CalendarCheck2,
  CheckIcon,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import PageClient from './page.client'

async function resetEmail(email: string) {
  const normalizedEmail = email.trim()

  if (!normalizedEmail) {
    throw new Error('Introdu o adresa de mail')
  }

  const res = await fetch('/api/users/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: normalizedEmail,
    }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.errors?.[0]?.message || data?.message || 'Password reset failed')
  }
}
export default function PasswordResetPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError('')
    setSent(false)

    try {
      await resetEmail(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="halftone-background relative min-h-screen overflow-hidden bg-[#0f172c] px-4 pb-12 pt-28 text-white sm:px-6 lg:px-8">
      <PageClient />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,162,224,0.28),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(247,168,27,0.22),transparent_32%)]" />
      <div className="absolute inset-0 bg-[url('/scren_texture.svg')] opacity-[0.08]" />
      <div className="absolute left-1/2 top-20 hidden h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-white/10 lg:block" />
      <div className="absolute right-8 top-36 hidden h-40 w-40 rounded-full border border-[#f7a81b]/30 lg:block" />

      <main className="relative mx-auto grid min-h-[calc(100vh-10rem)] max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="hidden max-w-2xl lg:block">
         
          <h1 className="max-w-xl text-5xl font-semibold leading-tight tracking-normal">
            Reseteaza parola contului tau de membru Interact Bucureşti Triumph
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-white/70">
            Introdu adresa ta de email si acceseaza linkul din casuta de mail pentru a reseta parola.
          </p>

          <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              { icon: CalendarCheck2, label: 'Prezența' },
              { icon: CheckIcon, label: 'Cotizațiile' },
              { icon: ShieldCheck, label: 'Linkuri Utile' },
            ].map((item) => (
              <div
                className="rounded-lg border border-white/12 bg-card p-4 text-sm font-medium text-white/85 backdrop-blur"
                key={item.label}
              >
                <item.icon className="mb-4 size-5 text-[#00a2e0]" />
                {item.label}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-white/15 bg-card/[0.96] p-2 text-[#0f172c] shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
          <div className="mb-8 flex flex-row-reverse items-center justify-between gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Interact Bucuresti Triumph"
              className="h-auto w-48 object-contain"
              height={150}
              src="/logo_full.png"
              width={300}
            />
            
          </div>

          <div className="mb-8">
            <h2 className="text-3xl text-foreground font-semibold leading-tight">Resetează Parola</h2>
            <p className="mt-2 text-sm leading-6 text-[#526071]">
             Introdu adresa de email.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6b7280]" />
                <Input
                  autoComplete="email"
                  className="h-12 border-accent bg-[#0f172c] pl-10 text-[#0f172c] placeholder:text-[#8b95a5] focus-visible:ring-[#00a2e0]/20"
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {sent && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Dacă adresa există, vei primi un email cu linkul de resetare.
              </div>
            )}

            <Button
              className="h-12 w-full bg-foreground text-card hover:text-primary shadow-lg shadow-[#0f172c]/20 transition hover:bg-sidebar"
              disabled={loading}
              type="submit"
            >
              {loading ? 'Se trimite...' : 'Trimite Mail'}
              {!loading && <ArrowRight className="size-4" />}
            </Button>
          </form>
        </section>
      </main>
    </div>
  )
}
