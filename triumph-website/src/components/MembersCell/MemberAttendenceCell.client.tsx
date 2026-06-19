'use client'

import './MemberCellMetrics.scss'

type MeetingAttendenceCellClientProps = {
  attendanceCount: number
  meetingsCount: number
}

export default function MemberAttendenceCell({
  attendanceCount,
  meetingsCount,
}: MeetingAttendenceCellClientProps) {
  const attendanceRate = meetingsCount > 0 ? Math.round((attendanceCount / meetingsCount) * 100) : 0

  return (
    <div className="member-cell-metrics">
      <span className="member-cell-metrics__value">
        {attendanceCount}/{meetingsCount}
      </span>
      <span className="member-cell-metrics__value">{attendanceRate}%</span>
    </div>
  )
}
