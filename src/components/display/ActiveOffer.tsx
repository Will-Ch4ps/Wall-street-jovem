'use client'

import { formatCurrency, formatPercent } from '@/lib/formatters'
import type { MarketOffer } from '@/types'

interface ActiveOfferProps {
  offer: MarketOffer
  currentPrice?: number
  className?: string
}

export function ActiveOffer({ offer, currentPrice, className = '' }: ActiveOfferProps) {
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
        <h3 className="text-lg font-bold text-amber-400">Oferta Especial</h3>
        <span className="text-sm text-zinc-400">
          {offer.type === 'sell' ? 'VENDA' : 'COMPRA'} — {offer.ticker}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-zinc-400">Preço oferta: </span>
          <span className="font-semibold">{formatCurrency(offer.offerPrice)}</span>
        </div>
        <div>
          <span className="text-zinc-400">Preço mercado: </span>
          <span>{formatCurrency(price)}</span>
          <span
            className={`ml-1 font-mono ${diffPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            ({formatPercent(diffPct)})
          </span>
        </div>
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>Disponível</span>
          <span>
            {offer.remainingQuantity} / {offer.totalQuantity}
          </span>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-zinc-700">
          <div
            className="h-full rounded-full bg-amber-500"
            style={{ width: `${percentRemaining}%` }}
          />
        </div>
      </div>
      {offer.reason && (
        <p className="mt-2 text-xs text-zinc-400">Motivo: {offer.reason}</p>
      )}
    </div>
  )
}
