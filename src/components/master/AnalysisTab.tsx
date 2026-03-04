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

function getTrendIcon(trend: string) { return { bullish: '📈', bearish: '📉', volatile: '⚡', neutral: '➡️' }[trend] ?? '➡️' }
function getTrendLabel(trend: string) { return { bullish: 'Alta', bearish: 'Baixa', volatile: 'Volátil', neutral: 'Neutro' }[trend] ?? trend }
function getTrendBadge(trend: string) {
    return {
        bullish: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/50',
        bearish: 'text-red-400 bg-red-950/60 border-red-700/50',
        volatile: 'text-amber-400 bg-amber-950/60 border-amber-700/50',
        neutral: 'text-zinc-400 bg-zinc-800/60 border-zinc-700/50',
    }[trend] ?? 'text-zinc-400 bg-zinc-800/60 border-zinc-700/50'
}


function getFIIHealth(fii: FII): { label: string; color: string; score: number } {
    const pvp = fii.pvpRatio; const vacancy = fii.vacancyRate; let s = 0
    if (pvp < 0.8) s += 3; else if (pvp < 1.0) s += 2; else if (pvp < 1.2) s += 1
    if (vacancy < 0.05) s += 3; else if (vacancy < 0.15) s += 2; else if (vacancy < 0.25) s += 1
    if (fii.dividendYield > 0.08) s += 2; else if (fii.dividendYield > 0.05) s += 1
    if (s >= 7) return { label: 'Excelente', color: 'text-emerald-400', score: s }
    if (s >= 5) return { label: 'Bom', color: 'text-green-400', score: s }
    if (s >= 3) return { label: 'Regular', color: 'text-amber-400', score: s }
    return { label: 'Em Risco', color: 'text-red-400', score: s }
}

