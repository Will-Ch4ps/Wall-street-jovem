'use client'

import { useState, useMemo } from 'react'
import { formatCurrency } from '@/lib/formatters'
import type { GameState, OwnerType } from '@/types'

interface TransactionPanelProps {
  state: GameState
  onSuccess?: () => void
}

export function TransactionPanel({ state, onSuccess }: TransactionPanelProps) {
  const [type, setType] = useState<'buy' | 'sell'>('buy')
  const [buyerId, setBuyerId] = useState('')
  const [sellerId, setSellerId] = useState('market')
  const [ticker, setTicker] = useState('')
  const [quantity, setQuantity] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buyers: { id: string; name: string; type: OwnerType }[] = useMemo(() => {
    const p: { id: string; name: string; type: OwnerType }[] = state.players
      .filter((x) => x.isActive && !x.holdingId)
      .map((x) => ({ id: x.id, name: x.name, type: 'player' as OwnerType }))
    const h: { id: string; name: string; type: OwnerType }[] = state.holdings
      .filter((x) => x.isActive)
      .map((x) => ({ id: x.id, name: x.name, type: 'holding' as OwnerType }))
    return [...p, ...h]
  }, [state.players, state.holdings])

  const sellers = useMemo(() => {
    const s = [...buyers]
    return [{ id: 'market', name: 'Mercado', type: 'market' as OwnerType }, ...s]
  }, [buyers])

  const asset = state.assets.find((a) => a.ticker === ticker)
  const marketPrice = asset?.currentPrice ?? 0
  const qty = parseInt(quantity, 10) || 0

  const isP2P = type === 'buy' ? sellerId !== 'market' : buyerId !== 'market'
  const isCustomPriceValid = customPrice.trim() !== '' && !isNaN(parseFloat(customPrice))
  const execPrice = isP2P && isCustomPriceValid ? parseFloat(customPrice) : marketPrice
  const total = execPrice * qty

  const buyer = buyers.find((b) => b.id === buyerId)
  const seller = sellers.find((s) => s.id === sellerId)
  const buyerCash =
    buyer?.type === 'player'
      ? state.players.find((p) => p.id === buyerId)?.cash ?? 0
      : buyer?.type === 'holding'
        ? state.holdings.find((h) => h.id === buyerId)?.cash ?? 0
        : 0

  const portfolio =
    type === 'buy'
      ? state.portfolios.find((p) => p.ownerId === buyerId && p.ownerType === (buyer?.type ?? 'player'))
      : state.portfolios.find((p) => p.ownerId === sellerId && p.ownerType === (seller?.type ?? 'player'))
  const position = portfolio?.positions.find((p) => p.ticker === ticker)
  const canSell = type === 'sell' && (position?.quantity ?? 0) >= qty
  const canBuy = type === 'buy' && buyerCash >= total && (asset?.availableShares ?? 0) >= qty

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          buyerId: type === 'buy' ? buyerId : 'market',
          buyerType: type === 'buy' ? (buyer?.type ?? 'player') : 'market',
          sellerId: type === 'sell' ? sellerId : 'market',
          sellerType: type === 'sell' ? (seller?.type ?? 'player') : 'market',
          ticker,
          quantity: qty,
          price: execPrice,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao executar transação')
      }
      setQuantity('')
      setCustomPrice('')
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Transação Rápida</h2>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={type === 'buy'}
              onChange={() => setType('buy')}
            />
            Compra
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={type === 'sell'}
              onChange={() => setType('sell')}
            />
            Venda
          </label>
        </div>
        {type === 'buy' && (
          <>
            <div>
              <label className="block text-sm text-zinc-400">De (Vendedor)</label>
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2"
              >
                <option value="market">Mercado</option>
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400">Para (Comprador)</label>
              <select
                value={buyerId}
                onChange={(e) => setBuyerId(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2"
              >
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.type})
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {type === 'sell' && (
          <>
            <div>
              <label className="block text-sm text-zinc-400">De (Vendedor)</label>
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2"
              >
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400">Para (Comprador)</label>
              <select
                value={buyerId}
                onChange={(e) => setBuyerId(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2"
              >
                <option value="market">Mercado</option>
                {buyers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.type})
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div>
          <label className="block text-sm text-zinc-400">Ativo</label>
          <select
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2"
          >
            <option value="">Selecione...</option>
            {state.assets
              .filter((a) => a.status === 'active' || a.status === 'ipo_open')
              .map((a) => (
                <option key={a.ticker} value={a.ticker}>
                  {a.ticker} - {a.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <span className="text-sm text-zinc-400">Preço Mercado: </span>
          <span className="font-mono font-semibold">{formatCurrency(marketPrice)}</span>
        </div>
        {isP2P && (
          <div>
            <label className="block text-sm text-zinc-400">Preço Negociado (P2P) - Opcional</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={customPrice}
              placeholder={marketPrice.toFixed(2)}
              onChange={(e) => setCustomPrice(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2"
            />
            <p className="text-xs text-zinc-500 mt-1">Se deixado em branco, usará o preço de mercado.</p>
          </div>
        )}
        <div>
          <label className="block text-sm text-zinc-400">Quantidade</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2"
          />
        </div>
        <div>
          <span className="text-sm text-zinc-400">Total: </span>
          <span className="font-mono font-semibold">{formatCurrency(total)}</span>
        </div>
        {type === 'buy' && (
          <p className="text-xs text-zinc-500">
            Saldo: {formatCurrency(buyerCash)} {buyerCash >= total ? '✅' : '❌'}
          </p>
        )}
        {type === 'sell' && (
          <p className="text-xs text-zinc-500">
            Posição: {position?.quantity ?? 0} ações {canSell ? '✅' : '❌'}
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !ticker || qty < 1 || (type === 'buy' ? !canBuy : !canSell)}
          className="rounded bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Executando...' : 'Executar'}
        </button>
      </form>
    </div>
  )
}
