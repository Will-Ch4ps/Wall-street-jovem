'use client'

import { useMemo, useState } from 'react'
import { formatCurrency } from '@/lib/formatters'
import { companyStories } from '@/data/defaultCompanies'
import { fiiStories } from '@/data/defaultFIIs'
import { projectEndGame } from '@/lib/analysis'
import type { GameState, Asset, FII, Stock } from '@/types'

interface AnalysisTabProps {
    state: GameState
    onUpdate: () => void
}

type TrendType = 'bullish' | 'bearish' | 'volatile' | 'neutral'
interface AssetEdit {
    trend: TrendType
    targetClose: string
    momentum: string
    volatility: string
}

const TREND_OPTIONS: { value: TrendType; label: string; icon: string; color: string }[] = [
    { value: 'bullish', label: 'Alta', icon: '📈', color: 'bg-emerald-700 border-emerald-500 text-white' },
    { value: 'bearish', label: 'Baixa', icon: '📉', color: 'bg-red-700 border-red-500 text-white' },
    { value: 'volatile', label: 'Volátil', icon: '⚡', color: 'bg-amber-700 border-amber-500 text-white' },
    { value: 'neutral', label: 'Neutro', icon: '➡️', color: 'bg-zinc-600 border-zinc-500 text-white' },
]

function getTrendBadge(trend: string) {
    return {
        bullish: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/50',
        bearish: 'text-red-400 bg-red-950/60 border-red-700/50',
        volatile: 'text-amber-400 bg-amber-950/60 border-amber-700/50',
        neutral: 'text-zinc-400 bg-zinc-800/60 border-zinc-700/50',
    }[trend] ?? 'text-zinc-400 bg-zinc-800/60 border-zinc-700/50'
}
function getTrendIcon(trend: string) { return { bullish: '📈', bearish: '📉', volatile: '⚡', neutral: '➡️' }[trend] ?? '➡️' }
function getTrendLabel(trend: string) { return { bullish: 'Alta', bearish: 'Baixa', volatile: 'Volátil', neutral: 'Neutro' }[trend] ?? trend }

function getFIIHealthBadge(fii: FII) {
    let s = 0
    if (fii.pvpRatio < 0.8) s += 3; else if (fii.pvpRatio < 1.0) s += 2; else if (fii.pvpRatio < 1.2) s += 1
    if (fii.vacancyRate < 0.05) s += 3; else if (fii.vacancyRate < 0.15) s += 2; else if (fii.vacancyRate < 0.25) s += 1
    if (fii.dividendYield > 0.08) s += 2; else if (fii.dividendYield > 0.05) s += 1
    if (s >= 7) return { label: 'Excelente', color: 'text-emerald-400 border-emerald-700 bg-emerald-950/40', score: s }
    if (s >= 5) return { label: 'Bom', color: 'text-green-400 border-green-700 bg-green-950/40', score: s }
    if (s >= 3) return { label: 'Regular', color: 'text-amber-400 border-amber-700 bg-amber-950/40', score: s }
    return { label: 'Em Risco', color: 'text-red-400 border-red-700 bg-red-950/40', score: s }
}

