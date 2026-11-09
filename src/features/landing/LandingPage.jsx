import { Link } from 'react-router-dom'
import { Logo, Wordmark } from '../../shared/ui/Logo'

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-navy text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 70% 20%, rgba(92,225,230,0.28), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(255,210,63,0.18), transparent 50%), linear-gradient(160deg, #12153a 0%, #1b1f4b 45%, #1a3a4a 100%)',
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-9" />
          <Wordmark light />
        </div>
        <Link
          to="/login"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-lcyan transition hover:text-white"
        >
          Sign in
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
        <section className="animate-rise">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-lcyan">
            Healthcare practice OS
          </p>
          <h1 className="max-w-[14ch] text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-cyan">Utessa</span>
          </h1>
          <p className="mt-5 max-w-[36ch] text-lg font-medium leading-relaxed text-lavender/95 sm:text-xl">
            One place for CRM, operations, outreach, and time — built for practices that need clear tenant boundaries and HIPAA-ready workflows.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/signup"
              className="rounded-xl bg-yellow px-6 py-3.5 text-[15px] font-bold text-navy transition hover:brightness-105"
            >
              Start free 14-day trial
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-white/25 bg-white/5 px-6 py-3.5 text-[15px] font-bold text-white backdrop-blur transition hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-5 text-sm text-lavender/70">No credit card. Your organization stays private from day one.</p>
        </section>

        <section className="animate-rise-delay relative flex min-h-[340px] items-center justify-center lg:min-h-[460px]">
          <div className="animate-mosaic absolute inset-8 rounded-[2rem] bg-gradient-to-br from-cyan/20 via-transparent to-yellow/15 blur-2xl" />
          <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { c: 'bg-cyan', d: 'translate-x-2 -translate-y-3' },
              { c: 'bg-lavender', d: 'translate-x-6 translate-y-2' },
              { c: 'bg-yellow', d: '-translate-x-1 translate-y-4' },
              { c: 'bg-lcyan', d: 'translate-x-4 -translate-y-1' },
              { c: 'bg-teal', d: 'col-span-2 mx-auto w-1/2 translate-y-2' },
            ].map((tile, i) => (
              <div
                key={i}
                className={`h-24 w-24 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] sm:h-28 sm:w-28 ${tile.c} ${tile.d}`}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
