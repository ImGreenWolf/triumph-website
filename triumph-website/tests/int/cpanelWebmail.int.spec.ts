import { afterEach, describe, expect, it, vi } from 'vitest'

import { createCPanelWebmailSession } from '@/utilities/cpanelWebmail'

describe('createCPanelWebmailSession', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('creates a Webmail login POST target from cPanel session data', async () => {
    vi.stubEnv('CPANEL_AUTH_TOKEN', 'cpanel username:token')
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://interact-triumph.org')

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            data: {
              hostname: 'mail.interact-triumph.org',
              session: 'member:session-token',
              token: '/cpsess1234567890',
            },
            status: 1,
          },
        }),
        { status: 200 },
      ),
    )

    const result = await createCPanelWebmailSession({
      email: 'member@interact-triumph.org',
      password: 'stored-password',
      remoteAddress: '198.51.100.12',
    })

    const [url, init] = fetchMock.mock.calls[0]
    const requestURL = url as URL

    expect(requestURL.toString()).toContain(
      'https://interact-triumph.org:2083/execute/Session/create_webmail_session_for_mail_user_check_password',
    )
    expect(requestURL.searchParams.get('login')).toBe('member')
    expect(requestURL.searchParams.get('domain')).toBe('interact-triumph.org')
    expect(requestURL.searchParams.get('password')).toBe('stored-password')
    expect(requestURL.searchParams.get('remote_address')).toBe('198.51.100.12')
    expect((init?.headers as Record<string, string>).Authorization).toBe('cpanel username:token')
    expect(result).toEqual({
      action: 'https://mail.interact-triumph.org:2096/cpsess1234567890/login',
      session: 'member:session-token',
    })
  })

  it('falls back to the cPanel API hostname when cPanel returns no Webmail hostname', async () => {
    vi.stubEnv('CPANEL_AUTH_TOKEN', 'cpanel username:token')
    vi.stubEnv('CPANEL_API_URL', 'https://cpanel.interact-triumph.org:2083')

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            hostname: null,
            session: 'member:session-token',
            token: 'cpsess1234567890',
          },
          status: 1,
        }),
        { status: 200 },
      ),
    )

    await expect(
      createCPanelWebmailSession({
        email: 'member@interact-triumph.org',
        password: 'stored-password',
      }),
    ).resolves.toEqual({
      action: 'https://cpanel.interact-triumph.org:2096/cpsess1234567890/login',
      session: 'member:session-token',
    })
  })
})
