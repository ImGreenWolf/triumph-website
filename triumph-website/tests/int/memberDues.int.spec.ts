import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import type { Payment, User } from '@/payload-types'
import {
  getAllMembersDuesSummary,
  getCoveredCount,
  getDuesSummary,
  getDuesSummaryFromPayments,
  getExpectedMonths,
  getMemberDues,
  getMemberDuesSummary,
  getMembersDuesSummary,
  getOverdueCount,
  getPaidCount,
  getPaidCountFromPayments,
  getPaymentMemberId,
  getTotalOwed,
  getTotalOwedForMembers,
  getTotalOwedFromPayments,
  getTotalPaid,
  getTotalPaidAmountFromPayments,
  getTotalPaidForMembers,
  getTotalPaidFromPayments,
  getWaivedCount,
} from '@/utilities/memberDues'

const joinedAt = '2026-01-10T10:00:00.000Z'
const now = new Date('2026-06-19T10:00:00.000Z')
const payments = [
  {
    member: 'member-1',
    amount: 21,
    month: '2026-01-01T00:00:00.000Z',
    type: 'paid',
  },
  {
    member: 'member-1',
    amount: 35,
    month: '2026-03-01T00:00:00.000Z',
    type: 'paid',
  },
  {
    member: 'member-1',
    month: '2026-04-01T00:00:00.000Z',
    type: 'waived',
  },
] as Payment[]
const members = [
  {
    id: 'member-1',
    joinedAt,
  },
  {
    id: 'member-2',
    joinedAt: '2026-04-10T10:00:00.000Z',
  },
] as User[]
const allPayments = [
  ...payments,
  {
    member: {
      id: 'member-2',
    },
    amount: 21,
    month: '2026-04-01T00:00:00.000Z',
    type: 'paid',
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
    expect(getTotalOwedFromPayments(payments, joinedAt, now)).toBe(63)
    expect(getTotalPaidFromPayments(payments, joinedAt, now)).toBe(56)
    expect(getPaidCountFromPayments(payments)).toBe(2)
    expect(getTotalPaidAmountFromPayments(payments)).toBe(56)
    expect(getTotalPaidFromPayments(payments)).toBe(56)
    expect(getDuesSummaryFromPayments(payments, joinedAt, now)).toMatchObject({
      totalOwed: 63,
      totalPaid: 56,
    })
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

  it('calculates club-wide dues from all members and all payments', () => {
    const summary = getMembersDuesSummary(members, allPayments, now)

    expect(getPaymentMemberId(allPayments[3])).toBe('member-2')
    expect(summary.memberSummaries).toHaveLength(2)
    expect(summary.totalOwed).toBe(105)
    expect(summary.totalPaid).toBe(77)
    expect(summary.totalOverdueCount).toBe(3)
    expect(summary.totalCoveredCount).toBe(4)
    expect(summary.totalWaivedCount).toBe(1)
    expect(getTotalOwedForMembers(members, allPayments, now)).toBe(105)
    expect(getTotalPaidForMembers(members, allPayments, now)).toBe(77)
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

  it('fetches all members and payments for club-wide dues', async () => {
    const payload = {
      find: vi.fn(({ collection }) =>
        Promise.resolve({ docs: collection === 'users' ? members : allPayments }),
      ),
    } as unknown as Payload

    const summary = await getAllMembersDuesSummary(payload, now)

    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'users', depth: 0, pagination: false }),
    )
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'payments', depth: 0, pagination: false }),
    )
    expect(summary.totalOwed).toBe(105)
  })
})
