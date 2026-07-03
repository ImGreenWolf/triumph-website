const dashboardWidgets = [
  {
    slug: 'member-presence-statistics',
    label: 'Statistici prezență membri',
    Component: '@/components/Dashboard/Widgets/MemberPresenceStatisticsWidget',
  },
  {
    slug: 'member-presence-graph',
    label: 'Grafic prezență membri',
    Component: '@/components/Dashboard/Widgets/MemberPresenceGraphWidget',
  },
  {
    slug: 'gallery-submission',
    label: 'Trimiteri galerie',
    Component: '@/components/Dashboard/Widgets/GallerySubmissionWidget',
  },
  {
    slug: 'event-statistics',
    label: 'Statistici evenimente',
    Component: '@/components/Dashboard/Widgets/EventStatisticsWidget',
  },
  {
    slug: 'meetings-management',
    label: 'Administrare întâlniri',
    Component: '@/components/Dashboard/Widgets/MeetingsManagementWidget',
  },
  {
    slug: 'last-meeting-statistic',
    label: 'Statistica ultimei întâlniri',
    Component: '@/components/Dashboard/Widgets/LastMeetingStatisticWidget',
  },
  {
    slug: 'dues-statistics',
    label: 'Statistici cotizații',
    Component: '@/components/Dashboard/Widgets/DuesStatisticsWidget',
  },
  {
    slug: 'dues-management',
    label: 'Administrare cotizații',
    Component: '@/components/Dashboard/Widgets/DuesManagementWidget',
  },
  {
    slug: 'intro-widget',
    label: 'Introducere',
    Component: '@/components/Dashboard/Widgets/IntroWidget',
  },
]

export default dashboardWidgets
