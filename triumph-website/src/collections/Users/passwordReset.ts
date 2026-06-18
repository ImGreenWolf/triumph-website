import type { Payload, PayloadRequest } from 'payload'

import type { User } from '@/payload-types'

type PasswordResetPayload = Pick<Payload, 'forgotPassword'>
type PasswordResetUser = Pick<User, 'email' | 'id'>

export type PasswordResetEmailResult = {
  errors: {
    email: string
    id: string
    message: string
  }[]
  sent: {
    email: string
    id: string
  }[]
}

export async function sendPasswordResetEmails(args: {
  payload: PasswordResetPayload
  req: PayloadRequest
  users: PasswordResetUser[]
}): Promise<PasswordResetEmailResult> {
  const result: PasswordResetEmailResult = {
    errors: [],
    sent: [],
  }

  for (const user of args.users) {
    try {
      await args.payload.forgotPassword({
        collection: 'users',
        data: {
          email: user.email,
        },
        overrideAccess: true,
        req: args.req,
      })

      result.sent.push({
        email: user.email,
        id: user.id,
      })
    } catch (error) {
      result.errors.push({
        email: user.email,
        id: user.id,
        message: error instanceof Error ? error.message : 'Password reset email could not be sent.',
      })
    }
  }

  return result
}
