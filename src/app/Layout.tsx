import { Video, Download } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">ScreenNest</span>
          <nav className="flex gap-4">
            <NavLink
              to="/record"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-100'
                }`
              }
            >
              <Video size={15} />
              Record
            </NavLink>
            <NavLink
              to="/download"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-100'
                }`
              }
            >
              <Download size={15} />
              Download
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
