'use client'

import { formatCurrency, formatPercent } from '@/lib/formatters'
import type { MarketOffer } from '@/types'

interface ActiveOfferProps {
  offer: MarketOffer
  currentPrice?: number
  className?: string
  onCancel?: (id: string) => void
}

export function ActiveOffer({ offer, currentPrice, className = '', onCancel }: ActiveOfferProps) {
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
      className={`rounded-lg border-2 border-amber-500/80 bg-amber-900/30 p-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-black text-amber-500 tracking-tight uppercase">Oferta Especial</h3>
          <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-500/20">
            {offer.type === 'sell' ? 'OFERTA DE VENDA' : 'OFERTA DE COMPRA'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono font-bold text-white/90">
            {offer.ticker}
          </span>
          {onCancel && (
            <button
              onClick={() => onCancel(offer.id)}
              className="text-[10px] font-bold bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white px-2 py-1 rounded transition-colors"
            >
              CANCELAR
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 text-sm">
        <div>
          <span className="text-zinc-400">Preço oferta: </span>
          <span className="font-bold text-lg text-white">{formatCurrency(offer.offerPrice)}</span>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Progresso da Oferta ({offer.remainingQuantity.toLocaleString()} restantes)</span>
          <span>{Math.round(percentRemaining)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-800 border border-zinc-700 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
            style={{ width: `${percentRemaining}%` }}
          />
        </div>
      </div>
      {offer.reason && (
        <p className="mt-3 text-xs text-zinc-500 italic">Motivo: {offer.reason}</p>
      )}

    </div>
  )
}
