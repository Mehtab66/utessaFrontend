import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'
import { Logo, Wordmark } from '../../shared/ui/Logo'
import { PLATFORM_NAV, TONE_DOT } from './platformNav'

export default function PlatformShell() {
  const { user, loading, logout, isAuthenticated } = useAuth()

  if (loading) {
    return <Boot label="Checking secure platform session…" />
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user?.superAdmin) return <Navigate to="/app" replace />

  return (
    <div className="flex min-h-screen bg-white text-[#141B35]">
      <aside
        aria-label="Platform"
        className="flex w-full flex-col border-b border-[#E4E8F3] bg-[#F9FAFC] md:sticky md:top-0 md:h-screen md:w-[290px] md:flex-none md:border-b-0 md:border-r"
      >
        <div className="flex items-center gap-3 border-b border-[#EEF2FA] bg-white px-4 py-4 md:px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F6FC] ring-1 ring-[#E4E8F3]">
            <Logo className="h-6 w-6" />
          </div>
          <div>
            <Wordmark />
          </div>
        </div>

        <nav className="hide-scrollbar flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {PLATFORM_NAV.map((section) => (
            <div key={section.title} className="rounded-2xl border border-[#EEF2FA] bg-white p-2.5 shadow-[0_6px_18px_rgba(17,24,39,0.02)]">
              <p className="mb-2 flex items-center gap-2 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#5B647C]">
                <i className={`inline-block h-2.5 w-2.5 rounded-[4px] ${TONE_DOT[section.tone]}`} />
                {section.title}
              </p>
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.end === true}
                    className={({ isActive }) =>
                      `flex min-h-[42px] items-center rounded-xl px-3 text-[15px] font-medium transition ${
                        isActive
                          ? 'bg-[#F1F6FF] text-[#141B35] shadow-[inset_2px_0_0_0_#1EA7A8]'
                          : 'text-[#5B647C] hover:bg-[#F4F7FB] hover:text-[#141B35]'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#EEF2FA] bg-white p-3 md:p-4">
          <div className="rounded-2xl border border-[#E4E8F3] bg-[#F9FBFF] p-3">
            <div className="text-sm font-semibold text-[#141B35]">{user.fullName}</div>
            <div className="mt-1 truncate text-xs text-[#5B647C]">{user.email}</div>
            <button
              type="button"
              onClick={logout}
              className="mt-3 w-full rounded-xl border border-[#E4E8F3] bg-white px-3 py-2 text-sm font-semibold text-[#141B35] transition hover:bg-[#F5F7FB]"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-[#E4E8F3] bg-white px-4 py-3 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[#5B647C]">Utessa control plane</p>
              <p className="m-0 text-sm text-[#5B647C]">Operations, access, and platform health</p>
            </div>
          </div>
        </header>
        <main className="bg-white px-4 py-6 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Boot({ label }) {
  return (
    <div className="grid min-h-screen place-items-center bg-white px-4">
      <div className="w-full max-w-md rounded-[18px] border border-[#E4E8F3] bg-white p-8 text-center shadow-[0_10px_24px_rgba(17,24,39,0.06)]">
        <Logo className="mx-auto mb-5 h-12 w-12" />
        <h1 className="text-[22px] font-bold text-[#141B35]">{label}</h1>
      </div>
    </div>
  )
}
