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
  const [resolvedPos, setResolvedPos] = useState(position)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const show = () => {
    if (!wrapRef.current) return
    // display:contents means the span has no box — measure the first child instead
    const el = (wrapRef.current.firstElementChild as HTMLElement) ?? wrapRef.current
    const rect = el.getBoundingClientRect()

    // Start with centered left position
    let left = rect.left + rect.width / 2
    let top: number
    let resolvedPosition = position

    // Flip position if tooltip would go off-screen vertically
    if (position === 'top' && rect.top < 40) {
      resolvedPosition = 'bottom'
    } else if (position === 'bottom' && rect.bottom > window.innerHeight - 40) {
      resolvedPosition = 'top'
    }

    if (resolvedPosition === 'top') {
      top = rect.top - 4
    } else {
      top = rect.bottom + 4
    }

    setCoords({ top, left })
    setResolvedPos(resolvedPosition)
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

  // After rendering, clamp tooltip horizontally so it stays within the viewport
  useEffect(() => {
    if (!visible || !tooltipRef.current) return
    const el = tooltipRef.current
    const rect = el.getBoundingClientRect()
    const MARGIN = 6
    if (rect.right > window.innerWidth - MARGIN) {
      el.style.left = `${window.innerWidth - rect.width - MARGIN}px`
      el.style.transform = resolvedPos === 'top' ? 'translateY(-100%)' : ''
    } else if (rect.left < MARGIN) {
      el.style.left = `${MARGIN}px`
      el.style.transform = resolvedPos === 'top' ? 'translateY(-100%)' : ''
    }
  }, [visible, coords, resolvedPos])

  const tooltipEl = visible ? (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        transform: resolvedPos === 'top'
          ? 'translate(-50%, -100%)'
          : 'translate(-50%, 0)',
        zIndex: 9999,
        pointerEvents: 'none',
        backgroundColor: '#1e293b',
      }}
      className="px-2 py-0.5 rounded text-white text-xs whitespace-nowrap shadow-lg"
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
