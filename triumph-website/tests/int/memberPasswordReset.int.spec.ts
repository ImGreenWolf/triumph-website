import type { Payload, PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { generateForgotPasswordEmailHTML } from '@/collections/Users/forgotPasswordEmail'
import { sendPasswordResetEmails } from '@/collections/Users/passwordReset'

describe('member password reset emails', () => {
  it('links to the frontend password reset flow', () => {
    const html = generateForgotPasswordEmailHTML({
      req: {
        origin: 'https://triumph.example',
      } as PayloadRequest,
      token: 'token/with spaces',
    })

    expect(html).toContain('https://triumph.example/members/password-reset/token%2Fwith%20spaces')
    expect(html).not.toContain('/admin/reset/')
  })

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
