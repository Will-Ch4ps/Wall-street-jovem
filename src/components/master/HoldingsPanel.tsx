'use client'

import { useState } from 'react'
import { nanoid } from 'nanoid'
import { formatCurrency } from '@/lib/formatters'
import { calculateNetWorth } from '@/engine/portfolioCalc'
import type { GameState, OwnerType } from '@/types'

interface HoldingsPanelProps {
  state: GameState
  onUpdate?: () => void
}

export function HoldingsPanel({ state, onUpdate }: HoldingsPanelProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const addHolding = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const id = nanoid()
      const holding = {
        id,
        name: name.trim(),
        memberIds: [] as string[],
        cash: 0,
        totalContributed: 0,
        contributions: {} as Record<string, number>,
        isActive: true,
        createdAt: new Date().toISOString(),
      }
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          state: {
            holdings: [...state.holdings, holding],
            portfolios: [
              ...state.portfolios,
              { ownerId: id, ownerType: 'holding' as OwnerType, positions: [] },
            ],
          },
        }),
      })
      if (res.ok) {
        setName('')
        onUpdate?.()
      }
    } finally {
      setLoading(false)
    }
  }

  const addMemberToHolding = async (holdingId: string, playerId: string, amount: number) => {
    const holding = state.holdings.find((h) => h.id === holdingId)
    const player = state.players.find((p) => p.id === playerId)
    if (!holding || !player || player.cash < amount) return
    setLoading(true)
    try {
      const updatedHoldings = state.holdings.map((h) =>
        h.id === holdingId
          ? {
            ...h,
            memberIds: h.memberIds.includes(playerId) ? h.memberIds : [...h.memberIds, playerId],
            cash: h.cash + amount,
            totalContributed: h.totalContributed + amount,
            contributions: {
              ...h.contributions,
              [playerId]: (h.contributions[playerId] ?? 0) + amount,
            },
          }
          : h
      )
      const updatedPlayers = state.players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash - amount } : p
      )
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          state: { holdings: updatedHoldings, players: updatedPlayers },
        }),
      })
      if (res.ok) onUpdate?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Holdings</h2>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
        <h3 className="mb-3 text-sm font-medium">Criar Holding</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nome da holding"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm"
          />
          <button
            onClick={addHolding}
            disabled={loading || !name.trim()}
            className="rounded bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            Criar
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">Holdings Ativas</h3>
        <div className="space-y-3">
          {state.holdings
            .filter((h) => h.isActive)
            .map((h) => {
              const portfolio = state.portfolios.find(
                (p) => p.ownerId === h.id && p.ownerType === 'holding'
              ) ?? { ownerId: h.id, ownerType: 'holding' as OwnerType, positions: [] }
              const { netWorth } = calculateNetWorth(
                h,
                portfolio,
                state.assets,
                state.fixedIncomeInvestments,
                state.fixedIncomeProducts,
                state.loans,
                state.game.currentRound,
                state.game.config.taxRate
              )
              return (
                <div
                  key={h.id}
                  className="rounded border border-zinc-700 bg-zinc-800/50 p-4 text-sm"
                >
                  <div className="flex justify-between">
                    <span className="font-semibold">{h.name}</span>
                    <span className="font-mono">{formatCurrency(netWorth)}</span>
                  </div>
                  <div className="mt-2 text-zinc-400">
                    Saldo: {formatCurrency(h.cash)} | Membros: {h.memberIds.length}
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    ID: {h.id}
                  </div>

                  <div className="mt-4 border-t border-zinc-700 pt-3">
                    <h4 className="mb-2 text-xs font-semibold text-zinc-400">Adicionar Membro / Investimento</h4>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        const form = e.currentTarget
                        const playerId = (form.elements.namedItem('playerId') as HTMLSelectElement).value
                        const amount = Number((form.elements.namedItem('amount') as HTMLInputElement).value)
                        if (playerId && amount > 0) {
                          addMemberToHolding(h.id, playerId, amount)
                          form.reset()
                        }
                      }}
                      className="flex gap-2"
                    >
                      <select
                        name="playerId"
                        className="flex-1 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs"
                        required
                      >
                        <option value="">Selecione um jogador</option>
                        {state.players
                          .filter((p) => p.isActive)
                          .map((p) => (
                            <option key={p.id} value={p.id} disabled={p.cash <= 0}>
                              {p.name} (Saldo: {formatCurrency(p.cash)})
                            </option>
                          ))}
                      </select>
                      <input
                        name="amount"
                        type="number"
                        min="1"
                        placeholder="Valor"
                        className="w-24 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs"
                        required
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Adicionar
                      </button>
                    </form>
                  </div>

                  {h.memberIds.length > 0 && (
                    <div className="mt-4 border-t border-zinc-700 pt-3 flex flex-col gap-1">
                      <h4 className="text-xs font-semibold text-zinc-400 mb-1">Composição</h4>
                      {h.memberIds.map((memberId) => {
                        const player = state.players.find((p) => p.id === memberId)
                        const contribution = h.contributions[memberId] || 0
                        const percentage = h.totalContributed > 0 ? (contribution / h.totalContributed) * 100 : 0
                        return (
                          <div key={memberId} className="flex justify-between items-center text-xs">
                            <span className="text-zinc-300">{player?.name || 'Desconhecido'}</span>
                            <span className="font-mono text-indigo-400">
                              {percentage.toFixed(1)}% ({formatCurrency(contribution)})
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
