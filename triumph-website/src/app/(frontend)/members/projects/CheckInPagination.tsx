import { ChevronLeft, ChevronRight } from 'lucide-react'

export function CheckInPagination(props: {
  page: number
  pages: number
  position: 'sus' | 'jos'
  onChange: (page: number) => void
}) {
  const buttonClass =
    'inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-current/20 bg-card text-card-foreground hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <nav
      aria-label={`Paginare ${props.position}`}
      className="flex items-center gap-1 text-xs sm:gap-2 sm:text-sm"
    >
      <button
        type="button"
        aria-label="Pagina anterioară"
        title="Pagina anterioară"
        disabled={props.page <= 1}
        onClick={() => props.onChange(props.page - 1)}
        className={buttonClass}
      >
        <ChevronLeft aria-hidden className="size-4" />
      </button>
      <label className="flex min-w-0 items-center gap-1 sm:gap-2">
        Pagina
        <select
          aria-label="Pagina de check-in"
          value={props.page}
          onChange={(event) => props.onChange(Number(event.target.value))}
          className="min-h-11 rounded-lg border border-current/20 bg-card px-2 text-card-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {Array.from({ length: props.pages }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1}
            </option>
          ))}
        </select>
        <span>din {props.pages}</span>
      </label>
      <button
        type="button"
        aria-label="Pagina următoare"
        title="Pagina următoare"
        disabled={props.page >= props.pages}
        onClick={() => props.onChange(props.page + 1)}
        className={buttonClass}
      >
        <ChevronRight aria-hidden className="size-4" />
      </button>
    </nav>
  )
}
