import { Suspense, type ReactNode } from 'react'
import MemberLoading from './MemberLoading'

async function MemberData({ children }: { children: () => Promise<ReactNode> }) {
  return children()
}

// The callback runs in the async child, so its reads suspend below this boundary.
export function MemberDataBoundary({ children }: { children: () => Promise<ReactNode> }) {
  return (
    <Suspense fallback={<MemberLoading />}>
      <MemberData>{children}</MemberData>
    </Suspense>
  )
}
