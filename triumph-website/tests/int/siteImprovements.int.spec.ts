import { describe, expect, it } from 'vitest'
import { getRecruitmentStatus } from '@/utilities/recruitmentStatus'
import {
  countActiveRegistrations,
  registrationCountLabel,
} from '@/utilities/eventRegistrationStats'

const schedule = { recruitmentStartDate: '2026-10-01', recruitmentEndDate: '2026-10-25' }
describe('recruitment dates in Bucharest', () => {
  it('opens at local midnight, independently of the server timezone', () => {
    expect(getRecruitmentStatus(schedule, new Date('2026-09-30T20:59:59.999Z')).state).toBe(
      'upcoming',
    )
    expect(getRecruitmentStatus(schedule, new Date('2026-09-30T21:00:00Z')).state).toBe('open')
  })
  it('includes the entire closing day across the daylight saving change', () => {
    expect(getRecruitmentStatus(schedule, new Date('2026-10-25T21:59:59.999Z')).isOpen).toBe(true)
    expect(getRecruitmentStatus(schedule, new Date('2026-10-25T22:00:00Z')).state).toBe('closed')
    expect(getRecruitmentStatus(schedule, new Date('2026-10-25T12:00:00Z')).nextChange).toBe(
      '2026-10-25T22:00:00.000Z',
    )
  })
  it('does not accept applications when the schedule is missing or reversed', () => {
    for (const config of [
      undefined,
      {},
      { recruitmentStartDate: '2026-10-25' },
      { recruitmentStartDate: '2026-10-25', recruitmentEndDate: '2026-10-01' },
    ]) {
      expect(getRecruitmentStatus(config).state).toBe('unconfigured')
      expect(getRecruitmentStatus(config).isOpen).toBe(false)
    }
  })
  it('only announces a future date when it has been configured', () => {
    expect(getRecruitmentStatus(schedule, new Date('2026-09-01Z')).message).toContain(
      '1 octombrie 2026',
    )
    expect(getRecruitmentStatus(undefined).message).not.toMatch(/2026|septembrie/)
  })
})
describe('public registration statistics', () => {
  it('counts active registrations without treating cancellations as participants', () => {
    expect(
      countActiveRegistrations([
        { status: 'cancelled' },
        { status: 'registered' },
        { status: 'present' },
      ] as Parameters<typeof countActiveRegistrations>[0]),
    ).toBe(2)
    expect(countActiveRegistrations([])).toBe(0)
    expect(registrationCountLabel(1)).toBe('1 înscriere')
    expect(registrationCountLabel(0)).toBe('0 înscrieri')
  })
})
