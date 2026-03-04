'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import { calculateNetWorth } from '@/engine/portfolioCalc'
import type { GameState } from '@/types'

export default function PlayerPage() {
  const params = useParams()
  const id = params?.id as string
  const [state, setState] = useState<GameState | null>(null)

  useEffect(() => {
    if (!id) return
    async function fetchData() {
      try {
        const res = await fetch('/api/game')
        if (res.ok) {
          const data = await res.json()
          setState(data)
        }
      } catch {
        // ignore
      }
    }
    fetchData()
  }, [id])

  useEffect(() => {
    if (!state || state.game.status !== 'running') return
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/prices')
        if (res.ok) {
          const data = await res.json()
          setState((prev) => (prev ? { ...prev, ...data } : null))
        }
      } catch {
        // ignore
      }
    }, 10000) // Changed to 10s
    return () => clearInterval(interval)
  }, [state?.game?.status])

  if (!id || !state) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <p className="text-zinc-400">Carregando...</p>
      </main>
    )
  }

  const player = state.players.find((p) => p.id === id)
  const portfolio =
    state.portfolios.find((p) => p.ownerId === id && p.ownerType === 'player') ?? {
      ownerId: id,
      ownerType: 'player' as const,
      positions: [],
    }

  if (!player) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <p className="text-zinc-400">Jogador não encontrado.</p>
      </main>
    )
  }

  if (state.game.status === 'finished') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center">
        <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">FIM DE JOGO</h1>
        <p className="text-zinc-400 text-lg">Olhe para o Telão Principal para ver o Ranking Final!</p>
      </main>
    )
  }

  const { netWorth, returnPercent, breakdown } = calculateNetWorth(
    player,
    portfolio,
    state.assets,
    state.fixedIncomeInvestments,
    state.fixedIncomeProducts,
    state.loans,
    state.game.currentRound,
    state.game.config.taxRate
  )

  return (
    <main className="min-h-screen bg-zinc-900 p-4 text-white md:p-6">
      <h1 className="mb-6 text-2xl font-bold">{player.name}</h1>
      <div className="mb-6 rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
        <div className="text-2xl font-bold">{formatCurrency(netWorth)}</div>
        <div
          className={`text-lg ${returnPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {formatPercent(returnPercent)} retorno
        </div>
        <div className="mt-2 flex gap-4 text-sm text-zinc-400">
          <span>Saldo: {formatCurrency(player.cash)}</span>
          <span>Ações: {breakdown.stocksPercent.toFixed(0)}%</span>
          <span>FIIs: {breakdown.fiisPercent.toFixed(0)}%</span>
        </div>
      </div>
      <h2 className="mb-3 text-lg font-bold">Carteira</h2>
      <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
        {portfolio.positions.length === 0 ? (
          <p className="text-zinc-500">Nenhuma posição.</p>
        ) : (
          portfolio.positions.map((pos) => {
            const asset = state.assets.find((a) => a.ticker === pos.ticker)
            const currentValue = asset ? pos.quantity * asset.currentPrice : 0
            return (
              <div
                key={pos.ticker}
                className="flex items-center justify-between rounded border border-zinc-700/50 p-3"
              >
                <div>
                  <span className="font-mono font-semibold">{pos.ticker}</span>
                  <span className="ml-2 text-zinc-400">
                    {pos.quantity} {(asset?.type === 'fii' ? 'cotas' : 'ações')}
                  </span>
                </div>
                <div className="text-right">
                  <div>PM: {formatCurrency(pos.avgPrice)}</div>
                  <div>Atual: {asset ? formatCurrency(asset.currentPrice) : '-'}</div>
                  <div className="font-semibold">{formatCurrency(currentValue)}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}
