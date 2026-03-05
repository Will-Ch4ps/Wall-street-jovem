'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/formatters'
import type { GameState } from '@/types'

export default function HomePage() {
  const [state, setState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    fetchState()
  }, [])

  const startGame = async () => {
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      })
      if (res.ok) window.location.href = '/master'
    } catch (err) {
      console.error(err)
    }
  }

  const resetGame = async () => {
    const confirmReset = window.confirm("CUIDADO: Isso apagará completamente o jogo atual! Deseja continuar?")
    if (!confirmReset) return
    const res = await fetch('/api/game', { method: 'DELETE' })
    if (res.ok) window.location.reload()
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
    if (res.ok) window.location.reload()
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white font-sans p-6 md:p-12 selection:bg-indigo-500/30">

      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-zinc-800 pb-8">
          <div>
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-2">InvestQuest</h1>
            <p className="text-zinc-400 text-lg">Simulação Avançada do Mercado Financeiro</p>
          </div>

          <div className="flex bg-zinc-900/80 border border-zinc-800 p-2 rounded-2xl shadow-xl">
            <Link href="/display" className="px-6 py-3 hover:bg-zinc-800 rounded-xl transition font-semibold flex items-center gap-2">
              🖥️ Telão Projetor
            </Link>
            <Link href="/master" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-lg shadow-indigo-500/20 font-bold flex items-center gap-2">
              👑 Dashboard Mestre
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Esquerda: Status da Simulação */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="bg-indigo-600 p-2 rounded-lg text-sm">🎮</span> Status da Simulação
            </h2>

            <div className="border border-zinc-800 bg-zinc-900/50 rounded-3xl p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

              {loading ? (
                <p className="text-zinc-500 animate-pulse">Consultando servidor...</p>
              ) : !state || !state.assets || state.assets.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-5xl mb-4">🏦</p>
                  <p className="text-zinc-300 text-xl font-bold mb-2">Pronto para começar!</p>
                  <p className="text-zinc-500 mb-8">Clique abaixo para carregar as empresas do banco e iniciar uma nova simulação.</p>
                  <button onClick={startGame} className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95">
                    🚀 Criar Nova Simulação
                  </button>
                </div>
              ) : (
                <div className="space-y-8 relative z-10">
                  <div className="flex flex-wrap gap-8 items-end">
                    <div>
                      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-1">Status</p>
                      <p className={`text-2xl font-black ${state.game.status === 'running' ? 'text-emerald-400' : state.game.status === 'finished' ? 'text-amber-500' : 'text-blue-400'}`}>
                        {state.game.status.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-1">Rodada Atual</p>
                      <p className="text-3xl font-mono text-white">{state.game.currentRound} <span className="text-xl text-zinc-600">/ {state.game.maxRounds}</span></p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-1">Participantes</p>
                      <p className="text-3xl font-mono text-white flex items-center gap-2">👥 {state.players.length}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-1">Ativos</p>
                      <p className="text-3xl font-mono text-white">📈 {state.assets.length}</p>
                    </div>
                  </div>

                  <div className="h-px bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 w-full"></div>

                  <div className="flex gap-4 flex-wrap">
                    {state.game.status === 'setup' && (
                      <button onClick={startGame} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all hover:scale-105">
                        🚀 Nova Simulação (recarregar do DB)
                      </button>
                    )}
                    <button onClick={resetGame} className="px-5 py-2 hover:bg-orange-900/30 text-orange-400 border border-orange-900/50 rounded-lg text-sm font-semibold transition">
                      Resetar / Nova Turma
                    </button>
                    {state.game.status !== 'finished' && (
                      <button onClick={endGame} className="px-5 py-2 hover:bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg text-sm font-semibold transition">
                        Encerrar Simulação
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Links Mestre */}
            {state && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <Link href="/master?tab=holdings" className="bg-zinc-900/30 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 text-center transition group">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">👥</div>
                  <p className="font-semibold text-sm">Add Jogador</p>
                </Link>
                <Link href="/master?tab=cenarios" className="bg-zinc-900/30 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 text-center transition group">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🏦</div>
                  <p className="font-semibold text-sm">Criar IPO</p>
                </Link>
                <Link href="/master?tab=eventos" className="bg-zinc-900/30 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 text-center transition group">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">⚡</div>
                  <p className="font-semibold text-sm">Disparar Evento</p>
                </Link>
                <Link href="/master?tab=regras" className="bg-zinc-900/30 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 text-center transition group">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">⚙️</div>
                  <p className="font-semibold text-sm">Regras Gerais</p>
                </Link>
                <Link href="/guide" className="bg-indigo-900/20 hover:bg-indigo-900/40 border border-indigo-700/40 rounded-xl p-4 text-center transition group col-span-2 md:col-span-1">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📖</div>
                  <p className="font-semibold text-sm text-indigo-300">Guia do Jogo</p>
                </Link>
              </div>
            )}
          </div>

          {/* Direita: Consultar Jogador */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="bg-zinc-800 p-2 rounded-lg text-sm">🔍</span> Consultar Jogador
            </h2>

            <div className="w-full rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl">
              <p className="text-xs font-medium text-zinc-500 mb-4">
                Clique para abrir o painel completo do investidor com carteira, gráficos e operações.
              </p>

              {state && (state.players.length > 0 || state.holdings.length > 0) ? (
                <div className="space-y-2">
                  {state.players.filter(p => p.isActive).map(p => (
                    <Link
                      key={p.id}
                      href={`/master/player/${encodeURIComponent(p.id)}?type=player`}
                      className="flex items-center gap-3 p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl hover:border-indigo-500/60 hover:bg-zinc-800/50 transition group"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-xs font-black text-white shrink-0">
                        {p.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white truncate">{p.name}</p>
                        <p className="text-xs text-zinc-500">Jogador • {formatCurrency(p.cash)} disponível</p>
                      </div>
                      <span className="text-zinc-600 group-hover:text-indigo-400 transition">→</span>
                    </Link>
                  ))}
                  {state.holdings.filter(h => h.isActive).map(h => (
                    <Link
                      key={h.id}
                      href={`/master/player/${encodeURIComponent(h.id)}?type=holding`}
                      className="flex items-center gap-3 p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl hover:border-violet-500/60 hover:bg-zinc-800/50 transition group"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-xs font-black text-white shrink-0">
                        {h.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white truncate">{h.name}</p>
                        <p className="text-xs text-zinc-500">Holding • {formatCurrency(h.cash)} disponível</p>
                      </div>
                      <span className="text-zinc-600 group-hover:text-violet-400 transition">→</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">👤</p>
                  <p className="text-zinc-500 text-sm">Nenhum jogador cadastrado ainda.</p>
                  {state && (
                    <Link href="/master" className="mt-4 inline-block px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold transition">
                      Ir ao Dashboard
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
