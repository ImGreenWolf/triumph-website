/** Suspend continuous hero motion when visitors cannot see it. */
export function observeHeroActivity(element: HTMLElement, onChange: (active: boolean) => void) {
  const bounds = element.getBoundingClientRect()
  let intersecting = bounds.bottom > 0 && bounds.top < window.innerHeight
  let previous: boolean | undefined
  const update = () => {
    const active = intersecting && !document.hidden
    if (active === previous) return
    previous = active
    onChange(active)
  }
  const observer = new IntersectionObserver(([entry]) => {
    intersecting = entry.isIntersecting
    update()
  })
  observer.observe(element)
  document.addEventListener('visibilitychange', update)
  update()

  return () => {
    observer.disconnect()
    document.removeEventListener('visibilitychange', update)
  }
}
