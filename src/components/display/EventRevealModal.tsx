'use client'

import { useEffect, useState, useCallback } from 'react'
import type { GameEvent } from '@/types'

interface EventRevealModalProps {
    events: GameEvent[]
    onClose: () => void
}

export function EventRevealModal({ events, onClose }: EventRevealModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const total = events.length
    const event = events[currentIndex]

    const handleNext = useCallback(() => {
        if (currentIndex < total - 1) {
            setCurrentIndex((i) => i + 1)
        } else {
            onClose()
        }
    }, [currentIndex, total, onClose])

    // Auto avança para o próximo evento a cada 15 segundos
    useEffect(() => {
        const timer = setTimeout(handleNext, 15000)
        return () => clearTimeout(timer)
    }, [currentIndex, handleNext])

    if (!event) return null

    const wrapperBorder = event.isPositive
        ? 'border-emerald-500/50 shadow-emerald-500/20'
        : 'border-red-500/50 shadow-red-500/20'
    const wrapperGradient = event.isPositive
        ? 'from-emerald-950/40'
        : 'from-red-950/40'
    const textHighlight = event.isPositive ? 'text-emerald-400' : 'text-red-400'

    const getTargetLabel = () => {
        if (event.targets.includes('Todos')) return 'Mercado Geral'
        return event.targets.join(', ')
    }

    const isLast = currentIndex >= total - 1

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div
                className={`relative w-full max-w-4xl rounded-3xl border-2 ${wrapperBorder} bg-zinc-950 bg-gradient-to-br ${wrapperGradient} p-1 max-h-[90vh] flex flex-col items-center justify-center text-center shadow-2xl overflow-y-auto animate-in fade-in zoom-in-95 duration-700 ease-out`}
            >
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                {/* Indicador de página (ex: 1/3) */}
                {total > 1 && (
                    <div className="absolute top-4 right-6 z-20 bg-black/60 px-3 py-1 rounded-full border border-white/10">
                        <span className="text-xs font-mono font-bold text-white/60">
                            {currentIndex + 1} / {total}
                        </span>
                    </div>
                )}

                <div className="relative z-10 w-full p-8 md:p-14 flex flex-col items-center gap-6">
                    <div className="space-y-8">
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-[80px] leading-none drop-shadow-2xl">
                                {event.icon}
                            </div>

                            <div className="bg-black/60 px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-3">
                                <span className="text-sm font-bold tracking-widest uppercase text-white/50">URGENTE</span>
                                <span className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                                <span className="text-sm font-mono text-white/50">Rodada {event.round}</span>
                            </div>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black text-white leading-tight filter drop-shadow-lg text-balance">
                            {event.name}
                        </h1>

                        <h2 className={`text-2xl md:text-3xl font-bold ${textHighlight} filter drop-shadow-md text-balance`}>
                            {event.headline}
                        </h2>

                        <div className="max-w-2xl mx-auto mt-4 bg-black/40 border border-white/10 rounded-2xl p-6 shadow-inner text-left">
                            <p className="text-lg md:text-xl text-zinc-300 leading-relaxed font-medium text-center text-balance">
                                {event.body}
                            </p>
                        </div>

                        {event.expertTip && (
                            <div className="mt-4 p-4 bg-blue-900/20 border-l-4 border-blue-500 rounded-r-xl text-left">
                                <strong className="text-xs uppercase text-blue-400">💡 Dica:</strong> {event.expertTip}
                            </div>
                        )}

                        {event.expertAnalysis && (
                            <div className="mt-2 p-4 bg-purple-900/10 border border-purple-800/30 rounded-xl text-left">
                                <strong className="text-xs uppercase text-purple-400">📣 Análise (Guia):</strong> {event.expertAnalysis}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
                            <div className="bg-zinc-900 border border-zinc-700 px-6 py-3 rounded-xl flex flex-col items-center min-w-[140px]">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Duração</span>
                                <span className="text-lg font-mono font-bold text-white">{event.duration > 1 ? `${event.duration} Rodadas` : 'Imediato'}</span>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-700 px-6 py-3 rounded-xl flex flex-col items-center min-w-[140px]">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Alvos</span>
                                <span className="text-lg font-mono font-bold text-white">{getTargetLabel()}</span>
                            </div>
                        </div>

                        {/* Per-company impact breakdown */}
                        {event.impactMap && Object.keys(event.impactMap).length > 0 && (
                            <div className="w-full max-w-lg mx-auto mt-4 bg-black/40 border border-white/10 rounded-2xl p-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 text-center">
                                    📊 Impacto por Empresa
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {Object.entries(event.impactMap)
                                        .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                                        .map(([ticker, impact]) => {
                                            const pct = (impact * 100).toFixed(1)
                                            const isPos = impact >= 0
                                            return (
                                                <div
                                                    key={ticker}
                                                    className={`flex items-center justify-between px-3 py-2 rounded-lg border ${isPos
                                                        ? 'bg-emerald-950/30 border-emerald-800/40'
                                                        : 'bg-red-950/30 border-red-800/40'
                                                        }`}
                                                >
                                                    <span className="font-mono text-xs font-bold text-zinc-200">{ticker}</span>
                                                    <span className={`font-mono text-sm font-black ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {isPos ? '+' : ''}{pct}%
                                                    </span>
                                                </div>
                                            )
                                        })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botão de ação: Próximo ou Fechar */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleNext() }}
                        className={`mt-6 px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg ${isLast
                            ? 'bg-zinc-100 text-zinc-900 hover:bg-white'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-400/30'
                            }`}
                    >
                        {isLast ? 'Fechar' : `Próximo (${currentIndex + 1}/${total})`}
                    </button>

                    <p className="text-xs text-white/30 uppercase tracking-widest mt-2 font-semibold animate-pulse">
                        Avança automaticamente em 15s
                    </p>
                </div>
            </div>
        </div>
    )
}
