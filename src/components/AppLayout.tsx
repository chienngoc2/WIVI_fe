import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'

export const AppLayout = () => (
  <div data-testid="app-shell" className="relative flex h-screen w-full overflow-hidden bg-canvas">
    <Sidebar />
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopNav />
      <main className="flex-1 overflow-y-auto bg-canvas p-6 scrollbar-premium">
        <Outlet />
      </main>
    </div>
  </div>
)
