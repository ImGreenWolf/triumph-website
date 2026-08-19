'use client'

import dynamic from 'next/dynamic'
import { AlertCircle, CheckCircle2, Loader2, QrCode, UserCheck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/utilities/ui'

import { onCodeScanned } from './actions'

const BarcodeScanner = dynamic(() => import('react-qr-barcode-scanner'), {
  loading: () => <ScannerPlaceholder />,
  ssr: false,
})

type ScannerUser = {
  email: string
  id: string
  name?: string | null
}

type NoticeTone = 'idle' | 'success' | 'warning' | 'error'

type ScanNotice = {
  message: string
  title: string
  tone: NoticeTone
}

type ScannerProps = {
  expectedCount: number
  hasMeeting: boolean
  initialCheckedInCount: number
  user: ScannerUser
}

type ScanPoint = {
  getX: () => number
  getY: () => number
}

type ScanResult = {
  getResultPoints: () => ScanPoint[]
  getText: () => string
  getTimestamp: () => number
}

type CanvasPoint = {
  x: number
  y: number
}

type OverlayTone = 'active' | 'success' | 'warning' | 'error'

type ScanOverlay = {
  lastSeenAt: number
  pixelRatio: number
  points: CanvasPoint[]
  pulseStartedAt: number
  snapStartedAt: number
  tone: OverlayTone
  toneStartedAt: number
}

const READY_NOTICE: ScanNotice = {
  message: 'Camera este pregătită.',
  title: 'Pregătit pentru scanare',
  tone: 'idle',
}

const SCAN_THROTTLE_MS = 3_500
const SNAP_DURATION_MS = 240
const TONE_FLASH_DURATION_MS = 420
const PULSE_DURATION_MS = 1_200
const DEFAULT_SCANNER_ASPECT_RATIO = 4 / 5
const QR_OVERLAY_MIN_OFFSET_PX = 10
const QR_OVERLAY_OFFSET_RATIO = 0.22

const overlayColors: Record<OverlayTone, { glow: string; stroke: string }> = {
  active: {
    glow: '0, 162, 224',
    stroke: '255, 255, 255',
  },
  error: {
    glow: '239, 68, 68',
    stroke: '248, 113, 113',
  },
  success: {
    glow: '16, 185, 129',
    stroke: '52, 211, 153',
  },
  warning: {
    glow: '247, 168, 27',
    stroke: '247, 168, 27',
  },
}

export function Scanner(props: ScannerProps) {
  const { expectedCount, hasMeeting, initialCheckedInCount, user } = props
  const [checkedInCount, setCheckedInCount] = useState(initialCheckedInCount)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState<ScanNotice>(
    hasMeeting
      ? READY_NOTICE
      : {
          message: 'Scannerul pornește automat când există o ședință în ziua curentă.',
          title: 'Scanner inactiv',
          tone: 'warning',
        },
  )

  const [scannerAspectRatio, setScannerAspectRatio] = useState(DEFAULT_SCANNER_ASPECT_RATIO)

  const animationFrameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const clearNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearOverlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightScan = useRef(false)
  const lastScan = useRef<{ at: number; value: string } | null>(null)
  const overlayRef = useRef<ScanOverlay | null>(null)
  const scannerSurfaceRef = useRef<HTMLDivElement | null>(null)

  const attendanceRate = useMemo(() => {
    if (expectedCount <= 0) return 0

    return Math.round((checkedInCount / expectedCount) * 100)
  }, [checkedInCount, expectedCount])

  const videoConstraints = useMemo<MediaTrackConstraints>(
    () => ({
      aspectRatio: scannerAspectRatio,
      facingMode: 'environment',
      frameRate: 60,
    }),
    [scannerAspectRatio],
  )

  const clearScanOverlay = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) return

    overlayRef.current = null
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const scheduleOverlayClear = useCallback(() => {
    if (clearOverlayTimer.current) clearTimeout(clearOverlayTimer.current)

    clearOverlayTimer.current = setTimeout(() => {
      clearScanOverlay()
    }, 350)
  }, [clearScanOverlay])

  const startOverlayAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) return

    const animate = () => {
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')
      const overlay = overlayRef.current

      if (!canvas || !context || !overlay) {
        animationFrameRef.current = null
        return
      }

      renderScanOverlay(context, canvas, overlay, performance.now())
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [])

  const updateScanOverlay = useCallback(
    (result: ScanResult, options?: { snap?: boolean; tone?: OverlayTone }) => {
      const canvas = canvasRef.current
      const surface = scannerSurfaceRef.current
      const points = result.getResultPoints().slice(0, 3)

      if (!canvas || !surface || points.length < 3) return

      if (clearOverlayTimer.current) clearTimeout(clearOverlayTimer.current)

      const bounds = surface.getBoundingClientRect()
      const pixelRatio = window.devicePixelRatio || 1
      const width = Math.max(1, Math.round(bounds.width * pixelRatio))
      const height = Math.max(1, Math.round(bounds.height * pixelRatio))

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      canvas.style.width = `${bounds.width}px`
      canvas.style.height = `${bounds.height}px`

      const video = surface.querySelector('video')
      const videoBounds = video?.getBoundingClientRect()
      const videoWidth = videoBounds?.width || bounds.width
      const videoHeight = videoBounds?.height || bounds.height
      const videoAspect =
        video && video.videoWidth > 0 && video.videoHeight > 0
          ? video.videoWidth / video.videoHeight
          : videoWidth / videoHeight
      const screenshotWidth = video?.clientWidth || videoWidth
      const screenshotHeight = screenshotWidth / videoAspect
      const isWidthConstrained = videoWidth / videoHeight <= videoAspect
      const renderedWidth = isWidthConstrained ? videoWidth : videoHeight * videoAspect
      const renderedHeight = isWidthConstrained ? videoWidth / videoAspect : videoHeight
      const offsetX =
        (videoBounds?.left ?? bounds.left) - bounds.left + (videoWidth - renderedWidth) / 2
      const offsetY =
        (videoBounds?.top ?? bounds.top) - bounds.top + (videoHeight - renderedHeight) / 2
      const scaleX = screenshotWidth > 0 ? renderedWidth / screenshotWidth : 1
      const scaleY = screenshotHeight > 0 ? renderedHeight / screenshotHeight : 1
      const scaledPoints = points.map((point) => ({
        x: offsetX + point.getX() * scaleX,
        y: offsetY + point.getY() * scaleY,
      }))
      const overlayPoints = expandQrOverlayPolygon(interpolateQrPolygon(scaledPoints))
      const now = performance.now()
      const currentOverlay = overlayRef.current
      const currentTone = currentOverlay?.tone ?? 'active'
      const nextTone = options?.tone ?? currentTone

      overlayRef.current = {
        lastSeenAt: now,
        pixelRatio,
        points: overlayPoints,
        pulseStartedAt: currentOverlay?.pulseStartedAt ?? now,
        snapStartedAt: options?.snap ? now : (currentOverlay?.snapStartedAt ?? now),
        tone: nextTone,
        toneStartedAt: nextTone !== currentTone ? now : (currentOverlay?.toneStartedAt ?? now),
      }

      startOverlayAnimation()
    },
    [startOverlayAnimation],
  )

  const setOverlayTone = useCallback(
    (tone: OverlayTone) => {
      const currentOverlay = overlayRef.current

      if (!currentOverlay) return

      overlayRef.current = {
        ...currentOverlay,
        tone,
        toneStartedAt: performance.now(),
      }
      startOverlayAnimation()
    },
    [startOverlayAnimation],
  )

  useEffect(() => {
    setCheckedInCount(initialCheckedInCount)
  }, [initialCheckedInCount])

  useEffect(() => {
    if (hasMeeting) {
      setNotice(READY_NOTICE)
      return
    }

    clearScanOverlay()
    setNotice({
      message: 'Scannerul pornește automat când există o ședință în ziua curentă.',
      title: 'Scanner inactiv',
      tone: 'warning',
    })
  }, [clearScanOverlay, hasMeeting])

  useEffect(() => {
    if (!hasMeeting) return

    const surface = scannerSurfaceRef.current
    if (!surface) return

    const updateAspectRatio = () => {
      const bounds = surface.getBoundingClientRect()

      if (bounds.width <= 0 || bounds.height <= 0) return

      const nextAspectRatio = Number((bounds.width / bounds.height).toFixed(4))

      setScannerAspectRatio((currentAspectRatio) =>
        Math.abs(currentAspectRatio - nextAspectRatio) > 0.01
          ? nextAspectRatio
          : currentAspectRatio,
      )
    }

    updateAspectRatio()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateAspectRatio)

      return () => window.removeEventListener('resize', updateAspectRatio)
    }

    const observer = new ResizeObserver(updateAspectRatio)
    observer.observe(surface)

    return () => observer.disconnect()
  }, [hasMeeting])

  useEffect(() => {
    return () => {
      if (clearNoticeTimer.current) clearTimeout(clearNoticeTimer.current)
      if (clearOverlayTimer.current) clearTimeout(clearOverlayTimer.current)
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  const resetNoticeLater = useCallback(() => {
    if (clearNoticeTimer.current) clearTimeout(clearNoticeTimer.current)

    clearNoticeTimer.current = setTimeout(() => {
      setNotice(READY_NOTICE)
    }, 6_500)
  }, [])

  const handleUpdate = useCallback(
    async (_error: unknown, result?: ScanResult) => {
      if (!hasMeeting) return

      if (!result) {
        scheduleOverlayClear()
        return
      }

      const value = result.getText()
      const now = Date.now()
      const previous = lastScan.current
      const isFreshScan = !(previous?.value === value && now - previous.at < SCAN_THROTTLE_MS)

      updateScanOverlay(result, {
        snap: isFreshScan && !inFlightScan.current,
        tone: isFreshScan && !inFlightScan.current ? 'active' : undefined,
      })

      if (inFlightScan.current) return

      if (!isFreshScan) return

      lastScan.current = { at: now, value }
      inFlightScan.current = true
      setIsSubmitting(true)
      setNotice({
        message: 'Se validează codul membrului.',
        title: 'Scanare în curs',
        tone: 'idle',
      })

      try {
        const response = await onCodeScanned(value, result.getTimestamp(), user.id)

        if (response.user) {
          if (response.counted) {
            setCheckedInCount((current) => current + 1)
          }

          setOverlayTone(response.err ? 'warning' : 'success')
          setNotice({
            message: response.user.name || response.user.email,
            title: response.err || 'Prezență confirmată',
            tone: response.err ? 'warning' : 'success',
          })
        } else {
          setOverlayTone('error')
          setNotice({
            message: response.err || 'Codul scanat nu a putut fi validat.',
            title: 'Scanare respinsă',
            tone: 'error',
          })
        }
      } catch (error) {
        setNotice({
          message: error instanceof Error ? error.message : 'Încearcă din nou.',
          title: 'Eroare la scanare',
          tone: 'error',
        })
        setOverlayTone('error')
      } finally {
        inFlightScan.current = false
        setIsSubmitting(false)
        resetNoticeLater()
      }
    },
    [
      hasMeeting,
      resetNoticeLater,
      scheduleOverlayClear,
      setOverlayTone,
      updateScanOverlay,
      user.id,
    ],
  )

  return (
    <section className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
      <div className="grid gap-4">
        {hasMeeting ? (
          <div
            className="relative aspect-[4/5] overflow-hidden rounded-lg border border-border bg-black shadow-sm sm:aspect-video xl:aspect-[4/5] [&_video]:absolute [&_video]:inset-0 [&_video]:size-full [&_video]:object-contain"
            ref={scannerSurfaceRef}
          >
            <BarcodeScanner
              delay={300}
              facingMode="environment"
              formats={[11]}
              height="100%"
              onError={(cameraError) => {
                setOverlayTone('error')
                setNotice({
                  message:
                    cameraError instanceof DOMException ? cameraError.message : String(cameraError),
                  title: 'Camera indisponibilă',
                  tone: 'error',
                })
              }}
              onUpdate={handleUpdate}
              videoConstraints={videoConstraints}
              width="100%"
            />

            <canvas className="pointer-events-none absolute inset-0 z-10" ref={canvasRef} />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_34%,rgba(0,0,0,0.32)_68%)]" />
            <NoticePanel
              className="absolute inset-x-3 top-3 z-30 sm:inset-x-4 sm:top-4"
              notice={notice}
            />
            {isSubmitting && (
              <div className="absolute inset-x-4 bottom-4 flex items-center gap-2 rounded-md border border-white/15 bg-black/70 px-3 py-2 text-sm font-semibold text-white backdrop-blur">
                <Loader2 className="size-4 animate-spin" />
                Se verifică
              </div>
            )}
          </div>
        ) : (
          <div className="relative flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-border bg-sidebar/60 p-6 text-center">
            <NoticePanel
              className="absolute inset-x-3 top-3 text-left sm:inset-x-4 sm:top-4"
              notice={notice}
            />
            <div className="max-w-sm pt-24">
              <QrCode className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold">Scanner inactiv</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Nu există ședință programată astăzi.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function renderScanOverlay(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  overlay: ScanOverlay,
  now: number,
) {
  const colors = overlayColors[overlay.tone]
  const points = overlay.points
  const snapProgress = easeOutCubic(clamp((now - overlay.snapStartedAt) / SNAP_DURATION_MS, 0, 1))
  const pulseProgress = ((now - overlay.pulseStartedAt) % PULSE_DURATION_MS) / PULSE_DURATION_MS
  const toneProgress = clamp((now - overlay.toneStartedAt) / TONE_FLASH_DURATION_MS, 0, 1)
  const snapScale = 1 + (1 - snapProgress) * 0.08
  const pulseScale = 1 + pulseProgress * 0.07
  const pulseAlpha = 0.3 * (1 - pulseProgress)
  const flashAlpha = overlay.tone === 'active' ? 0 : 0.44 * (1 - toneProgress)
  const flashScale = 1 + easeOutCubic(toneProgress) * 0.12

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.save()
  context.scale(overlay.pixelRatio, overlay.pixelRatio)
  context.lineJoin = 'round'
  context.lineCap = 'round'

  drawOverlayPath(context, scalePolygon(points, pulseScale))
  context.strokeStyle = `rgba(${colors.glow}, ${pulseAlpha})`
  context.lineWidth = 10
  context.shadowBlur = 26
  context.shadowColor = `rgba(${colors.glow}, ${pulseAlpha})`
  context.stroke()

  if (flashAlpha > 0) {
    drawOverlayPath(context, scalePolygon(points, flashScale))
    context.strokeStyle = `rgba(${colors.stroke}, ${flashAlpha})`
    context.lineWidth = 8
    context.shadowBlur = 24
    context.shadowColor = `rgba(${colors.glow}, ${flashAlpha})`
    context.stroke()
  }

  drawOverlayPath(context, scalePolygon(points, snapScale))
  context.strokeStyle = `rgba(${colors.stroke}, 0.96)`
  context.lineWidth = 4
  context.shadowBlur = 16
  context.shadowColor = `rgba(${colors.glow}, 0.72)`
  context.stroke()
  context.restore()
}

function interpolateQrPolygon(points: CanvasPoint[]) {
  return [
    points[0],
    points[1],
    points[2],
    {
      x: points[0].x + points[2].x - points[1].x,
      y: points[0].y + points[2].y - points[1].y,
    },
  ]
}

function expandQrOverlayPolygon(points: CanvasPoint[]) {
  const center = getPolygonCenter(points)
  const horizontalSize = (distance(points[0], points[1]) + distance(points[2], points[3])) / 2
  const verticalSize = (distance(points[1], points[2]) + distance(points[3], points[0])) / 2
  const averageSize = (horizontalSize + verticalSize) / 2
  const offset = Math.max(QR_OVERLAY_MIN_OFFSET_PX, averageSize * QR_OVERLAY_OFFSET_RATIO)
  const scale = averageSize > 0 ? (averageSize + offset * 2) / averageSize : 1

  return points.map((point) => ({
    x: center.x + (point.x - center.x) * scale,
    y: center.y + (point.y - center.y) * scale,
  }))
}

function drawOverlayPath(context: CanvasRenderingContext2D, points: CanvasPoint[]) {
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y))
  context.closePath()
}

function scalePolygon(points: CanvasPoint[], scale: number) {
  const center = getPolygonCenter(points)

  return points.map((point) => ({
    x: center.x + (point.x - center.x) * scale,
    y: center.y + (point.y - center.y) * scale,
  }))
}

function getPolygonCenter(points: CanvasPoint[]) {
  return points.reduce(
    (current, point) => ({
      x: current.x + point.x / points.length,
      y: current.y + point.y / points.length,
    }),
    { x: 0, y: 0 },
  )
}

function distance(a: CanvasPoint, b: CanvasPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
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

function NoticePanel(props: { className?: string; notice: ScanNotice }) {
  const { className, notice } = props
  const Icon =
    notice.tone === 'success' ? CheckCircle2 : notice.tone === 'error' ? AlertCircle : UserCheck

  return (
    <div
      className={cn(
        'rounded-md border p-4 shadow-xl backdrop-blur',
        notice.tone === 'idle' && 'border-border bg-sidebar/60',
        notice.tone === 'success' && 'border-emerald-500/25 bg-emerald-500/10',
        notice.tone === 'warning' && 'border-[#f7a81b]/25 bg-[#f7a81b]/10',
        notice.tone === 'error' && 'border-red-500/25 bg-red-500/10',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md bg-[#00a2e0]/15 text-[#00a2e0]',
            notice.tone === 'success' && 'bg-emerald-500/15 text-emerald-500',
            notice.tone === 'warning' && 'bg-[#f7a81b]/15 text-[#f7a81b]',
            notice.tone === 'error' && 'bg-red-500/15 text-red-500',
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold">{notice.title}</p>
          <p className=" break-words text-sm leading-6 text-muted-foreground">{notice.message}</p>
        </div>
      </div>
    </div>
  )
}

function ScannerCorner(props: { className: string }) {
  return <span className={cn('absolute size-12 border-white', props.className)} />
}

function ScannerPlaceholder() {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center bg-black text-white">
      <Loader2 className="size-5 animate-spin" />
    </div>
  )
}

export default Scanner
