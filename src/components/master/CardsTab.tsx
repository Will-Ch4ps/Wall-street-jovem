'use client'

import { useState, useMemo } from 'react'
import type { GameState, Card } from '@/types'

interface CardsTabProps {
  state: GameState
  onCardPlayed?: () => void
}

export function CardsTab({ state, onCardPlayed }: CardsTabProps) {
  const [loading, setLoading] = useState(false)
  const [deckType, setDeckType] = useState<'global' | 'company' | 'fii'>('global')
  const [errorMsg, setErrorMsg] = useState('')

  const currentRound = state.game.currentRound
  const maxCardsPerRound = state.game.config.maxCardsPerRound ?? 3
  const cardsPlayedThisRound = state.activeCardEffects.filter(
    (e) => e.round === currentRound
  ).length
  const limitReached = cardsPlayedThisRound >= maxCardsPerRound

  const groupedCards = useMemo(() => {
    const groups: Record<string, { label: string; color: string; cards: Card[] }> = {
      global: {
        label: '🌍 Global / Macro',
        color: 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200',
        cards: state.cards.globalDeck,
      },
      fii: {
        label: '🏢 FIIs',
        color: 'bg-amber-950/40 border-amber-800/50 text-amber-200',
        cards: [],
      },
      master: {
        label: '⚡ Cartas do Master',
        color: 'bg-purple-950/40 border-purple-800/50 text-purple-200',
        cards: state.cards.masterDeck,
      },
    }

    Object.entries(state.cards.sectorDecks).forEach(([sector, cards]) => {
      groups[`sector_${sector}`] = {
        label: `🏭 Setor: ${sector}`,
        color: 'bg-blue-950/40 border-blue-800/50 text-blue-200',
        cards,
      }
    })

    Object.entries(state.cards.companyDecks).forEach(([ticker, cards]) => {
      groups[`company_${ticker}`] = {
        label: `📦 Empresa: ${ticker}`,
        color: 'bg-indigo-950/40 border-indigo-800/50 text-indigo-200',
        cards,
      }
    })

    Object.entries(state.cards.fiiDecks).forEach(([, cards]) => {
      groups.fii.cards.push(...cards)
    })

    return groups
  }, [state.cards])

  const handleDraw = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draw', cardType: deckType, ignoreLimit: true }), // <-- Mestre ignora limite
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Erro ao sortear carta')
      }
      onCardPlayed?.()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handlePlaySpecific = async (cardId: string) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'playSpecific', cardId, ignoreLimit: true }), // <-- Mestre ignora limite
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Erro ao jogar carta')
      }
      onCardPlayed?.()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">🃏 Gerenciamento de Cartas (Legado)</h2>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-950/40 border border-red-800 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {limitReached && (
        <div className="bg-amber-950/30 border border-amber-700/50 text-amber-300 p-4 rounded-xl text-sm flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold">Limite de cartas atingido, mas você pode forçar.</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
        <h3 className="mb-4 text-sm font-bold text-zinc-300 uppercase tracking-widest">
          🎲 Sorteio Aleatório
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <select value={deckType} onChange={(e) => setDeckType(e.target.value as typeof deckType)} disabled={loading} className="rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="global">🌍 Deck Global</option>
            <option value="company">📦 Deck de Empresas</option>
            <option value="fii">🏢 Deck de FIIs</option>
          </select>
          <button onClick={handleDraw} disabled={loading} className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold shadow-lg hover:bg-indigo-500 disabled:opacity-40 transition">
            {loading ? 'Sorteando...' : limitReached ? '⚠️ Forçar Sorteio' : 'Sortear e Aplicar'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {Object.entries(groupedCards).map(([key, group]) => {
            if (group.cards.length === 0) return null
            return (
              <div key={key} className={`rounded-xl border p-4 ${group.color}`}>
                <h4 className="font-bold text-sm mb-3 border-b border-current/20 pb-2">{group.label}</h4>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {group.cards.map((c) => (
                    <div key={c.id} className="bg-black/20 rounded-lg p-2.5 hover:bg-black/30 transition group">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-xs leading-tight">{c.name}</span>
                        <button onClick={() => handlePlaySpecific(c.id)} disabled={loading}
                          className="text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition disabled:opacity-30">
                          {limitReached ? '⚠️ Forçar' : 'Jogar'}
                        </button>
                      </div>
                      <p className="text-[10px] opacity-80 leading-relaxed line-clamp-2">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}