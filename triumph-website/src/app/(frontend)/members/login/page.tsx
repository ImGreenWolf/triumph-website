'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

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

      router.push('/members/')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">
        Member Login
      </h1>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label>Email</label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2"
            required
          />
        </div>

        <div>
          <label>Password</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2"
            required
          />
        </div>

        {error && (
          <p className="text-red-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="border px-4 py-2"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}
