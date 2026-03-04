'use client'

import { useState, useEffect, useMemo } from 'react'

type DisplayView = 'market_overview' | 'candlestick' | 'ranking' | 'news' | 'fii_overview'

interface DisplayRotationProps {
  views: Record<DisplayView, React.ReactNode>
  durations?: Partial<Record<DisplayView, number>>
  activeOffersCount?: number
}

const DEFAULT_DURATIONS: Record<DisplayView, number> = {
  market_overview: 15000,
  candlestick: 20000,
  ranking: 10000,
  news: 12000,
  fii_overview: 15000,
}

const VIEW_ORDER: DisplayView[] = [
  'market_overview',
  'candlestick',
  'ranking',
  'news',
  'fii_overview',
]

export function DisplayRotation({
  views,
  durations = {},
  activeOffersCount = 0,
}: DisplayRotationProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const durationsMerged = useMemo(() => {
    return { ...DEFAULT_DURATIONS, ...durations }
  }, [durations])

  useEffect(() => {
    if (activeOffersCount > 0) return
    const view = VIEW_ORDER[currentIndex]
    const duration = durationsMerged[view] ?? 15000
    const id = setTimeout(() => {
      setCurrentIndex((i) => (i + 1) % VIEW_ORDER.length)
    }, duration)
    return () => clearTimeout(id)
  }, [currentIndex, activeOffersCount, durationsMerged])

  const view = VIEW_ORDER[currentIndex]
  return <>{views[view]}</>
}
