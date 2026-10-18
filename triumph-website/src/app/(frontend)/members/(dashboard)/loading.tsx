import { getDashboardBootstrap } from './bootstrap'
import DashboardShell from '../_components/DashboardShell'
import PageClient from '../page.client'

export default async function DashboardLoading() {
  const { shell } = await getDashboardBootstrap()
  return (
    <>
      <PageClient />
      <DashboardShell {...shell} />
    </>
  )
}
