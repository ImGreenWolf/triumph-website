import { describe, expect, it, vi } from 'vitest'

import { AbsenceMotivations } from '@/collections/AbsenceMotivations'

const beforeValidate = AbsenceMotivations.hooks?.beforeValidate?.[0]
const beforeChange = AbsenceMotivations.hooks?.beforeChange?.[0]
const afterChange = AbsenceMotivations.hooks?.afterChange?.[0]

if (!beforeValidate || !beforeChange || !afterChange) {
  throw new Error('Absence motivation hooks are not configured.')
}

describe('absence motivation workflow', () => {
  it('assigns the authenticated member and pending status during submission', async () => {
    const data = await beforeValidate({
      data: {
        meeting: 'meeting-1',
        member: 'forged-member',
        status: 'accepted',
      },
      operation: 'create',
      req: {
        user: {
          id: 'member-1',
        },
      },
    } as never)

    expect(data).toMatchObject({
      meeting: 'meeting-1',
      member: 'member-1',
      reviewedAt: null,
      reviewedBy: null,
      secretaryMessage: null,
      status: 'pending',
    })
  })

  it('creates motivated attendance when the secretary accepts a request', async () => {
    const create = vi.fn()
    const req = {
      payload: {
        create,
        find: vi.fn().mockResolvedValue({
          docs: [],
        }),
      },
      user: {
        id: 'secretary-1',
      },
    }

    await afterChange({
      doc: {
        member: 'member-1',
        memberMessage: 'Nu pot participa.',
        meeting: 'meeting-1',
        status: 'accepted',
      },
      operation: 'update',
      previousDoc: {
        status: 'pending',
      },
      req,
    } as never)

    expect(create).toHaveBeenCalledWith({
      collection: 'attendance',
      data: {
        member: 'member-1',
        meeting: 'meeting-1',
        motivatedBy: 'secretary-1',
        motivationReason: 'Nu pot participa.',
        status: 'motivated',
      },
      req,
    })
  })

  it('rejects a submission when attendance is already recorded', async () => {
    const req = {
      payload: {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              status: 'present',
            },
          ],
        }),
      },
    }

    await expect(
      beforeChange({
        data: {
          meeting: 'meeting-1',
          member: 'member-1',
        },
        operation: 'create',
        req,
      } as never),
    ).rejects.toThrow('Prezența pentru această întâlnire este deja înregistrată.')
  })

  it('requires the secretary to send a message when rejecting a request', async () => {
    await expect(
      beforeChange({
        data: {
          status: 'rejected',
        },
        operation: 'update',
        originalDoc: {
          secretaryMessage: null,
          status: 'pending',
        },
        req: {},
      } as never),
    ).rejects.toThrow('Adaugă un mesaj pentru membru înainte de a respinge motivarea.')
  })

  it('allows the secretary to accept a request without a message', async () => {
    const req = {
      payload: {
        find: vi.fn().mockResolvedValue({
          docs: [],
        }),
      },
      user: {
        id: 'secretary-1',
      },
    }

    const data = await beforeChange({
      data: {
        status: 'accepted',
      },
      operation: 'update',
      originalDoc: {
        member: 'member-1',
        meeting: 'meeting-1',
        secretaryMessage: null,
        status: 'pending',
      },
      req,
    } as never)

    expect(data).toMatchObject({
      reviewedBy: 'secretary-1',
      status: 'accepted',
    })
  })

  it('restores an absence when an accepted motivation is later rejected', async () => {
    const update = vi.fn()
    const req = {
      payload: {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              id: 'attendance-1',
              status: 'motivated',
            },
          ],
        }),
        update,
      },
    }

    await afterChange({
      doc: {
        member: 'member-1',
        meeting: 'meeting-1',
        status: 'rejected',
      },
      operation: 'update',
      previousDoc: {
        status: 'accepted',
      },
      req,
    } as never)

    expect(update).toHaveBeenCalledWith({
      collection: 'attendance',
      data: {
        motivatedBy: null,
        motivationReason: null,
        status: 'absent',
      },
      id: 'attendance-1',
      req,
    })
  })
})
