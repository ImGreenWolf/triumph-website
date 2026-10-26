// @vitest-environment node
import { PassThrough } from 'node:stream'
import { renderToPipeableStream } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import DashboardContent from '@/app/(frontend)/members/(dashboard)/DashboardContent'
import { deferredData, fixtureShell } from '../fixtures/dashboard/data'

describe('dashboard shell streaming', () => {
  it('shows an unassessed state when there is no attendance history', async () => {
    const run = deferredData('populated')
    run.resolve('all')
    const attendance = await run.data.attendance
    run.data.attendance = Promise.resolve({
      ...attendance,
      totalMeetings: 0,
      attendancePercentage: 0,
      presentMeetings: 0,
      lateMeetings: 0,
      absentMeetings: 0,
      motivatedMeetings: 0,
      records: [],
    })
    const output = new PassThrough()
    let html = ''
    output.on('data', (chunk) => {
      html += chunk.toString()
    })
    await new Promise<void>((resolve, reject) => {
      output.on('end', resolve)
      output.on('error', reject)
      const stream = renderToPipeableStream(
        <DashboardContent shell={fixtureShell()} data={run.data} />,
        {
          onAllReady() {
            stream.pipe(output)
          },
          onError: reject,
        },
      )
    })
    expect(html).toContain('Neevaluat')
    expect(html).toContain('style="width:0%"')
    expect(html).not.toContain('Necesită atenție')
  })

  it('emits headings, labels, profile and actions before any card or avatar data resolves', async () => {
    const run = deferredData('populated')
    const output = new PassThrough()
    let html = ''
    output.on('data', (chunk) => {
      html += chunk.toString()
    })
    const complete = new Promise<void>((resolve, reject) => {
      output.on('end', resolve)
      output.on('error', reject)
    })
    await new Promise<void>((resolve, reject) => {
      const stream = renderToPipeableStream(
        <DashboardContent shell={fixtureShell()} data={run.data} />,
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
      for (const label of [
        'Prezență',
        'Cotizații',
        'Următoarea întâlnire',
        'Prezente',
        'Motivate',
        'Nemotivate',
        'Acoperite',
        'Scutite',
        'Restante',
        'Alexandra Popescu',
        'Proiectele mele',
        'Comisiile mele',
        'Recrutare',
        'Administrare club',
        'Profil',
        'Deconectare',
        'Deschide Webmail',
        'Arată codul QR',
      ])
        expect(html).toContain(label)
      expect(html).toContain('data-dashboard-panel="attendance"')
      expect(html).toContain('data-dashboard-panel="meeting"')
      expect(html).toContain('data-dashboard-slot="avatar"')
      expect(html).not.toContain('Mesajul 1 despre activitățile clubului')
      expect(html).not.toContain('duminică, 18 octombrie')
      run.resolve('attendance')
      await new Promise((resolve) => setImmediate(resolve))
      expect(html).toContain('style="width:83%"')
      expect(html).not.toContain('Mesajul 1 despre activitățile clubului')
    } finally {
      run.resolve('all')
    }
    await complete
    expect(html).toContain('Mesajul 1 despre activitățile clubului')
    expect(html).toContain('duminică, 18 octombrie')
  })
})
