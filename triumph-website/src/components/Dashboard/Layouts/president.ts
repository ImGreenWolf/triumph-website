import type { PayloadRequest, WidgetInstance } from 'payload'

export default async function presidentDashboardLayout({
  req: _req,
}: {
  req: PayloadRequest
}): Promise<Array<WidgetInstance>> {



  return [
    {
      widgetSlug: 'event-statistics',
      width: 'medium',
    },
    {
      widgetSlug: 'last-meeting-statistic',
      width: 'medium',
    },
    {
      widgetSlug: 'meetings-management',
      width: 'small',
    },
    {
      widgetSlug: 'member-presence-statistics',
      width: 'small',
    },
    {
      widgetSlug: 'dues-statistics',
      width: 'small',
    },
    {
      widgetSlug: 'member-presence-graph',
      width: 'full',
    },
    
  ]
}
