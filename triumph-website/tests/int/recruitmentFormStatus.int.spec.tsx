import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'
import { FormBlock } from '@/blocks/Form/Component'
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/Media', () => ({ Media: () => null }))
vi.mock('@/components/RichText', () => ({ default: () => null }))
const form = {
  id: 'recruitment',
  title: 'Înscriere',
  fields: [],
  submitButtonLabel: 'Trimite',
  confirmationType: 'message',
} as unknown as FormType

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})
describe('recruitment form availability', () => {
  it('does not expose a submit action before availability is verified', async () => {
    let resolve!: (response: Response) => void
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    render(<FormBlock enableIntro={false} form={form} introMedia={null} />)
    expect(screen.queryByRole('button', { name: 'Trimite' })).toBeNull()
    await act(async () =>
      resolve(
        Response.json({
          isRecruitmentForm: true,
          isOpen: false,
          message: 'Perioada de înscrieri s-a încheiat.',
        }),
      ),
    )
    expect(await screen.findByText('Perioada de înscrieri s-a încheiat.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Trimite' })).toBeNull()
  })
  it('fails closed on a network error and supports retry', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValue(Response.json({ isRecruitmentForm: false, isOpen: true }))
    render(<FormBlock enableIntro={false} form={form} introMedia={null} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Încearcă din nou' }))
    expect(await screen.findByRole('button', { name: 'Trimite' })).toBeTruthy()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('rechecks status when a member returns to the tab', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => Response.json({ isRecruitmentForm: false, isOpen: true }))
    render(<FormBlock enableIntro={false} form={form} introMedia={null} />)
    await screen.findByRole('button', { name: 'Trimite' })
    fireEvent(window, new Event('focus'))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })
})
