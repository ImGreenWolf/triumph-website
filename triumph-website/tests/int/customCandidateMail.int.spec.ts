import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  PATCH,
  sendCustomCandidateMail,
} from '@/app/(frontend)/members/commissions/applications/route'
import type { Application, User } from '@/payload-types'
import {
  CUSTOM_MAIL_BODY_MAX_LENGTH,
  CUSTOM_MAIL_SUBJECT_MAX_LENGTH,
  DEFAULT_CUSTOM_MAIL_SENDER,
  getCustomMailFromHeader,
  getCustomMailSenderAddress,
  insertTextAtSelection,
} from '@/utilities/customCandidateMail'

const { getPayloadMock } = vi.hoisted(() => ({ getPayloadMock: vi.fn() }))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: getPayloadMock,
}))

const boardUser = {
  email: 'board@example.com',
  id: 'board-1',
  name: 'Board Member',
  role: 'hr-director',
} as User

const application = {
  createdAt: '2026-09-01T09:00:00.000Z',
  email: 'candidate@example.com',
  formSubmission: 'submission-1',
  id: 'application-1',
  name: 'Candidate Name',
  reviewProcess: {
    customMailHistory: [
      {
        body: 'Previous body',
        recipient: 'candidate@example.com',
        sentAt: '2026-09-10T09:00:00.000Z',
        sentBy: 'board-1',
        subject: 'Previous subject',
      },
    ],
    status: 'submitted',
  },
  updatedAt: '2026-09-01T09:00:00.000Z',
} as Application

function createPayload(candidate: Application = application) {
  const findByID = vi.fn().mockResolvedValue(candidate)
  const sendEmail = vi.fn().mockResolvedValue(undefined)
  const update = vi.fn().mockImplementation(async ({ data }) => ({
    ...candidate,
    ...data,
  }))

  return {
    findByID,
    payload: { findByID, sendEmail, update } as unknown as Payload,
    sendEmail,
    update,
  }
}

