import type { Payload } from 'payload'

import type { Payment, User } from '@/payload-types'
import { getRotaryYearRange, getRotaryYearStart, isDateInRotaryYear } from '@/utilities/rotaryYear'

export const MONTHLY_DUE = 21
export const OVERDUE_DUE = 41
export const OVERDUE_GRACE_MONTHS = 4

export type MemberDue = {
  amountDue: number
  isCurrentMonth: boolean
  month: Date
  paid: boolean
  payment?: Payment
  waived: boolean
}

export type MemberDuesSummary = {
  coveredCount: number
  dues: MemberDue[]
  overdueCount: number
  paidCount: number
  totalOwed: number
  totalPaid: number
  waivedCount: number
}

export type MemberDuesSummaryWithMember = MemberDuesSummary & {
  member: Pick<User, 'id' | 'joinedAt' | 'name'>
  memberId: string
}

export type MembersDuesSummary = {
  memberSummaries: MemberDuesSummaryWithMember[]
  totalCoveredCount: number
  totalOverdueCount: number
  totalOwed: number
  totalPaid: number
  totalPaidCount: number
  totalWaivedCount: number
}

export function getMonthKey(month: Date) {
  return `${month.getFullYear()}-${month.getMonth()}`
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getExpectedEndDate(now: Date, rotaryYearStart: number) {
  const range = getRotaryYearRange(rotaryYearStart)

  if (now < range.start) return new Date(range.start.getTime() - 1)
  if (now >= range.endExclusive) return new Date(range.endExclusive.getTime() - 1)

  return now
}

function isPaymentInRotaryYear(payment: Pick<Payment, 'month'>, rotaryYearStart: number) {
  return isDateInRotaryYear(payment.month, rotaryYearStart)
}

function getScopedPayments(payments: Payment[], rotaryYearStart: number) {
  return payments.filter((payment) => isPaymentInRotaryYear(payment, rotaryYearStart))
}

export function getExpectedMonths(
  joinedAt: string,
  now = new Date(),
  rotaryYearStart = getRotaryYearStart(now),
) {
  const joinedAtDate = new Date(joinedAt)
  const expectedMonths: Date[] = []
  const range = getRotaryYearRange(rotaryYearStart)
  const joinedMonthStart = getMonthStart(joinedAtDate)
  const start = joinedMonthStart > range.start ? joinedMonthStart : range.start
  const end = getMonthStart(getExpectedEndDate(now, rotaryYearStart))

  if (Number.isNaN(joinedAtDate.getTime()) || start > end) return expectedMonths

  for (let date = new Date(start); date <= end; date.setMonth(date.getMonth() + 1)) {
    expectedMonths.push(new Date(date))
  }

  return expectedMonths
}

export function getPaymentsByMonth(payments: Payment[]) {
  return new Map(payments.map((payment) => [getMonthKey(new Date(payment.month)), payment]))
}

function getRelationId(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)

  if (typeof value === 'object') {
    if ('id' in value && value.id !== null && value.id !== undefined) {
      return String(value.id)
    }

    if ('_id' in value && value._id !== null && value._id !== undefined) {
      return String(value._id)
    }

    if ('toString' in value && typeof value.toString === 'function') {
      const stringValue = value.toString()

      if (stringValue !== '[object Object]') return stringValue
    }
  }

  return ''
}

export function getMemberId(member: Pick<User, 'id'>) {
  return getRelationId(member.id)
}

export function getPaymentMemberId(payment: Payment) {
  return getRelationId(payment.member)
}

export function getPaymentsByMember(payments: Payment[]) {
  return payments.reduce((paymentsByMember, payment) => {
    const memberId = getPaymentMemberId(payment)
    if (!memberId) return paymentsByMember

    const memberPayments = paymentsByMember.get(memberId) ?? []

    memberPayments.push(payment)
    paymentsByMember.set(memberId, memberPayments)

    return paymentsByMember
  }, new Map<string, Payment[]>())
}

