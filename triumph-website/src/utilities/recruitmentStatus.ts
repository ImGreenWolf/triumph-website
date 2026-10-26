import { getEndOfBucharestDay, getStartOfBucharestDay } from './recruitmentWorkflow'

type Schedule = {
  recruitmentStartDate?: string | null
  recruitmentEndDate?: string | null
}
export type RecruitmentStatus = {
  state: 'upcoming' | 'open' | 'closed' | 'unconfigured'
  isOpen: boolean
  message: string
  startDate: string | null
  endDate: string | null
  nextChange: string | null
}
export function getRecruitmentStatus(
  schedule?: Schedule | null,
  now = new Date(),
): RecruitmentStatus {
  const start = getStartOfBucharestDay(schedule?.recruitmentStartDate)
  const end = getEndOfBucharestDay(schedule?.recruitmentEndDate)
  const configured = Boolean(start && end && start <= end)
  const state = !configured
    ? 'unconfigured'
    : now < start!
      ? 'upcoming'
      : now > end!
        ? 'closed'
        : 'open'
  const format = (date: Date) =>
    new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Bucharest',
    }).format(date)
  return {
    state,
    isOpen: state === 'open',
    startDate: schedule?.recruitmentStartDate ?? null,
    endDate: schedule?.recruitmentEndDate ?? null,
    nextChange:
      state === 'upcoming'
        ? start!.toISOString()
        : state === 'open'
          ? new Date(end!.getTime() + 1).toISOString()
          : null,
    message:
      state === 'upcoming'
        ? `Înscrierile se deschid pe ${format(start!)} și se încheie pe ${format(end!)}.`
        : state === 'open'
          ? `Înscrierile sunt deschise până pe ${format(end!)}.`
          : state === 'closed'
            ? 'Perioada de înscrieri s-a încheiat. Urmărește anunțurile clubului pentru următoarea recrutare.'
            : 'Următoarea perioadă de înscrieri va fi anunțată aici.',
  }
}
