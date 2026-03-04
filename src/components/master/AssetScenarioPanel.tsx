'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/formatters'
import { companyStories } from '@/data/defaultCompanies'
import { fiiStories } from '@/data/defaultFIIs'
import type { GameState, BaseAsset } from '@/types'
import { projectEndGame } from '@/lib/analysis'

interface AssetScenarioPanelProps {
    state: GameState
    onUpdate: () => void
}

type TrendType = 'bullish' | 'bearish' | 'volatile' | 'neutral'

const TREND_OPTIONS: { value: TrendType; label: string; icon: string; color: string }[] = [
    { value: 'bullish', label: 'Alta', icon: '📈', color: 'bg-emerald-700 border-emerald-500 text-white' },
    { value: 'bearish', label: 'Baixa', icon: '📉', color: 'bg-red-700 border-red-500 text-white' },
    { value: 'volatile', label: 'Volátil', icon: '⚡', color: 'bg-amber-700 border-amber-500 text-white' },
    { value: 'neutral', label: 'Neutro', icon: '➡️', color: 'bg-zinc-600 border-zinc-500 text-white' },
]

interface AssetEdit {
    trend: TrendType
    targetClose: string
    momentum: string
    volatility: string
}

export function AssetScenarioPanel({ state, onUpdate }: AssetScenarioPanelProps) {
    const [filter, setFilter] = useState<'all' | 'stock' | 'fii'>('all')
    const [selected, setSelected] = useState<string | null>(null)
    const [edits, setEdits] = useState<Record<string, AssetEdit>>({})
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const assets = state.assets
        .filter(a => a.status === 'active' || a.status === 'ipo_open')
        .filter(a => filter === 'all' || a.type === filter)
        .sort((a, b) => a.ticker.localeCompare(b.ticker))

    const getEdit = (a: BaseAsset): AssetEdit => edits[a.ticker] ?? {
        trend: a.trend,
        targetClose: a.targetClose.toString(),
        momentum: (a.momentum ?? 0.08).toFixed(3),
        volatility: (a.volatility ?? 0.06).toFixed(3),
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
        setError(null)
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
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar')
            setSaved(ticker)
            setTimeout(() => setSaved(null), 2000)
            onUpdate()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erro desconhecido')
        } finally {
            setLoading(false)
        }
    }

    const handleSaveAll = async () => {
        for (const ticker of Object.keys(edits)) {
            await handleSave(ticker)
        }
    }

    const selectedAsset = selected ? state.assets.find(a => a.ticker === selected) : null
    const story = selected
        ? (companyStories[selected] ?? fiiStories[selected] ?? null)
        : null

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-lg font-bold">⚙️ Cenário dos Ativos</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Configure tendência, alvo e parâmetros de cada empresa por rodada</p>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="flex bg-zinc-800 rounded-lg p-0.5">
                        {(['all', 'stock', 'fii'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-xs rounded-md font-medium transition ${filter === f ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
                                {f === 'all' ? 'Todos' : f === 'stock' ? '📦 Ações' : '🏢 FIIs'}
                            </button>
                        ))}
                    </div>
                    {Object.keys(edits).length > 0 && (
                        <button onClick={handleSaveAll} disabled={loading}
                            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition disabled:opacity-40">
                            💾 Salvar Todos ({Object.keys(edits).length})
                        </button>
                    )}
                </div>
            </div>

            {error && <div className="text-sm text-red-400 bg-red-950/30 border border-red-800/50 rounded-xl px-4 py-3">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {assets.map(a => {
                    const edit = getEdit(a)
                    const isSelected = selected === a.ticker
                    const isSaved = saved === a.ticker
                    const isDirty = !!edits[a.ticker]
                    const todayPct = ((a.currentPrice - a.openPrice) / a.openPrice) * 100
                    const targetPct = ((parseFloat(edit.targetClose) || a.targetClose) - a.currentPrice) / a.currentPrice * 100
                    const remainingRounds = Math.max(0, state.game.maxRounds - state.game.currentRound)
                    const proj = projectEndGame(a, remainingRounds)
                    const projPct = ((proj.mid - a.initialPrice) / a.initialPrice) * 100

                    return (
                        <div key={a.ticker}
                            className={`rounded-xl border transition cursor-pointer ${isSelected ? 'border-indigo-500 bg-indigo-950/30' : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600'}`}
                            onClick={() => setSelected(isSelected ? null : a.ticker)}>
                            {/* Header row */}
                            <div className="px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white font-mono text-sm">{a.ticker}</span>
                                    {isDirty && <span className="text-xs text-amber-400">●</span>}
                                    {isSaved && <span className="text-xs text-emerald-400">✓ Salvo</span>}
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-mono text-white">{formatCurrency(a.currentPrice)}</p>
                                    <p className={`text-xs font-mono ${todayPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {todayPct >= 0 ? '+' : ''}{todayPct.toFixed(1)}% hoje
                                    </p>
                                    <p className="text-[10px] text-zinc-400 mt-0.5">
                                        Fechamento rod.: {formatCurrency(a.targetClose)}
                                    </p>
                                    <p className="text-[10px] text-zinc-400 mt-0.5">
                                        Est. fim jogo {formatCurrency(proj.mid)} ({projPct >= 0 ? '+' : ''}{projPct.toFixed(1)}%)
                                    </p>
                                </div>
                            </div>

                            {/* Trend quick-select */}
                            <div className="px-4 pb-3 space-y-3" onClick={e => e.stopPropagation()}>
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Tendência</p>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {TREND_OPTIONS.map(t => (
                                            <button key={t.value}
                                                onClick={() => setField(a.ticker, 'trend', t.value)}
                                                className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition ${edit.trend === t.value ? t.color : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                                                    }`}>
                                                {t.icon} {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Target Close */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-xs text-zinc-500 block mb-1">Meta (Alvo)</label>
                                        <input type="number" value={edit.targetClose}
                                            onChange={e => setField(a.ticker, 'targetClose', e.target.value)}
                                            className="w-full text-xs font-mono rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        <p className={`text-xs mt-0.5 font-mono ${targetPct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {targetPct >= 0 ? '+' : ''}{targetPct.toFixed(1)}%
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-500 block mb-1">Momentum</label>
                                        <input type="number" value={edit.momentum} step="0.01" min="0.01" max="0.30"
                                            onChange={e => setField(a.ticker, 'momentum', e.target.value)}
                                            className="w-full text-xs font-mono rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        <p className="text-xs text-zinc-600 mt-0.5">atração ao alvo</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-500 block mb-1">Volatilidade</label>
                                        <input type="number" value={edit.volatility} step="0.005" min="0.01" max="0.30"
                                            onChange={e => setField(a.ticker, 'volatility', e.target.value)}
                                            className="w-full text-xs font-mono rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        <p className="text-xs text-zinc-600 mt-0.5">ruído por tick</p>
                                    </div>
                                </div>

                                {/* Price presets */}
                                <div className="flex gap-1.5 flex-wrap">
                                    {[-0.20, -0.10, +0.10, +0.20, +0.30].map(pct => {
                                        const preset = +(a.currentPrice * (1 + pct)).toFixed(2)
                                        return (
                                            <button key={pct} onClick={() => setField(a.ticker, 'targetClose', preset.toString())}
                                                className={`px-2 py-0.5 text-xs rounded border ${pct >= 0 ? 'border-emerald-800 text-emerald-400 hover:bg-emerald-900/20' : 'border-red-800 text-red-400 hover:bg-red-900/20'} transition`}>
                                                {pct >= 0 ? '+' : ''}{(pct * 100).toFixed(0)}% → {formatCurrency(preset)}
                                            </button>
                                        )
                                    })}
                                </div>

                                <button onClick={() => handleSave(a.ticker)} disabled={loading || !isDirty}
                                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition disabled:opacity-30">
                                    {loading ? 'Salvando...' : isSaved ? '✅ Aplicado!' : '💾 Aplicar Cenário'}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Story / Educational context panel */}
            {selectedAsset && story && (
                <div className="rounded-xl border border-indigo-700/40 bg-indigo-950/20 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="font-bold text-indigo-300">{selectedAsset.ticker}</span>
                        <span className="text-zinc-500 text-sm">— {selectedAsset.name}</span>
                        <span className="text-xs text-zinc-600 ml-auto">{selectedAsset.sector}</span>
                    </div>
                    <div className="flex gap-2 mb-3">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            vol: {(selectedAsset.volatility * 100).toFixed(1)}%
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            mom: {(selectedAsset.momentum ?? 0.08).toFixed(2)}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            alvo: {formatCurrency(selectedAsset.targetClose)}
                        </span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">📚 {story}</p>
                </div>
            )}
        </div>
    )
}
