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
vi.mock('@/utilities/getGlobals', () => ({
  getCachedGlobal: () => async () => ({ darkModeLogo: null }),
}))
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

function mockRoutePayload(user: User, candidate: Application = application) {
  const mocks = createPayload(candidate)
  getPayloadMock.mockResolvedValueOnce({
    ...mocks.payload,
    auth: vi.fn().mockResolvedValue({ user }),
  })

  return mocks
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

describe('form review comments', () => {
  it('lets HR add a timestamped comment to a first-stage form review', async () => {
    const mocks = mockRoutePayload(boardUser)

    const response = (await PATCH(
      new Request('http://localhost/members/recruitment/applications', {
        body: JSON.stringify({
          action: 'add-form-comment',
          applicationId: application.id,
          comment: '  Comentariu intern pentru formular.  ',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
    )) as Response

    expect(response.status).toBe(200)

    const updateInput = mocks.update.mock.calls[0]?.[0]
    const comments = updateInput.data.reviewProcess.formReviewComments
    expect(comments).toHaveLength(1)
    expect(comments[0]).toMatchObject({
      author: boardUser.id,
      comment: 'Comentariu intern pentru formular.',
    })
    expect(comments[0].createdAt).toEqual(expect.any(String))

    const result = (await response.json()) as {
      application: {
        formReviewComments: Array<{
          authorId: string
          comment: string
          createdAt: string
          id: string
        }>
      }
    }
    expect(result.application.formReviewComments).toHaveLength(1)
    expect(result.application.formReviewComments[0]).toMatchObject({
      authorId: boardUser.id,
      comment: 'Comentariu intern pentru formular.',
      createdAt: expect.any(String),
      id: expect.any(String),
    })
  })

  it.each(['', 'x'.repeat(2001)])('rejects invalid comment content %#', async (comment) => {
    const mocks = mockRoutePayload(boardUser)

    const response = (await PATCH(
      new Request('http://localhost/members/recruitment/applications', {
        body: JSON.stringify({
          action: 'add-form-comment',
          applicationId: application.id,
          comment,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
    )) as Response

    expect(response.status).toBe(400)
    expect(mocks.findByID).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('does not expose form comments in the commission workspace', async () => {
    const mocks = mockRoutePayload({ ...boardUser, role: 'active' })

    const response = (await PATCH(
      new Request('http://localhost/members/commissions/applications', {
        body: JSON.stringify({
          action: 'add-form-comment',
          applicationId: application.id,
          comment: 'Comentariu',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
    )) as Response

    expect(response.status).toBe(403)
    expect(mocks.findByID).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

describe('review result and interview scheduling emails', () => {
  it('sends accepted interview scheduling emails and rejected form review emails', async () => {
    const candidates = [
      makeApplication('accepted-1', 'interview', {
        comission: 'commission-1',
        interviewScheduleToken: 'token-1',
      }),
      makeApplication('rejected-1', 'submission-rejected'),
      makeApplication('already-sent-1', 'submission-rejected', {
        interviewMailSentAt: '2026-09-15T09:00:00.000Z',
      }),
      makeApplication('submitted-1', 'submitted'),
      makeApplication('waitlisted-1', 'submission-waitlisted'),
      makeApplication('coordinator-1', 'coordonator-review'),
      makeApplication('final-1', 'interview-passed'),
    ] as Application[]
    const sendEmail = vi.fn().mockResolvedValue(undefined)
    const findByID = vi.fn().mockResolvedValue(createCommission())
    const find = vi.fn().mockImplementation(async ({ where }) => {
      const statuses = where?.['reviewProcess.status']?.in as string[] | undefined
      const status = where?.['reviewProcess.status']?.equals as string | undefined
      return {
        docs: candidates.filter((candidate) => {
          const candidateStatus = candidate.reviewProcess?.status
          return statuses ? statuses.includes(candidateStatus ?? '') : candidateStatus === status
        }),
      }
    })
    const update = vi.fn().mockImplementation(async ({ data, id }) => ({
      ...candidates.find((candidate) => candidate.id === id),
      reviewProcess: {
        ...(candidates.find((candidate) => candidate.id === id)?.reviewProcess ?? {}),
        ...data.reviewProcess,
      },
    }))

    getPayloadMock.mockResolvedValueOnce({
      auth: vi.fn().mockResolvedValue({ user: boardUser }),
      find,
      findByID,
      findGlobal: vi.fn().mockResolvedValue({
        recruitment: { interviewSchedulingDeadline: '2099-01-01T00:00:00.000Z' },
      }),
      sendEmail,
      update,
    })

    const response = (await PATCH(
      new Request('http://localhost/members/recruitment/applications', {
        body: JSON.stringify({ action: 'send-interview-mails' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
    )) as Response

    expect(response.status).toBe(200)
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          'reviewProcess.status': {
            in: ['interview', 'submission-rejected'],
          },
        },
      }),
    )
    expect(sendEmail).toHaveBeenCalledTimes(2)
    expect(sendEmail.mock.calls.map((call) => call[0].to).sort()).toEqual([
      'accepted-1@example.com',
      'rejected-1@example.com',
    ])
    expect(sendEmail.mock.calls[0]?.[0].text).toContain('Programare:')
    expect(sendEmail.mock.calls[0]?.[0].text).toContain('token-1')
    expect(sendEmail.mock.calls[1]?.[0].text).toContain('nu ai fost acceptat')
    expect(update).toHaveBeenCalledTimes(2)
    expect(update.mock.calls.map((call) => call[0].id).sort()).toEqual(['accepted-1', 'rejected-1'])
    for (const call of update.mock.calls) {
      expect(call[0].data.reviewProcess).toMatchObject({
        interviewMailSentAt: expect.any(String),
        interviewMailSentBy: boardUser.id,
      })
      expect(call[0].data.reviewProcess).not.toHaveProperty('reviewMailSentAt')
      expect(call[0].data.reviewProcess).not.toHaveProperty('finalMailSentAt')
    }

    const result = (await response.json()) as {
      applications: Array<{ id: string; interviewMailSentAt: string }>
      mailBatch: { failed: number; sent: number; skipped: number }
    }
    expect(result.mailBatch).toMatchObject({ failed: 0, sent: 2, skipped: 1 })
    expect(result.applications).toHaveLength(2)
    expect(result.applications[0]?.interviewMailSentAt).toEqual(expect.any(String))
  })

  it('does not send interview mails when commission slots do not cover assigned candidates', async () => {
    const candidates = [
      makeApplication('accepted-1', 'interview', { comission: 'commission-1' }),
      makeApplication('accepted-2', 'interview', { comission: 'commission-1' }),
    ] as Application[]
    const sendEmail = vi.fn().mockResolvedValue(undefined)
    const findByID = vi.fn().mockResolvedValue(
      createCommission({
        interviewIntervals: [
          {
            breaks: [],
            endDateTime: '2099-01-01T09:20:00.000Z',
            interviewDuration: 20,
            location: { name: 'Club HQ' },
            pauseBetween: 5,
            startDateTime: '2099-01-01T09:00:00.000Z',
          },
        ],
      }),
    )
    const find = vi.fn().mockImplementation(async ({ where }) => {
      const statusWhere =
        where?.['reviewProcess.status'] ??
        where?.and?.find((clause: Record<string, unknown>) => 'reviewProcess.status' in clause)?.[
          'reviewProcess.status'
        ]
      const statuses = statusWhere?.in as string[] | undefined
      const status = statusWhere?.equals as string | undefined
      const docs = candidates.filter((candidate) => {
        const candidateStatus = candidate.reviewProcess?.status
        return statuses ? statuses.includes(candidateStatus ?? '') : candidateStatus === status
      })
      return { docs, totalDocs: docs.length }
    })
    const update = vi.fn()

    getPayloadMock.mockResolvedValueOnce({
      auth: vi.fn().mockResolvedValue({ user: boardUser }),
      find,
      findByID,
      findGlobal: vi.fn().mockResolvedValue({
        recruitment: { interviewSchedulingDeadline: '2099-01-01T00:00:00.000Z' },
      }),
      sendEmail,
      update,
    })

    const response = (await PATCH(
      new Request('http://localhost/members/recruitment/applications', {
        body: JSON.stringify({ action: 'send-interview-mails' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
    )) as Response

    expect(response.status).toBe(200)
    expect(sendEmail).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()

    const result = (await response.json()) as {
      mailBatch: { failed: number; sent: number; skipped: number; warnings: string[] }
    }
    expect(result.mailBatch).toMatchObject({ failed: 0, sent: 0, skipped: 2 })
    expect(result.mailBatch.warnings[0]).toContain('1 sloturi pentru 2 candidati')
  })

  it('resends one rejected review result email when an application id is provided', async () => {
    const candidates = [
      makeApplication('rejected-1', 'submission-rejected'),
      makeApplication('rejected-2', 'submission-rejected', {
        interviewMailSentAt: '2026-09-15T09:00:00.000Z',
      }),
    ] as Application[]
    const sendEmail = vi.fn().mockResolvedValue(undefined)
    const find = vi.fn().mockImplementation(async ({ where }) => {
      const requestedId = where?.and?.find((clause: Record<string, unknown>) => 'id' in clause)?.id
        ?.equals
      const statusWhere = where?.and?.find(
        (clause: Record<string, unknown>) => 'reviewProcess.status' in clause,
      )?.['reviewProcess.status']
      const statuses = statusWhere?.in as string[] | undefined
      const status = statusWhere?.equals as string | undefined

      return {
        docs: candidates.filter((candidate) => {
          const candidateStatus = candidate.reviewProcess?.status
          const statusMatches = statuses
            ? statuses.includes(candidateStatus ?? '')
            : candidateStatus === status
          return candidate.id === requestedId && statusMatches
        }),
      }
    })
    const update = vi.fn().mockImplementation(async ({ data, id }) => ({
      ...candidates.find((candidate) => candidate.id === id),
      reviewProcess: {
        ...(candidates.find((candidate) => candidate.id === id)?.reviewProcess ?? {}),
        ...data.reviewProcess,
      },
    }))

    getPayloadMock.mockResolvedValueOnce({
      auth: vi.fn().mockResolvedValue({ user: boardUser }),
      find,
      findGlobal: vi.fn().mockResolvedValue({ recruitment: {} }),
      sendEmail,
      update,
    })

    const response = (await PATCH(
      new Request('http://localhost/members/recruitment/applications', {
        body: JSON.stringify({
          action: 'send-interview-mails',
          applicationId: 'rejected-2',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
    )) as Response

    expect(response.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'rejected-2@example.com' }),
    )
    expect(update).toHaveBeenCalledTimes(1)
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      id: 'rejected-2',
      data: {
        reviewProcess: {
          interviewMailSentAt: expect.any(String),
          interviewMailSentBy: boardUser.id,
        },
      },
    })

    const result = (await response.json()) as {
      applications: Array<{ id: string; interviewMailSentAt: string }>
      mailBatch: { failed: number; sent: number; skipped: number }
    }
    expect(result.mailBatch).toMatchObject({ failed: 0, sent: 1, skipped: 0 })
    expect(result.applications).toHaveLength(1)
    expect(result.applications[0]?.id).toBe('rejected-2')
  })

  it('lets PR directors send debug accepted review emails before assignment', async () => {
    const candidates = [makeApplication('accepted-review-1', 'coordonator-review')] as Application[]
    const sendEmail = vi.fn().mockResolvedValue(undefined)
    const find = vi.fn().mockResolvedValue({ docs: candidates })
    const update = vi.fn().mockImplementation(async ({ data, id }) => ({
      ...candidates.find((candidate) => candidate.id === id),
      reviewProcess: {
        ...(candidates.find((candidate) => candidate.id === id)?.reviewProcess ?? {}),
        ...data.reviewProcess,
      },
    }))

    getPayloadMock.mockResolvedValueOnce({
      auth: vi.fn().mockResolvedValue({ user: { ...boardUser, role: 'pr-director' } }),
      find,
      findGlobal: vi.fn().mockResolvedValue({ recruitment: {} }),
      sendEmail,
      update,
    })

    const response = (await PATCH(
      new Request('http://localhost/members/recruitment/applications', {
        body: JSON.stringify({
          action: 'send-interview-mails',
          applicationId: 'accepted-review-1',
          debugIncludeAcceptedReviewCandidates: true,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
    )) as Response

    expect(response.status).toBe(200)
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          and: [
            { id: { equals: 'accepted-review-1' } },
            {
              'reviewProcess.status': {
                in: ['coordonator-review', 'interview', 'submission-rejected'],
              },
            },
          ],
        },
      }),
    )
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.not.stringContaining('Programare:'),
        to: 'accepted-review-1@example.com',
      }),
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          reviewProcess: expect.objectContaining({
            interviewMailSentAt: expect.any(String),
            interviewMailSentBy: boardUser.id,
          }),
        },
      }),
    )
  })
})

describe('bulk assignment wizard route', () => {
  it('assigns eligible candidates and keeps conflicted candidates out', async () => {
    const candidates = [
      makeApplication('eligible-1', 'coordonator-review'),
      makeApplication('conflicted-1', 'coordonator-review', {
        coordonatorIncompatability: ['coordinator-1'],
      }),
    ] as Application[]
    const commission = createCommission()
    const findByID = vi.fn().mockImplementation(async ({ collection, id }) => {
      if (collection === 'comissions') return commission
      return candidates.find((candidate) => candidate.id === id)
    })
    const update = vi.fn().mockImplementation(async ({ data, id }) => ({
      ...candidates.find((candidate) => candidate.id === id),
      reviewProcess: {
        ...(candidates.find((candidate) => candidate.id === id)?.reviewProcess ?? {}),
        ...data.reviewProcess,
      },
    }))

    getPayloadMock.mockResolvedValueOnce({
      auth: vi.fn().mockResolvedValue({ user: boardUser }),
      findByID,
      update,
    })

    const response = (await PATCH(
      new Request('http://localhost/members/recruitment/applications', {
        body: JSON.stringify({
          action: 'bulk-assign-candidates',
          assignments: [
            { applicationId: 'eligible-1', commissionId: 'commission-1' },
            { applicationId: 'conflicted-1', commissionId: 'commission-1' },
          ],
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
    )) as Response

    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          reviewProcess: expect.objectContaining({
            comission: 'commission-1',
            interviewDate: null,
            status: 'interview',
          }),
        },
        id: 'eligible-1',
      }),
    )

    const result = (await response.json()) as {
      applications: Array<{ commissionId: string; id: string; status: string }>
      message: string
    }
    expect(result.applications).toEqual([
      expect.objectContaining({
        commissionId: 'commission-1',
        id: 'eligible-1',
        status: 'interview',
      }),
    ])
    expect(result.message).toContain('1 esuate')
  })
})

function createCommission(overrides: Record<string, unknown> = {}) {
  return {
    commissionNumber: 1,
    coordinators: ['coordinator-1'],
    id: 'commission-1',
    interviewIntervals: [
      {
        breaks: [],
        endDateTime: '2099-01-01T11:00:00.000Z',
        interviewDuration: 20,
        location: { name: 'Club HQ' },
        pauseBetween: 5,
        startDateTime: '2099-01-01T09:00:00.000Z',
      },
    ],
    recruitmentReviews: [
      {
        confirmedAt: '2026-09-15T09:00:00.000Z',
        coordinator: 'coordinator-1',
      },
    ],
    ...overrides,
  }
}

function makeApplication(
  id: string,
  status: NonNullable<NonNullable<Application['reviewProcess']>['status']>,
  reviewProcess: Partial<NonNullable<Application['reviewProcess']>> = {},
): Application {
  return {
    createdAt: '2026-09-01T09:00:00.000Z',
    email: `${id}@example.com`,
    formSubmission: {
      id: `${id}-submission`,
      submissionData: [],
      updatedAt: '2026-09-01T09:00:00.000Z',
    },
    id,
    name: id,
    reviewProcess: {
      status,
      ...reviewProcess,
    },
    updatedAt: '2026-09-01T09:00:00.000Z',
  } as unknown as Application
}
