'use client'

import { useState, useMemo } from 'react'
import { formatCurrency } from '@/lib/formatters'
import type { GameState, MarketOffer, OwnerType } from '@/types'

interface ExecuteOfferModalProps {
    offer: MarketOffer
    state: GameState
    onClose: () => void
    onSuccess?: () => void
}

export function ExecuteOfferModal({ offer, state, onClose, onSuccess }: ExecuteOfferModalProps) {
    const [selectedOwnerId, setSelectedOwnerId] = useState('')
    const [quantity, setQuantity] = useState('1')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isMarketSelling = offer.type === 'sell'

    const owners: { id: string; name: string; type: OwnerType }[] = useMemo(() => {
        const p = state.players
            .filter((x) => x.isActive && !x.holdingId)
            .map((x) => ({ id: x.id, name: x.name, type: 'player' as OwnerType }))
        const h = state.holdings
            .filter((x) => x.isActive)
            .map((x) => ({ id: x.id, name: x.name, type: 'holding' as OwnerType }))
        return [...p, ...h].sort((a, b) => a.name.localeCompare(b.name))
    }, [state.players, state.holdings])

    const qty = parseInt(quantity, 10) || 0
    const totalPrice = offer.offerPrice * qty

    // Validation
    let canExecute = true
    let validationMessage = ''

    if (!selectedOwnerId) {
        canExecute = false
    } else if (qty < 1 || qty > offer.remainingQuantity) {
        canExecute = false
        validationMessage = `Quantidade inválida (Max: ${offer.remainingQuantity})`
    } else {
        const owner = owners.find((o) => o.id === selectedOwnerId)
        // If market is selling, the selected owner is buying
        if (isMarketSelling) {
            const buyerCash =
                owner?.type === 'player'
                    ? state.players.find((p) => p.id === selectedOwnerId)?.cash ?? 0
                    : state.holdings.find((h) => h.id === selectedOwnerId)?.cash ?? 0

            if (buyerCash < totalPrice) {
                canExecute = false
                validationMessage = `Saldo insuficiente (Disponível: ${formatCurrency(buyerCash)})`
            }
        } else {
            // If market is buying, the selected owner is selling
            const portfolio = state.portfolios.find(
                (p) => p.ownerId === selectedOwnerId && p.ownerType === owner?.type
            )
            const position = portfolio?.positions.find((p) => p.ticker === offer.ticker)
            const availableShares = position?.quantity ?? 0

            if (availableShares < qty) {
                canExecute = false
                validationMessage = `Ações insuficientes (Disponível: ${availableShares})`
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!canExecute) return

        setLoading(true)
        setError(null)

        const owner = owners.find((o) => o.id === selectedOwnerId)
        if (!owner) return

        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: isMarketSelling ? 'buy' : 'sell',
                    buyerId: isMarketSelling ? selectedOwnerId : 'market',
                    buyerType: isMarketSelling ? owner.type : 'market',
                    sellerId: isMarketSelling ? 'market' : selectedOwnerId,
                    sellerType: isMarketSelling ? 'market' : owner.type,
                    ticker: offer.ticker,
                    quantity: qty,
                    price: offer.offerPrice,
                    offerId: offer.id,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error ?? 'Erro ao executar transação')
            }

            onSuccess?.()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido')
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-indigo-500/50 bg-white dark:bg-zinc-950 p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Executar Oferta</h2>
                        <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-1">
                            {isMarketSelling ? 'Mercado está VENDENDO' : 'Mercado está COMPRANDO'} <span className="font-bold text-indigo-600 dark:text-indigo-400">{offer.ticker}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-lg p-4 border border-slate-100 dark:border-zinc-800/50 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-zinc-400">Preço Fixo:</span>
                            <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(offer.offerPrice)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-zinc-400">Disponível:</span>
                            <span className="font-bold text-slate-800 dark:text-white">{offer.remainingQuantity.toLocaleString()}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                            {isMarketSelling ? 'Comprador (Quem vai pagar)' : 'Vendedor (Quem vai entregar)'}
                        </label>
                        <select
                            value={selectedOwnerId}
                            onChange={(e) => setSelectedOwnerId(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Selecione...</option>
                            {owners.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.name} ({o.type})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                            Quantidade
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={offer.remainingQuantity}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-zinc-800">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-slate-600 dark:text-zinc-300">Total da Operação:</span>
                            <span className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{formatCurrency(totalPrice)}</span>
                        </div>
                        {validationMessage && (
                            <p className="text-xs font-medium text-red-500 dark:text-red-400 text-right">{validationMessage}</p>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800/50">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !canExecute}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Processando...' : 'Confirmar Transação'}
                    </button>
                </form>
            </div>
        </div>
    )
}
