'use client'

import { useEffect, useState } from 'react'
import type { GameEvent } from '@/types'

interface EventRevealModalProps {
    events: GameEvent[]
    onClose: () => void
}

export function EventRevealModal({ events, onClose }: EventRevealModalProps) {
    // Auto fechar após 15 segundos
    useEffect(() => {
        const t2 = setTimeout(onClose, 15000)
        return () => clearTimeout(t2)
    }, [onClose])

    const firstEvent = events[0]
    const wrapperBorder = firstEvent
        ? firstEvent.isPositive
            ? 'border-emerald-500/50 shadow-emerald-500/20'
            : 'border-red-500/50 shadow-red-500/20'
        : 'border-zinc-700'
    const wrapperGradient = firstEvent
        ? firstEvent.isPositive
            ? 'from-emerald-950/40'
            : 'from-red-950/40'
        : ''


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            {/* 
        Container animado 
        - Começa pequeno (scale-95, opacity-0)
        - Cresce dramáticamente (animate-in)
      */}
            <div
                className={`relative w-full max-w-4xl rounded-3xl border-2 ${wrapperBorder} bg-zinc-950 bg-gradient-to-br ${wrapperGradient} p-1 max-h-[90vh] flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-700 ease-out`}
                onClick={onClose} // Clicar em qualquer lugar fecha
            >
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                <div className="relative z-10 w-full p-8 md:p-14 flex flex-col items-center gap-6">

                    {events.map((event, idx) => {
                        const bgBorder = event.isPositive ? 'border-emerald-500/50 shadow-emerald-500/20' : 'border-red-500/50 shadow-red-500/20'
                        const textHighlight = event.isPositive ? 'text-emerald-400' : 'text-red-400'
                        const gradient = event.isPositive ? 'from-emerald-950/40' : 'from-red-950/40'

                        const getTargetLabel = () => {
                            if (event.targets.includes('Todos')) return 'Mercado Geral'
                            return event.targets.join(', ')
                        }

                        return (
                            <div key={event.id} className="space-y-8">
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

                                <hr className="border-t border-white/20 my-6" />
                            </div>
                        )
                    })}

                        <p className="text-xs text-white/30 uppercase tracking-widest mt-4 font-semibold animate-pulse">
                            Clique para fechar
                        </p>
                </div>
            </div>
        </div>
    )
}
