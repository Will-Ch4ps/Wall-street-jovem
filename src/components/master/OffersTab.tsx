'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/formatters'
import { ActiveOffer } from '@/components/display/ActiveOffer'
import type { GameState } from '@/types'

interface OffersTabProps {
  state: GameState
  onUpdate?: () => void
}

export function OffersTab({ state, onUpdate }: OffersTabProps) {
  const [ticker, setTicker] = useState('')
  const [type, setType] = useState<'buy' | 'sell'>('sell')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [expiresIn, setExpiresIn] = useState(3)
  const [loading, setLoading] = useState(false)

  const activeOffers = state.marketOffers.filter(
    (o) => o.isActive && new Date(o.expiresAt) > new Date()
  )

  const handleCreate = async () => {
    const offerPrice = parseFloat(price)
    const qty = parseInt(quantity, 10)
    if (!ticker || offerPrice <= 0 || qty <= 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ticker,
          type,
          offerPrice,
          totalQuantity: qty,
          reason: reason || undefined,
          expiresInMinutes: expiresIn,
        }),
      })
      if (res.ok) {
        setTicker('')
        setPrice('')
        setQuantity('')
        setReason('')
        onUpdate?.()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Ofertas de Mercado</h2>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
        <h3 className="mb-3 text-sm font-medium">Criar Oferta</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs text-zinc-400">Ativo</label>
            <select
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {state.assets
                .filter((a) => a.status === 'active')
                .map((a) => (
                  <option key={a.ticker} value={a.ticker}>
                    {a.ticker} - {a.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'buy' | 'sell')}
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm"
            >
              <option value="sell">Venda (mercado vende)</option>
              <option value="buy">Compra (mercado compra)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400">Preço</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400">Quantidade</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400">Motivo</label>
            <input
              type="text"
              placeholder="Ex: Fundo de pensão liquida"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400">Expira em (min)</label>
            <input
              type="number"
              min={1}
              value={expiresIn}
              onChange={(e) => setExpiresIn(parseInt(e.target.value, 10) || 3)}
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={loading || !ticker || !price || !quantity}
          className="mt-4 rounded bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          Criar Oferta
        </button>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">Ofertas Ativas</h3>
        {activeOffers.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma oferta ativa.</p>
        ) : (
          <div className="space-y-4">
            {activeOffers.map((o) => {
              const asset = state.assets.find((a) => a.ticker === o.ticker)
              return (
                <ActiveOffer
                  key={o.id}
                  offer={o}
                  currentPrice={asset?.currentPrice}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