export function getMemberDues(
  payments: Payment[],
  joinedAt: string,
  now = new Date(),
  rotaryYearStart = getRotaryYearStart(now),
) {
  const paymentsByMonth = getPaymentsByMonth(getScopedPayments(payments, rotaryYearStart))
  const currentMonthKey = getMonthKey(now)
  let overdueMonthsSeen = 0

  return getExpectedMonths(joinedAt, now, rotaryYearStart).map<MemberDue>((month) => {
    const payment = paymentsByMonth.get(getMonthKey(month))
    const isCurrentMonth = getMonthKey(month) === currentMonthKey
    let amountDue = 0

    if (!payment) {
      if (isCurrentMonth) {
        amountDue = MONTHLY_DUE
      } else {
        overdueMonthsSeen += 1
        amountDue = overdueMonthsSeen <= OVERDUE_GRACE_MONTHS ? MONTHLY_DUE : OVERDUE_DUE
      }
    }

    return {
      amountDue,
      isCurrentMonth,
      month,
      paid: Boolean(payment),
      payment,
      waived: payment?.type === 'waived',
    }
  })
}

export function getPaidCount(dues: MemberDue[]) {
  return dues.filter((due) => due.paid && !due.waived).length
}

export function getWaivedCount(dues: MemberDue[]) {
  return dues.filter((due) => due.waived).length
}

export function getCoveredCount(dues: MemberDue[]) {
  return getPaidCount(dues) + getWaivedCount(dues)
}

export function getOverdueCount(dues: MemberDue[]) {
  return dues.filter((due) => !due.paid && !due.isCurrentMonth).length
}

export function getTotalOwed(dues: MemberDue[]) {
  return dues.reduce((total, due) => total + due.amountDue, 0)
}

export function getTotalPaid(dues: MemberDue[]) {
  return dues.reduce((total, due) => {
    if (!due.paid || due.waived) return total

    return total + (due.payment?.amount ?? MONTHLY_DUE)
  }, 0)
}

export function isPaidPayment(payment: Payment) {
  return payment.type !== 'waived'
}

export function getPaidPayments(payments: Payment[]) {
  return payments.filter(isPaidPayment)
}

export function getPaidCountFromPayments(payments: Payment[]) {
  return getPaidPayments(payments).length
}

export function getWaivedCountFromPayments(payments: Payment[]) {
  return payments.filter((payment) => payment.type === 'waived').length
}

export function getCoveredCountFromPayments(payments: Payment[]) {
  return payments.length
}

export function getTotalPaidAmountFromPayments(payments: Payment[]) {
  return getPaidPayments(payments).reduce(
    (total, payment) => total + (payment.amount ?? MONTHLY_DUE),
    0,
  )
}

export function getTotalOwedFromPayments(
  payments: Payment[],
  joinedAt: string,
  now = new Date(),
  rotaryYearStart = getRotaryYearStart(now),
) {
  return getTotalOwed(getMemberDues(payments, joinedAt, now, rotaryYearStart))
}

export function getTotalPaidFromPayments(
  payments: Payment[],
  joinedAt?: string,
  now = new Date(),
  rotaryYearStart = getRotaryYearStart(now),
) {
  if (joinedAt) {
    return getTotalPaid(getMemberDues(payments, joinedAt, now, rotaryYearStart))
  }

  return getTotalPaidAmountFromPayments(payments)
}

export function getDuesSummary(dues: MemberDue[]): MemberDuesSummary {
  return {
    coveredCount: getCoveredCount(dues),
    dues,
    overdueCount: getOverdueCount(dues),
    paidCount: getPaidCount(dues),
    totalOwed: getTotalOwed(dues),
    totalPaid: getTotalPaid(dues),
    waivedCount: getWaivedCount(dues),
  }
}

export function getDuesSummaryFromPayments(
  payments: Payment[],
  joinedAt: string,
  now = new Date(),
  rotaryYearStart = getRotaryYearStart(now),
) {
  return getDuesSummary(getMemberDues(payments, joinedAt, now, rotaryYearStart))
}

