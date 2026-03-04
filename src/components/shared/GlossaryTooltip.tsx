'use client'

import { useState, useRef, useEffect } from 'react'
import { getGlossaryEntry } from '@/data/glossary'

interface GlossaryTooltipProps {
  term: string
  customText?: string
  children?: React.ReactNode
  className?: string
}

export function GlossaryTooltip({ term, customText, children, className = '' }: GlossaryTooltipProps) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Try to find the entry only if customText is not provided
  const entry = customText || getGlossaryEntry(term)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false)
      }
    }
    if (show) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [show])

  if (!entry) return <>{children}</>

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setShow(!show)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-500 bg-zinc-700 text-xs text-zinc-300 hover:bg-zinc-600"
        aria-label={`Glossário: ${term}`}
      >
        i
      </button>
      {show && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-zinc-600 bg-zinc-800 p-3 text-xs text-zinc-200 shadow-xl"
          role="tooltip"
        >
          <div className="font-semibold text-white">{term}</div>
          <div className="mt-1">{entry}</div>
        </div>
      )}
    </div>
  )
}
