import { useEffect, useState } from 'react'

/*
 * First-dashboard loader: a small skeleton of the dashboard whose cards fly in one by one,
 * shown over the real (blurred) dashboard while it loads. Used once, right after signup.
 * Styles live in index.css under "Dashboard loader".
 */

const SHOW_MS = 3600 // long enough for every card and the chart bars to land
const FADE_MS = 400

const S = ({ w, h, round, style }) => (
  <i className="dl-s" style={{ width: w, height: h, borderRadius: round, ...style }} />
)

// Each card flies in from its own direction (--tx / --ty) after its own delay (--d).
const Card = ({ d, tx = '0', ty = '14px', className = '', style, children }) => (
  <div className={`dl-a ${className}`} style={{ '--d': `${d}s`, '--tx': tx, '--ty': ty, ...style }}>
    {children}
  </div>
)

const LogoMark = () => (
  <svg className="dl-w" width="24" height="24" viewBox="0 0 120 120" aria-hidden="true">
    <rect style={{ animationDelay: '0s' }} x="44" y="6" width="32" height="32" rx="9" fill="#BDEFF1" />
    <rect style={{ animationDelay: '.12s' }} x="82" y="44" width="32" height="32" rx="9" fill="#2BB5BB" />
    <rect style={{ animationDelay: '.24s' }} x="44" y="82" width="32" height="32" rx="9" fill="#0F7F86" />
    <rect style={{ animationDelay: '.36s' }} x="6" y="44" width="32" height="32" rx="9" fill="#6FD3D8" />
    <rect style={{ animationDelay: '.48s' }} x="44" y="44" width="32" height="32" rx="9" fill="#FFC83D" />
  </svg>
)

export default function DashboardLoader({ onDone }) {
  const [hiding, setHiding] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setHiding(true), SHOW_MS)
    const t2 = setTimeout(() => onDone?.(), SHOW_MS + FADE_MS)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div className={`dash-loader ${hiding ? 'is-hiding' : ''}`} role="status" aria-label="Loading your dashboard">
      <div className="dl play">
        <Card d={0.4} tx="-220px" ty="0" className="dl-sbr">
          <LogoMark />
          {[0, 1, 2, 3].map((k) => <S key={k} w="16px" h="16px" />)}
        </Card>
        <div className="dl-mn">
          <Card d={0.8} ty="-170px" className="dl-bk" style={{ gridColumn: 'span 3' }}>
            <div className="dl-row" style={{ justifyContent: 'space-between' }}>
              <S w="90px" h="10px" />
              <S w="20px" h="20px" round="50%" />
            </div>
          </Card>
          {[[1.2, '-70px', '190px'], [1.55, '0', '210px'], [1.9, '70px', '190px']].map(([d, tx, ty]) => (
            <Card key={d} d={d} tx={tx} ty={ty} className="dl-bk">
              <S w="55%" h="6px" />
              <div style={{ height: 7 }} />
              <S w="75%" h="13px" />
            </Card>
          ))}
          <Card d={2.3} ty="220px" className="dl-bk dl-ch" style={{ gridColumn: 'span 2' }}>
            <S w="45%" h="8px" />
            <div className="dl-bars">
              {[40, 58, 46, 72, 62, 90].map((h, k) => <i key={k} className="dl-s" style={{ height: `${h}%`, '--k': k }} />)}
            </div>
          </Card>
          <Card d={2.75} tx="230px" ty="0" className="dl-bk">
            <S w="60%" h="8px" />
            {[0, 1, 2].map((k) => (
              <div key={k} className="dl-row" style={{ marginTop: 9 }}>
                <S w="16px" h="16px" round="50%" style={{ flexShrink: 0 }} />
                <S w="100%" h="7px" />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
