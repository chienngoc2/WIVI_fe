import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'

export const AppLayout = () => {
  const overview = useLocation().pathname === '/'
  return (
    <div data-testid="app-shell" className="relative flex h-screen w-full overflow-hidden bg-canvas">
      <Sidebar overview={overview} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopNav overview={overview} />
        <main className={`flex-1 overflow-y-auto bg-canvas scrollbar-premium ${overview ? 'p-4 md:p-6' : 'p-6'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
