import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload } from 'payload'
import type { User } from '@/payload-types'
import { recordMemberCheckIn } from '@/utilities/recordMemberCheckIn'
import { POST } from '@/app/(frontend)/members/meetings/[meetingId]/check-in/submit/route'
import CheckInPage from '@/app/(frontend)/members/meetings/[meetingId]/check-in/page'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))
vi.mock('@/utilities/recordMemberCheckIn', () => ({ recordMemberCheckIn: vi.fn() }))
vi.mock('@/utilities/payloadAuth', () => ({
  getPayloadAuthHeaders: vi.fn(async () => new Headers()),
}))

const member = { id: 'authenticated-member', role: 'active' } as User
const params = Promise.resolve({ meetingId: 'meeting' })
const request = (headers?: HeadersInit) =>
  new Request('https://example.com/members/meetings/meeting/check-in/submit', {
    method: 'POST',
    headers,
  })
beforeEach(() => vi.clearAllMocks())

describe('member check-in HTTP boundary', () => {
  it('rejects unauthenticated and cross-site requests before any write', async () => {
    expect((await POST(request({ 'sec-fetch-site': 'cross-site' }), { params })).status).toBe(403)
    expect(getPayload).not.toHaveBeenCalled()
    vi.mocked(getPayload).mockResolvedValue({ auth: vi.fn(async () => ({ user: null })) } as never)
    expect((await POST(request(), { params })).status).toBe(401)
    expect(recordMemberCheckIn).not.toHaveBeenCalled()
  })

  it('uses the live authenticated identity and returns the mutation result', async () => {
    const payload = { auth: vi.fn(async () => ({ user: member })) }
    vi.mocked(getPayload).mockResolvedValue(payload as never)
    const result = { status: 'present', meetingDate: '2026-10-18T10:00:00Z' } as const
    vi.mocked(recordMemberCheckIn).mockResolvedValue(result)
    const response = await POST(request(), { params })
    expect(await response.json()).toEqual(result)
    expect(recordMemberCheckIn).toHaveBeenCalledWith(payload, member, 'meeting')
    expect(payload.auth).toHaveBeenCalledTimes(1)
  })

  it('returns the closed-window status from the live validator', async () => {
    vi.mocked(getPayload).mockResolvedValue({
      auth: vi.fn(async () => ({ user: member })),
    } as never)
    vi.mocked(recordMemberCheckIn).mockResolvedValue({
      error: 'Fereastra de check-in pentru această ședință s-a închis.',
      statusCode: 409,
    })
    const response = await POST(request(), { params })
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      message: 'Fereastra de check-in pentru această ședință s-a închis.',
    })
  })

  it('performs no attendance writes while rendering the GET page', async () => {
    vi.mocked(getPayload).mockResolvedValue({
      auth: vi.fn(async () => ({ user: member })),
    } as never)
    await CheckInPage({ params })
    expect(recordMemberCheckIn).not.toHaveBeenCalled()
  })
})
