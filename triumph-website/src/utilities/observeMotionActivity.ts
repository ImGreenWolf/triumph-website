/** Keep decorative motion quiet outside the viewport and while people interact. */
export function observeMotionActivity(
  element: HTMLElement,
  onChange: (active: boolean) => void,
  { pauseOnInteraction = false }: { pauseOnInteraction?: boolean } = {},
) {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  let inView = false
  let hovered = false
  let focused = false
  let previous: boolean | undefined

  const update = () => {
    const active = inView && !document.hidden && !preference.matches && !hovered && !focused
    if (active !== previous) {
      previous = active
      onChange(active)
    }
  }
  const measure = () => {
    const rect = element.getBoundingClientRect()
    inView =
      rect.bottom > 0 &&
      rect.top < window.innerHeight &&
      rect.right > 0 &&
      rect.left < window.innerWidth
    update()
  }
  const enter = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      hovered = true
      update()
    }
  }
  const leave = () => {
    hovered = false
    update()
  }
  const focusIn = () => {
    focused = true
    update()
  }
  const focusOut = (event: FocusEvent) => {
    focused = event.relatedTarget instanceof Node && element.contains(event.relatedTarget)
    update()
  }

  const observer =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting
          update()
        })
  observer?.observe(element)
  if (!observer) {
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
  }
  if (pauseOnInteraction) {
    hovered = element.matches(':hover') && window.matchMedia('(hover: hover)').matches
    focused = element.contains(document.activeElement)
    element.addEventListener('pointerenter', enter)
    element.addEventListener('pointerleave', leave)
    element.addEventListener('focusin', focusIn)
    element.addEventListener('focusout', focusOut)
  }
  preference.addEventListener('change', update)
  document.addEventListener('visibilitychange', update)
  measure()

  return () => {
    observer?.disconnect()
    window.removeEventListener('scroll', measure)
    window.removeEventListener('resize', measure)
    element.removeEventListener('pointerenter', enter)
    element.removeEventListener('pointerleave', leave)
    element.removeEventListener('focusin', focusIn)
    element.removeEventListener('focusout', focusOut)
    preference.removeEventListener('change', update)
    document.removeEventListener('visibilitychange', update)
  }
}
