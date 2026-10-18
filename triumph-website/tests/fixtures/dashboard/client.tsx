import { useEffect, useState } from 'react'
import { hydrateRoot } from 'react-dom/client'
import DashboardShell, {
  dashboardFallbacks,
} from '@/app/(frontend)/members/_components/DashboardShell'
import DashboardAvatar from '@/app/(frontend)/members/_components/DashboardAvatar'
import { fixtureShell } from './data'

declare global {
  interface Window {
    dashboardFixtureReady?: boolean
    resolveFixtureAvatar?: (src: string) => void
    dashboardLayoutShifts?: number[]
  }
}
function InteractiveFixture() {
  const [avatar, setAvatar] = useState<string | null>(null)
  useEffect(() => {
    window.resolveFixtureAvatar = setAvatar
    window.dashboardFixtureReady = true
  }, [])
  return (
    <DashboardShell
      {...fixtureShell()}
      slots={{
        avatar: avatar ? <DashboardAvatar key={avatar} src={avatar} /> : dashboardFallbacks.avatar,
      }}
    />
  )
}
hydrateRoot(document.getElementById('fixture-root')!, <InteractiveFixture />)
