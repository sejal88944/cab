import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const BottomNav = () => {
  const location = useLocation()
  const isHiddenOnAdmin = location.pathname.startsWith('/admin')

  if (isHiddenOnAdmin) return null

  const base =
    'flex flex-col items-center justify-center flex-1 gap-0.5 text-xs font-medium transition-colors'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 h-14 bg-slate-900/95 border-t border-slate-800 backdrop-blur">
      <div className="mx-auto flex h-full max-w-md items-center px-4">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `${base} ${isActive ? 'text-emerald-400' : 'text-slate-400'}`
          }
        >
          <i className="ri-home-5-line text-lg" />
          <span>Home</span>
        </NavLink>
        <NavLink
          to="/home"
          className={({ isActive }) =>
            `${base} ${isActive ? 'text-emerald-400' : 'text-slate-400'}`
          }
        >
          <i className="ri-taxi-wifi-line text-lg" />
          <span>Ride</span>
        </NavLink>
        <NavLink
          to="/captain-home"
          className={({ isActive }) =>
            `${base} ${isActive ? 'text-emerald-400' : 'text-slate-400'}`
          }
        >
          <i className="ri-steering-2-line text-lg" />
          <span>Captain</span>
        </NavLink>
      </div>
    </nav>
  )
}

export default BottomNav

