'use client'

import { formatCurrency, formatPercent } from '@/lib/formatters'
import type { Asset } from '@/types'
import { cn } from '@/lib/utils'

interface TickerProps {
  assets: Asset[]
  className?: string
}

export function Ticker({ assets, className }: TickerProps) {
  const items = assets.filter((a) => a.status === 'active' || a.status === 'ipo_open')
  const variation = (a: Asset) =>
    a.openPrice > 0
      ? ((a.currentPrice - a.openPrice) / a.openPrice) * 100
      : 0

  return (
    <div
      className={cn(
        'overflow-hidden whitespace-nowrap bg-zinc-800 py-2 text-sm',
        className
      )}
    >
      <div
        className="inline-flex gap-6"
        style={{ animation: 'ticker-scroll 30s linear infinite' }}
      >
        {[...items, ...items].map((a, i) => (
          <span key={`${a.ticker}-${i}`} className="inline-flex items-center gap-2">
            <span className="font-mono font-semibold">{a.ticker}</span>
            <span>{formatCurrency(a.currentPrice)}</span>
            <span
              className={cn(
                'font-mono',
                variation(a) >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {variation(a) >= 0 ? '▲' : '▼'}
              {formatPercent(Math.abs(variation(a)))}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
