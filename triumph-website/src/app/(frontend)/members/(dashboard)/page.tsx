import { getDashboardBootstrap } from './bootstrap'
import { loadDashboardData } from './data'
import DashboardContent from './DashboardContent'
import PageClient from '../page.client'

export default async function DashboardPage() {
  const bootstrap = await getDashboardBootstrap()
  const data = loadDashboardData(bootstrap)
  return (
    <>
      <PageClient />
      <DashboardContent shell={bootstrap.shell} data={data} />
    </>
  )
}