export function getMemberDuesSummaries(
  members: Pick<User, 'id' | 'joinedAt'>[],
  payments: Payment[],
  now = new Date(),
  rotaryYearStart = getRotaryYearStart(now),
) {
  const paymentsByMember = getPaymentsByMember(payments)

  return members.map<MemberDuesSummaryWithMember>((member) => {
    const memberId = getMemberId(member)

    return {
      ...getDuesSummaryFromPayments(
        paymentsByMember.get(memberId) ?? [],
        member.joinedAt,
        now,
        rotaryYearStart,
      ),
      member,
      memberId,
    }
  })
}

export function getMembersDuesSummary(
  members: Pick<User, 'id' | 'joinedAt'>[],
  payments: Payment[],
  now = new Date(),
  rotaryYearStart = getRotaryYearStart(now),
): MembersDuesSummary {
  const memberSummaries = getMemberDuesSummaries(members, payments, now, rotaryYearStart)
  const memberIds = new Set(members.map(getMemberId))
  const memberPayments = getScopedPayments(payments, rotaryYearStart).filter((payment) =>
    memberIds.has(getPaymentMemberId(payment)),
  )
  const dueTotals = memberSummaries.reduce(
    (summary, memberSummary) => ({
      totalOverdueCount: summary.totalOverdueCount + memberSummary.overdueCount,
      totalOwed: summary.totalOwed + memberSummary.totalOwed,
    }),
    {
      totalOverdueCount: 0,
      totalOwed: 0,
    },
  )

  return {
    memberSummaries,
    totalCoveredCount: getCoveredCountFromPayments(memberPayments),
    totalOverdueCount: dueTotals.totalOverdueCount,
    totalOwed: dueTotals.totalOwed,
    totalPaid: getTotalPaidAmountFromPayments(memberPayments),
    totalPaidCount: getPaidCountFromPayments(memberPayments),
    totalWaivedCount: getWaivedCountFromPayments(memberPayments),
  }
}

export function getTotalOwedForMembers(
  members: Pick<User, 'id' | 'joinedAt'>[],
  payments: Payment[],
  now = new Date(),
  rotaryYearStart = getRotaryYearStart(now),
) {
  return getMembersDuesSummary(members, payments, now, rotaryYearStart).totalOwed
}

export function getTotalPaidForMembers(
  members: Pick<User, 'id' | 'joinedAt'>[],
  payments: Payment[],
  now = new Date(),
  rotaryYearStart = getRotaryYearStart(now),
) {
  return getMembersDuesSummary(members, payments, now, rotaryYearStart).totalPaid
}

export async function getMemberDuesSummary(
  payload: Payload,
  member: Pick<User, 'id' | 'joinedAt'>,
  now = new Date(),
  rotaryYearStart = getRotaryYearStart(now),
) {
  const paymentsDocs = await payload.find({
    collection: 'payments',
    where: {
      member: {
        equals: member.id,
      },
    },
    pagination: false,
    sort: 'month',
  })
  const payments = paymentsDocs.docs as Payment[]

  return getDuesSummaryFromPayments(payments, member.joinedAt, now, rotaryYearStart)
}

export async function getAllMembersDuesSummary(
  payload: Payload,
  now = new Date(),
  rotaryYearStart = getRotaryYearStart(now),
) {
  const [membersDocs, paymentsDocs] = await Promise.all([
    payload.find({
      collection: 'users',
      depth: 0,
      pagination: false,
      sort: 'joinedAt',
    }),
    payload.find({
      collection: 'payments',
      depth: 0,
      pagination: false,
      sort: 'month',
    }),
  ])

  return getMembersDuesSummary(
    membersDocs.docs as Pick<User, 'id' | 'joinedAt'>[],
    paymentsDocs.docs as Payment[],
    now,
    rotaryYearStart,
  )
}
