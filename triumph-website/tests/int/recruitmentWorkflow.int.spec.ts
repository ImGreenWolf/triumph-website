import { describe, expect, it } from 'vitest'

import { getRecruitmentWorkflowState } from '@/utilities/recruitmentWorkflow'

describe('recruitment workflow', () => {
  it('keeps review emails visible without blocking coordinator verification or assignment', () => {
    const workflow = getRecruitmentWorkflowState({
      applications: [
        {
          id: 'application-1',
          reviewMailSentAt: null,
          reviewedCoordinatorIds: ['coordinator-1'],
          status: 'coordonator-review',
        },
      ],
      commissions: [
        {
          coordinators: [{ id: 'coordinator-1' }],
          id: 'commission-1',
          recruitmentReviews: [{ coordinatorId: 'coordinator-1' }],
        },
      ],
      config: {
        recruitmentEndDate: '2026-01-01T00:00:00.000Z',
      },
      now: new Date('2026-09-29T12:00:00.000Z'),
    })

    expect(workflow.gates['review-emails'].complete).toBe(false)
    expect(workflow.gates['review-emails'].blockers[0]).toContain('emailuri de review formular')
    expect(workflow.currentStep).toBe('assignment')
  })
})
