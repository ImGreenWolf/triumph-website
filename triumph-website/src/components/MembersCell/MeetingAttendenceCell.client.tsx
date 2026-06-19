'use client'

import './MemberCellMetrics.scss'

type MeetingAttendenceCellClientProps = {
  attendanceCount: number
  memberCount: number
}

export default function MeetingAttendenceCellClient({
  attendanceCount,
  memberCount,
}: MeetingAttendenceCellClientProps) {
  const attendanceRate = memberCount > 0 ? Math.round((attendanceCount / memberCount) * 100) : 0

  return (
    <div className="member-cell-metrics">
      <span className="member-cell-metrics__value">
        {attendanceCount}/{memberCount}
      </span>
      <span className="member-cell-metrics__value">{attendanceRate}%</span>
    </div>
  )
}
