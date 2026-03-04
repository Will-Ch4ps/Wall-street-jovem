'use client'

import { useState, useEffect } from 'react'
import { MarketTab } from './MarketTab'
import { TransactionPanel } from './TransactionPanel'
import { EventsTab } from './EventsTab'
import { FinanceTab } from './FinanceTab'
import { TransitionPanel } from './TransitionPanel'
import { OffersTab } from './OffersTab'
import { HoldingsPanel } from './HoldingsPanel'
import { AnalysisTab } from './AnalysisTab'
import { RulesTab } from './RulesTab'
import type { GameState } from '@/types'

type Tab = 'mercado' | 'transacoes' | 'analise' | 'eventos' | 'financeiro' | 'transicao' | 'ofertas' | 'holdings' | 'regras'

export function MasterLayout() {
  const [tab, setTab] = useState<Tab>('mercado')
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitionLoading, setTransitionLoading] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  // Live clock for countdown timer — updates every second without navigation
  const [now, setNow] = useState(Date.now())

  const fetchState = async () => {
    try {
      const res = await fetch('/api/game')
      if (res.ok) {
        const data = await res.json()
        setState(data)
      } else {
        setState(null)
      }
    } catch {
      setState(null)
    } finally {
      setLoading(false)
    }
  }

  // Initial load + URL tab
  useEffect(() => {
    fetchState()
    const query = new URLSearchParams(window.location.search)
    const t = query.get('tab') as Tab
    if (t) setTab(t)
  }, [])

  // 1-second ticker — drives the countdown without needing to navigate
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Background state polling every 8s — keeps prices, news, cards in sync
  useEffect(() => {
    const id = setInterval(() => {
      fetch('/api/game')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setState(data) })
        .catch(() => { })
    }, 8000)
    return () => clearInterval(id)
  }, [])

  // Auto card draw loop — fires cardDrawIntervalMs when game is running
  useEffect(() => {
    if (state?.game?.status !== 'running') return
    const currentRoundObj = state.rounds.find((r) => r.number === state.game.currentRound)
    if (currentRoundObj?.roundEndsAt && new Date() > new Date(currentRoundObj.roundEndsAt)) return

    const intervalMs = state.game.config.cardDrawIntervalMs
    if (!intervalMs || intervalMs <= 0) return

    const id = setInterval(async () => {
      // Re-verify inside the loop just in case it expired while looping
      if (currentRoundObj?.roundEndsAt && new Date() > new Date(currentRoundObj.roundEndsAt)) {
        clearInterval(id)
        return
      }

      // Count cards drawn in the current round
      const cardsThisRound = state.events.filter(
        (e) => e.round === state.game.currentRound && e.isActive && e.isRevealed
      ).length
      const maxCards = state.game.config.maxCardsPerRound ?? 3
      if (cardsThisRound >= maxCards) return // limit reached, skip

      try {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'draw' }),
        })
        if (res.ok) fetchState()
      } catch {
        // silent — don't interrupt the master UI
      }
    }, intervalMs)

    return () => clearInterval(id)
  }, [state?.game?.status, state?.game?.config?.cardDrawIntervalMs, state?.game?.currentRound])

  const startGame = async () => {
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      })
      if (res.ok) {
        const data = await res.json()
        setState(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const startRound = async () => {
    if (!state) return
    try {
      const rounds = [...state.rounds]
      const newRoundNum = state.game.currentRound + 1
      const now = new Date()
      rounds.push({
        number: newRoundNum,
        status: 'active',
        theme: `Rodada ${newRoundNum}`,
        startedAt: now.toISOString(),
        roundEndsAt: new Date(now.getTime() + 10 * 60000).toISOString(),
        lastUpdateAt: now.toISOString(),
        totalPausedMs: 0,
        config: {
          description: '',
          allowLoans: state.game.config.allowLoans,
          allowShort: state.game.config.allowShort,
          allowDayTrade: state.game.config.allowDayTrade,
          tickIntervalMs: state.game.config.tickIntervalMs,
          candleIntervalMs: state.game.config.candleIntervalMs,
          cardDrawIntervalMs: state.game.config.cardDrawIntervalMs,
          maxCardsPerRound: state.game.config.maxCardsPerRound,
          assets: state.assets.map((a) => ({
            ticker: a.ticker,
            targetClose: a.targetClose,
            trend: a.trend,
            volatility: a.volatility,
            momentum: a.momentum,
            status: a.status,
          })),
          scheduledEvents: [],
          fixedIncomeRates: [],
        },
      })
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          state: {
            game: { ...state.game, status: 'running', currentRound: newRoundNum },
            rounds,
          },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setState(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const pauseGame = async () => {
    if (!state) return
    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        state: { game: { ...state.game, status: 'paused' } },
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setState(data)
    }
  }

  const endGame = async () => {
    if (!state) return
    const confirmEnd = window.confirm("Tem certeza que deseja encerrar o jogo atual?")
    if (!confirmEnd) return

    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        state: { game: { ...state.game, status: 'finished' } },
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setState(data)
    }
  }

  const resetGame = async () => {
    const confirmReset = window.confirm("CUIDADO: Isso apagará completamente o jogo atual, incluindo todos os saldos e histórico! Deseja continuar e preparar para novos alunos?")
    if (!confirmReset) return
    const res = await fetch('/api/game', { method: 'DELETE' })
    if (res.ok) {
      window.location.reload()
    }
  }

  const addPlayer = async () => {
    if (!newPlayerName.trim()) return
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addPlayer', name: newPlayerName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setState(data)
        setNewPlayerName('')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const advanceRound = async () => {
    setTransitionLoading(true)
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transition' }),
      })
      if (res.ok) {
        const data = await res.json()
        setState(data.state)
      }
    } finally {
      setTransitionLoading(false)
    }
  }

  const resumeGame = async () => {
    if (!state) return
    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        state: { game: { ...state.game, status: 'running' } },
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setState(data)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-zinc-400">Carregando...</p>
        </div>
      </main>
    )
  }

  if (!state) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-900 text-white">
        <p className="text-zinc-400">Nenhum jogo. Crie um jogo para começar.</p>
        <button
          onClick={startGame}
          className="rounded bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-700"
        >
          Criar Jogo
        </button>
      </main>
    )
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="p-6">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">InvestQuest</h1>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-semibold">Master Panel</p>
          </div>

          <nav className="flex flex-col gap-1 px-4 mt-4">
            {[
              { id: 'mercado', label: 'Mercado e Ativos', icon: '📈' },
              { id: 'transacoes', label: 'Transações', icon: '💰' },
              { id: 'analise', label: 'Análise de Mercado', icon: '🔭' },
              { id: 'eventos', label: 'Eventos (Notícias e Cards)', icon: '🎭' },
              { id: 'financeiro', label: 'Empr. e Renda Fixa', icon: '🏦' },
              { id: 'transicao', label: 'Gestão de Rodada', icon: '⏳' },
              { id: 'ofertas', label: 'Ofertas Públicas', icon: '⚖️' },
              { id: 'holdings', label: 'Holdings', icon: '🏢' },
              { id: 'regras', label: 'Regras Globais', icon: '⚙️' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as Tab)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${tab === t.id
                  ? 'bg-indigo-600 shadow-md shadow-indigo-900/50 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/80 mt-auto">
            <div className="text-xs text-zinc-400 mb-2">Game Status: <span className="font-bold text-white capitalize">{state.game.status}</span></div>
            <div className="text-xs text-zinc-400 mb-4">Rodada: <span className="font-bold text-indigo-400">{state.game.currentRound}</span></div>

            {state.game.status === 'setup' && (
              <button onClick={startRound} className="w-full rounded bg-emerald-600 py-2 text-sm font-semibold hover:bg-emerald-700 transition">Iniciar Rodada 1</button>
            )}
            {state.game.status === 'running' && (
              <button onClick={pauseGame} className="w-full rounded bg-amber-600 py-2 text-sm font-semibold hover:bg-amber-700 transition mb-2">Pausar</button>
            )}
            {state.game.status === 'paused' && (
              <button onClick={resumeGame} className="w-full rounded bg-emerald-600 py-2 text-sm font-semibold hover:bg-emerald-700 transition mb-2">Retomar</button>
            )}
            {(state.game.status === 'running' || state.game.status === 'paused') && (
              <button onClick={advanceRound} disabled={transitionLoading} className="w-full rounded bg-violet-600 py-2 text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50">
                {transitionLoading ? 'Avançando...' : 'Avançar Rodada'}
              </button>
            )}
            {(state.game.status === 'running' || state.game.status === 'paused') && (
              <button onClick={endGame} className="w-full mt-4 rounded border border-red-500/30 text-red-500 py-2 text-sm font-semibold hover:bg-red-500 hover:text-white transition">
                Encerrar Jogo
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full bg-zinc-950/80">
        {/* Top Header Controls (Timer, Users) */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            {state.game.status === 'setup' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nome do jogador"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 transition"
                />
                <button onClick={addPlayer} disabled={!newPlayerName.trim()} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                  Adicionar
                </button>
              </div>
            )}
            <span className="text-sm font-semibold text-zinc-300 bg-zinc-800 px-3 py-1 rounded-full">{state.players.length} Jogadores</span>
          </div>

          {(state.game.status === 'running' || state.game.status === 'paused') && (
            <div className="flex items-center gap-3">
              <span className="text-zinc-400 text-sm font-medium">Tempo Restante:</span>
              <span className={`text-2xl font-mono font-bold bg-zinc-900 px-3 py-1 rounded-lg border shadow-inner ${(() => {
                const rd = state.rounds.find(r => r.number === state.game.currentRound)
                if (!rd?.roundEndsAt) return 'text-white border-zinc-700'
                const ms = new Date(rd.roundEndsAt).getTime() - now
                return ms < 120000 ? 'text-red-400 border-red-800/50' : 'text-white border-zinc-700'
              })()
                }`}>
                {(() => {
                  const currentRoundData = state.rounds.find(r => r.number === state.game.currentRound);
                  if (!currentRoundData?.roundEndsAt) return '--:--';
                  const remainingMs = new Date(currentRoundData.roundEndsAt).getTime() - now;
                  if (remainingMs <= 0) return '⏰ 00:00';
                  const m = Math.floor(remainingMs / 60000);
                  const s = Math.floor((remainingMs % 60000) / 1000);
                  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                })()}
              </span>
              <button
                onClick={async () => {
                  await fetch('/api/finance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'time_add', amountMs: 3 * 60000 })
                  });
                  fetchState();
                }}
                className="rounded-lg bg-zinc-800 border border-zinc-700 font-medium px-3 py-1.5 text-sm hover:bg-zinc-700 hover:text-white transition flex items-center gap-1"
              >
                +3<span className="text-zinc-500 font-normal">min</span>
              </button>
              <button
                onClick={async () => {
                  await fetch('/api/finance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'time_add', amountMs: 5 * 60000 })
                  });
                  fetchState();
                }}
                className="rounded-lg bg-zinc-800 border border-zinc-700 font-medium px-3 py-1.5 text-sm hover:bg-zinc-700 hover:text-white transition flex items-center gap-1"
              >
                +5<span className="text-zinc-500 font-normal">min</span>
              </button>
            </div>
          )}
        </header>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          <div className="max-w-6xl mx-auto min-h-[500px]">
            {tab === 'mercado' && <MarketTab assets={state.assets} />}
            {tab === 'transacoes' && (
              <div className="grid gap-6 lg:grid-cols-2">
                <TransactionPanel state={state} onSuccess={fetchState} />
              </div>
            )}
            {tab === 'analise' && <AnalysisTab state={state} onUpdate={fetchState} />}
            {tab === 'eventos' && <EventsTab state={state} onEventPlayed={fetchState} />}
            {tab === 'financeiro' && <FinanceTab state={state} onUpdate={fetchState} />}
            {tab === 'transicao' && <TransitionPanel state={state} onAdvance={advanceRound} loading={transitionLoading} />}
            {tab === 'ofertas' && <OffersTab state={state} onUpdate={fetchState} />}
            {tab === 'holdings' && <HoldingsPanel state={state} onUpdate={fetchState} />}
            {tab === 'regras' && <RulesTab state={state} onUpdate={fetchState} />}
          </div>
        </div>
      </div>
    </div>
  )
}
