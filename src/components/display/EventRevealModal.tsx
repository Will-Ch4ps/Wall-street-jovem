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
        ? 'border-emerald-500/80 shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)] dark:border-emerald-500/50 dark:shadow-emerald-500/20'
        : 'border-red-500/80 shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)] dark:border-red-500/50 dark:shadow-red-500/20'
    const wrapperGradient = event.isPositive
        ? 'from-emerald-50 to-white dark:from-emerald-950/40 dark:to-zinc-950'
        : 'from-red-50 to-white dark:from-red-950/40 dark:to-zinc-950'
    const textHighlight = event.isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'

    const getTargetLabel = () => {
        if (event.targets.includes('Todos')) return 'Mercado Geral'
        return event.targets.join(', ')
    }

    const isLast = currentIndex >= total - 1

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
            <div
                className={`relative w-full max-w-4xl rounded-2xl border-2 ${wrapperBorder} bg-white dark:bg-zinc-950 bg-gradient-to-br ${wrapperGradient} p-1 max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-xl animate-in fade-in zoom-in-95 duration-500 ease-out overflow-hidden`}
            >
                {/* Indicador de página (ex: 1/3) */}
                {total > 1 && (
                    <div className="absolute top-4 right-6 z-20 bg-slate-100 dark:bg-black/60 px-3 py-1 rounded-full border border-slate-300 dark:border-zinc-700">
                        <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400">
                            {currentIndex + 1} / {total}
                        </span>
                    </div>
                )}

                <div className="relative z-10 w-full p-4 sm:p-6 md:p-8 flex flex-col items-center gap-4 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4 w-full text-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="text-6xl leading-none drop-shadow-md">
                                {event.icon}
                            </div>

                            <div className="bg-slate-800 dark:bg-black/60 px-4 py-1.5 rounded-full flex items-center gap-3 shadow-sm border border-slate-700 dark:border-zinc-800">
                                <span className="text-xs font-bold tracking-widest uppercase text-white dark:text-zinc-400">URGENTE</span>
                                <span className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                                <span className="text-xs font-mono text-white/90 dark:text-zinc-400 font-medium">Rodada {event.round}</span>
                            </div>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight text-balance">
                            {event.name}
                        </h1>

                        <h2 className={`text-xl md:text-2xl font-bold ${textHighlight} text-balance`}>
                            {event.headline}
                        </h2>

                        <div className="max-w-2xl mx-auto mt-2 bg-slate-100/80 dark:bg-black/40 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm text-center">
                            <p className="text-base md:text-lg text-slate-700 dark:text-zinc-300 leading-relaxed font-medium text-balance">
                                {event.body}
                            </p>
                        </div>

                        {event.expertTip && (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-xl text-left border border-blue-100 dark:border-transparent shadow-sm">
                                <strong className="text-xs uppercase text-blue-700 dark:text-blue-400">💡 Dica:</strong> <span className="text-slate-700 dark:text-zinc-300 text-sm">{event.expertTip}</span>
                            </div>
                        )}

                        {event.expertAnalysis && (
                            <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-xl text-left shadow-sm">
                                <strong className="text-xs uppercase text-purple-700 dark:text-purple-400">📣 Análise (Guia):</strong> <span className="text-slate-700 dark:text-zinc-300 text-sm">{event.expertAnalysis}</span>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                            <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-5 py-2 rounded-xl flex flex-col items-center min-w-[120px] shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Duração</span>
                                <span className="text-base font-mono font-bold text-slate-800 dark:text-white">{event.duration > 1 ? `${event.duration} Rodadas` : 'Imediato'}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-5 py-2 rounded-xl flex flex-col items-center min-w-[120px] shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Alvos</span>
                                <span className="text-base font-mono font-bold text-slate-800 dark:text-white">{getTargetLabel()}</span>
                            </div>
                        </div>

                        {/* Per-company impact breakdown */}
                        {event.impactMap && Object.keys(event.impactMap).length > 0 && (
                            <div className="w-full max-w-lg mx-auto mt-3 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500 mb-2 text-center">
                                    📊 Impacto por Empresa
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {Object.entries(event.impactMap)
                                        .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                                        .map(([ticker, impact]) => {
                                            const pct = (impact * 100).toFixed(1)
                                            const isPos = impact >= 0
                                            return (
                                                <div
                                                    key={ticker}
                                                    className={`flex items-center justify-between px-2 py-1.5 rounded border ${isPos
                                                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40'
                                                        : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/40'
                                                        }`}
                                                >
                                                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-zinc-200">{ticker}</span>
                                                    <span className={`font-mono text-xs font-black ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
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
                        className={`mt-4 px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all shadow-sm ${isLast
                            ? 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:hover:bg-indigo-500'
                            }`}
                    >
                        {isLast ? 'Fechar' : `Próximo (${currentIndex + 1}/${total})`}
                    </button>

                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1 font-semibold animate-pulse text-center">
                        Avança automaticamente em 15s
                    </p>
                </div>
            </div>
        </div>
    )
}
