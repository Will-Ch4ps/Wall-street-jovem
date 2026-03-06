'use client'

import { formatCurrency, formatPercent } from '@/lib/formatters'
import { calculateNetWorth } from '@/engine/portfolioCalc'
import type { Asset, GameState, Holding, OwnerType, Player } from '@/types'

interface RankingProps {
  players: Player[]
  holdings: Holding[]
  portfolios: GameState['portfolios']
  assets: Asset[]
  fixedIncomeInvestments: GameState['fixedIncomeInvestments']
  fixedIncomeProducts: GameState['fixedIncomeProducts']
  loans: GameState['loans']
  currentRound: number
  taxRate: number
}

type RankEntry = {
  id: string
  name: string
  type: 'player' | 'holding'
  netWorth: number
  returnPercent: number
}

export function Ranking({
  players,
  holdings,
  portfolios,
  assets,
  fixedIncomeInvestments,
  fixedIncomeProducts,
  loans,
  currentRound,
  taxRate,
}: RankingProps) {
  const entries: RankEntry[] = []

  for (const p of players) {
    if (!p.isActive || p.holdingId) continue
    const portfolio = portfolios.find((po) => po.ownerId === p.id && po.ownerType === 'player') ?? {
      ownerId: p.id,
      ownerType: 'player' as OwnerType,
      positions: [],
    }
    const { netWorth, returnPercent } = calculateNetWorth(
      p,
      portfolio,
      assets,
      fixedIncomeInvestments,
      fixedIncomeProducts,
      loans,
      currentRound,
      taxRate
    )
    entries.push({
      id: p.id,
      name: p.name,
      type: 'player',
      netWorth,
      returnPercent,
    })
  }

  for (const h of holdings) {
    if (!h.isActive) continue
    const portfolio = portfolios.find((po) => po.ownerId === h.id && po.ownerType === 'holding') ?? {
      ownerId: h.id,
      ownerType: 'holding' as OwnerType,
      positions: [],
    }
    const { netWorth, returnPercent } = calculateNetWorth(
      h,
      portfolio,
      assets,
      fixedIncomeInvestments,
      fixedIncomeProducts,
      loans,
      currentRound,
      taxRate
    )
    entries.push({
      id: h.id,
      name: h.name,
      type: 'holding',
      netWorth,
      returnPercent,
    })
  }

  entries.sort((a, b) => b.netWorth - a.netWorth)
  const maxWorth = entries[0]?.netWorth ?? 1

  return (
    <div className="rounded border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-3 shadow-sm h-full flex flex-col">
      <h2 className="mb-3 text-base font-bold text-slate-800 dark:text-white uppercase tracking-widest">Ranking Global</h2>
      <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {entries.slice(0, 10).map((e, i) => (
          <div key={e.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-zinc-200 truncate mr-2">
                {i === 0 && '🥇 '}
                {i === 1 && '🥈 '}
                {i === 2 && '🥉 '}
                {i > 2 && `${i + 1}. `}
                {e.name}
                {e.type === 'holding' && ' 👥'}
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap text-[10px]">
                {formatCurrency(e.netWorth)}{' '}
                <span
                  className={
                    e.returnPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                  }
                >
                  {formatPercent(e.returnPercent)}
                </span>
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${Math.min(100, (e.netWorth / maxWorth) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
