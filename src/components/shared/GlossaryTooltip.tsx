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
    <div ref={ref} className={`relative inline-block ${className} font-sans`}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setShow(!show) }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700/60 text-[10px] font-bold text-zinc-300 ring-1 ring-inset ring-white/10 transition-all hover:bg-indigo-500 hover:text-white"
        aria-label={`Informações sobre ${term}`}
      >
        i
      </button>
      {show && (
        <div
          className="absolute bottom-[calc(100%+8px)] left-1/2 z-[99999] w-[min(320px,calc(100vw-32px))] -translate-x-1/2 rounded-xl border border-zinc-700/80 bg-zinc-900/95 p-4 text-xs font-normal text-zinc-300 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all sm:w-80"
          role="tooltip"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          <div className="mb-2 border-b border-zinc-700/50 pb-2 text-sm font-bold text-white tracking-wide">
            {term}
          </div>
          <div className="leading-relaxed opacity-90 break-words">{entry}</div>
          {/* Seta do tooltip */}
          <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-zinc-700/80 bg-zinc-900/95"></div>
        </div>
      )}
    </div>
  )
}

