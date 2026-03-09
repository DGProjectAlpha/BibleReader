// Tooltip.tsx — lightweight hover tooltip for icon buttons
// Shows a small label above (default) or below the wrapped element on hover.

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  label: string
  children: React.ReactElement
  position?: 'top' | 'bottom'
}

export default function Tooltip({ label, children, position = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const wrapRef = useRef<HTMLSpanElement>(null)

  const show = () => {
    if (!wrapRef.current) return
    // display:contents means the span has no box — measure the first child instead
    const el = (wrapRef.current.firstElementChild as HTMLElement) ?? wrapRef.current
    const rect = el.getBoundingClientRect()
    if (position === 'top') {
      setCoords({ top: rect.top - 4, left: rect.left + rect.width / 2 })
    } else {
      setCoords({ top: rect.bottom + 4, left: rect.left + rect.width / 2 })
    }
    setVisible(true)
  }

  const hide = () => setVisible(false)

  // Hide on scroll / resize so tooltip doesn't float away
  useEffect(() => {
    if (!visible) return
    const abort = () => setVisible(false)
    window.addEventListener('scroll', abort, { capture: true, passive: true })
    window.addEventListener('resize', abort, { passive: true })
    return () => {
      window.removeEventListener('scroll', abort, { capture: true })
      window.removeEventListener('resize', abort)
    }
  }, [visible])

  const tooltipEl = visible ? (
    <div
      style={{
        position: 'fixed',
        top: position === 'top' ? coords.top : coords.top,
        left: coords.left,
        transform: position === 'top'
          ? 'translate(-50%, -100%)'
          : 'translate(-50%, 0)',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
      className="px-2 py-0.5 rounded bg-gray-900 dark:bg-gray-700 text-white text-xs whitespace-nowrap shadow-lg"
    >
      {label}
    </div>
  ) : null

  return (
    <>
      <span
        ref={wrapRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ display: 'contents' }}
      >
        {children}
      </span>
      {tooltipEl && createPortal(tooltipEl, document.body)}
    </>
  )
}
