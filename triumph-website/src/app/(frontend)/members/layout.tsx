import type { Metadata } from 'next'
import type { ReactNode } from 'react'
export const metadata: Metadata = {
  title: 'Zona membrilor | Interact București Triumph',
  robots: { index: false, follow: false },
}
export default function MembersLayout({ children }: { children: ReactNode }) {
  return children
}
