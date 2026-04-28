// src/components/Header.jsx
import { Link, useLocation } from 'react-router-dom'
import { User, LogOut, LayoutDashboard, Flag } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function Header() {
  // We use this to check which page we are currently on for styling
  const location = useLocation()
  const isActive = (path) => location.pathname === path

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Left: Brand / Logo section */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 shadow-inner">
              <Flag className="w-5 h-5 text-emerald-500" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-100 hidden sm:block">
              Open-Yardage <span className="text-emerald-500 font-light">Architect</span>
            </h1>
          </div>

          {/* Center: Main Navigation */}
          <nav className="flex items-center gap-2 sm:gap-6 absolute left-1/2 transform -translate-x-1/2">
            <Link 
              to="/" 
              className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive('/') 
                  ? 'bg-slate-800/80 text-emerald-400 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            {/* Future routes like /community or /leaderboard can drop in right here */}
          </nav>

          {/* Right: User Settings & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link 
              to="/profile" 
              className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive('/profile') 
                  ? 'bg-slate-800/80 text-emerald-400 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="hidden md:inline">Profile & Bag</span>
            </Link>

            <div className="h-5 w-px bg-slate-700 hidden sm:block"></div> {/* Divider */}

            <button 
              onClick={() => supabase.auth.signOut()}
              className="group flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-all duration-200"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  )
}