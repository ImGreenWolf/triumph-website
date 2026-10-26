'use client'

import { useSyncExternalStore } from 'react'

const query = '(prefers-reduced-motion: reduce)'
function subscribe(onChange: () => void) {
  const preference = window.matchMedia(query)
  preference.addEventListener('change', onChange)
  return () => preference.removeEventListener('change', onChange)
}
const getSnapshot = () => window.matchMedia(query).matches
const getServerSnapshot = () => false

// The installed Motion hook snapshots the initial preference. Subscribe to
// changes too, so already-hidden blocks become visible immediately.
export function useMotionPreference() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
