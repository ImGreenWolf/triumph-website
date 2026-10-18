// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPayload } from 'payload'
import { getMemberReads } from '@/utilities/memberReads'
import { getDashboardBootstrap } from '@/app/(frontend)/members/(dashboard)/bootstrap'
import type { User } from '@/payload-types'

vi.mock('server-only', () => ({}))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))
vi.mock('@/utilities/memberReads', () => ({ getMemberReads: vi.fn() }))
vi.mock('@/utilities/payloadAuth', () => ({
  getPayloadAuthHeaders: vi.fn(async () => new Headers()),
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`)
  },
}))

const user = {
  id: 'member',
  name: 'Alexandra',
  email: 'alexandra@example.com',
  role: 'president',
  clubMail: 'alexandra@club.example',
  clubMailPassword: 'server-only-test-credential',
} as User
beforeEach(() => vi.clearAllMocks())

function setup(member: User | null = user) {
  const auth = vi.fn(async () => ({ user: member }))
  const findGlobal = vi.fn(async () => ({ id: 'dashboard', dashboardTitle: 'Dashboard Membrii' }))
  const count = vi.fn(async () => ({ totalDocs: 1 }))
  const findByID = vi.fn()
  vi.mocked(getPayload).mockResolvedValue({ auth } as never)
  vi.mocked(getMemberReads).mockReturnValue({ findGlobal, count, findByID } as never)
  return { auth, findGlobal, count, findByID }
}

describe('initial member dashboard bootstrap', () => {
  it('resolves settings and navigation while leaving photos and card data asynchronous', async () => {
    const { auth, findGlobal, count, findByID } = setup()
    const bootstrap = await getDashboardBootstrap()
    expect(auth).toHaveBeenCalledTimes(1)
    expect(findGlobal).toHaveBeenCalledWith({ slug: 'members-dashboard', depth: 0 })
    expect(count).toHaveBeenCalledTimes(1)
    expect(bootstrap.shell.capabilities).toEqual({ projects: true, commissions: true, board: true })
    expect(bootstrap.shell.hasWebmail).toBe(true)
    expect(JSON.stringify(bootstrap.shell)).not.toContain('server-only-test-credential')
    expect(findByID).not.toHaveBeenCalled()
  })

  it('uses cached assignment queries for non-board tool visibility', async () => {
    const { count } = setup({ ...user, role: 'active' })
    count.mockResolvedValue({ totalDocs: 0 })
    const { shell } = await getDashboardBootstrap()
    expect(shell.capabilities).toEqual({ projects: false, commissions: false, board: false })
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'comissions',
        where: { coordinators: { contains: user.id } },
      }),
    )
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'events',
        where: {
          or: [{ coordonators: { contains: user.id } }, { checkInMembers: { contains: user.id } }],
        },
      }),
    )
  })

  it('redirects unauthenticated requests before reading any private cached content', async () => {
    const { findGlobal, count } = setup(null)
    await expect(getDashboardBootstrap()).rejects.toThrow('redirect:/members/login')
    expect(getMemberReads).not.toHaveBeenCalled()
    expect(findGlobal).not.toHaveBeenCalled()
    expect(count).not.toHaveBeenCalled()
  })
})
