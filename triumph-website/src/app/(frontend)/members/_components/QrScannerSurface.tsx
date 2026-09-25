'use client'

import dynamic from 'next/dynamic'
import {
  AlertCircle,
  CheckCircle2,
  FlipHorizontal2,
  Loader2,
  QrCode,
  SwitchCamera,
  UserCheck,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/utilities/ui'

const BarcodeScanner = dynamic(() => import('react-qr-barcode-scanner'), {
  loading: () => <ScannerPlaceholder />,
  ssr: false,
})

export type QrScannerNoticeTone = 'idle' | 'success' | 'warning' | 'error'
export type QrScannerOverlayTone = 'active' | 'success' | 'warning' | 'error'

export type QrScannerNotice = {
  message: string
  title: string
  tone: QrScannerNoticeTone
}

type CameraFacingMode = 'environment' | 'user'

type ScanPoint = {
  getX: () => number
  getY: () => number
}

export type QrScanResult = {
  getResultPoints: () => ScanPoint[]
  getText: () => string
}

type CanvasPoint = {
  x: number
  y: number
}

type ScanOverlay = {
  lastSeenAt: number
  pixelRatio: number
  points: CanvasPoint[]
  pulseStartedAt: number
  snapStartedAt: number
  tone: QrScannerOverlayTone
  toneStartedAt: number
}

type QrScannerSurfaceProps = {
  active?: boolean
  busyLabel?: string
  className?: string
  inactiveMessage?: string
  inactiveTitle?: string
  notice: QrScannerNotice
  onCameraError?: (message: string) => void
  onScan: (
    value: string,
    result: QrScanResult,
  ) => Promise<QrScannerOverlayTone | void> | QrScannerOverlayTone | void
  onScanError?: (message: string) => void
  onScanSettled?: () => void
  onScanStart?: (value: string) => void
  throttleMs?: number
}

const SCAN_THROTTLE_MS = 3_500
const SNAP_DURATION_MS = 240
const TONE_FLASH_DURATION_MS = 420
const PULSE_DURATION_MS = 1_200
const DEFAULT_SCANNER_ASPECT_RATIO = 4 / 5
const QR_OVERLAY_MIN_OFFSET_PX = 10
const QR_OVERLAY_OFFSET_RATIO = 0.22

const overlayColors: Record<QrScannerOverlayTone, { glow: string; stroke: string }> = {
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

export function QrScannerSurface(props: QrScannerSurfaceProps) {
  const {
    active = true,
    busyLabel = 'Se verifică',
    className,
    inactiveMessage = 'Scannerul nu este disponibil momentan.',
    inactiveTitle = 'Scanner inactiv',
    notice,
    onCameraError,
    onScan,
    onScanError,
    onScanSettled,
    onScanStart,
    throttleMs = SCAN_THROTTLE_MS,
  } = props
  const [cameraFacingMode, setCameraFacingMode] = useState<CameraFacingMode>('environment')
  const [isPreviewMirrored, setIsPreviewMirrored] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scannerAspectRatio, setScannerAspectRatio] = useState(DEFAULT_SCANNER_ASPECT_RATIO)

  const animationFrameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const clearOverlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightScan = useRef(false)
  const lastScan = useRef<{ at: number; value: string } | null>(null)
  const overlayRef = useRef<ScanOverlay | null>(null)
  const scannerSurfaceRef = useRef<HTMLDivElement | null>(null)

  const videoConstraints = useMemo<MediaTrackConstraints>(
    () => ({
      aspectRatio: scannerAspectRatio,
      facingMode: cameraFacingMode,
      frameRate: 60,
    }),
    [cameraFacingMode, scannerAspectRatio],
  )

  const clearScanOverlay = useCallback(() => {
    if (clearOverlayTimer.current) {
      clearTimeout(clearOverlayTimer.current)
      clearOverlayTimer.current = null
    }

    overlayRef.current = null
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const switchCamera = useCallback(() => {
    const nextFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment'

    clearScanOverlay()
    lastScan.current = null
    setCameraFacingMode(nextFacingMode)
    setIsPreviewMirrored(nextFacingMode === 'user')
  }, [cameraFacingMode, clearScanOverlay])

  const scheduleOverlayClear = useCallback(() => {
    if (clearOverlayTimer.current) return

    clearOverlayTimer.current = setTimeout(() => {
      clearOverlayTimer.current = null
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
    (result: QrScanResult, options?: { snap?: boolean; tone?: QrScannerOverlayTone }) => {
      const canvas = canvasRef.current
      const surface = scannerSurfaceRef.current
      const points = result.getResultPoints().slice(0, 3)

      if (!canvas || !surface || points.length < 3) return

      if (clearOverlayTimer.current) {
        clearTimeout(clearOverlayTimer.current)
        clearOverlayTimer.current = null
      }

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
    (tone: QrScannerOverlayTone) => {
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
    if (active) return

    clearScanOverlay()
  }, [active, clearScanOverlay])

  useEffect(() => {
    if (!active) return

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
  }, [active])

  useEffect(() => {
    return () => {
      if (clearOverlayTimer.current) clearTimeout(clearOverlayTimer.current)
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  const handleUpdate = useCallback(
    async (_error: unknown, result?: QrScanResult) => {
      if (!active) return

      if (!result) {
        if (!inFlightScan.current) scheduleOverlayClear()
        return
      }

      const value = result.getText()
      const now = Date.now()
      const previous = lastScan.current
      const isFreshScan = !(previous?.value === value && now - previous.at < throttleMs)

      if (inFlightScan.current) {
        updateScanOverlay(result)
        return
      }

      if (!isFreshScan) return

      updateScanOverlay(result, { snap: true, tone: 'active' })
      lastScan.current = { at: now, value }
      inFlightScan.current = true
      setIsSubmitting(true)
      onScanStart?.(value)

      try {
        const tone = await onScan(value, result)

        if (tone) setOverlayTone(tone)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Încearcă din nou.'
        onScanError?.(message)
        setOverlayTone('error')
      } finally {
        inFlightScan.current = false
        setIsSubmitting(false)
        scheduleOverlayClear()
        onScanSettled?.()
      }
    },
    [
      active,
      onScan,
      onScanError,
      onScanSettled,
      onScanStart,
      scheduleOverlayClear,
      setOverlayTone,
      throttleMs,
      updateScanOverlay,
    ],
  )

  if (!active) {
    return (
      <div className="relative flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-border bg-sidebar/60 p-6 text-center">
        <NoticePanel
          className="absolute inset-x-3 top-3 text-left sm:inset-x-4 sm:top-4"
          notice={notice}
        />
        <div className="max-w-sm pt-24">
          <QrCode className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold">{inactiveTitle}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{inactiveMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative aspect-[4/5] overflow-hidden rounded-lg border border-border bg-black shadow-sm sm:aspect-video xl:aspect-[4/5] [&_video]:absolute [&_video]:inset-0 [&_video]:size-full [&_video]:object-contain',
        isPreviewMirrored && '[&_canvas]:[transform:scaleX(-1)] [&_video]:[transform:scaleX(-1)]',
        className,
      )}
      ref={scannerSurfaceRef}
    >
      <BarcodeScanner
        delay={120}
        facingMode={cameraFacingMode}
        formats={[11]}
        height="100%"
        key={cameraFacingMode}
        onError={(cameraError) => {
          setOverlayTone('error')
          onCameraError?.(
            cameraError instanceof DOMException ? cameraError.message : String(cameraError),
          )
        }}
        onUpdate={handleUpdate}
        videoConstraints={videoConstraints}
        width="100%"
      />

      <canvas className="pointer-events-none absolute inset-0 z-10" ref={canvasRef} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-20 aspect-square w-[67%] max-w-[18.5rem] -translate-x-1/2 -translate-y-1/2 rounded-md border border-white/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]"
      >
        <span className="absolute -left-px -top-px size-10 rounded-tl-md border-l-[3px] border-t-[3px] border-[#00a2e0]" />
        <span className="absolute -right-px -top-px size-10 rounded-tr-md border-r-[3px] border-t-[3px] border-[#00a2e0]" />
        <span className="absolute -bottom-px -left-px size-10 rounded-bl-md border-b-[3px] border-l-[3px] border-[#00a2e0]" />
        <span className="absolute -bottom-px -right-px size-10 rounded-br-md border-b-[3px] border-r-[3px] border-[#00a2e0]" />
        <span className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-white/45 shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
      </div>
      <NoticePanel
        className="absolute inset-x-3 top-3 z-30 sm:inset-x-4 sm:top-4"
        notice={notice}
      />
      <div className="absolute bottom-3 right-3 z-40 flex gap-2 sm:bottom-4 sm:right-4">
        <button
          aria-label={
            cameraFacingMode === 'environment'
              ? 'Folosește camera frontală'
              : 'Folosește camera din spate'
          }
          className="flex size-10 items-center justify-center rounded-md border border-white/20 bg-black/70 text-white shadow-sm backdrop-blur transition-colors hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting}
          onClick={switchCamera}
          title={
            cameraFacingMode === 'environment'
              ? 'Folosește camera frontală'
              : 'Folosește camera din spate'
          }
          type="button"
        >
          <SwitchCamera className="size-5" />
        </button>
        <button
          aria-label={isPreviewMirrored ? 'Oprește oglindirea' : 'Oglindește imaginea'}
          aria-pressed={isPreviewMirrored}
          className={cn(
            'flex size-10 items-center justify-center rounded-md border border-white/20 bg-black/70 text-white shadow-sm backdrop-blur transition-colors hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
            isPreviewMirrored && 'bg-white text-black hover:bg-white/90',
          )}
          onClick={() => setIsPreviewMirrored((current) => !current)}
          title={isPreviewMirrored ? 'Oprește oglindirea' : 'Oglindește imaginea'}
          type="button"
        >
          <FlipHorizontal2 className="size-5" />
        </button>
      </div>
      {isSubmitting && (
        <div className="absolute inset-x-4 bottom-16 flex items-center gap-2 rounded-md border border-white/15 bg-black/70 px-3 py-2 text-sm font-semibold text-white backdrop-blur">
          <Loader2 className="size-4 animate-spin" />
          {busyLabel}
        </div>
      )}
    </div>
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

function NoticePanel(props: { className?: string; notice: QrScannerNotice }) {
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
          <p className="break-words text-sm leading-6 text-muted-foreground">{notice.message}</p>
        </div>
      </div>
    </div>
  )
}

function ScannerPlaceholder() {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center bg-black text-white">
      <Loader2 className="size-5 animate-spin" />
    </div>
  )
}
