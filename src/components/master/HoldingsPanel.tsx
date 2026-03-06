'use client'

import { useState } from 'react'
import { nanoid } from 'nanoid'
import { formatCurrency } from '@/lib/formatters'
import { calculateNetWorth } from '@/engine/portfolioCalc'
import type { GameState, OwnerType, Position } from '@/types'

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
      // --- Lógica de Participação Justa (Equity Units) ---
      // 1. Calcular o Patrimônio Líquido (PL) atual antes do novo aporte
      const portfolio = state.portfolios.find(
        (p) => p.ownerId === holdingId && p.ownerType === 'holding'
      ) ?? { ownerId: holdingId, ownerType: 'holding' as OwnerType, positions: [] }

      const { netWorth } = calculateNetWorth(
        holding, portfolio, state.assets,
        state.fixedIncomeInvestments, state.fixedIncomeProducts,
        state.loans, state.game.currentRound, state.game.config.taxRate
      )

      // 2. Determinar quanto de "crédito de participação" o novo aporte gera.
      // Se a holding já valorizou, o real investido "vale menos" em porcentagem do que no início.
      // Se a holding não tem valor/aporte (início), o crédito é o próprio valor.
      let participationCredit = amount
      if (holding.totalContributed > 0 && netWorth > 0) {
        // Regra de Três:
        // netWorth (Valor Real)      -> holding.totalContributed (Crédito Total Atual)
        // amount (Dinheiro Novo)    -> participationCredit (Novo Crédito)
        participationCredit = (amount * holding.totalContributed) / netWorth
      }

      const updatedHoldings = state.holdings.map((h) =>
        h.id === holdingId
          ? {
            ...h,
            memberIds: h.memberIds.includes(playerId) ? h.memberIds : [...h.memberIds, playerId],
            cash: h.cash + amount, // O caixa aumenta pelo valor REAL
            totalContributed: h.totalContributed + participationCredit, // A base de cálculo aumenta pelo crédito proporcional
            contributions: {
              ...h.contributions,
              [playerId]: (h.contributions[playerId] ?? 0) + participationCredit,
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

  // ── Calcula o payout proporcional de um membro ──
  const getMemberPayout = (holdingId: string, playerId: string): number => {
    const holding = state.holdings.find((h) => h.id === holdingId)
    if (!holding || holding.totalContributed <= 0) return 0
    const portfolio = state.portfolios.find(
      (p) => p.ownerId === holdingId && p.ownerType === 'holding'
    ) ?? { ownerId: holdingId, ownerType: 'holding' as OwnerType, positions: [] }
    const { netWorth } = calculateNetWorth(
      holding, portfolio, state.assets,
      state.fixedIncomeInvestments, state.fixedIncomeProducts,
      state.loans, state.game.currentRound, state.game.config.taxRate
    )
    const sharePercent = (holding.contributions[playerId] ?? 0) / holding.totalContributed
    return Math.max(0, Math.round(sharePercent * netWorth * 100) / 100)
  }

  // ── Retira um membro da holding ──
  const withdrawMember = async (holdingId: string, playerId: string) => {
    const holding = state.holdings.find((h) => h.id === holdingId)
    const player = state.players.find((p) => p.id === playerId)
    if (!holding || !player) return
    const payout = getMemberPayout(holdingId, playerId)
    const sharePercent = holding.totalContributed > 0
      ? (holding.contributions[playerId] ?? 0) / holding.totalContributed
      : 0

    const confirmMsg = `Retirar ${player.name} da holding "${holding.name}"?\n\n` +
      `Participação: ${(sharePercent * 100).toFixed(1)}%\n` +
      `Valor a receber: ${formatCurrency(payout)}\n\n` +
      `Posições serão liquidadas proporcionalmente se necessário.`
    if (!confirm(confirmMsg)) return

    setLoading(true)
    try {
      const portfolio = state.portfolios.find(
        (p) => p.ownerId === holdingId && p.ownerType === 'holding'
      )

      // Liquidar posições proporcionalmente ao share do membro
      let cashFromLiquidation = 0
      let updatedPositions: Position[] = portfolio?.positions ? [...portfolio.positions] : []

      // Quanto precisa ser liquidado?
      const cashNeeded = Math.max(0, payout - holding.cash)

      if (cashNeeded > 0 && updatedPositions.length > 0) {
        // Vender posições proporcionalmente (share%) ao preço de mercado
        updatedPositions = updatedPositions.map((pos) => {
          const asset = state.assets.find((a) => a.ticker === pos.ticker)
          if (!asset) return pos
          const sharesToSell = Math.floor(pos.quantity * sharePercent)
          if (sharesToSell <= 0) return pos
          const saleValue = sharesToSell * asset.currentPrice
          cashFromLiquidation += saleValue
          return {
            ...pos,
            quantity: pos.quantity - sharesToSell,
            totalInvested: pos.totalInvested * ((pos.quantity - sharesToSell) / pos.quantity),
          }
        }).filter((pos) => pos.quantity > 0)
      }

      const totalCashAvailable = holding.cash + cashFromLiquidation
      const actualPayout = Math.min(payout, totalCashAvailable)

      // Atualizar holding: remover membro, recalcular contribuições
      const isLastMember = holding.memberIds.length <= 1
      const newContributions = { ...holding.contributions }
      const memberContribution = newContributions[playerId] ?? 0
      delete newContributions[playerId]
      const newTotalContributed = holding.totalContributed - memberContribution

      const updatedHolding = {
        ...holding,
        memberIds: holding.memberIds.filter((id) => id !== playerId),
        cash: totalCashAvailable - actualPayout,
        totalContributed: isLastMember ? 0 : newTotalContributed,
        contributions: newContributions,
        isActive: !isLastMember,
      }

      const updatedHoldings = state.holdings.map((h) =>
        h.id === holdingId ? updatedHolding : h
      )

      const updatedPlayers = state.players.map((p) =>
        p.id === playerId ? { ...p, cash: p.cash + actualPayout } : p
      )

      const updatedPortfolios = state.portfolios.map((p) =>
        p.ownerId === holdingId && p.ownerType === 'holding'
          ? { ...p, positions: updatedPositions }
          : p
      )

      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          state: {
            holdings: updatedHoldings,
            players: updatedPlayers,
            portfolios: updatedPortfolios,
          },
        }),
      })
      if (res.ok) {
        onUpdate?.()
        alert(`✅ ${player.name} retirado(a) da holding.\nRecebeu: ${formatCurrency(actualPayout)}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Dissolve a holding inteira ──
  const dissolveHolding = async (holdingId: string) => {
    const holding = state.holdings.find((h) => h.id === holdingId)
    if (!holding || holding.memberIds.length === 0) return

    const portfolio = state.portfolios.find(
      (p) => p.ownerId === holdingId && p.ownerType === 'holding'
    ) ?? { ownerId: holdingId, ownerType: 'holding' as OwnerType, positions: [] }
    const { netWorth } = calculateNetWorth(
      holding, portfolio, state.assets,
      state.fixedIncomeInvestments, state.fixedIncomeProducts,
      state.loans, state.game.currentRound, state.game.config.taxRate
    )

    const breakdownLines = holding.memberIds.map((mid) => {
      const p = state.players.find((pl) => pl.id === mid)
      const share = holding.totalContributed > 0
        ? (holding.contributions[mid] ?? 0) / holding.totalContributed
        : 0
      return `  ${p?.name ?? '?'}: ${(share * 100).toFixed(1)}% → ${formatCurrency(share * netWorth)}`
    }).join('\n')

    if (!confirm(
      `Dissolver holding "${holding.name}"?\n\n` +
      `Patrimônio líquido: ${formatCurrency(netWorth)}\n\nDistribuição:\n${breakdownLines}\n\n` +
      `Todas as posições serão liquidadas a preço de mercado.`
    )) return

    setLoading(true)
    try {
      // Liquidar todas as posições ao preço de mercado
      let totalCashFromPositions = 0
      if (portfolio.positions.length > 0) {
        for (const pos of portfolio.positions) {
          const asset = state.assets.find((a) => a.ticker === pos.ticker)
          if (asset) totalCashFromPositions += pos.quantity * asset.currentPrice
        }
      }

      const totalCash = holding.cash + totalCashFromPositions

      // Distribuir para cada membro proporcionalmente
      let updatedPlayers = [...state.players]
      for (const memberId of holding.memberIds) {
        const sharePercent = holding.totalContributed > 0
          ? (holding.contributions[memberId] ?? 0) / holding.totalContributed
          : (1 / holding.memberIds.length) // fallback: divisão igual
        const memberPayout = Math.round(sharePercent * totalCash * 100) / 100
        updatedPlayers = updatedPlayers.map((p) =>
          p.id === memberId ? { ...p, cash: p.cash + memberPayout } : p
        )
      }

      const updatedHoldings = state.holdings.map((h) =>
        h.id === holdingId
          ? { ...h, cash: 0, isActive: false, memberIds: [], contributions: {}, totalContributed: 0 }
          : h
      )

      const updatedPortfolios = state.portfolios.map((p) =>
        p.ownerId === holdingId && p.ownerType === 'holding'
          ? { ...p, positions: [] }
          : p
      )

      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          state: {
            holdings: updatedHoldings,
            players: updatedPlayers,
            portfolios: updatedPortfolios,
          },
        }),
      })
      if (res.ok) {
        onUpdate?.()
        alert(`✅ Holding "${holding.name}" dissolvida com sucesso!`)
      }
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
                        const estimatedPayout = getMemberPayout(h.id, memberId)
                        return (
                          <div key={memberId} className="flex justify-between items-center text-xs gap-2 py-1">
                            <div className="flex flex-col">
                              <span className="text-zinc-300">{player?.name || 'Desconhecido'}</span>
                              <span className="text-zinc-500 text-[10px]">
                                Contribuiu {formatCurrency(contribution)} · Cota atual {formatCurrency(estimatedPayout)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-indigo-400 whitespace-nowrap">
                                {percentage.toFixed(1)}%
                              </span>
                              <button
                                onClick={() => withdrawMember(h.id, memberId)}
                                disabled={loading}
                                className="px-2 py-1 text-[10px] font-bold rounded bg-red-600/20 text-red-400 border border-red-800/50 hover:bg-red-600/40 transition disabled:opacity-50 whitespace-nowrap"
                                title={`Retirar ${player?.name} — receberá ${formatCurrency(estimatedPayout)}`}
                              >
                                Retirar
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Botão Dissolver */}
                  {h.memberIds.length > 0 && (
                    <div className="mt-4 border-t border-zinc-700 pt-3">
                      <button
                        onClick={() => dissolveHolding(h.id)}
                        disabled={loading}
                        className="w-full rounded-lg bg-red-900/30 border border-red-800/50 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-900/50 transition disabled:opacity-50"
                      >
                        💣 Dissolver Holding — Distribuir para todos
                      </button>
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
