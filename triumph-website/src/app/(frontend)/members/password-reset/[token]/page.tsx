'use client'

import { ArrowRight, Eye, EyeOff, LockIcon } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

async function resetPassword(token: string, password: string) {
  const response = await fetch('/api/users/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ password, token }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.errors?.[0]?.message || data?.message || 'Nu am putut reseta parola.')
  }
}

export default function SetNewPasswordPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Parolele nu coincid.')
      return
    }

    setLoading(true)

    try {
      await resetPassword(params.token, password)
      router.replace('/members/login')
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Nu am putut reseta parola.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="halftone-background relative min-h-screen overflow-hidden bg-[#0f172c] px-4 pb-12 pt-28 text-white sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,162,224,0.28),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(247,168,27,0.22),transparent_32%)]" />
      <div className="absolute inset-0 bg-[url('/scren_texture.svg')] opacity-[0.08]" />

      <main className="relative mx-auto flex min-h-[calc(100vh-10rem)] max-w-md items-center">
        <section className="w-full rounded-lg border border-white/15 bg-card/[0.96] p-6 text-[#0f172c] shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Interact Bucuresti Triumph"
            className="mb-8 ml-auto h-auto w-48 object-contain"
            height={150}
            src="/logo_full.png"
            width={300}
          />

          <h1 className="text-3xl font-semibold leading-tight text-foreground">
            Alege o parolă nouă
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#526071]">
            Introdu noua parolă pentru contul tău de membru.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <PasswordInput
              autoComplete="new-password"
              id="password"
              label="Parolă nouă"
              onChange={setPassword}
              showPassword={showPassword}
              value={password}
            />
            <PasswordInput
              autoComplete="new-password"
              id="confirm-password"
              label="Confirmă parola"
              onChange={setConfirmPassword}
              showPassword={showPassword}
              value={confirmPassword}
            />

            <button
              className="inline-flex items-center gap-2 text-sm text-[#526071] transition hover:text-[#0f172c]"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {showPassword ? 'Ascunde parolele' : 'Arată parolele'}
            </button>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              className="h-12 w-full bg-foreground text-card shadow-lg shadow-[#0f172c]/20 transition hover:bg-sidebar hover:text-primary"
              disabled={loading}
              type="submit"
            >
              {loading ? 'Se resetează...' : 'Resetează parola'}
              {!loading && <ArrowRight className="size-4" />}
            </Button>
          </form>
        </section>
      </main>
    </div>
  )
}

type PasswordInputProps = {
  autoComplete: string
  id: string
  label: string
  onChange: (value: string) => void
  showPassword: boolean
  value: string
}

function PasswordInput({
  autoComplete,
  id,
  label,
  onChange,
  showPassword,
  value,
}: PasswordInputProps) {
  return (
    <div className="space-y-2">
      <Label className="text-primary/50" htmlFor={id}>
        {label}
      </Label>
      <div className="relative">
        <LockIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
        <Input
          autoComplete={autoComplete}
          className="h-12 border-accent bg-[#0f172c] pl-10 text-primary placeholder:text-[#8b95a5] focus-visible:ring-[#00a2e0]/20"
          id={id}
          minLength={8}
          onChange={(event) => onChange(event.target.value)}
          required
          type={showPassword ? 'text' : 'password'}
          value={value}
        />
      </div>
    </div>
  )
}
