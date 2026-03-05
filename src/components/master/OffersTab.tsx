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

  const handleCancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta oferta?')) return
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', offerId: id }),
      })
      if (res.ok) onUpdate?.()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Ofertas de Mercado</h2>
        <div className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
          {activeOffers.length} ofertas ativas
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-2xl">
        <h3 className="mb-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Criar Nova Oferta</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Ativo</label>
            <select
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
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
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Tipo de Operação</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'buy' | 'sell')}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            >
              <option value="sell">Venda (Mercado Vende)</option>
              <option value="buy">Compra (Mercado Compra)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Preço (R$)</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Quantidade de Títulos</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Motivo / Narrativa</label>
            <input
              type="text"
              placeholder="Ex: IPO Oficial ou Fundo de pensão liquida"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5 ml-1">Expira em (minutos)</label>
            <input
              type="number"
              min={1}
              value={expiresIn}
              onChange={(e) => setExpiresIn(parseInt(e.target.value, 10) || 3)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={loading || !ticker || !price || !quantity}
          className="mt-6 w-full sm:w-auto rounded-lg bg-indigo-600 hover:bg-indigo-500 px-8 py-3 text-sm font-black text-white uppercase shadow-lg shadow-indigo-900/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Processando...' : 'Publicar Oferta no Mercado'}
        </button>
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          🎯 Painel de Ofertas Ativas
        </h3>
        {activeOffers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
            <p className="text-sm text-zinc-600">Nenhuma oferta ativa no momento.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeOffers.map((o) => {
              const asset = state.assets.find((a) => a.ticker === o.ticker)
              return (
                <ActiveOffer
                  key={o.id}
                  offer={o}
                  currentPrice={asset?.currentPrice}
                  onCancel={handleCancel}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
