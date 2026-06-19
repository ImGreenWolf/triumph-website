import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import type { Payment } from '@/payload-types'
import {
  getCoveredCount,
  getDuesSummary,
  getExpectedMonths,
  getMemberDues,
  getMemberDuesSummary,
  getOverdueCount,
  getPaidCount,
  getTotalOwed,
  getTotalPaid,
  getWaivedCount,
} from '@/utilities/memberDues'

const joinedAt = '2026-01-10T10:00:00.000Z'
const now = new Date('2026-06-19T10:00:00.000Z')
const payments = [
  {
    amount: 21,
    month: '2026-01-01T00:00:00.000Z',
    type: 'paid',
  },
  {
    amount: 35,
    month: '2026-03-01T00:00:00.000Z',
    type: 'paid',
  },
  {
    month: '2026-04-01T00:00:00.000Z',
    type: 'waived',
  },
] as Payment[]

describe('member dues utilities', () => {
  it('returns each expected month from joining through the current month', () => {
    expect(getExpectedMonths(joinedAt, now).map((month) => month.getMonth())).toEqual([
      0, 1, 2, 3, 4, 5,
    ])
  })

  it('calculates reusable dues totals and counts', () => {
    const dues = getMemberDues(payments, joinedAt, now)

    expect(getPaidCount(dues)).toBe(2)
    expect(getWaivedCount(dues)).toBe(1)
    expect(getCoveredCount(dues)).toBe(3)
    expect(getOverdueCount(dues)).toBe(2)
    expect(getTotalOwed(dues)).toBe(63)
    expect(getTotalPaid(dues)).toBe(56)
    expect(getDuesSummary(dues)).toMatchObject({
      coveredCount: 3,
      overdueCount: 2,
      paidCount: 2,
      totalOwed: 63,
      totalPaid: 56,
      waivedCount: 1,
    })
  })

  it('uses the overdue rate after four unpaid overdue months', () => {
    const dues = getMemberDues([], joinedAt, now)

    expect(dues.map((due) => due.amountDue)).toEqual([21, 21, 21, 21, 41, 21])
    expect(getTotalOwed(dues)).toBe(146)
  })

  it('fetches every payment and returns the member summary', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: payments }),
    } as unknown as Payload

    const summary = await getMemberDuesSummary(payload, { id: 'member-1', joinedAt }, now)

    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'payments', pagination: false }),
    )
    expect(summary.totalPaid).toBe(56)
  })
})
