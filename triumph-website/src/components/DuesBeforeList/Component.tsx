'use client'

import { useMemo, useState } from 'react'

import { usePayloadAPI } from '@payloadcms/ui'

import type { Payment, User } from '@/payload-types'
import { getMembersDuesSummary, MONTHLY_DUE } from '@/utilities/memberDues'
import {
  formatRotaryYearLabel,
  getRotaryYearEnd,
  getRotaryYearRange,
  getRotaryYearStart,
  getRotaryYearStartsFromDates,
  isDateInRotaryYear,
} from '@/utilities/rotaryYear'

import './index.scss'

type PaymentWithRelations = Omit<Payment, 'member'> & {
  member: string | User
}

type PaymentsListResponse = {
  docs?: PaymentWithRelations[]
}

type UsersListResponse = {
  docs?: User[]
}

type SectionKey = 'debtors' | 'monthly' | 'recent'

type SummaryCardProps = {
  helper: string
  label: string
  tone?: 'danger' | 'success' | 'warning'
  value: string
}

const currencyFormatter = new Intl.NumberFormat('ro-RO', {
  currency: 'RON',
  maximumFractionDigits: 0,
  style: 'currency',
})

const numberFormatter = new Intl.NumberFormat('ro-RO')

const monthFormatter = new Intl.DateTimeFormat('ro-RO', {
  month: 'long',
  year: 'numeric',
})

const dateFormatter = new Intl.DateTimeFormat('ro-RO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const sectionOptions: { key: SectionKey; label: string }[] = [
  { key: 'debtors', label: 'Restanțieri' },
  { key: 'recent', label: 'Ultimele plăți' },
  { key: 'monthly', label: 'Sumar lunar' },
]

const getRelationId = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)

  if (typeof value === 'object') {
    if ('id' in value && value.id !== null && value.id !== undefined) {
      return String(value.id)
    }
  }

  return ''
}

const getMemberName = (member: PaymentWithRelations['member']) => {
  if (typeof member === 'object' && member !== null) {
    return member.name || member.email || getRelationId(member)
  }

  return member || 'Membru'
}

const formatCurrency = (value: number) => currencyFormatter.format(value)

const formatNumber = (value: number) => numberFormatter.format(value)

const formatPercent = (value: number) => `${Math.round(value)}%`

const formatMonth = (value: Date | string | null | undefined) => {
  if (!value) return 'Lună necunoscută'

  const date = typeof value === 'string' ? new Date(value) : value

  if (Number.isNaN(date.getTime())) return 'Lună necunoscută'

  return monthFormatter.format(date)
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Dată necunoscută'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Dată necunoscută'

  return dateFormatter.format(date)
}

const formatRotaryYearRange = (rotaryYearStart: number) => {
  const range = getRotaryYearRange(rotaryYearStart)
  const end = getRotaryYearEnd(rotaryYearStart)

  return `${formatDate(range.start.toISOString())} - ${formatDate(end.toISOString())}`
}

