import { useMemo, useRef, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'
import { Logo, Wordmark } from '../../shared/ui/Logo'
import { PLATFORM_NAV } from './platformNav'

export default function PlatformShell() {
  const { user, loading, logout, isAuthenticated } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const closeTimerRef = useRef(null)

  const activeSection = useMemo(() => {
    const flatItems = PLATFORM_NAV.flatMap((section) => section.items)
    const activeItem = flatItems.find((item) => item.to === location.pathname || (item.end && location.pathname === item.to))

    if (!activeItem) return PLATFORM_NAV[0]

    return PLATFORM_NAV.find((section) => section.items.some((item) => item.id === activeItem.id)) || PLATFORM_NAV[0]
  }, [location.pathname])

  const handleSubmenuEnter = (sectionTitle) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setOpenDropdown(sectionTitle)
  }

  const handleSubmenuLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdown(null)
    }, 120)
  }

  if (loading) {
    return <Boot label="Checking secure platform session…" />
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user?.superAdmin) return <Navigate to="/app" replace />

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#0A3B40]">
      <header className="sticky top-0 z-40 border-b border-[#E2E8EC] bg-white/95 backdrop-blur-xl">
        <div className="w-full">
          <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E1F4F5] ring-1 ring-[#E2E8EC]">
                <Logo className="h-6 w-6" />
              </div>
              <div className="flex items-center gap-2">
                <Wordmark />
              </div>
            </div>

            <nav className="hidden flex-1 items-center justify-center gap-1.5 lg:flex">
              {PLATFORM_NAV.map((section) => {
                const isOpen = openDropdown === section.title
                const isActive = section.items.some((item) => item.to === location.pathname)

                return (
                  <div
                    key={section.title}
                    className="relative"
                    onMouseEnter={() => handleSubmenuEnter(section.title)}
                    onMouseLeave={() => handleSubmenuLeave()}
                  >
                    <div
                      onClick={() => {
                        if (isOpen) {
                          setOpenDropdown(null)
                          return
                        }
                        setOpenDropdown(section.title)
                      }}
                      className={`flex cursor-pointer items-center gap-1 rounded-full border px-3 py-2.5 text-[13px] font-medium leading-none transition-all duration-200 ${
                        isActive
                          ? 'border-[#0F7F86] bg-[#0F7F86] text-white shadow-[0_10px_22px_rgba(15,127,134,0.18)]'
                          : 'border-transparent bg-transparent text-[#0A3B40] hover:bg-[#E1F4F5] hover:text-[#0A3B40]'
                      }`}
                    >
                      <NavLink
                        to={section.items[0].to}
                        end={section.items[0].end === true}
                        className="flex min-w-[100px] items-center justify-center text-center"
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenDropdown(null)
                        }}
                      >
                        {section.title}
                      </NavLink>

                      {section.items.length > 1 && (
                        <span
                          aria-hidden="true"
                          onClick={(event) => {
                            event.stopPropagation()
                            setOpenDropdown((current) => (current === section.title ? null : section.title))
                          }}
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                            isActive || isOpen ? 'bg-white/10 text-white' : 'bg-[#E1F4F5] text-[#0F7F86]'
                          }`}
                        >
                          ▾
                        </span>
                      )}
                    </div>

                    {section.items.length > 1 && isOpen && (
                      <div
                        className="absolute left-0 top-full z-50 w-52 overflow-hidden rounded-2xl border border-[#E2E8EC] bg-white p-1.5 shadow-[0_18px_34px_rgba(10,59,64,0.10)]"
                        onMouseEnter={() => handleSubmenuEnter(section.title)}
                        onMouseLeave={() => handleSubmenuLeave()}
                        style={{ marginTop: 0 }}
                      >
                        {section.items.map((item) => (
                          <NavLink
                            key={item.id}
                            to={item.to}
                            end={item.end === true}
                            onClick={() => setOpenDropdown(null)}
                            className={({ isActive }) =>
                              `flex rounded-xl px-3 py-2 text-sm font-medium transition ${
                                isActive
                                  ? 'bg-[#0F7F86] text-white'
                                  : 'text-[#5B6B73] hover:bg-[#E1F4F5] hover:text-[#0A3B40]'
                              }`
                            }
                          >
                            {item.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                aria-label="Toggle navigation menu"
                onClick={() => setMenuOpen((value) => !value)}
                className="inline-flex items-center justify-center rounded-full border border-[#E2E8EC] bg-white px-3 py-2 text-sm font-semibold text-[#0A3B40] transition hover:border-[#D5E7E9] hover:bg-[#E1F4F5] lg:hidden"
              >
                Menu
              </button>

              <button
                type="button"
                onClick={logout}
                className="hidden rounded-full border border-[#E2E8EC] bg-white px-3 py-2 text-sm font-semibold text-[#0A3B40] transition hover:border-[#D5E7E9] hover:bg-[#E1F4F5] lg:inline-flex"
              >
                Sign out
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="border-t border-[#E2E8EC] bg-[#F6F8FA] px-4 py-3 sm:px-6 lg:hidden">
              <div className="mx-auto max-w-[1600px] rounded-2xl border border-[#E2E8EC] bg-white p-3 shadow-[0_14px_28px_rgba(10,59,64,0.05)]">
                {PLATFORM_NAV.map((section) => (
                  <div key={section.title} className="py-2 first:pt-0 last:pb-0">
                    <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5B6B73]">
                      {section.title}
                    </p>
                    <div className="space-y-1.5">
                      {section.items.map((item) => (
                        <NavLink
                          key={item.id}
                          to={item.to}
                          end={item.end === true}
                          onClick={() => setMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                              isActive
                                ? 'bg-[#0F7F86] text-white'
                                : 'bg-[#E1F4F5] text-[#0A3B40] hover:bg-[#D9EEF0] hover:text-[#0A3B40]'
                            }`
                          }
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="mt-3 border-t border-[#E2E8EC] pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      logout()
                    }}
                    className="flex w-full items-center justify-center rounded-xl border border-[#E2E8EC] bg-white px-3 py-2.5 text-sm font-semibold text-[#0A3B40] hover:bg-[#E1F4F5]"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
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