function Sparkline({ values, positive }: { values: number[]; positive?: boolean }) {
    if (values.length < 2) return <span className="text-zinc-700 text-xs italic">sem dados</span>
    const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1
    const W = 64; const H = 24
    const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * H}`).join(' ')
    const color = positive === undefined ? (values[values.length - 1] >= values[0] ? '#34d399' : '#f87171') : positive ? '#34d399' : '#f87171'
    return (
        <svg width={W} height={H} className="shrink-0">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
        <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-3 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">{label}</span>
            <span className={`text-base font-bold font-mono ${color ?? 'text-white'}`}>{value}</span>
            {sub && <span className="text-[10px] text-zinc-500">{sub}</span>}
        </div>
    )
}

export function AnalysisTab({ state, onUpdate }: AnalysisTabProps) {
    const [filter, setFilter] = useState<'all' | 'stock' | 'fii'>('all')
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
    const [edits, setEdits] = useState<Record<string, AssetEdit>>({})
    const [loading, setLoading] = useState(false)
    const [savedTicker, setSavedTicker] = useState<string | null>(null)

    const maxRounds = state.game.maxRounds
    const currentRound = state.game.currentRound
    const remainingRounds = Math.max(0, maxRounds - currentRound)

    const assets = useMemo(() =>
        state.assets
            .filter(a => a.status === 'active' || a.status === 'ipo_open')
            .filter(a => filter === 'all' || a.type === filter)
            .sort((a, b) => {
                const pa = ((a.currentPrice - a.openPrice) / a.openPrice) * 100
                const pb = ((b.currentPrice - b.openPrice) / b.openPrice) * 100
                return pb - pa
            })
        , [state.assets, filter])

    const selected = selectedTicker ? state.assets.find(a => a.ticker === selectedTicker) : null

    // Auto-select first asset
    const displayTicker = selectedTicker ?? assets[0]?.ticker ?? null
    const displayed = displayTicker ? state.assets.find(a => a.ticker === displayTicker) : null

    const story = displayed ? (companyStories[displayed.ticker] ?? fiiStories[displayed.ticker] ?? null) : null

    // === Holders of this asset ===
    const holders = useMemo(() => {
        if (!displayed) return []
        const results: { name: string; type: 'player' | 'holding'; quantity: number; avgPrice: number; currentValue: number; pnlPct: number }[] = []
        for (const portfolio of state.portfolios) {
            const pos = portfolio.positions.find(p => p.ticker === displayed.ticker)
            if (!pos || pos.quantity === 0) continue
            const currentValue = pos.quantity * displayed.currentPrice
            const pnlPct = ((displayed.currentPrice - pos.avgPrice) / pos.avgPrice) * 100
            if (portfolio.ownerType === 'player') {
                const player = state.players.find(p => p.id === portfolio.ownerId)
                if (player) results.push({ name: player.name, type: 'player', quantity: pos.quantity, avgPrice: pos.avgPrice, currentValue, pnlPct })
            } else if (portfolio.ownerType === 'holding') {
                const holding = state.holdings.find(h => h.id === portfolio.ownerId)
                if (holding) results.push({ name: holding.name, type: 'holding', quantity: pos.quantity, avgPrice: pos.avgPrice, currentValue, pnlPct })
            }
        }
        return results.sort((a, b) => b.quantity - a.quantity)
    }, [displayed, state.portfolios, state.players, state.holdings])

    // === Active card effects on this asset ===
    const activeEffects = useMemo(() => {
        if (!displayed) return []
        return (state.activeCardEffects ?? []).filter(e => {
            const t = e.effect?.target
            const tf = e.effect?.targetFilter
            return t === 'all' || tf === displayed.ticker || tf === displayed.sector
        })
    }, [displayed, state.activeCardEffects])

    // === News related to this asset ===
    const relatedNews = useMemo(() => {
        if (!displayed) return []
        const all = [...(state.news ?? []), ...(state.newsArchive ?? [])]
        return all
            .filter(n => n.targets?.includes(displayed.ticker) || n.targets?.includes(displayed.sector) || n.targets?.includes('Todos'))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10)
    }, [displayed, state.news, state.newsArchive])

    // === Scenario edit helpers ===
    const getEdit = (a: Asset): AssetEdit => edits[a.ticker] ?? {
        trend: a.trend,
        targetClose: a.targetClose.toString(),
        momentum: (a.momentum ?? 0.08).toString(),
        volatility: (a.volatility ?? 0.06).toString(),
    }

    const setField = (ticker: string, field: keyof AssetEdit, value: string) =>
        setEdits(prev => ({ ...prev, [ticker]: { ...getEdit(state.assets.find(a => a.ticker === ticker)!), ...prev[ticker], [field]: value } }))

    const handleSave = async (ticker: string) => {
        const asset = state.assets.find(a => a.ticker === ticker)
        if (!asset) return
        const edit = getEdit(asset)
        const targetClose = parseFloat(edit.targetClose)
        const momentum = parseFloat(edit.momentum)
        const volatility = parseFloat(edit.volatility)
        if (isNaN(targetClose) || isNaN(momentum) || isNaN(volatility)) return
        setLoading(true)
        try {
            const res = await fetch('/api/game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_asset', ticker, updates: { trend: edit.trend, targetClose, momentum, volatility } }),
            })
            if (res.ok) {
                setSavedTicker(ticker)
                setTimeout(() => setSavedTicker(null), 2000)
                setEdits(prev => { const next = { ...prev }; delete next[ticker]; return next })
                onUpdate()
            }
        } finally { setLoading(false) }
    }

    const activeTicker = selectedTicker ?? assets[0]?.ticker ?? null
    const activeAsset = activeTicker ? state.assets.find(a => a.ticker === activeTicker) : null

    return (
        <div className="flex gap-0 h-full min-h-[600px]">

            {/* ══════════════════════════════════════════════════
                LEFT SIDEBAR — Company List
            ══════════════════════════════════════════════════ */}
            <div className="w-56 shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-900/60 rounded-l-2xl overflow-hidden">
                {/* Filter strip */}
                <div className="flex gap-0.5 p-2 border-b border-zinc-800 bg-zinc-900">
                    {(['all', 'stock', 'fii'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`flex-1 py-1 text-[10px] rounded font-bold transition ${filter === f ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                            {f === 'all' ? 'Todos' : f === 'stock' ? 'Ações' : 'FIIs'}
                        </button>
                    ))}
                </div>

                {/* Asset list */}
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40 custom-scrollbar">
                    {assets.map(asset => {
                        const isActive = activeTicker === asset.ticker
                        const isDirty = !!edits[asset.ticker]
                        const todayPct = ((asset.currentPrice - asset.openPrice) / asset.openPrice) * 100
                        const sparkPrices = (state.priceHistories[asset.ticker]?.candles ?? []).slice(-8).map(c => c.close)
                        return (
                            <button
                                key={asset.ticker}
                                onClick={() => setSelectedTicker(asset.ticker)}
                                className={`w-full text-left px-3 py-2.5 transition-all ${isActive ? 'bg-indigo-950/50 border-l-2 border-l-indigo-500' : 'hover:bg-zinc-800/40 border-l-2 border-l-transparent'}`}
                            >
                                <div className="flex items-start justify-between gap-1">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1">
                                            <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-zinc-200'}`}>{asset.ticker}</span>
                                            {isDirty && <span className="text-amber-400 text-[8px]">●</span>}
                                        </div>
                                        <p className="text-[10px] text-zinc-500 truncate leading-tight">{asset.name}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[10px] font-mono text-zinc-300">{formatCurrency(asset.currentPrice)}</p>
                                        <p className={`text-[10px] font-bold ${todayPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {todayPct >= 0 ? '+' : ''}{todayPct.toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                                {sparkPrices.length >= 2 && (
                                    <div className="mt-1 opacity-60">
                                        <Sparkline values={sparkPrices} positive={todayPct >= 0} />
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                MAIN PANEL — Company Deep Dive
            ══════════════════════════════════════════════════ */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-900/30 rounded-r-2xl">
                {!activeAsset ? (
                    <div className="flex items-center justify-center h-full text-zinc-600 text-sm italic">
                        Selecione uma empresa na lista
                    </div>
                ) : (() => {
                    const asset = activeAsset
                    const edit = getEdit(asset)
                    const isDirty = !!edits[asset.ticker]
                    const isSaved = savedTicker === asset.ticker
                    const isFII = asset.type === 'fii'
                    const fii = isFII ? asset as FII : null
                    const stock = !isFII ? asset as Stock : null

                    const todayPct = ((asset.currentPrice - asset.openPrice) / asset.openPrice) * 100
                    const totalPct = ((asset.currentPrice - asset.initialPrice) / asset.initialPrice) * 100
                    const toTargetPct = ((asset.targetClose - asset.currentPrice) / asset.currentPrice) * 100
                    const proj = projectEndGame(asset, remainingRounds, {
                        trend: edit.trend as Asset['trend'],
                        targetClose: parseFloat(edit.targetClose) || undefined,
                        momentum: parseFloat(edit.momentum) || undefined,
                        volatility: parseFloat(edit.volatility) || undefined,
                    })
                    const endChangePct = ((proj.mid - asset.initialPrice) / asset.initialPrice) * 100

                    const fiiHealth = fii ? getFIIHealthBadge(fii) : null
                    const sparkPrices = (state.priceHistories[asset.ticker]?.candles ?? []).slice(-20).map(c => c.close)

                    const targetPct = ((parseFloat(edit.targetClose) || asset.targetClose) - asset.currentPrice) / asset.currentPrice * 100

                    // Total shares held by all players/holdings
                    const totalHeld = holders.reduce((s, h) => s + h.quantity, 0)
                    const floatPct = asset.totalShares > 0 ? (totalHeld / asset.totalShares) * 100 : 0

                    return (
                        <div className="p-5 space-y-5">

                            {/* ── Header ── */}
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h2 className="text-2xl font-black text-white">{asset.ticker}</h2>
                                            <span className={`text-xs px-2 py-1 rounded-lg border font-bold ${getTrendBadge(asset.trend)}`}>
                                                {getTrendIcon(asset.trend)} {getTrendLabel(asset.trend)}
                                            </span>
                                            {fiiHealth && (
                                                <span className={`text-xs px-2 py-1 rounded-lg border font-bold ${fiiHealth.color}`}>
                                                    ★ {fiiHealth.label}
                                                </span>
                                            )}
                                            {activeEffects.length > 0 && (
                                                <span className="text-xs px-2 py-1 rounded-lg border border-amber-700/50 bg-amber-950/40 text-amber-400 font-bold">
                                                    🃏 {activeEffects.length} Carta{activeEffects.length > 1 ? 's' : ''} Ativa{activeEffects.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {isDirty && (
                                                <span className="text-xs px-2 py-1 rounded-lg border border-amber-600/50 bg-amber-950/30 text-amber-300 font-bold animate-pulse">
                                                    ● Não salvo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-zinc-400 mt-1">{asset.name}</p>
                                        <p className="text-xs text-zinc-600 mt-0.5">{asset.sector} · {asset.profile}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black font-mono text-white">{formatCurrency(asset.currentPrice)}</p>
                                    <p className={`text-base font-bold ${todayPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {todayPct >= 0 ? '▲' : '▼'} {Math.abs(todayPct).toFixed(2)}% hoje
                                    </p>
                                    <p className={`text-xs ${totalPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {totalPct >= 0 ? '+' : ''}{totalPct.toFixed(2)}% desde início
                                    </p>
                                </div>
                            </div>

                            {/* ── Story / Narrativa ── */}
                            {story && (
                                <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/20 px-4 py-3">
                                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">📖 Narrativa da Empresa</p>
                                    <p className="text-sm text-indigo-200/90 leading-relaxed italic">"{story}"</p>
                                </div>
                            )}

                            {/* ── Price History Chart (sparkline grande) ── */}
                            {sparkPrices.length >= 2 && (
                                <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">📈 Histórico de Preços (últimos candles)</span>
                                        <span className="text-[10px] font-mono text-zinc-500">{sparkPrices.length} candles</span>
                                    </div>
                                    <svg width="100%" height="56" viewBox={`0 0 400 56`} preserveAspectRatio="none" className="rounded">
                                        {(() => {
                                            const min = Math.min(...sparkPrices); const max = Math.max(...sparkPrices); const range = max - min || 1
                                            const pts = sparkPrices.map((v, i) => `${(i / (sparkPrices.length - 1)) * 400},${56 - ((v - min) / range) * 52}`).join(' ')
                                            const isUp = sparkPrices[sparkPrices.length - 1] >= sparkPrices[0]
                                            return (
                                                <>
                                                    <defs>
                                                        <linearGradient id={`grad-${asset.ticker}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor={isUp ? '#34d399' : '#f87171'} stopOpacity="0.25" />
                                                            <stop offset="100%" stopColor={isUp ? '#34d399' : '#f87171'} stopOpacity="0" />
                                                        </linearGradient>
                                                    </defs>
                                                    <polygon
                                                        points={`0,56 ${pts} 400,56`}
                                                        fill={`url(#grad-${asset.ticker})`}
                                                    />
                                                    <polyline points={pts} fill="none" stroke={isUp ? '#34d399' : '#f87171'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </>
                                            )
                                        })()}
                                    </svg>
                                    <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-1">
                                        <span>{formatCurrency(Math.min(...sparkPrices))} mín</span>
                                        <span>{formatCurrency(Math.max(...sparkPrices))} máx</span>
                                    </div>
                                </div>
                            )}

                            {/* ── Key Metrics Grid ── */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">📊 Métricas em Tempo Real</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                    <StatBox label="Preço Atual" value={formatCurrency(asset.currentPrice)} sub={`Abertura: ${formatCurrency(asset.openPrice)}`} />
                                    <StatBox label="Meta Cenário" value={formatCurrency(asset.targetClose)}
                                        sub={`${toTargetPct >= 0 ? '+' : ''}${toTargetPct.toFixed(1)}% em relação ao atual`}
                                        color={toTargetPct >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                                    <StatBox label="Volatilidade" value={`${(asset.volatility * 100).toFixed(1)}%`} sub="Ruído por tick" />
                                    <StatBox label="Momentum" value={`${(asset.momentum * 100).toFixed(1)}%`} sub="Pull ➜ alvo" />
                                    <StatBox label="Total de Cotas" value={asset.totalShares.toLocaleString('pt-BR')} sub={`${floatPct.toFixed(1)}% em carteiras`} />
                                    <StatBox label="Preço Inicial" value={formatCurrency(asset.initialPrice)} sub={`Δ ${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(1)}%`}
                                        color={totalPct >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                                    {stock && <StatBox label="P/L" value={stock.peRatio < 0 ? 'Prejuízo' : `${stock.peRatio}x`} sub="Preço / Lucro" color={stock.peRatio < 0 ? 'text-red-400' : 'text-zinc-200'} />}
                                    {stock && <StatBox label="Dividend Yield" value={stock.dividendYield > 0 ? `${(stock.dividendYield * 100).toFixed(1)}%` : 'Não paga'} sub="ao ano" />}
                                    {stock && <StatBox label="Market Cap" value={formatCurrency(asset.currentPrice * asset.totalShares)} sub="valor de mercado" />}
                                </div>
                            </div>

                            {/* ── FII-Specific Metrics ── */}
                            {fii && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">🏢 Métricas do FII</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                        <StatBox label="Segmento" value={fii.segment.replace('_', ' ')} />
                                        <StatBox label="P/VP"
                                            value={fii.pvpRatio.toFixed(2)}
                                            sub={fii.pvpRatio < 1 ? 'Abaixo do patrimônio ✓' : 'Acima do patrimônio'}
                                            color={fii.pvpRatio < 1 ? 'text-emerald-400' : 'text-amber-400'} />
                                        <StatBox label="Vacância"
                                            value={`${(fii.vacancyRate * 100).toFixed(1)}%`}
                                            sub="Imóveis desocupados"
                                            color={fii.vacancyRate < 0.10 ? 'text-emerald-400' : fii.vacancyRate < 0.20 ? 'text-amber-400' : 'text-red-400'} />
                                        <StatBox label="DY Mensal"
                                            value={`${(fii.dividendYield / 12).toFixed(2)}%`}
                                            sub={`${(fii.dividendYield * 100).toFixed(1)}% ao ano`}
                                            color="text-emerald-400" />
                                        <StatBox label="Dividendo/Cota"
                                            value={formatCurrency(fii.dividendPerRound)}
                                            sub="por rodada" />
                                        <StatBox label="Val. Patrimonial"
                                            value={formatCurrency(fii.patrimonyValue)}
                                            sub="por cota" />
                                        {fii.totalProperties > 0 && <StatBox label="Imóveis" value={`${fii.totalProperties}`} sub="propriedades" />}
                                        {fii.netArea > 0 && <StatBox label="Área Bruta" value={`${(fii.netArea / 1000).toFixed(0)}k m²`} sub="área locável" />}
                                    </div>
                                </div>
                            )}

                            {/* ── Holders ── */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                                    👥 Detentores ({holders.length}) — {floatPct.toFixed(1)}% do float em carteiras
                                </p>
                                {holders.length === 0 ? (
                                    <p className="text-zinc-600 text-xs italic">Nenhum jogador possui este ativo ainda.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {holders.map((h, i) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-950/50 border border-zinc-800/60 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${h.type === 'holding' ? 'bg-purple-900/40 text-purple-300 border border-purple-700/40' : 'bg-zinc-800 text-zinc-400'}`}>
                                                        {h.type === 'holding' ? '🏛 Holding' : '👤 Jogador'}
                                                    </span>
                                                    <span className="font-semibold text-zinc-200">{h.name}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-right">
                                                    <div>
                                                        <p className="font-mono text-zinc-400">{h.quantity} cotas</p>
                                                        <p className="text-[10px] text-zinc-600">PM: {formatCurrency(h.avgPrice)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-mono font-bold text-white">{formatCurrency(h.currentValue)}</p>
                                                        <p className={`text-[10px] font-bold ${h.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(1)}% P&L
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Active Card Effects ── */}
                            {activeEffects.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">🃏 Efeitos de Cartas Ativos</p>
                                    <div className="space-y-1.5">
                                        {activeEffects.map((e, i) => (
                                            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs">
                                                <span className="text-lg">🃏</span>
                                                <div>
                                                    <p className="font-semibold text-amber-200">Carta #{e.cardId.slice(-6)}</p>
                                                    <p className="text-amber-400/70 text-[10px]">
                                                        Alvo: {e.effect?.targetFilter ?? e.effect?.target ?? 'global'}
                                                        {e.effect?.priceModifier && ` · Preço ${e.effect.priceModifier.min > 0 ? '+' : ''}${(e.effect.priceModifier.min * 100).toFixed(0)}% a ${(e.effect.priceModifier.max * 100).toFixed(0)}%`}
                                                    </p>
                                                </div>
                                                <div className="ml-auto text-right">
                                                    {e.expiresAtRound && <p className="text-[10px] text-amber-600">Expira R{e.expiresAtRound}</p>}
                                                    <p className="text-[10px] text-zinc-600">Desde R{e.round}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Tags ── */}
                            {asset.tags && asset.tags.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">🏷 Tags do Ativo</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {asset.tags.map(tag => (
                                            <span key={tag} className="px-2 py-0.5 text-[10px] rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Scenario Controls ── */}
                            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">⚙️ Controles de Cenário</p>
                                    {isDirty && <span className="text-[10px] text-amber-400 animate-pulse">● Alterações não salvas</span>}
                                </div>

                                {/* Trend */}
                                <div>
                                    <p className="text-[10px] text-zinc-500 mb-2 uppercase font-semibold">Tendência</p>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {TREND_OPTIONS.map(t => (
                                            <button key={t.value}
                                                onClick={() => setField(asset.ticker, 'trend', t.value)}
                                                className={`px-3 py-1.5 text-xs rounded-lg border font-bold transition flex-1 ${edit.trend === t.value ? t.color : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'}`}>
                                                {t.icon} {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Numeric fields */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 block mb-1 uppercase font-semibold">Alvo da Rodada</label>
                                        <input type="number" value={edit.targetClose}
                                            onChange={e => setField(asset.ticker, 'targetClose', e.target.value)}
                                            className="w-full text-xs font-mono rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                        <p className={`text-[10px] mt-1 font-bold ${targetPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {targetPct >= 0 ? '+' : ''}{targetPct.toFixed(1)}%
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 block mb-1 uppercase font-semibold">Gravidade</label>
                                        <input type="number" value={edit.momentum} step="0.01" min="0.01" max="0.30"
                                            onChange={e => setField(asset.ticker, 'momentum', e.target.value)}
                                            className="w-full text-xs font-mono rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-zinc-300 focus:ring-1 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 block mb-1 uppercase font-semibold">Volatilidade</label>
                                        <input type="number" value={edit.volatility} step="0.005" min="0.01" max="0.30"
                                            onChange={e => setField(asset.ticker, 'volatility', e.target.value)}
                                            className="w-full text-xs font-mono rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-zinc-300 focus:ring-1 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>

                                {/* Quick presets */}
                                <div>
                                    <p className="text-[10px] text-zinc-600 mb-1.5">Presets rápidos de alvo:</p>
                                    <div className="flex gap-1 flex-wrap">
                                        {[-0.30, -0.15, -0.05, +0.05, +0.15, +0.30].map(pct => {
                                            const preset = +(asset.currentPrice * (1 + pct)).toFixed(2)
                                            return (
                                                <button key={pct} onClick={() => setField(asset.ticker, 'targetClose', preset.toString())}
                                                    className={`flex-1 py-1 text-[10px] rounded-lg border font-bold transition ${pct >= 0 ? 'border-emerald-900/50 text-emerald-500/80 hover:bg-emerald-900/20' : 'border-red-900/50 text-red-500/80 hover:bg-red-900/20'}`}>
                                                    {pct >= 0 ? '+' : ''}{(pct * 100).toFixed(0)}%
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <button onClick={() => handleSave(asset.ticker)} disabled={loading || !isDirty}
                                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition disabled:opacity-30">
                                    {loading ? 'Salvando...' : isSaved ? '✅ Cenário Aplicado!' : '⚡ Aplicar Mudanças no Ativo'}
                                </button>
                            </div>

                            {/* ── End-Game Projection ── */}
                            {remainingRounds > 0 && (
                                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
                                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">🔭 Projeção Final ({remainingRounds} rodadas restantes)</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3 text-center">
                                            <p className="text-[10px] text-red-400 uppercase font-bold mb-1">Pessimista</p>
                                            <p className="text-base font-black font-mono text-red-300">{formatCurrency(proj.low)}</p>
                                        </div>
                                        <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-3 text-center">
                                            <p className="text-[10px] text-indigo-400 uppercase font-bold mb-1">Base</p>
                                            <p className="text-base font-black font-mono text-indigo-200">{formatCurrency(proj.mid)}</p>
                                            <p className={`text-[10px] font-bold mt-0.5 ${endChangePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {endChangePct >= 0 ? '+' : ''}{endChangePct.toFixed(1)}% s/ t=0
                                            </p>
                                        </div>
                                        <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl p-3 text-center">
                                            <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Otimista</p>
                                            <p className="text-base font-black font-mono text-emerald-300">{formatCurrency(proj.high)}</p>
                                        </div>
                                    </div>
                                    {/* Track bar */}
                                    <div className="h-2 bg-zinc-800 rounded-full relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 opacity-50 rounded-full" />
                                        <div className={`absolute inset-y-0 rounded-full w-1/3 transition-all ${isDirty ? 'bg-amber-300/70' : 'bg-white/40'}`}
                                            style={{ left: `${Math.min(65, Math.max(10, ((proj.mid - asset.initialPrice * 0.6) / (asset.initialPrice * 2)) * 100))}%` }} />
                                    </div>
                                </div>
                            )}

                            {/* ── Related News ── */}
                            {relatedNews.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">📰 Notícias Relacionadas</p>
                                    <div className="space-y-2">
                                        {relatedNews.map(n => (
                                            <div key={n.id} className="px-3 py-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800/60">
                                                <div className="flex items-start gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-white">{n.title}</p>
                                                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                                                        {n.expertTip && (
                                                            <div className={`mt-1.5 text-[10px] px-2 py-1 rounded border border-dashed ${n.masterOnly ? 'bg-purple-950/30 border-purple-800 text-purple-300' : 'bg-indigo-950/30 border-indigo-800/50 text-indigo-300'}`}>
                                                                {n.masterOnly ? '🔒 ' : '📣 '}{n.expertTip}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-zinc-600 font-mono shrink-0">R{n.round}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    )
                })()}
            </div>
        </div>
    )
}
