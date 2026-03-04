'use client'

import { formatCurrency } from '@/lib/formatters'
import type { GameState, Round } from '@/types'

interface TransitionPanelProps {
  state: GameState
  onAdvance?: () => void
  loading?: boolean
}

export function TransitionPanel({
  state,
  onAdvance,
  loading = false,
}: TransitionPanelProps) {
  const currentRound = state.game.currentRound
  const round = state.rounds.find((r) => r.number === currentRound)
  const canAdvance =
    state.game.status === 'running' ||
    state.game.status === 'paused' ||
    state.game.status === 'transition'

  const roundTransactions = state.transactions.filter((t) => t.round === currentRound)
  const totalVolume = roundTransactions
    .filter((t) => t.type === 'buy' || t.type === 'sell')
    .reduce((sum, t) => sum + t.total, 0)

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
      <h2 className="mb-4 text-lg font-bold">Transição de Rodada</h2>
      {round && (
        <div className="mb-4 space-y-2 rounded border border-zinc-700/50 bg-zinc-900/50 p-4 text-sm">
          <div>
            <span className="text-zinc-400">Rodada atual: </span>
            <span className="font-semibold">{currentRound}</span>
          </div>
          <div>
            <span className="text-zinc-400">Tema: </span>
            <span>{round.theme}</span>
          </div>
          <div>
            <span className="text-zinc-400">Transações: </span>
            <span>{roundTransactions.length}</span>
          </div>
          <div>
            <span className="text-zinc-400">Volume: </span>
            <span>{formatCurrency(totalVolume)}</span>
          </div>
        </div>
      )}
      <p className="mb-4 text-sm text-zinc-400">
        Ao avançar: dividendos FII, rendimentos de renda fixa e juros de empréstimos
        serão aplicados automaticamente.
      </p>
      <button
        onClick={onAdvance}
        disabled={loading || !canAdvance}
        className="rounded bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? 'Avançando...' : 'Avançar Rodada'}
      </button>
    </div>
  )
}
