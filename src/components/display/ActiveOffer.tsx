'use client'

import { formatCurrency, formatPercent } from '@/lib/formatters'
import type { MarketOffer } from '@/types'

interface ActiveOfferProps {
  offer: MarketOffer
  currentPrice?: number
  className?: string
  onCancel?: (id: string) => void
  onExecute?: (offer: MarketOffer) => void
}

export function ActiveOffer({ offer, currentPrice, className = '', onCancel, onExecute }: ActiveOfferProps) {
  const price = currentPrice ?? offer.currentPriceAtCreation
  const diffPct =
    price > 0
      ? ((offer.offerPrice - price) / price) * 100
      : 0
  const percentRemaining =
    offer.totalQuantity > 0
      ? (offer.remainingQuantity / offer.totalQuantity) * 100
      : 0

  return (
    <div
      className={`rounded-lg border-2 border-amber-600 bg-amber-50 dark:border-amber-500/80 dark:bg-amber-900/40 p-4 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-black text-amber-800 dark:text-amber-500 tracking-tight uppercase">Oferta Especial</h3>
          <span className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-500 px-2 py-0.5 rounded text-[10px] font-bold border dark:border-amber-500/20">
            {offer.type === 'sell' ? 'OFERTA DE VENDA' : 'OFERTA DE COMPRA'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono font-bold text-slate-800 dark:text-white/90">
            {offer.ticker}
          </span>
          {onCancel && (
            <button
              onClick={() => onCancel(offer.id)}
              className="text-[10px] font-bold bg-red-100 hover:bg-red-600 text-red-700 hover:text-white dark:bg-red-600/20 dark:hover:bg-red-600 dark:text-red-500 dark:hover:text-white px-2 py-1 rounded transition-colors"
            >
              CANCELAR
            </button>
          )}
          {onExecute && offer.remainingQuantity > 0 && (
            <button
              onClick={() => onExecute(offer)}
              className="text-[10px] font-bold bg-indigo-100 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-600/20 dark:hover:bg-indigo-600 dark:text-indigo-400 dark:hover:text-white px-3 py-1 rounded transition-colors shadow-sm"
            >
              {offer.type === 'sell' ? 'COMPRAR JÁ' : 'VENDER JÁ'}
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 text-sm">
        <div>
          <span className="text-slate-500 dark:text-zinc-400">Preço oferta: </span>
          <span className="font-bold text-lg text-slate-900 dark:text-white">{formatCurrency(offer.offerPrice)}</span>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1 font-medium">
          <span>Progresso da Oferta ({offer.remainingQuantity.toLocaleString()} restantes)</span>
          <span className="text-slate-800 dark:text-zinc-300 font-bold">{Math.round(percentRemaining)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
            style={{ width: `${percentRemaining}%` }}
          />
        </div>
      </div>
      {offer.reason && (
        <p className="mt-3 text-xs text-slate-500 dark:text-zinc-500 italic font-medium">Motivo: {offer.reason}</p>
      )}

    </div>
  )
}
