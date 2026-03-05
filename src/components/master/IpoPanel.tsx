'use client'

import { useState } from 'react'
import type { GameState, AssetStatus } from '@/types'
import { formatCurrency } from '@/lib/formatters'

interface IpoPanelProps {
    state: GameState
    onUpdate: () => void
}

export function IpoPanel({ state, onUpdate }: IpoPanelProps) {
    const [offerPrices, setOfferPrices] = useState<Record<string, string>>({})
    const [loadingToggles, setLoadingToggles] = useState<Record<string, boolean>>({})

    const toggleStatus = async (ticker: string, currentStatus: AssetStatus) => {
        const newStatus = currentStatus === 'active' ? 'ipo_pending' : 'active'
        setLoadingToggles(prev => ({ ...prev, [ticker]: true }))
        try {
            const res = await fetch('/api/game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_asset',
                    ticker,
                    updates: { status: newStatus },
                }),
            })
            if (res.ok) onUpdate()
        } finally {
            setLoadingToggles(prev => ({ ...prev, [ticker]: false }))
        }
    }

    const launchIPO = async (ticker: string) => {
        const priceStr = offerPrices[ticker]
        const price = parseFloat(priceStr?.replace(',', '.') || '0')

        if (isNaN(price) || price <= 0) {
            alert('Digite um preço de oferta válido maior que zero.')
            return
        }

        setLoadingToggles(prev => ({ ...prev, [ticker]: true }))
        try {
            const res = await fetch('/api/ipo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker, offerPrice: price }),
            })
            if (res.ok) {
                alert(`IPO de ${ticker} lançado com sucesso! Uma Oferta de Mercado foi criada e a Notícia Global foi disparada.`)
                onUpdate()
            } else {
                const err = await res.json()
                alert('Erro ao lançar IPO: ' + err.error)
            }
        } finally {
            setLoadingToggles(prev => ({ ...prev, [ticker]: false }))
        }
    }

    const sortedAssets = [...state.assets].sort((a, b) => {
        if (a.status === 'ipo_pending' && b.status !== 'ipo_pending') return -1
        if (a.status !== 'ipo_pending' && b.status === 'ipo_pending') return 1
        return a.ticker.localeCompare(b.ticker)
    })

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                    <span className="bg-orange-600 p-2 rounded-lg text-sm">🏢</span>
                    Gestão de IPOs e Listagem
                </h2>
                <p className="text-zinc-400 text-sm">
                    Abaixo você pode definir QUAIS empresas ficarão bloqueadas (Pendente de IPO) no início do jogo.
                    Durante a rodada que desejar, basta definir o Preço da Oferta Inicial e lançar o IPO no mercado ao vivo.
                </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-x-auto shadow-xl">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                    <thead className="bg-zinc-800/80 border-b border-zinc-700 text-zinc-400">
                        <tr>
                            <th className="p-4 font-medium">Ativo / Empresa</th>
                            <th className="p-4 font-medium">Visibilidade</th>
                            <th className="p-4 font-medium">Status Atual</th>
                            <th className="p-4 font-medium w-80">Configurar Oferta do IPO (R$)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                        {sortedAssets.map(asset => {
                            const isPending = asset.status === 'ipo_pending'

                            return (
                                <tr key={asset.ticker} className={`hover:bg-zinc-800/40 transition-colors ${isPending ? 'bg-orange-900/10' : ''}`}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded shadow-md flex items-center justify-center font-black text-xs text-white ${isPending ? 'bg-gradient-to-br from-orange-400 to-red-600' : 'bg-gradient-to-br from-zinc-700 to-zinc-900'}`}>
                                                {asset.ticker}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{asset.name}</div>
                                                <div className="text-xs text-zinc-500">{asset.sector}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {isPending ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 bg-orange-950/50 px-2 py-1 rounded border border-orange-900/50">
                                                <span className="text-[10px]">👁️‍🗨️</span> Oculto p/ Jogadores
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                                                <span className="text-[10px]">👁️</span> Visível no Mercado
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <button
                                            disabled={loadingToggles[asset.ticker]}
                                            onClick={() => toggleStatus(asset.ticker, asset.status)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition
                        ${isPending
                                                    ? 'border-orange-500/50 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]'
                                                    : 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10'
                                                }
                      `}
                                        >
                                            {loadingToggles[asset.ticker] ? '🔄 Trocando...' : isPending ? '🔒 PENDENTE DE IPO' : '✅ ATIVA NO PREGÃO'}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        {isPending ? (
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                                                    <input
                                                        type="text"
                                                        placeholder={asset.initialPrice.toString()}
                                                        value={offerPrices[asset.ticker] ?? ''}
                                                        onChange={e => setOfferPrices(prev => ({ ...prev, [asset.ticker]: e.target.value }))}
                                                        className="w-28 pl-8 pr-3 py-2 rounded-lg bg-zinc-950 border border-orange-500/50 text-white font-mono shadow-inner outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition"
                                                    />
                                                </div>
                                                <button
                                                    disabled={loadingToggles[asset.ticker] || !offerPrices[asset.ticker]}
                                                    onClick={() => launchIPO(asset.ticker)}
                                                    className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-lg shadow-lg shadow-orange-900/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                                                >
                                                    🚀 Lançar IPO
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-zinc-500 text-xs flex items-center gap-2">
                                                Preço inicial de tela: <strong className="text-emerald-400 font-mono text-sm bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{formatCurrency(asset.initialPrice)}</strong>
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
