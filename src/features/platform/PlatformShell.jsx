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
    <div className="flex min-h-screen flex-wrap bg-[#F6F7FB] text-[#1B1F4B]">
      <nav
        aria-label="Platform"
        className="flex w-full flex-col gap-5 border-b border-[#DCDFEE] bg-white px-4 py-5 md:sticky md:top-0 md:h-screen md:w-[272px] md:flex-none md:overflow-y-auto md:border-b-0 md:border-r"
      >
        <div className="flex items-center gap-2.5 px-1.5">
          <Logo className="h-8 w-8" />
          <div>
            <Wordmark />
          </div>
        </div>

        <div className="flex-1 space-y-3 px-0.5">
          {PLATFORM_NAV.map((section) => (
            <div key={section.title} className="border-t border-[#DCDFEE] pt-3 first:border-t-0 first:pt-0">
              <p className="mb-1.5 flex items-center gap-2 px-3 text-[12px] font-bold uppercase tracking-[0.1em] text-[#1B1F4B]">
                <i className={`inline-block h-2.5 w-2.5 rounded-[3px] ${TONE_DOT[section.tone]}`} />
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.end ?? true}
                    className={({ isActive }) =>
                      `flex min-h-[42px] items-center rounded-[10px] px-3 pl-[30px] text-[15px] font-medium transition ${
                        isActive
                          ? `bg-[#DDF6F7] font-semibold text-[#1B1F4B] shadow-[inset_3px_0_0_0] ${
                              section.tone === 'cyan'
                                ? 'shadow-[#3BC4CA]'
                                : section.tone === 'lav'
                                  ? 'shadow-[#C9CDF2]'
                                  : section.tone === 'yellow'
                                    ? 'shadow-[#FFD23F]'
                                    : 'shadow-[#1B1F4B]'
                            }`
                          : 'text-[#4A4E7A] hover:bg-[#EEF0FA] hover:text-[#1B1F4B]'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-2 border-t border-[#DCDFEE] px-1.5 pt-4">
          <div className="text-[14px]">
            <div className="text-base font-bold text-[#1B1F4B]">{user.fullName}</div>
            <div className="mt-1 truncate text-[13px] text-[#4A4E7A]">{user.email}</div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="min-h-[42px] w-full rounded-[10px] border border-[#DCDFEE] bg-[#F6F7FB] px-3 text-sm font-semibold text-[#1B1F4B] hover:bg-[#EEF0FA]"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCDFEE] bg-white px-5 py-3">
          <div>
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.08em] text-[#4A4E7A]">Utessa control plane</p>
            <p className="m-0 text-sm text-[#4A4E7A]">
              Totals across every organization · patient detail never appears here
            </p>
          </div>
        </header>
        <section className="px-4 py-7 sm:px-8">
          <Outlet />
        </section>
      </div>
    </div>
  )
}

function Boot({ label }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F6F7FB] px-4">
      <div className="w-full max-w-md text-center">
        <Logo className="mx-auto mb-5 h-12 w-12 animate-mosaic" />
        <h1 className="text-[22px] font-bold text-[#1B1F4B]">{label}</h1>
      </div>
    </div>
  )
}
