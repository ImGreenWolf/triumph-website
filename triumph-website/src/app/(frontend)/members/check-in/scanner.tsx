'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  QrScannerSurface,
  type QrScannerNotice,
  type QrScannerOverlayTone,
} from '../_components/QrScannerSurface'
import { onCodeScanned } from './actions'

type ScannerProps = {
  expectedCount: number
  hasMeeting: boolean
  initialCheckedInCount: number
}

const READY_NOTICE: QrScannerNotice = {
  message: 'Camera este pregătită.',
  title: 'Pregătit pentru scanare',
  tone: 'idle',
}

const INACTIVE_NOTICE: QrScannerNotice = {
  message: 'Scannerul pornește automat în fereastra de check-in a unei ședințe.',
  title: 'Scanner inactiv',
  tone: 'warning',
}

export function Scanner(props: ScannerProps) {
  const { expectedCount, hasMeeting, initialCheckedInCount } = props
  const [checkedInCount, setCheckedInCount] = useState(initialCheckedInCount)
  const [notice, setNotice] = useState<QrScannerNotice>(hasMeeting ? READY_NOTICE : INACTIVE_NOTICE)
  const clearNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const attendanceRate = useMemo(() => {
    if (expectedCount <= 0) return 0

    return Math.round((checkedInCount / expectedCount) * 100)
  }, [checkedInCount, expectedCount])

  useEffect(() => {
    setCheckedInCount(initialCheckedInCount)
  }, [initialCheckedInCount])

  useEffect(() => {
    setNotice(hasMeeting ? READY_NOTICE : INACTIVE_NOTICE)
  }, [hasMeeting])

  useEffect(() => {
    return () => {
      if (clearNoticeTimer.current) clearTimeout(clearNoticeTimer.current)
    }
  }, [])

  const resetNoticeLater = useCallback(() => {
    if (clearNoticeTimer.current) clearTimeout(clearNoticeTimer.current)

    clearNoticeTimer.current = setTimeout(() => {
      setNotice(READY_NOTICE)
    }, 6_500)
  }, [])

  const handleScan = useCallback(async (value: string): Promise<QrScannerOverlayTone> => {
    const response = await onCodeScanned(value)

    if (response.user) {
      if (response.counted) {
        setCheckedInCount((current) => current + 1)
      }

      const isLate = response.status === 'late'
      const tone = response.err || isLate ? 'warning' : 'success'

      setNotice({
        message: response.user.name || response.user.email,
        title: response.err || (isLate ? 'Întârziere înregistrată' : 'Prezență confirmată'),
        tone,
      })

      return tone
    }

    setNotice({
      message: response.err || 'Codul scanat nu a putut fi validat.',
      title: 'Scanare respinsă',
      tone: 'error',
    })

    return 'error'
  }, [])

  return (
    <section className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
      <div className="grid gap-4">
        <QrScannerSurface
          active={hasMeeting}
          busyLabel="Se verifică"
          inactiveMessage="Nu există ședință disponibilă pentru check-in."
          inactiveTitle="Scanner inactiv"
          notice={notice}
          onCameraError={(message) =>
            setNotice({
              message,
              title: 'Camera indisponibilă',
              tone: 'error',
            })
          }
          onScan={handleScan}
          onScanError={(message) =>
            setNotice({
              message,
              title: 'Eroare la scanare',
              tone: 'error',
            })
          }
          onScanSettled={resetNoticeLater}
          onScanStart={() =>
            setNotice({
              message: 'Se validează codul membrului.',
              title: 'Scanare în curs',
              tone: 'idle',
            })
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <CompactStat label="Prezenți" value={checkedInCount} />
          <CompactStat label="Progres" value={`${attendanceRate}%`} />
        </div>
      </div>
    </section>
  )
}

function CompactStat(props: { label: string; value: number | string }) {
  const { label, value } = props

  return (
    <div className="rounded-md border border-border bg-sidebar/60 p-3">
      <p className="text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export default Scanner
