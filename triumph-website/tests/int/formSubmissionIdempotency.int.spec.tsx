import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FormBlock } from '@/blocks/Form/Component'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/components/Media', () => ({ Media: () => null }))
vi.mock('@/components/RichText', () => ({ default: () => null }))

const form = {
  confirmationMessage: null,
  confirmationType: 'message',
  fields: [],
  id: 'form-1',
  submitButtonLabel: 'Trimite',
} as unknown as FormType

describe('form submission idempotency', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('allows only one POST when the submit button is clicked twice', async () => {
    let resolveSubmission: ((response: Response) => void) | undefined
    const pendingSubmission = new Promise<Response>((resolve) => {
      resolveSubmission = resolve
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/aspirement/recruitment-status')) {
        return Response.json({ isOpen: true, isRecruitmentForm: false })
      }

      return pendingSubmission
    })

    render(<FormBlock enableIntro={false} form={form} introMedia={null} />)

    const submit = screen.getByRole('button', { name: /trimite/i })
    fireEvent.click(submit)
    fireEvent.click(submit)

    await waitFor(() => {
      const submissionCalls = fetchMock.mock.calls.filter(([input]) =>
        String(input).includes('/api/form-submissions'),
      )
      expect(submissionCalls).toHaveLength(1)

      const request = submissionCalls[0]?.[1]
      const body = JSON.parse(String(request?.body)) as { submissionKey?: string }
      expect(body.submissionKey).toEqual(expect.any(String))
      expect(body.submissionKey).not.toBe('')
    })

    resolveSubmission?.(Response.json({ id: 'submission-1' }))
  })
})
