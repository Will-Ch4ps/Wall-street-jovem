'use client'

import { formatCurrency, formatPercent } from '@/lib/formatters'
import { GlossaryTooltip } from '@/components/shared/GlossaryTooltip'
import type { Asset, FII } from '@/types'
import { cn } from '@/lib/utils'

interface AssetCardProps {
  asset: Asset
  className?: string
  compact?: boolean
}

export function AssetCard({ asset, className, compact }: AssetCardProps) {
  const variation =
    asset.openPrice > 0
      ? ((asset.currentPrice - asset.openPrice) / asset.openPrice) * 100
      : 0

  const isUp = variation >= 0
  const descriptionText = `${asset.name} - ${asset.sector} (${asset.profile}). Uma empresa focada no seu setor base com meta de fechamento em R$${asset.targetClose.toFixed(2)}.` // Mock if description is missing from types

  if (compact) {
    return (
      <div
        className={cn(
          'rounded shadow-sm border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-1.5 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors',
          className
        )}
      >
        <div className="flex items-center justify-between pb-0.5 border-b border-slate-100 dark:border-zinc-800 mb-0.5">
          <span className="flex items-center gap-1 font-mono font-bold text-xs text-slate-800 dark:text-zinc-200 truncate">
            {asset.ticker}
            <GlossaryTooltip term={asset.name} customText={descriptionText} />
          </span>
          <span
            className={cn('text-[10px] font-mono font-bold', isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}
          >
            {isUp ? '▲' : '▼'}
            {formatPercent(Math.abs(variation))}
          </span>
        </div>
        <div className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{formatCurrency(asset.currentPrice)}</div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-4 hover:border-slate-300 dark:hover:border-zinc-500 transition-colors shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 font-mono font-semibold text-slate-800 dark:text-zinc-200">
          {asset.ticker}
          <GlossaryTooltip term={asset.name} customText={descriptionText} />
        </span>
        <span
          className={cn('text-sm font-mono', isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}
        >
          {isUp ? '▲' : '▼'}
          {formatPercent(Math.abs(variation))}
        </span>
      </div>
      <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(asset.currentPrice)}</div>
      <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-zinc-400">
        <div>
          Abertura: {formatCurrency(asset.openPrice)} | Máx: {formatCurrency(asset.currentPrice)} | Mín: {formatCurrency(asset.currentPrice)}
        </div>
        <div>Setor: {asset.sector}</div>
        <div>Disponível: {asset.availableShares} {(asset.type === 'fii' ? 'cotas' : 'ações')}</div>
      </div>
      {asset.type === 'fii' && (
        <div className="mt-2 text-xs text-slate-500 dark:text-zinc-500 font-medium">
          <span>P/VP: {(asset as FII).pvpRatio.toFixed(2)}</span>
          <span className="ml-3">DY/Rod: {((asset as FII).dividendYield / 12).toFixed(1)}%</span>
        </div>
      )}
    </div>
  )
}
