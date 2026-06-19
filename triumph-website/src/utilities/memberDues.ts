import type { Payload } from 'payload'

import type { Payment, User } from '@/payload-types'

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

export function getMonthKey(month: Date) {
  return `${month.getFullYear()}-${month.getMonth()}`
}

export function getExpectedMonths(joinedAt: string, now = new Date()) {
  const joinedAtDate = new Date(joinedAt)
  const expectedMonths: Date[] = []
  const start = new Date(joinedAtDate.getFullYear(), joinedAtDate.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)

  for (let date = new Date(start); date <= end; date.setMonth(date.getMonth() + 1)) {
    expectedMonths.push(new Date(date))
  }

  return expectedMonths
}

export function getPaymentsByMonth(payments: Payment[]) {
  return new Map(payments.map((payment) => [getMonthKey(new Date(payment.month)), payment]))
}

export function getMemberDues(payments: Payment[], joinedAt: string, now = new Date()) {
  const paymentsByMonth = getPaymentsByMonth(payments)
  const currentMonthKey = getMonthKey(now)
  let overdueMonthsSeen = 0

  return getExpectedMonths(joinedAt, now).map<MemberDue>((month) => {
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

export async function getMemberDuesSummary(
  payload: Payload,
  member: Pick<User, 'id' | 'joinedAt'>,
  now = new Date(),
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

  return getDuesSummary(getMemberDues(payments, member.joinedAt, now))
}
