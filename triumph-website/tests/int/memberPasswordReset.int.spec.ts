import type { Payload, PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { sendPasswordResetEmails } from '@/collections/Users/passwordReset'

describe('member password reset emails', () => {
  it('continues sending when one selected user fails', async () => {
    const forgotPassword = vi
      .fn()
      .mockResolvedValueOnce('first-token')
      .mockRejectedValueOnce(new Error('Mail server unavailable'))
    const req = {} as PayloadRequest

    const result = await sendPasswordResetEmails({
      payload: { forgotPassword } as Pick<Payload, 'forgotPassword'>,
      req,
      users: [
        { email: 'ana@example.com', id: 'user-1' },
        { email: 'ion@example.com', id: 'user-2' },
      ],
    })

    expect(forgotPassword).toHaveBeenCalledTimes(2)
    expect(forgotPassword).toHaveBeenNthCalledWith(1, {
      collection: 'users',
      data: { email: 'ana@example.com' },
      overrideAccess: true,
      req,
    })
    expect(result).toEqual({
      errors: [
        {
          email: 'ion@example.com',
          id: 'user-2',
          message: 'Mail server unavailable',
        },
      ],
      sent: [{ email: 'ana@example.com', id: 'user-1' }],
    })
  })
})
