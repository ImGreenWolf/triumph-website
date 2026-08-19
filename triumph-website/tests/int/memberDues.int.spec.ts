import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import type { Meeting, Payment, User } from '@/payload-types'
import {
  getAllMembersDuesSummary,
  getCoveredCount,
  getDuesSummary,
  getDuesSummaryFromPayments,
  getExpectedMonths,
  getFirstMeetingDate,
  getMemberDues,
  getMemberDuesSummary,
  getMembersDuesSummary,
  getMonthKey,
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
const firstMeetingAt = '2026-01-15T18:00:00.000Z'
const meetings = [{ meetingDate: firstMeetingAt }] as Meeting[]
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

  it('scopes expected months to the selected Rotary year', () => {
    const august = new Date('2026-08-15T10:00:00.000Z')

    expect(getExpectedMonths('2025-01-10T10:00:00.000Z', august).map(getMonthKey)).toEqual([
      '2026-6',
      '2026-7',
    ])
    expect(getExpectedMonths('2025-01-10T10:00:00.000Z', august, 2025).map(getMonthKey)).toEqual([
      '2025-6',
      '2025-7',
      '2025-8',
      '2025-9',
      '2025-10',
      '2025-11',
      '2026-0',
      '2026-1',
      '2026-2',
      '2026-3',
      '2026-4',
      '2026-5',
    ])
  })

  it('starts expected months from the first meeting in the selected Rotary year', () => {
    const october = new Date('2026-10-10T10:00:00.000Z')

    expect(
      getExpectedMonths('2026-07-01T10:00:00.000Z', october, 2026, {
        firstMeetingAt: '2026-09-12T18:00:00.000Z',
      }).map(getMonthKey),
    ).toEqual(['2026-8', '2026-9'])
  })

  it('does not calculate dues when the selected Rotary year has no past meeting', () => {
    const september = new Date('2026-09-01T10:00:00.000Z')

    expect(
      getExpectedMonths('2026-07-01T10:00:00.000Z', september, 2026, {
        firstMeetingAt: null,
      }),
    ).toEqual([])
    expect(
      getExpectedMonths('2026-07-01T10:00:00.000Z', september, 2026, {
        firstMeetingAt: '2026-09-12T18:00:00.000Z',
      }),
    ).toEqual([])
    expect(
      getMemberDues([], '2026-07-01T10:00:00.000Z', september, 2026, {
        firstMeetingAt: null,
      }),
    ).toEqual([])
  })

  it('finds the first past meeting in the selected Rotary year', () => {
    const october = new Date('2026-10-10T10:00:00.000Z')
    const firstMeeting = getFirstMeetingDate(
      [
        { meetingDate: '2026-09-01T18:00:00.000Z' },
        { meetingDate: '2026-07-15T18:00:00.000Z' },
        { meetingDate: '2027-07-15T18:00:00.000Z' },
      ] as Meeting[],
      october,
      2026,
    )

    expect(firstMeeting?.toISOString()).toBe('2026-07-15T18:00:00.000Z')
  })

  it('does not count payments outside the selected Rotary year', () => {
    const summary = getDuesSummaryFromPayments(
      [
        ...payments,
        {
          member: 'member-1',
          amount: 21,
          month: '2025-08-01T00:00:00.000Z',
          type: 'paid',
        },
      ] as Payment[],
      joinedAt,
      now,
    )

    expect(summary.totalPaid).toBe(56)
    expect(summary.paidCount).toBe(2)
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
      find: vi.fn(({ collection }) =>
        Promise.resolve({ docs: collection === 'meetings' ? meetings : payments }),
      ),
    } as unknown as Payload

    const summary = await getMemberDuesSummary(payload, { id: 'member-1', joinedAt }, now)

    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'payments', pagination: false }),
    )
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'meetings', depth: 0, limit: 1, pagination: false }),
    )
    expect(summary.totalPaid).toBe(56)
  })

  it('fetches all members and payments for club-wide dues', async () => {
    const payload = {
      find: vi.fn(({ collection }) =>
        Promise.resolve({
          docs:
            collection === 'users' ? members : collection === 'meetings' ? meetings : allPayments,
        }),
      ),
    } as unknown as Payload

    const summary = await getAllMembersDuesSummary(payload, now)

    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'users', depth: 0, pagination: false }),
    )
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'payments', depth: 0, pagination: false }),
    )
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'meetings', depth: 0, limit: 1, pagination: false }),
    )
    expect(summary.totalOwed).toBe(105)
  })
})
