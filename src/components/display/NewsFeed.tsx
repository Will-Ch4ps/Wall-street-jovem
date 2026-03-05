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
      <div className={`rounded-xl border border-zinc-700 bg-zinc-900/80 p-5 shadow-inner ${className}`}>
        <h2 className="mb-4 text-xl font-bold bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent flex items-center gap-2">
          <span>📰</span> Últimos Eventos
        </h2>

        <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-2 custom-scrollbar overflow-x-hidden">
          {combinedItems.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">Nenhum evento registrado ainda.</p>
          ) : (
            combinedItems.map((e) => {
              const borderLeft = e.isPositive ? 'border-l-emerald-500' : 'border-l-red-500'
              const bgGradient = e.isPositive
                ? 'bg-gradient-to-r from-emerald-950/40 to-zinc-900/50'
                : 'bg-gradient-to-r from-red-950/40 to-zinc-900/50'
              const iconColor = e.isPositive ? 'text-emerald-400' : 'text-red-400'

              return (
                <div
                  key={e.id}
                  onClick={() => allowDetails && setSelectedEvent(e.rawEvent)}
                  className={`relative overflow-hidden rounded-lg border border-zinc-700/50 ${bgGradient} p-3 transition-transform ${borderLeft} border-l-4 ${allowDetails ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg' : ''} break-words`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xl flex-shrink-0">{e.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-black/40 px-2 py-0.5 rounded break-words">Round {e.round} • {formatShortTime(e.timestamp)}</span>
                    </div>
                    {e.duration > 1 ? (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 whitespace-nowrap mt-1 sm:mt-0">
                        ⏳ {e.duration} Rodadas
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded whitespace-nowrap mt-1 sm:mt-0">
                        ⚡ Imediato
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-zinc-100 text-sm leading-tight mb-1">{e.name}</h3>
                  <p className={`font-semibold text-xs mb-1 ${iconColor}`}>{e.headline}</p>
                  {/* TEXTO DA NOTÍCIA AGORA APARECE NO CARD */}
                  {e.body && <p className="text-zinc-400 text-xs leading-relaxed mb-2 break-words">{e.body}</p>}

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 flex-wrap">
                    <span className="text-[10px] text-zinc-500 font-medium whitespace-nowrap">Alvos afetados:</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold tracking-wider break-words flex-1 min-w-0">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className={`max-w-2xl w-full rounded-2xl border ${selectedEvent.isPositive ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-red-500/50 bg-red-950/20'} bg-zinc-950 p-6 shadow-2xl shadow-black overflow-y-auto max-h-[90vh]`}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 text-xs font-mono font-bold text-zinc-400">
                  <span className="bg-zinc-800 border border-zinc-700 px-2 py-1 rounded">Round {selectedEvent.round}</span>
                  <span className="bg-zinc-800 border border-zinc-700 px-2 py-1 rounded">{formatShortTime(selectedEvent.timestamp)}</span>
                  <span className="bg-zinc-800 border border-zinc-700 px-2 py-1 rounded capitalize">Scope: {selectedEvent.scope}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-zinc-500 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                title="Fechar"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="text-5xl rounded-2xl bg-zinc-900 border border-zinc-800 p-4 shadow-inner flex items-center justify-center">
                {selectedEvent.icon}
              </div>
              <div>
                <h2 className="text-3xl font-black text-white leading-tight mb-2">
                  {selectedEvent.title}
                </h2>
                <div className={`text-lg font-bold ${selectedEvent.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {selectedEvent.headline}
                </div>
              </div>
            </div>

            <div className="space-y-6 text-zinc-300">
              <section className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800">
                <p className="text-lg leading-relaxed text-zinc-300">{selectedEvent.body}</p>
              </section>

              {selectedEvent.expertTip && (
                <section className="bg-blue-900/20 border-l-4 border-l-blue-500 p-5 rounded-r-xl">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-2">
                    💡 Dica de Analistas
                  </h3>
                  <p className="italic text-zinc-200">{selectedEvent.expertTip}</p>
                </section>
              )}

              {selectedEvent.expertAnalysis && (
                <section className="bg-purple-900/10 border border-purple-800/30 p-5 rounded-xl">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-2">
                    🎓 Análise do Professor (Guia)
                  </h3>
                  <p className="text-purple-200/90 leading-relaxed text-sm">
                    {selectedEvent.expertAnalysis}
                  </p>
                </section>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-between items-center">
              <div className="text-xs text-zinc-500 font-mono">
                Alvos: <span className="text-zinc-300">{getTargetLabel(selectedEvent.targets)}</span> |
                Duração: <span className="text-zinc-300">{selectedEvent.duration} {selectedEvent.duration > 1 ? 'Rodadas' : 'Rodada'}</span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg bg-zinc-100 text-zinc-900 px-6 py-2.5 font-bold hover:bg-white transition-colors shadow-lg"
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