const getPaymentMonthKey = (payment: Pick<PaymentWithRelations, 'month'>) => {
  const date = new Date(payment.month)

  if (Number.isNaN(date.getTime())) return ''

  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`
}

const getPaymentTypeLabel = (type: Payment['type']) => {
  if (type === 'waived') return 'Scutită'

  return 'Plătită'
}

const getCoverageRate = (covered: number, expected: number) => {
  if (expected <= 0) return 0

  return (covered / expected) * 100
}

function SummaryCard({ helper, label, tone, value }: SummaryCardProps) {
  return (
    <div className={`dues-before-list__card${tone ? ` dues-before-list__card--${tone}` : ''}`}>
      <span className="dues-before-list__cardLabel">{label}</span>
      <strong className="dues-before-list__cardValue">{value}</strong>
      <span className="dues-before-list__cardHelper">{helper}</span>
    </div>
  )
}

export default function DuesBeforeList() {
  const now = useMemo(() => new Date(), [])
  const [activeSection, setActiveSection] = useState<SectionKey>('debtors')
  const [selectedRotaryYear, setSelectedRotaryYear] = useState(() => getRotaryYearStart(now))

  const [{ data: paymentsData, isError: paymentsError, isLoading: paymentsLoading }] =
    usePayloadAPI('/api/payments', {
      initialParams: {
        depth: 1,
        limit: 1000,
        sort: '-createdAt',
        where: {},
      },
    })

  const [{ data: usersData, isError: usersError, isLoading: usersLoading }] = usePayloadAPI(
    '/api/users',
    {
      initialParams: {
        depth: 0,
        limit: 1000,
        sort: 'name',
        where: {},
      },
    },
  )

  const payments = useMemo(
    () =>
      ((paymentsData as PaymentsListResponse | undefined)?.docs ?? []) as PaymentWithRelations[],
    [paymentsData],
  )

  const members = useMemo(
    () => (((usersData as UsersListResponse | undefined)?.docs ?? []) as User[]).filter(Boolean),
    [usersData],
  )

  const rotaryYears = useMemo(
    () =>
      getRotaryYearStartsFromDates(
        [...payments.map((payment) => payment.month), ...members.map((member) => member.joinedAt)],
        now,
      ),
    [members, now, payments],
  )

  const selectedPayments = useMemo(
    () => payments.filter((payment) => isDateInRotaryYear(payment.month, selectedRotaryYear)),
    [payments, selectedRotaryYear],
  )

  const summary = useMemo(
    () => getMembersDuesSummary(members, payments, now, selectedRotaryYear),
    [members, now, payments, selectedRotaryYear],
  )

  const expectedDuesCount = summary.memberSummaries.reduce(
    (total, memberSummary) => total + memberSummary.dues.length,
    0,
  )
  const coveredRate = getCoverageRate(summary.totalCoveredCount, expectedDuesCount)
  const membersWithOpenDues = summary.memberSummaries.filter(
    (memberSummary) => memberSummary.totalOwed > 0,
  )
  const overdueMembers = summary.memberSummaries.filter(
    (memberSummary) => memberSummary.overdueCount > 0,
  )
  const debtorRows = membersWithOpenDues
    .slice()
    .sort(
      (left, right) => right.totalOwed - left.totalOwed || right.overdueCount - left.overdueCount,
    )
    .slice(0, 8)

  const recentPayments = selectedPayments
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 8)

  const monthlyRows = Array.from(
    selectedPayments.reduce((rows, payment) => {
      const key = getPaymentMonthKey(payment)
      if (!key) return rows

      const existing = rows.get(key) ?? {
        amount: 0,
        label: formatMonth(payment.month),
        paid: 0,
        time: new Date(payment.month).getTime(),
        waived: 0,
      }

      if (payment.type === 'waived') {
        existing.waived += 1
      } else {
        existing.paid += 1
        existing.amount += payment.amount ?? MONTHLY_DUE
      }

      rows.set(key, existing)

      return rows
    }, new Map<string, { amount: number; label: string; paid: number; time: number; waived: number }>()),
  )
    .map(([key, row]) => ({ key, ...row }))
    .sort((left, right) => right.time - left.time)
    .slice(0, 8)

  const isLoading = paymentsLoading || usersLoading
  const isError = paymentsError || usersError
  const selectedYearLabel = formatRotaryYearLabel(selectedRotaryYear)

  if (isLoading) {
    return (
      <section className="dues-before-list" aria-label="Sumar cotizații">
        <p className="dues-before-list__state">Se încarcă sumarul cotizațiilor...</p>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="dues-before-list" aria-label="Sumar cotizații">
        <p className="dues-before-list__state dues-before-list__state--error">
          Nu am putut încărca sumarul cotizațiilor.
        </p>
      </section>
    )
  }

  return (
    <section className="dues-before-list" aria-label="Sumar cotizații">
      <div className="dues-before-list__header">
        <div>
          <h2 className="dues-before-list__title">Sumar cotizații</h2>
          <p className="dues-before-list__description">
            Situația cotizațiilor pentru {formatNumber(members.length)} membri în{' '}
            {selectedYearLabel.toLowerCase()}, calculată pe baza plăților și scutirilor
            înregistrate.
          </p>
        </div>

        <div className="dues-before-list__actions" aria-label="Acțiuni rapide">
          <label className="dues-before-list__yearField" htmlFor="dues-rotary-year">
            <span>An Rotary</span>
            <select
              id="dues-rotary-year"
              value={selectedRotaryYear}
              onChange={(event) => setSelectedRotaryYear(Number(event.target.value))}
            >
              {rotaryYears.map((year) => (
                <option key={year} value={year}>
                  {formatRotaryYearLabel(year)}
                </option>
              ))}
            </select>
          </label>
          <a
            className="dues-before-list__action dues-before-list__action--primary"
            href="/admin/collections/payments/create"
          >
            Înregistrează plată
          </a>
          <a className="dues-before-list__action" href="/admin/collections/users">
            Deschide membri
          </a>
          <button
            className="dues-before-list__action"
            onClick={() => setActiveSection('debtors')}
            type="button"
          >
            Vezi restanțieri
          </button>
        </div>
      </div>

      <div className="dues-before-list__cards">
        <SummaryCard
          helper={`${formatNumber(summary.totalPaidCount)} plăți înregistrate`}
          label="Încasat"
          tone="success"
          value={formatCurrency(summary.totalPaid)}
        />
        <SummaryCard
          helper={`${formatNumber(summary.totalOverdueCount)} cotizații restante`}
          label="De încasat"
          tone={summary.totalOwed > 0 ? 'danger' : undefined}
          value={formatCurrency(summary.totalOwed)}
        />
        <SummaryCard
          helper={`${formatNumber(overdueMembers.length)} membri cu restanțe vechi`}
          label="Membri cu sume de încasat"
          tone={membersWithOpenDues.length > 0 ? 'warning' : undefined}
          value={formatNumber(membersWithOpenDues.length)}
        />
        <SummaryCard
          helper={`${formatNumber(summary.totalCoveredCount)} din ${formatNumber(expectedDuesCount)} cotizații`}
          label="Acoperire cotizații"
          value={formatPercent(coveredRate)}
        />
        <SummaryCard
          helper={formatRotaryYearRange(selectedRotaryYear)}
          label="Perioadă"
          value={selectedYearLabel.replace('Anul Rotary ', '')}
        />
        <SummaryCard
          helper="Cotizații marcate ca scutite"
          label="Scutiri"
          value={formatNumber(summary.totalWaivedCount)}
        />
      </div>

      <div className="dues-before-list__tabs" role="tablist" aria-label="Detalii cotizații">
        {sectionOptions.map((option) => (
          <button
            aria-selected={activeSection === option.key}
            className={`dues-before-list__tab${activeSection === option.key ? ' dues-before-list__tab--active' : ''}`}
            key={option.key}
            onClick={() => setActiveSection(option.key)}
            role="tab"
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {activeSection === 'debtors' ? (
        <div className="dues-before-list__panel">
          <div className="dues-before-list__panelHeader">
            <h3>Restanțieri principali</h3>
            <span>{formatNumber(membersWithOpenDues.length)} membri cu sume de încasat</span>
          </div>

          {debtorRows.length === 0 ? (
            <p className="dues-before-list__empty">Nu există membri cu cotizații restante.</p>
          ) : (
            <div className="dues-before-list__tableWrap">
              <table className="dues-before-list__table">
                <thead>
                  <tr>
                    <th>Membru</th>
                    <th>Restanțe</th>
                    <th>De încasat</th>
                    <th>Acțiune</th>
                  </tr>
                </thead>
                <tbody>
                  {debtorRows.map((memberSummary) => (
                    <tr key={memberSummary.memberId}>
                      <td>{memberSummary.member.name || memberSummary.memberId}</td>
                      <td>{formatNumber(memberSummary.overdueCount)}</td>
                      <td>{formatCurrency(memberSummary.totalOwed)}</td>
                      <td>
                        <a href={`/admin/collections/users/${memberSummary.memberId}`}>Deschide</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {activeSection === 'recent' ? (
        <div className="dues-before-list__panel">
          <div className="dues-before-list__panelHeader">
            <h3>Ultimele plăți</h3>
            <span>{formatNumber(selectedPayments.length)} înregistrări în anul selectat</span>
          </div>

          {recentPayments.length === 0 ? (
            <p className="dues-before-list__empty">Nu există plăți înregistrate.</p>
          ) : (
            <div className="dues-before-list__tableWrap">
              <table className="dues-before-list__table">
                <thead>
                  <tr>
                    <th>Membru</th>
                    <th>Lună</th>
                    <th>Tip</th>
                    <th>Sumă</th>
                    <th>Creată</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <a href={`/admin/collections/payments/${payment.id}`}>
                          {getMemberName(payment.member)}
                        </a>
                      </td>
                      <td>{formatMonth(payment.month)}</td>
                      <td>{getPaymentTypeLabel(payment.type)}</td>
                      <td>
                        {payment.type === 'waived'
                          ? '-'
                          : formatCurrency(payment.amount ?? MONTHLY_DUE)}
                      </td>
                      <td>{formatDate(payment.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {activeSection === 'monthly' ? (
        <div className="dues-before-list__panel">
          <div className="dues-before-list__panelHeader">
            <h3>Sumar lunar</h3>
            <span>Ultimele luni cu înregistrări</span>
          </div>

          {monthlyRows.length === 0 ? (
            <p className="dues-before-list__empty">Nu există date lunare de afișat.</p>
          ) : (
            <div className="dues-before-list__tableWrap">
              <table className="dues-before-list__table">
                <thead>
                  <tr>
                    <th>Lună</th>
                    <th>Plătite</th>
                    <th>Scutite</th>
                    <th>Încasat</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map((row) => (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      <td>{formatNumber(row.paid)}</td>
                      <td>{formatNumber(row.waived)}</td>
                      <td>{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}