function Sparkline({ values, color = '#818cf8' }: { values: number[]; color?: string }) {
    if (values.length < 2) return <span className="text-zinc-700 text-xs italic">sem dados</span>
    const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1
    const W = 80; const H = 28
    const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * H}`).join(' ')
    const isUp = values[values.length - 1] >= values[0]
    return (
        <svg width={W} height={H} className="shrink-0">
            <polyline points={pts} fill="none" stroke={color || (isUp ? '#34d399' : '#f87171')} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function AnalysisTab({ state, onUpdate }: AnalysisTabProps) {
    const [filter, setFilter] = useState<'all' | 'stock' | 'fii'>('all')
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
    const [histTab, setHistTab] = useState<'round' | 'archive'>('round')
    const [edits, setEdits] = useState<Record<string, AssetEdit>>({})
    const [loading, setLoading] = useState(false)
    const [savedTicker, setSavedTicker] = useState<string | null>(null)

    const maxRounds = state.game.maxRounds
    const currentRound = state.game.currentRound
    const remainingRounds = Math.max(0, maxRounds - currentRound)

    const assets = useMemo(() => {
        return state.assets
            .filter(a => a.status === 'active' || a.status === 'ipo_open')
            .filter(a => filter === 'all' || a.type === filter)
            .sort((a, b) => {
                const pa = ((a.currentPrice - a.openPrice) / a.openPrice) * 100
                const pb = ((b.currentPrice - b.openPrice) / b.openPrice) * 100
                return pb - pa
            })
    }, [state.assets, filter])

    const selected = selectedTicker ? state.assets.find(a => a.ticker === selectedTicker) : null
    const selectedHist = selectedTicker ? state.priceHistories[selectedTicker] : null
    const story = selected ? (companyStories[selected.ticker] ?? fiiStories[selected.ticker] ?? null) : null

    const roundNews = state.news ?? []
    const archivedNews = state.newsArchive ?? []

    const activeEffectsByTicker = useMemo(() => {
        const map: Record<string, number> = {}
        for (const e of state.activeCardEffects ?? []) {
            const t = e.effect?.targetFilter ?? 'global'
            map[t] = (map[t] ?? 0) + 1
        }
        return map
    }, [state.activeCardEffects])

    // Edit logic
    const getEdit = (a: Asset): AssetEdit => edits[a.ticker] ?? {
        trend: a.trend,
        targetClose: a.targetClose.toString(),
        momentum: (a.momentum ?? 0.08).toString(),
        volatility: (a.volatility ?? 0.06).toString(),
    }

    const setField = (ticker: string, field: keyof AssetEdit, value: string) => {
        setEdits(prev => ({
            ...prev,
            [ticker]: { ...getEdit(state.assets.find(a => a.ticker === ticker)!), ...prev[ticker], [field]: value },
        }))
    }

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
                body: JSON.stringify({
                    action: 'update_asset',
                    ticker,
                    updates: { trend: edit.trend, targetClose, momentum, volatility },
                }),
            })
            if (res.ok) {
                setSavedTicker(ticker)
                setTimeout(() => setSavedTicker(null), 2000)
                // Remove from local drafts once saved
                setEdits(prev => {
                    const next = { ...prev }; delete next[ticker]; return next
                })
                onUpdate()
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h2 className="text-lg font-bold">📊 Análise e Cenários</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Veja a saúde das empresas e controle a tendência global para a rodada</p>
                </div>
                <div className="flex bg-zinc-800/80 rounded-lg p-0.5 gap-0.5">
                    {(['all', 'stock', 'fii'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 text-xs rounded-md font-medium transition ${filter === f ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
                            {f === 'all' ? '📋 Todos' : f === 'stock' ? '📦 Ações' : '🏢 FIIs'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                {/* === LEFT PANEL: ASSET TABLE === */}
                <div className="xl:col-span-2 space-y-1">
                    <div className="grid grid-cols-12 gap-2 px-3 pb-1 text-xs text-zinc-600 uppercase tracking-wider">
                        <span className="col-span-3">Ativo</span>
                        <span className="col-span-2 text-right">Preço Atual</span>
                        <span className="col-span-2 text-right">Meta Cenário</span>
                        <span className="col-span-3 text-right">Projeção Final</span>
                        <span className="col-span-2 text-center">Gráfico</span>
                    </div>

                    {assets.length === 0 && <div className="text-center py-12 text-zinc-600 text-sm italic">Nenhum ativo encontrado.</div>}

                    {assets.map(asset => {
                        const isSelected = selectedTicker === asset.ticker
                        const isDirty = !!edits[asset.ticker]
                        const edit = isDirty ? getEdit(asset) : undefined
                        const effectiveTrend = edit?.trend ?? asset.trend
                        const effectiveTarget = edit ? parseFloat(edit.targetClose) || asset.targetClose : asset.targetClose

                        const todayChange = ((asset.currentPrice - asset.openPrice) / asset.openPrice) * 100
                        const toTarget = ((effectiveTarget - asset.currentPrice) / asset.currentPrice) * 100
                        const proj = projectEndGame(asset, remainingRounds, edit)
                        const endChange = ((proj.mid - asset.initialPrice) / asset.initialPrice) * 100
                        const sparkPrices = (state.priceHistories[asset.ticker]?.candles ?? []).slice(-8).map(c => c.close)
                        const cardCount = (activeEffectsByTicker[asset.ticker] ?? 0) + (activeEffectsByTicker['global'] ?? 0)
                        const fiiHealth = asset.type === 'fii' ? getFIIHealth(asset as FII) : null

                        return (
                            <div key={asset.ticker}
                                onClick={() => setSelectedTicker(isSelected ? null : asset.ticker)}
                                className={`grid grid-cols-12 gap-2 px-3 py-3 rounded-xl cursor-pointer transition items-center ${isSelected
                                    ? 'bg-indigo-950/40 border border-indigo-600/40'
                                    : 'bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-600/50 hover:bg-zinc-800/30'
                                    }`}>
                                <div className="col-span-3 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-sm text-white">{asset.ticker}</span>
                                        {isDirty && <span className="text-amber-400 text-xs shadow-amber-400/50 drop-shadow-md">●</span>}
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isDirty ? 'border-amber-500/50 text-amber-200 bg-amber-900/40' : getTrendBadge(effectiveTrend)}`}>
                                            {getTrendIcon(effectiveTrend)} {getTrendLabel(effectiveTrend)}
                                        </span>
                                        {cardCount > 0 && <span className="text-xs text-amber-400">🃏{cardCount}</span>}
                                    </div>
                                    <p className="text-xs text-zinc-600 truncate mt-0.5">{asset.name}</p>
                                    {fiiHealth && <p className={`text-xs font-medium mt-0.5 ${fiiHealth.color}`}>{fiiHealth.label}</p>}
                                </div>

                                <div className="col-span-2 text-right">
                                    <p className="text-sm font-mono font-bold text-white">{formatCurrency(asset.currentPrice)}</p>
                                    <p className={`text-xs font-mono ${todayChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {todayChange >= 0 ? '+' : ''}{todayChange.toFixed(1)}%
                                    </p>
                                </div>

                                <div className="col-span-2 text-right">
                                    <p className={`text-sm font-mono font-semibold ${isDirty ? 'text-amber-400' : toTarget >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatCurrency(effectiveTarget)}
                                    </p>
                                    <p className={`text-xs font-mono ${toTarget >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {toTarget >= 0 ? '▲ ' : '▼ '}{Math.abs(toTarget).toFixed(1)}% {isDirty ? '(novo)' : ''}
                                    </p>
                                </div>

                                <div className="col-span-3 text-right">
                                    {remainingRounds <= 0 ? (
                                        <p className="text-xs text-zinc-600 italic">Jogo encerrado</p>
                                    ) : (
                                        <>
                                            <div className="text-xs text-zinc-500 mb-0.5">
                                                <span className="text-red-400 font-mono">{formatCurrency(proj.low)}</span>
                                                <span className="text-zinc-600 mx-1">—</span>
                                                <span className="text-emerald-400 font-mono">{formatCurrency(proj.high)}</span>
                                            </div>
                                            <p className={`text-sm font-mono font-bold ${endChange >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                                {endChange >= 0 ? '+' : ''}{endChange.toFixed(1)}% s/ t=0
                                            </p>
                                        </>
                                    )}
                                </div>

                                <div className="col-span-2 flex justify-center">
                                    {sparkPrices.length >= 2 ? <Sparkline values={sparkPrices} /> : <span className="text-zinc-700 text-[10px] italic">aguardando</span>}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* === RIGHT PANEL: DETAIL, SCENARIO EDIT & NEWS === */}
                <div className="space-y-4">
                    {/* Selected asset context & editor */}
                    {selected && (() => {
                        const edit = getEdit(selected)
                        const isDirty = !!edits[selected.ticker]
                        const isSaved = savedTicker === selected.ticker
                        const targetPct = ((parseFloat(edit.targetClose) || selected.targetClose) - selected.currentPrice) / selected.currentPrice * 100
                        const proj = projectEndGame(selected, remainingRounds, edit)

                        return (
                            <div className="rounded-xl border border-indigo-600/50 bg-indigo-950/20 shadow-xl shadow-indigo-900/10 overflow-hidden">
                                <div className="px-4 py-3 border-b border-indigo-900/50 flex justify-between items-center bg-indigo-950/40">
                                    <div>
                                        <span className="font-bold text-white text-lg">{selected.ticker}</span>
                                        <span className="text-xs text-indigo-300 ml-2">{selected.name}</span>
                                    </div>
                                    <button onClick={() => setSelectedTicker(null)} className="text-indigo-400 hover:text-white">✕</button>
                                </div>

                                <div className="p-4 space-y-5">
                                    {/* Educational Story */}
                                    {story && (
                                        <div className="text-sm text-indigo-200/90 leading-relaxed border-l-2 border-indigo-500 pl-3 italic">
                                            "{story}"
                                        </div>
                                    )}

                                    {/* Scenario Config Editor */}
                                    <div className="bg-zinc-950/40 rounded-xl p-3 border border-zinc-800 space-y-3">
                                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                                            <span>Controles de Cenário</span>
                                            {isDirty && <span className="text-[10px] text-amber-400 normal-case">Alterações não salvas</span>}
                                        </h3>

                                        <div>
                                            <p className="text-[10px] text-zinc-500 mb-1.5 uppercase">Força Motriz (Tendência)</p>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {TREND_OPTIONS.map(t => (
                                                    <button key={t.value}
                                                        onClick={() => setField(selected.ticker, 'trend', t.value)}
                                                        className={`px-2.5 py-1 text-[10px] rounded border font-bold transition flex-1 ${edit.trend === t.value ? t.color : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                                                            }`}>
                                                        {t.icon} {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="text-[10px] text-zinc-500 block mb-1">Alvo da Rodada</label>
                                                <input type="number" value={edit.targetClose}
                                                    onChange={e => setField(selected.ticker, 'targetClose', e.target.value)}
                                                    className="w-full text-xs font-mono rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                                                <p className={`text-[10px] mt-0.5 font-bold ${targetPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {targetPct >= 0 ? '+' : ''}{targetPct.toFixed(1)}%
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-zinc-500 block mb-1">Gravidade</label>
                                                <input type="number" value={edit.momentum} step="0.01" min="0.01" max="0.30"
                                                    onChange={e => setField(selected.ticker, 'momentum', e.target.value)}
                                                    className="w-full text-xs font-mono rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-300 focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-zinc-500 block mb-1">Volatilidade (Ruído)</label>
                                                <input type="number" value={edit.volatility} step="0.005" min="0.01" max="0.30"
                                                    onChange={e => setField(selected.ticker, 'volatility', e.target.value)}
                                                    className="w-full text-xs font-mono rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-300 focus:ring-1 focus:ring-indigo-500 outline-none" />
                                            </div>
                                        </div>

                                        <div className="flex gap-1 flex-wrap">
                                            {[-0.30, -0.15, +0.15, +0.30].map(pct => {
                                                const preset = +(selected.currentPrice * (1 + pct)).toFixed(2)
                                                return (
                                                    <button key={pct} onClick={() => setField(selected.ticker, 'targetClose', preset.toString())}
                                                        className={`flex-1 py-1 text-[10px] rounded border font-medium ${pct >= 0 ? 'border-emerald-900/50 text-emerald-500/80 hover:bg-emerald-900/20' : 'border-red-900/50 text-red-500/80 hover:bg-red-900/20'} transition`}>
                                                        {pct >= 0 ? '+' : ''}{(pct * 100).toFixed(0)}%
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        <button onClick={() => handleSave(selected.ticker)} disabled={loading || !isDirty}
                                            className="w-full py-2.5 mt-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition disabled:opacity-30 disabled:hover:bg-indigo-600">
                                            {loading ? 'Salvando...' : isSaved ? '✅ Cenário Aplicado' : '⚡ Aplicar Mudanças no Ativo'}
                                        </button>
                                    </div>

                                    {/* Real-time projection visualizer */}
                                    {remainingRounds > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                                                Fim Esperado ({remainingRounds} rodadas)
                                            </p>
                                            <div className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/80 space-y-2.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-zinc-500">Mínimo (Pessimista)</span>
                                                    <span className="text-red-400 font-mono text-sm font-bold">{formatCurrency(proj.low)}</span>
                                                </div>
                                                <div className="h-2.5 bg-zinc-800 rounded-full relative overflow-hidden ring-1 ring-inset ring-black/40">
                                                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 rounded-full w-full opacity-60" />
                                                    <div className={`absolute inset-y-0 rounded-full bg-white/40 shadow-sm transition-all duration-300 ${isDirty ? 'bg-amber-300/60 shadow-amber-300/50 saturate-150' : ''}`}
                                                        style={{
                                                            left: `${Math.min(90, Math.max(5, ((proj.low - selected.initialPrice * 0.5) / (selected.initialPrice * 2)) * 100))}%`,
                                                            width: `${Math.min(60, Math.max(10, ((proj.high - proj.low) / (selected.initialPrice * 2)) * 100))}%`
                                                        }} />
                                                </div>
                                                <div className="flex justify-between items-center pb-1 border-b border-zinc-800/50">
                                                    <span className="text-xs text-zinc-500">Base Estimada</span>
                                                    <span className="text-indigo-300 font-mono text-base font-black">{formatCurrency(proj.mid)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-zinc-500">Máximo (Otimista)</span>
                                                    <span className="text-emerald-400 font-mono text-sm font-bold">{formatCurrency(proj.high)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })()}

                    {/* News archive widget is squished if an asset is selected, full if not */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                        <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
                            <span className="text-xs font-bold text-zinc-400 uppercase">Mural de Notícias</span>
                            <div className="flex gap-1">
                                <button onClick={() => setHistTab('round')}
                                    className={`text-[10px] px-2 py-1 rounded transition ${histTab === 'round' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                    Hoje ({roundNews.length})
                                </button>
                                <button onClick={() => setHistTab('archive')}
                                    className={`text-[10px] px-2 py-1 rounded transition ${histTab === 'archive' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                    Histórico ({archivedNews.length})
                                </button>
                            </div>
                        </div>
                        <div className={`divide-y divide-zinc-800/50 overflow-y-auto ${selected ? 'max-h-48' : 'max-h-[500px]'}`}>
                            {(histTab === 'round' ? roundNews : archivedNews).length === 0 ? (
                                <p className="text-center text-zinc-700 text-xs py-5 italic">Nenhuma notícia.</p>
                            ) : (
                                (histTab === 'round' ? roundNews : archivedNews).map(n => (
                                    <div key={n.id} className="px-3 py-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0 flex flex-col">
                                                <p className="text-sm font-medium text-white leading-snug">{n.title}</p>
                                                <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-3">{n.body}</p>
                                                {n.expertTip && (
                                                    <div className={`mt-2 text-xs px-2 py-1.5 rounded border border-dashed ${n.masterOnly ? 'bg-purple-950/30 border-purple-800 text-purple-300' : 'bg-indigo-950/30 border-indigo-800/50 text-indigo-300'}`}>
                                                        {n.masterOnly ? '🔒 Verdade (Master): ' : '📣 Dica/Rumor: '}{n.expertTip}
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-zinc-600 mt-1.5 font-mono">{n.source} · R{n.round} {n.isRumor && '(Rumor)'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
