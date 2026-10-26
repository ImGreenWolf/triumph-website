/** Only full, same-origin page changes participate in the decorative transition. */
export function transitionDestination(anchor: HTMLAnchorElement, current: URL): string | null {
  if (
    anchor.hasAttribute('download') ||
    (anchor.target && anchor.target !== '_self') ||
    anchor.closest('[data-no-page-transition]') ||
    anchor.relList.contains('external')
  )
    return null
  const url = new URL(anchor.href, current)
  if (
    url.origin !== current.origin ||
    !/^https?:$/.test(url.protocol) ||
    url.pathname === current.pathname ||
    /^\/(?:api|admin|next)(?:\/|$)/.test(url.pathname) ||
    /\.[a-z0-9]+$/i.test(url.pathname)
  )
    return null
  return `${url.pathname}${url.search}${url.hash}`
}
