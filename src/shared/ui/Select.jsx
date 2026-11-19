import { Children, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/*
 * Drop-in replacement for <select> whose open list uses the app's menu style
 * (the browser's native list can't be styled). Use it exactly like <select>:
 *
 *   <Select value={v} onChange={(e) => setV(e.target.value)} className="…trigger classes…">
 *     <option value="">Any</option>
 *     <option value="A">Alpha</option>
 *   </Select>
 *
 * - onChange receives { target: { value, name } } like a native change event (value is a string)
 * - Keyboard: ↑/↓ to move, Enter/Space to pick, Esc to close, type a letter to jump
 * - The list renders in a portal so it is never clipped by scrolling containers or modals,
 *   and opens upward when there's no room below.
 * - `renderValue(label, option)` customises what the closed trigger shows (used by filter chips).
 */

function optionText(children) {
  return Children.toArray(children).map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : '')).join('')
}

function readOptions(children) {
  const out = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === 'option') {
      const label = optionText(child.props.children)
      out.push({ value: child.props.value !== undefined ? String(child.props.value) : label, label, disabled: !!child.props.disabled })
    } else if (child.type === 'optgroup') {
      out.push(...readOptions(child.props.children))
    } else if (child.props?.children) {
      out.push(...readOptions(child.props.children))
    }
  })
  return out
}

const LIST_MAX_HEIGHT = 300

export default function Select({
  value,
  defaultValue,
  onChange,
  children,
  className = '',
  disabled = false,
  name,
  id,
  renderValue,
  placeholder = 'Select…',
  onFocus,
  onBlur,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  title,
}) {
  const options = useMemo(() => readOptions(children), [children])
  const [inner, setInner] = useState(defaultValue !== undefined ? String(defaultValue) : options[0]?.value ?? '')
  const current = value !== undefined && value !== null ? String(value) : inner
  const selectedIndex = options.findIndex((o) => o.value === current)
  const selected = options[selectedIndex]

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [pos, setPos] = useState(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const typed = useRef({ text: '', at: 0 })
  const listId = useId()

  const place = useCallback(() => {
    const b = buttonRef.current?.getBoundingClientRect()
    if (!b) return
    const spaceBelow = window.innerHeight - b.bottom
    const height = Math.min(LIST_MAX_HEIGHT, options.length * 38 + 12)
    const up = spaceBelow < height + 12 && b.top > spaceBelow
    const width = Math.max(b.width, 200)
    const left = Math.min(b.left, window.innerWidth - width - 8)
    setPos(up ? { left, bottom: window.innerHeight - b.top + 6, width } : { left, top: b.bottom + 6, width })
  }, [options.length])

  const openList = useCallback(() => {
    if (disabled) return
    place()
    setActive(selectedIndex >= 0 ? selectedIndex : options.findIndex((o) => !o.disabled))
    setOpen(true)
  }, [disabled, place, selectedIndex, options])

  const close = useCallback((focusButton = true) => {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }, [])

  const choose = useCallback((opt) => {
    if (!opt || opt.disabled) return
    if (value === undefined) setInner(opt.value)
    if (opt.value !== current) onChange?.({ target: { value: opt.value, name }, currentTarget: { value: opt.value, name } })
    close()
  }, [value, current, onChange, name, close])

  /* close on outside click, reposition on scroll/resize */
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (buttonRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return
      close(false)
    }
    const onMove = () => place()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, close, place])

  /* keep the active row in view */
  useLayoutEffect(() => {
    if (!open || active < 0) return
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function move(step) {
    if (!options.length) return
    let i = active
    for (let n = 0; n < options.length; n += 1) {
      i = (i + step + options.length) % options.length
      if (!options[i].disabled) break
    }
    setActive(i)
  }

  function onKeyDown(e) {
    if (disabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList() }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(options.findIndex((o) => !o.disabled)) }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(options[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() } // don't also close a surrounding modal
    else if (e.key === 'Tab') { setOpen(false) }
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now()
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + e.key.toLowerCase(), at: now }
      const i = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text))
      if (i >= 0) setActive(i)
    }
  }

  const label = selected ? selected.label : placeholder
  const shown = renderValue ? renderValue(label, selected) : label

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        title={title}
        disabled={disabled}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        className={`inline-flex items-center justify-between gap-2 text-left ${className} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        {renderValue ? shown : (
          <>
            <span className={`min-w-0 truncate ${selected ? '' : 'text-mist-500'}`}>{shown}</span>
            <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-mist-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </>
        )}
      </button>
      {name && <input type="hidden" name={name} value={current} />}
      {open && pos && createPortal(
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.width, maxWidth: Math.max(pos.width, 360), maxHeight: LIST_MAX_HEIGHT, zIndex: 80 }}
          className="menu-surface overflow-y-auto"
        >
          {options.map((o, i) => (
            <div
              key={`${o.value}-${i}`}
              role="option"
              data-index={i}
              aria-selected={o.value === current}
              aria-disabled={o.disabled || undefined}
              data-active={i === active || undefined}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
              className="menu-item justify-between"
            >
              <span className="min-w-0 truncate">{o.label || ' '}</span>
              {o.value === current && (
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-brand-600" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
              )}
            </div>
          ))}
          {!options.length && <div className="menu-item text-mist-500" aria-disabled="true">No options</div>}
        </div>,
        document.body,
      )}
    </>
  )
}
