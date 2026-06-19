'use client'

import type { MemberDuesSummary } from '@/utilities/memberDues'

import './MemberCellMetrics.scss'

type MeetingAttendenceCellClientProps = {
  summary: MemberDuesSummary
}

export default function MemberPaymentCell({ summary }: MeetingAttendenceCellClientProps) {
  return (
    <div className="member-cell-metrics">
      <span className="member-cell-metrics__value">
        {summary.paidCount}/{summary.dues.length}
      </span>
      <span className="member-cell-metrics__value">{summary.totalOwed} lei</span>
    </div>
  )
}
