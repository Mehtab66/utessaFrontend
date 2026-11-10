import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'
import { Logo, Wordmark } from '../../shared/ui/Logo'

export default function PlatformShell() {
  const { user, loading, logout, isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [booting, setBooting] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!booting) return undefined
    const started = Date.now()
    const timer = setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - started) / 1200) * 100))
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(timer)
        setTimeout(() => {
          setBooting(false)
          if (location.state?.bootDashboard) {
            navigate(location.pathname, { replace: true, state: {} })
          }
        }, 160)
      }
    }, 40)
    return () => clearInterval(timer)
  }, [booting, location.pathname, location.state, navigate])

  if (loading) {
    return <Boot progress={30} label="Checking secure platform session…" />
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user?.superAdmin) return <Navigate to="/app" replace />

  if (booting) {
    return <Boot progress={progress} label="Loading platform console…" detail={user.email} />
  }

  return (
    <div className="flex min-h-screen flex-wrap bg-[#F3F3F8] text-[#151940]">
      <nav className="flex w-full flex-col gap-4 border-b border-[#E1E3F0] bg-[#12153a] px-3.5 py-5 text-white md:min-h-screen md:w-[236px] md:flex-none md:border-b-0 md:border-r md:border-[#2a2f5c]">
        <div className="flex items-center gap-2.5 px-1.5">
          <Logo className="h-8 w-8" />
          <div>
            <Wordmark light />
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lcyan">Platform</p>
          </div>
        </div>
        <div className="flex-1 px-1.5 text-sm text-lavender/80">
          <p className="rounded-lg bg-white/5 px-3 py-2 leading-relaxed">
            System-wide monitoring. Not tied to any practice organization.
          </p>
        </div>
        <div className="mt-auto space-y-2 border-t border-white/10 px-1.5 pt-3">
          <div className="rounded-lg bg-white/5 px-2.5 py-2 text-[12px] leading-snug">
            <div className="font-semibold text-white">{user.fullName}</div>
            <div className="text-lcyan">Super admin</div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="min-h-10 w-full rounded-lg bg-yellow px-3 text-sm font-bold text-navy"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-[#E1E3F0] bg-white px-5 py-3">
          <div>
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.08em] text-[#717490]">Utessa control plane</p>
            <p className="m-0 text-sm text-[#43476A]">Cross-tenant visibility · session cookie auth</p>
          </div>
          <span className="rounded-full bg-[#E8E9F3] px-3 py-1.5 text-[12px] font-semibold text-[#3B3F5D]">
            No org membership
          </span>
        </header>
        <section className="px-5 py-6 sm:px-7">
          <Outlet />
        </section>
      </div>
    </div>
  )
}

function Boot({ progress, label, detail }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#12153a] px-4 text-white">
      <div className="w-full max-w-md text-center">
        <Logo className="mx-auto mb-5 h-12 w-12 animate-mosaic" />
        <h1 className="text-[22px] font-bold">{label}</h1>
        {detail && <p className="mt-1 text-sm text-lavender/80">{detail}</p>}
        <div className="mx-auto mt-6 h-2.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-cyan transition-[width] duration-100" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