describe('custom candidate email', () => {
  it('rejects an expired session at the route boundary', async () => {
    getPayloadMock.mockResolvedValueOnce({
      auth: vi.fn().mockResolvedValue({ user: null }),
    })

    const response = await PATCH(
      new Request('http://localhost/members/recruitment/applications', {
        body: JSON.stringify({
          action: 'send-custom-mail',
          applicationId: application.id,
          body: 'Mesaj',
          subject: 'Subiect',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
    )

    expect(response).toBeInstanceOf(Response)
    expect(response?.status).toBe(401)
  })

  it('does not expose custom email sending in the commission workspace', async () => {
    getPayloadMock.mockResolvedValueOnce({
      auth: vi.fn().mockResolvedValue({ user: { ...boardUser, role: 'active' } }),
    })

    const response = await PATCH(
      new Request('http://localhost/members/commissions/applications', {
        body: JSON.stringify({
          action: 'send-custom-mail',
          applicationId: application.id,
          body: 'Mesaj',
          subject: 'Subiect',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
    )

    expect(response).toBeInstanceOf(Response)
    expect(response?.status).toBe(403)
  })

  it('sends only to the stored candidate email and appends a complete audit entry', async () => {
    const mocks = createPayload()
    const body = 'Salut <script>alert(1)</script>\nA doua linie & detalii.'

    const response = await sendCustomCandidateMail({
      body: {
        applicationId: application.id,
        bcc: 'attacker@example.com',
        body,
        recipient: 'attacker@example.com',
        subject: 'Mesaj <important>',
      },
      payload: mocks.payload,
      user: boardUser,
    })

    expect(response.status).toBe(200)
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: `"${boardUser.name}" <${DEFAULT_CUSTOM_MAIL_SENDER}>`,
        replyTo: DEFAULT_CUSTOM_MAIL_SENDER,
        subject: 'Mesaj <important>',
        text: body,
        to: application.email,
      }),
    )

    const sentMessage = mocks.sendEmail.mock.calls[0]?.[0]
    expect(sentMessage).not.toHaveProperty('bcc')
    expect(sentMessage).not.toHaveProperty('cc')
    expect(sentMessage.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(sentMessage.html).not.toContain('<script>alert(1)</script>')
    expect(sentMessage.html).toContain('A doua linie &amp; detalii.')
    expect(sentMessage.html).toContain('<br />A doua linie')

    const updateInput = mocks.update.mock.calls[0]?.[0]
    const history = updateInput.data.reviewProcess.customMailHistory
    expect(history).toHaveLength(2)
    expect(history[1]).toMatchObject({
      body,
      recipient: application.email,
      senderAddress: DEFAULT_CUSTOM_MAIL_SENDER,
      sentBy: boardUser.id,
      subject: 'Mesaj <important>',
    })
    expect(history[1].sentAt).toEqual(expect.any(String))

    const result = (await response.json()) as {
      application: { customMailHistory: unknown[] }
    }
    expect(result.application.customMailHistory).toHaveLength(2)
  })

  it('uses the board member club email as both sender and reply address', async () => {
    const mocks = createPayload()
    const user = { ...boardUser, clubMail: 'hr.member@interact-triumph.org' }

    await sendCustomCandidateMail({
      body: {
        applicationId: application.id,
        body: 'Mesaj',
        subject: 'Subiect',
      },
      payload: mocks.payload,
      user,
    })

    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: `"${user.name}" <${user.clubMail}>`,
        replyTo: user.clubMail,
        to: application.email,
      }),
    )
    expect(
      mocks.update.mock.calls[0]?.[0].data.reviewProcess.customMailHistory.at(-1),
    ).toMatchObject({ senderAddress: user.clubMail })
  })

  it('falls back to the default sender for a non-club email', () => {
    expect(getCustomMailSenderAddress({ clubMail: 'personal@example.com' })).toBe(
      DEFAULT_CUSTOM_MAIL_SENDER,
    )
  })

  it('removes header-breaking characters from the sender display name', () => {
    expect(
      getCustomMailFromHeader({
        clubMail: 'hr.member@interact-triumph.org',
        name: 'Board\r\n"BCC: attacker@example.com',
      }),
    ).toBe('"BoardBCC: attacker@example.com" <hr.member@interact-triumph.org>')
  })

  it('does not append history when delivery fails', async () => {
    const mocks = createPayload()
    mocks.sendEmail.mockRejectedValueOnce(new Error('SMTP unavailable'))

    await expect(
      sendCustomCandidateMail({
        body: {
          applicationId: application.id,
          body: 'Mesaj',
          subject: 'Subiect',
        },
        payload: mocks.payload,
        user: boardUser,
      }),
    ).rejects.toThrow('SMTP unavailable')

    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects users outside the board before loading the application', async () => {
    const mocks = createPayload()

    await expect(
      sendCustomCandidateMail({
        body: {
          applicationId: application.id,
          body: 'Mesaj',
          subject: 'Subiect',
        },
        payload: mocks.payload,
        user: { ...boardUser, role: 'active' },
      }),
    ).rejects.toMatchObject({ status: 403 })

    expect(mocks.findByID).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it.each([
    [{ body: 'Mesaj', subject: '' }, 'Adaugă subiectul emailului.'],
    [
      { body: 'Mesaj', subject: 's'.repeat(CUSTOM_MAIL_SUBJECT_MAX_LENGTH + 1) },
      `Subiectul poate avea maximum ${CUSTOM_MAIL_SUBJECT_MAX_LENGTH} de caractere.`,
    ],
    [{ body: '', subject: 'Subiect' }, 'Adaugă conținutul emailului.'],
    [
      { body: 'b'.repeat(CUSTOM_MAIL_BODY_MAX_LENGTH + 1), subject: 'Subiect' },
      'Conținutul poate avea maximum 20.000 de caractere.',
    ],
  ])('rejects invalid content %#', async (message, expectedError) => {
    const mocks = createPayload()

    await expect(
      sendCustomCandidateMail({
        body: { applicationId: application.id, ...message },
        payload: mocks.payload,
        user: boardUser,
      }),
    ).rejects.toMatchObject({ message: expectedError, status: 400 })

    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('returns not found when the application cannot be loaded', async () => {
    const mocks = createPayload()
    mocks.findByID.mockRejectedValueOnce(new Error('missing'))

    await expect(
      sendCustomCandidateMail({
        body: { applicationId: 'missing', body: 'Mesaj', subject: 'Subiect' },
        payload: mocks.payload,
        user: boardUser,
      }),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('inserts an answer at the current body selection without touching other text', () => {
    expect(insertTextAtSelection('Salut [] final', 'Ana Popescu', 6, 8)).toEqual({
      cursor: 17,
      value: 'Salut Ana Popescu final',
    })
  })
})
