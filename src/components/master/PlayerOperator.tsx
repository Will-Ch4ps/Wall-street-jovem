'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/formatters'
import type { GameState, OwnerType } from '@/types'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
} from 'recharts'

interface PlayerOperatorProps {
    playerId: string
    ownerType?: OwnerType
}

export function PlayerOperator({ playerId, ownerType = 'player' }: PlayerOperatorProps) {
    const [state, setState] = useState<GameState | null>(null)
    const [loading, setLoading] = useState(true)
    const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy')
    const [selectedTicker, setSelectedTicker] = useState('')
    const [qty, setQty] = useState('')
    const [tradeLoading, setTradeLoading] = useState(false)
    const [tradeError, setTradeError] = useState<string | null>(null)
    const [tradeSuccess, setTradeSuccess] = useState<string | null>(null)

    const fetchState = async () => {
        const res = await fetch('/api/game')
        if (res.ok) setState(await res.json())
        setLoading(false)
    }

    useEffect(() => {
        fetchState()
        const id = setInterval(() => {
            fetch('/api/prices')
                .then(r => r.ok ? r.json() : null)
                .then(data => { if (data) setState(prev => prev ? { ...prev, ...data } : null) })
                .catch(() => { })
        }, 10000)
        return () => clearInterval(id)
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
    )
    if (!state) return (
        <div className="text-center text-zinc-500 py-16">Nenhum jogo ativo.</div>
    )

    const entity = ownerType === 'player'
        ? state.players.find(p => p.id === playerId)
        : state.holdings.find(h => h.id === playerId)

    if (!entity) return (
        <div className="text-center text-zinc-500 py-16">
            Investidor não encontrado: <code className="text-xs bg-zinc-800 px-2 py-1 rounded">{playerId}</code>
        </div>
    )

    const portfolio = state.portfolios.find(p => p.ownerId === playerId && p.ownerType === ownerType)
    const positions = portfolio?.positions ?? []
    const activeAssets = state.assets.filter(a => a.status === 'active' || a.status === 'ipo_open')

    // Net worth calc
    let netWorth = entity.cash
    positions.forEach(pos => {
        const asset = state.assets.find(a => a.ticker === pos.ticker)
        if (asset) netWorth += pos.quantity * asset.currentPrice
    })

    const initialCash = state.game.initialCapital
    const totalReturn = ((netWorth - initialCash) / initialCash) * 100
    const isUp = totalReturn >= 0

    // Active loans for this player
    const myLoans = state.loans.filter(l => l.borrowerId === playerId && l.status === 'active')
    const totalDebt = myLoans.reduce((sum, l) => {
        const rounds = state.game.currentRound - l.roundTaken
        return sum + l.amount + l.amount * l.interestPerRound * rounds
    }, 0)

    // Recent transactions
    const myTxs = state.transactions
        .filter(t => t.buyerId === playerId || t.sellerId === playerId)
        .slice(-20)
        .reverse()

    // Build chart data — candle range per asset in portfolio
    const chartData = positions.map(pos => {
        const hist = state.priceHistories[pos.ticker]
        const recentCandles = hist?.candles.slice(-5) ?? []
        const avgRange = recentCandles.length > 0
            ? recentCandles.reduce((s, c) => s + (c.high - c.low), 0) / recentCandles.length
            : 0
        const asset = state.assets.find(a => a.ticker === pos.ticker)
        const pnlPct = asset
            ? ((asset.currentPrice - pos.avgPrice) / pos.avgPrice) * 100
            : 0
        return {
            ticker: pos.ticker,
            volatilidade: parseFloat(avgRange.toFixed(2)),
            variacao: parseFloat(pnlPct.toFixed(2)),
            preco: asset?.currentPrice ?? pos.avgPrice,
        }
    })

    const tradeAsset = state.assets.find(a => a.ticker === selectedTicker)
    const tradeQty = parseInt(qty) || 0
    const tradeTotal = (tradeAsset?.currentPrice ?? 0) * tradeQty
    const sellPosition = positions.find(p => p.ticker === selectedTicker)

    const canExecute = selectedTicker && tradeQty > 0 && (
        tradeMode === 'buy'
            ? entity.cash >= tradeTotal && (tradeAsset?.availableShares ?? 0) >= tradeQty
            : (sellPosition?.quantity ?? 0) >= tradeQty
    )

    const handleTrade = async () => {
        setTradeLoading(true)
        setTradeError(null)
        setTradeSuccess(null)
        try {
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: tradeMode,
                    buyerId: tradeMode === 'buy' ? playerId : 'market',
                    buyerType: tradeMode === 'buy' ? ownerType : 'market',
                    sellerId: tradeMode === 'sell' ? playerId : 'market',
                    sellerType: tradeMode === 'sell' ? ownerType : 'market',
                    ticker: selectedTicker,
                    quantity: tradeQty,
                    price: tradeAsset?.currentPrice,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Erro na operação')
            setTradeSuccess(`${tradeMode === 'buy' ? 'Compra' : 'Venda'} de ${tradeQty} ${selectedTicker} executada!`)
            setQty('')
            await fetchState()
        } catch (err) {
            setTradeError(err instanceof Error ? err.message : 'Erro desconhecido')
        } finally {
            setTradeLoading(false)
        }
    }

    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
        if (!active || !payload?.length) return null
        return (
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs shadow-xl">
                <p className="font-bold text-white mb-1">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.name === 'variacao' ? (p.value >= 0 ? '#34d399' : '#f87171') : '#818cf8' }}>
                        {p.name === 'variacao' ? 'Variação' : 'Volatilidade'}: {p.value}{p.name === 'variacao' ? '%' : ''}
                    </p>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                            {entity.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{entity.name}</h1>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ownerType === 'player' ? 'bg-indigo-900/60 text-indigo-300' : 'bg-violet-900/60 text-violet-300'}`}>
                                {ownerType === 'player' ? 'Jogador Individual' : 'Holding'}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-6 flex-wrap">
                        <div className="text-center">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">Patrimônio</p>
                            <p className="text-2xl font-bold text-white">{formatCurrency(netWorth)}</p>
                            <p className={`text-xs font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isUp ? '▲' : '▼'} {Math.abs(totalReturn).toFixed(2)}% desde o início
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">Caixa</p>
                            <p className="text-xl font-bold text-emerald-400">{formatCurrency(entity.cash)}</p>
                        </div>
                        {totalDebt > 0 && (
                            <div className="text-center">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider">Dívida</p>
                                <p className="text-xl font-bold text-red-400">{formatCurrency(totalDebt)}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Portfolio + Chart */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Portfolio Table */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                            <h2 className="font-bold text-white">Carteira de Ativos</h2>
                            <span className="text-xs text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full">{positions.length} ativo{positions.length !== 1 ? 's' : ''}</span>
                        </div>
                        {positions.length === 0 ? (
                            <div className="py-12 text-center text-zinc-600 text-sm italic">Nenhum ativo na carteira.</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800/60">
                                        <th className="text-left px-5 py-3">Ativo</th>
                                        <th className="text-right px-5 py-3">Qtd</th>
                                        <th className="text-right px-5 py-3">PM</th>
                                        <th className="text-right px-5 py-3">Preço Atual</th>
                                        <th className="text-right px-5 py-3">Valor Total</th>
                                        <th className="text-right px-5 py-3">P&L</th>
                                        <th className="px-3 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map(pos => {
                                        const asset = state.assets.find(a => a.ticker === pos.ticker)
                                        const price = asset?.currentPrice ?? pos.avgPrice
                                        const currentVal = price * pos.quantity
                                        const pnl = currentVal - pos.totalInvested
                                        const pnlPct = (pnl / pos.totalInvested) * 100
                                        const isGain = pnl >= 0
                                        return (
                                            <tr key={pos.ticker} className="border-b border-zinc-800/40 hover:bg-zinc-800/30 transition group">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white bg-indigo-900/50 px-2 py-0.5 rounded text-xs">{pos.ticker}</span>
                                                        <span className="text-zinc-400 text-xs truncate max-w-24">{asset?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="text-right px-5 py-3 font-mono text-white">{pos.quantity.toLocaleString()}</td>
                                                <td className="text-right px-5 py-3 font-mono text-zinc-400">{formatCurrency(pos.avgPrice)}</td>
                                                <td className="text-right px-5 py-3 font-mono text-white font-semibold">{formatCurrency(price)}</td>
                                                <td className="text-right px-5 py-3 font-mono text-white">{formatCurrency(currentVal)}</td>
                                                <td className="text-right px-5 py-3">
                                                    <div>
                                                        <span className={`font-mono font-bold text-xs ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {isGain ? '+' : ''}{pnlPct.toFixed(2)}%
                                                        </span>
                                                        <p className={`text-xs font-mono ${isGain ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {isGain ? '+' : ''}{formatCurrency(pnl)}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                        <button onClick={() => { setSelectedTicker(pos.ticker); setTradeMode('sell') }}
                                                            className="px-2 py-1 text-xs bg-red-900/50 border border-red-700/50 text-red-300 rounded hover:bg-red-800/50">
                                                            Vender
                                                        </button>
                                                        <button onClick={() => { setSelectedTicker(pos.ticker); setTradeMode('buy') }}
                                                            className="px-2 py-1 text-xs bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 rounded hover:bg-indigo-800/50">
                                                            Comprar +
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Volatility & P&L Bar Chart */}
                    {chartData.length > 0 && (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                            <h2 className="font-bold text-white mb-4">Análise de Posições</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Variação vs PM (%)</p>
                                    <ResponsiveContainer width="100%" height={160}>
                                        <BarChart data={chartData} barSize={28}>
                                            <XAxis dataKey="ticker" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={35} tickFormatter={v => `${v}%`} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                                            <Bar dataKey="variacao" radius={[4, 4, 0, 0]}>
                                                {chartData.map((entry, index) => (
                                                    <Cell key={index} fill={entry.variacao >= 0 ? '#34d399' : '#f87171'} fillOpacity={0.85} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Volatilidade Recente (range médio R$)</p>
                                    <ResponsiveContainer width="100%" height={160}>
                                        <BarChart data={chartData} barSize={28}>
                                            <XAxis dataKey="ticker" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="volatilidade" fill="#818cf8" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Transactions */}
                    {myTxs.length > 0 && (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                            <div className="px-5 py-4 border-b border-zinc-800">
                                <h2 className="font-bold text-white">Histórico de Operações</h2>
                            </div>
                            <div className="divide-y divide-zinc-800/50 max-h-72 overflow-y-auto custom-scrollbar">
                                {myTxs.map(tx => {
                                    const isBuyer = tx.buyerId === playerId
                                    const isDiv = tx.type === 'fii_dividend' || tx.type === 'dividend' || tx.type === 'fixed_income_yield'
                                    return (
                                        <div key={tx.id} className="px-5 py-2.5 flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-16 text-center text-xs font-bold py-0.5 rounded-full ${isDiv ? 'bg-amber-900/40 text-amber-300' :
                                                        isBuyer ? 'bg-indigo-900/40 text-indigo-300' : 'bg-red-900/40 text-red-300'
                                                    }`}>
                                                    {isDiv ? 'DIVID' : isBuyer ? 'COMPRA' : 'VENDA'}
                                                </span>
                                                <div>
                                                    <p className="text-zinc-200 font-medium">{tx.ticker ? `${tx.quantity}× ${tx.ticker}` : tx.description?.substring(0, 40)}</p>
                                                    <p className="text-zinc-600 text-xs">R{tx.round}</p>
                                                </div>
                                            </div>
                                            <span className={`font-mono font-bold ${isBuyer ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {isBuyer && !isDiv ? '-' : '+'}{formatCurrency(tx.total)}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Trade Panel + Market Prices */}
                <div className="space-y-5">
                    {/* Trade Panel */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                        <div className="flex border-b border-zinc-800">
                            <button onClick={() => setTradeMode('buy')}
                                className={`flex-1 py-3 text-sm font-bold transition ${tradeMode === 'buy' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                                📈 Comprar
                            </button>
                            <button onClick={() => setTradeMode('sell')}
                                className={`flex-1 py-3 text-sm font-bold transition ${tradeMode === 'sell' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                                📉 Vender
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">Ativo</label>
                                <select value={selectedTicker} onChange={e => setSelectedTicker(e.target.value)}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition">
                                    <option value="">Selecione...</option>
                                    {(tradeMode === 'buy' ? activeAssets : positions.map(p => state.assets.find(a => a.ticker === p.ticker)).filter(Boolean))
                                        .map(a => a && (
                                            <option key={a.ticker} value={a.ticker}>{a.ticker} — {formatCurrency(a.currentPrice)}</option>
                                        ))}
                                </select>
                            </div>

                            {tradeAsset && (
                                <div className="bg-zinc-950/60 rounded-lg p-3 text-xs text-zinc-400 space-y-1 border border-zinc-800">
                                    <div className="flex justify-between">
                                        <span>Cotação atual</span>
                                        <span className="font-mono text-white font-bold">{formatCurrency(tradeAsset.currentPrice)}</span>
                                    </div>
                                    {tradeMode === 'buy' && (
                                        <div className="flex justify-between">
                                            <span>Disponível mkt</span>
                                            <span className="font-mono">{tradeAsset.availableShares.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {tradeMode === 'sell' && sellPosition && (
                                        <div className="flex justify-between">
                                            <span>Na carteira</span>
                                            <span className="font-mono">{sellPosition.quantity.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">Quantidade</label>
                                <input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)}
                                    placeholder="0"
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                            </div>

                            {tradeQty > 0 && tradeAsset && (
                                <div className="bg-zinc-950/40 rounded-lg p-3 border border-zinc-800">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">Total estimado</span>
                                        <span className="font-mono font-bold text-white">{formatCurrency(tradeTotal)}</span>
                                    </div>
                                    {tradeMode === 'buy' && (
                                        <div className="flex justify-between text-xs mt-1">
                                            <span className="text-zinc-600">Saldo após</span>
                                            <span className={`font-mono ${entity.cash - tradeTotal >= 0 ? 'text-zinc-400' : 'text-red-400'}`}>
                                                {formatCurrency(entity.cash - tradeTotal)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {tradeError && (
                                <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2 text-xs text-red-300">{tradeError}</div>
                            )}
                            {tradeSuccess && (
                                <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-lg px-3 py-2 text-xs text-emerald-300">{tradeSuccess}</div>
                            )}

                            <button onClick={handleTrade} disabled={!canExecute || tradeLoading}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition shadow-lg disabled:opacity-40 ${tradeMode === 'buy'
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40'
                                        : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40'
                                    }`}>
                                {tradeLoading ? 'Executando...' : tradeMode === 'buy' ? '📈 Confirmar Compra' : '📉 Confirmar Venda'}
                            </button>
                        </div>
                    </div>

                    {/* Market Prices */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                        <div className="px-5 py-4 border-b border-zinc-800">
                            <h2 className="font-bold text-white text-sm">Mercado ao Vivo</h2>
                        </div>
                        <div className="divide-y divide-zinc-800/40 max-h-80 overflow-y-auto custom-scrollbar">
                            {activeAssets.map(a => {
                                const hist = state.priceHistories[a.ticker]
                                const lastCandle = hist?.candles.slice(-1)[0]
                                const openPrice = lastCandle?.open ?? a.currentPrice
                                const change = ((a.currentPrice - openPrice) / openPrice) * 100
                                const isGain = change >= 0
                                return (
                                    <div key={a.ticker} className="px-5 py-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition cursor-pointer"
                                        onClick={() => setSelectedTicker(a.ticker)}>
                                        <div>
                                            <p className="font-bold text-xs text-white">{a.ticker}</p>
                                            <p className="text-xs text-zinc-600">{a.name.substring(0, 18)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono font-bold text-sm text-white">{formatCurrency(a.currentPrice)}</p>
                                            <p className={`text-xs font-mono ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {isGain ? '+' : ''}{change.toFixed(2)}%
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
