// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const { auth, enable, disable } = vi.hoisted(() => ({
  auth: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
}))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: async () => ({ auth, logger: { error: vi.fn() } }) }))
vi.mock('next/headers', () => ({ draftMode: async () => ({ enable, disable }) }))
vi.mock('next/navigation', () => ({
  redirect: () => {
    throw new Error('redirected')
  },
}))
import { NextRequest } from 'next/server'
import { GET } from '@/app/(frontend)/next/preview/route'
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('PREVIEW_SECRET', 'test-preview')
})
const request = (path = '/') =>
  new NextRequest(
    `http://localhost/next/preview?previewSecret=test-preview&path=${encodeURIComponent(path)}`,
  )
describe('draft preview access', () => {
  it('requires a real authenticated user, not just an authentication-result object', async () => {
    auth.mockResolvedValue({ user: null })
    expect((await GET(request())).status).toBe(403)
    expect(enable).not.toHaveBeenCalled()
  })
  it('rejects redirects outside the site', async () => {
    expect((await GET(request('//example.com'))).status).toBe(500)
    expect((await GET(request('/\\example.com'))).status).toBe(500)
    expect(auth).not.toHaveBeenCalled()
  })
  it('enables preview for an authenticated user', async () => {
    auth.mockResolvedValue({ user: { id: 'member' } })
    await expect(GET(request())).rejects.toThrow('redirected')
    expect(enable).toHaveBeenCalledOnce()
  })
})
