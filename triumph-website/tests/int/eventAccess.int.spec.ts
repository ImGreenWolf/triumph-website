import { describe, expect, it } from 'vitest'

import {
  canCheckInEvent,
  canManageEvent,
  getEventAccessLevel,
  type EventAccessSource,
  type EventAccessUser,
} from '@/utilities/eventAccess'

const event = {
  checkInMembers: ['check-in-member'],
  coordonators: ['coordinator'],
} satisfies EventAccessSource

describe('event access helpers', () => {
  it('gives board members manager and check-in access to every event', () => {
    const user = { id: 'board-member', role: 'president' } satisfies EventAccessUser

    expect(canManageEvent(event, user)).toBe(true)
    expect(canCheckInEvent(event, user)).toBe(true)
    expect(getEventAccessLevel(event, user)).toBe('manager')
  })

  it('gives coordinators manager and check-in access', () => {
    const user = { id: 'coordinator', role: 'active' } satisfies EventAccessUser

    expect(canManageEvent(event, user)).toBe(true)
    expect(canCheckInEvent(event, user)).toBe(true)
    expect(getEventAccessLevel(event, user)).toBe('manager')
  })

  it('gives check-in members check-in access without manager access', () => {
    const user = { id: 'check-in-member', role: 'aspirer' } satisfies EventAccessUser

    expect(canManageEvent(event, user)).toBe(false)
    expect(canCheckInEvent(event, user)).toBe(true)
    expect(getEventAccessLevel(event, user)).toBe('check-in')
  })

  it('rejects unrelated users', () => {
    const user = { id: 'other-member', role: 'active' } satisfies EventAccessUser

    expect(canManageEvent(event, user)).toBe(false)
    expect(canCheckInEvent(event, user)).toBe(false)
    expect(getEventAccessLevel(event, user)).toBe('none')
  })
})
