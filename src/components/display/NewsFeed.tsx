'use client'

import { useState, useMemo } from 'react'
import { formatShortTime } from '@/lib/formatters'
import type { GameEvent, News } from '@/types'

interface NewsFeedProps {
  events: GameEvent[]
  news?: News[]
  maxItems?: number
  className?: string
  allowDetails?: boolean
}

export function NewsFeed({ events, news = [], maxItems = 10, className = '', allowDetails = true }: NewsFeedProps) {
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null)

  // Unifica GameEvents e News manuais em uma única lista padronizada
  const combinedItems = useMemo(() => {
    const evts = events.filter((e) => e.isActive && e.isRevealed).map((e) => ({
      id: e.id,
      round: e.round,
      timestamp: e.timestamp,
      icon: e.icon,
      name: e.name,
      headline: e.headline,
      body: e.body,
      isPositive: e.isPositive,
      duration: e.duration,
      targets: e.targets,
      rawEvent: e,
    }))

    const nws = news.filter((n) => n.isActive && n.isPublic).map((n) => ({
      id: n.id,
      round: n.round,
      timestamp: n.timestamp,
      icon: '📰',
      name: n.scope === 'global' ? 'Mercado Geral' : 'Aviso Corporativo',
      headline: n.title,
      body: n.body,
      isPositive: true,
      duration: 1,
      targets: n.targets && n.targets.length > 0 ? n.targets : ['Todos'],
      rawEvent: {
        ...n,
        templateId: n.templateId || 'manual',
        name: n.title,
        headline: n.title,
        icon: '📰',
        isPositive: true,
        effect: { target: 'all' as const },
        duration: 1,
        expiresAtRound: n.round + 1,
        isRevealed: true,
      } as GameEvent,
    }))

    return [...evts, ...nws]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxItems)
  }, [events, news, maxItems])

  const getTargetLabel = (targets: string[]) => {
    if (targets.includes('Todos')) return 'Mercado Geral'
    return targets.join(', ')
  }

  return (
    <>
      <div className={`rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-5 shadow-sm ${className}`}>
        <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <span>📰</span> Últimos Eventos
        </h2>

        <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-2 custom-scrollbar overflow-x-hidden">
          {combinedItems.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-zinc-500 italic font-medium">Nenhum evento registrado ainda.</p>
          ) : (
            combinedItems.map((e) => {
              const borderLeft = e.isPositive ? 'border-l-emerald-500 dark:border-l-emerald-600' : 'border-l-red-500 dark:border-l-red-600'
              const bgGradient = e.isPositive
                ? 'bg-gradient-to-r from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-transparent'
                : 'bg-gradient-to-r from-red-50/50 to-white dark:from-red-950/20 dark:to-transparent'
              const iconColor = e.isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'

              return (
                <div
                  key={e.id}
                  onClick={() => allowDetails && setSelectedEvent(e.rawEvent)}
                  className={`relative overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-800 ${bgGradient} p-3 transition-transform ${borderLeft} border-l-4 ${allowDetails ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md dark:hover:border-zinc-700' : ''} break-words`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xl flex-shrink-0">{e.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700 break-words">Round {e.round} • {formatShortTime(e.timestamp)}</span>
                    </div>
                    {e.duration > 1 ? (
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/50 whitespace-nowrap mt-1 sm:mt-0">
                        ⏳ {e.duration} Rodadas
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700 whitespace-nowrap mt-1 sm:mt-0">
                        ⚡ Imediato
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight mb-1">{e.name}</h3>
                  <p className={`font-semibold text-xs mb-1 ${iconColor}`}>{e.headline}</p>
                  {/* TEXTO DA NOTÍCIA AGORA APARECE NO CARD */}
                  {e.body && <p className="text-slate-600 dark:text-zinc-300 text-xs leading-relaxed mb-2 break-words">{e.body}</p>}

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800 flex-wrap">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold whitespace-nowrap">Alvos afetados:</span>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 px-2 py-0.5 rounded font-mono font-bold tracking-wider break-words flex-1 min-w-0">
                      {getTargetLabel(e.targets)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* MODAL DE NOTÍCIA COMPLETA */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 p-4 backdrop-blur-sm">
          <div className={`max-w-2xl w-full rounded-2xl border ${selectedEvent.isPositive ? 'border-emerald-500/80 dark:border-emerald-500/50' : 'border-red-500/80 dark:border-red-500/50'} bg-white dark:bg-zinc-950 p-6 shadow-xl overflow-y-auto custom-scrollbar max-h-[90vh]`}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 text-xs font-mono font-bold text-slate-600 dark:text-zinc-400">
                  <span className="bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-2 py-1 rounded">Round {selectedEvent.round}</span>
                  <span className="bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-2 py-1 rounded">{formatShortTime(selectedEvent.timestamp)}</span>
                  <span className="bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-2 py-1 rounded capitalize">Scope: {selectedEvent.scope}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                title="Fechar"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="text-5xl rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 shadow-sm flex items-center justify-center">
                {selectedEvent.icon}
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight mb-2">
                  {selectedEvent.title}
                </h2>
                <div className={`text-lg font-bold ${selectedEvent.isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                  {selectedEvent.headline}
                </div>
              </div>
            </div>

            <div className="space-y-4 text-slate-800">
              <section className="bg-slate-50 dark:bg-zinc-900/80 rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-sm">
                <p className="text-base md:text-lg leading-relaxed text-slate-700 dark:text-zinc-300 font-medium">{selectedEvent.body}</p>
              </section>

              {selectedEvent.expertTip && (
                <section className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 border-t border-b border-r border-blue-100 dark:border-transparent shadow-sm p-4 rounded-r-xl">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-1.5 flex items-center gap-2">
                    💡 Dica de Analistas
                  </h3>
                  <p className="italic text-slate-700 dark:text-zinc-300 text-sm">{selectedEvent.expertTip}</p>
                </section>
              )}

              {selectedEvent.expertAnalysis && (
                <section className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 shadow-sm p-4 rounded-xl">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-1.5 flex items-center gap-2">
                    🎓 Análise do Professor (Guia)
                  </h3>
                  <p className="text-slate-700 dark:text-zinc-300 leading-relaxed text-sm">
                    {selectedEvent.expertAnalysis}
                  </p>
                </section>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center gap-4 flex-wrap">
              <div className="text-xs text-slate-500 dark:text-zinc-500 font-mono font-bold">
                Alvos: <span className="text-slate-800 dark:text-zinc-300">{getTargetLabel(selectedEvent.targets)}</span> |
                Duração: <span className="text-slate-800 dark:text-zinc-300">{selectedEvent.duration} {selectedEvent.duration > 1 ? 'Rodadas' : 'Rodada'}</span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-2 font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-sm"
              >
                Voltar ao Jogo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
