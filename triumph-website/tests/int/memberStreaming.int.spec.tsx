// @vitest-environment node
import { PassThrough } from 'node:stream'
import { renderToPipeableStream } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MemberDataBoundary } from '@/app/(frontend)/members/_components/MemberDataBoundary'

describe('member data streaming', () => {
  it('streams a skeleton and a fast section before a delayed section resolves', async () => {
    let resolveSlow!: () => void
    const slow = new Promise<void>((resolve) => {
      resolveSlow = resolve
    })
    let html = ''
    const output = new PassThrough()
    output.on('data', (chunk) => {
      html += chunk.toString()
    })
    const complete = new Promise<void>((resolve, reject) => {
      output.on('end', resolve)
      output.on('error', reject)
    })
    const shell = new Promise<void>((resolve, reject) => {
      const stream = renderToPipeableStream(
        <main>
          <MemberDataBoundary>{async () => <p>Fast section</p>}</MemberDataBoundary>
          <MemberDataBoundary>
            {async () => {
              await slow
              return <p>Slow section</p>
            }}
          </MemberDataBoundary>
        </main>,
        {
          onShellReady() {
            stream.pipe(output)
            resolve()
          },
          onError: reject,
        },
      )
    })
    try {
      await shell
      await new Promise((resolve) => setImmediate(resolve))
      expect(html).toContain('aria-busy="true"')
      expect(html).toContain('Fast section')
      expect(html).not.toContain('Slow section')
    } finally {
      resolveSlow()
    }
    await complete
    expect(html).toContain('Slow section')
  })
})
