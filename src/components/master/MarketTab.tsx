'use client'

import { useState } from 'react'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import type { Asset } from '@/types'

interface MarketTabProps {
  assets: Asset[]
}

type SortField = 'ticker' | 'price' | 'var' | 'target' | 'trend' | 'status' | 'available'

export function MarketTab({ assets }: MarketTabProps) {
  const [sortField, setSortField] = useState<SortField>('var')
  const [sortDesc, setSortDesc] = useState(true)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc)
    } else {
      setSortField(field)
      setSortDesc(true) // Default to DESC when changing fields, usually preferred for metrics
    }
  }

  const sortedAssets = [...assets].sort((a, b) => {
    let valA: any
    let valB: any

    const varA = a.openPrice > 0 ? ((a.currentPrice - a.openPrice) / a.openPrice) * 100 : 0
    const varB = b.openPrice > 0 ? ((b.currentPrice - b.openPrice) / b.openPrice) * 100 : 0

    switch (sortField) {
      case 'ticker': valA = a.ticker; valB = b.ticker; break
      case 'price': valA = a.currentPrice; valB = b.currentPrice; break
      case 'var': valA = varA; valB = varB; break
      case 'target': valA = a.targetClose; valB = b.targetClose; break
      case 'trend': valA = a.trend; valB = b.trend; break
      case 'status': valA = a.status; valB = b.status; break
      case 'available': valA = a.availableShares; valB = b.availableShares; break
      default: valA = 0; valB = 0; break
    }

    if (valA < valB) return sortDesc ? 1 : -1
    if (valA > valB) return sortDesc ? -1 : 1
    return 0
  })

  // Helper Header Component
  const SortableHeader = ({ label, field }: { label: string, field: SortField }) => (
    <th
      className="px-4 py-3 cursor-pointer hover:bg-zinc-700/50 transition select-none group"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <span className={`text-[10px] ${sortField === field ? 'text-indigo-400 opacity-100' : 'text-zinc-600 opacity-0 group-hover:opacity-100'}`}>
          {sortField === field ? (sortDesc ? '▼' : '▲') : '▼'}
        </span>
      </div>
    </th>
  )

  return (
    <div className="space-y-4 text-white">
      <h2 className="text-lg font-bold">Mercado</h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-700">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-zinc-700 bg-zinc-800">
              <SortableHeader label="Ticker" field="ticker" />
              <SortableHeader label="Preço" field="price" />
              <SortableHeader label="Var%" field="var" />
              <SortableHeader label="Alvo" field="target" />
              <SortableHeader label="Trend" field="trend" />
              <SortableHeader label="Status" field="status" />
              <SortableHeader label="Disponível" field="available" />
            </tr>
          </thead>
          <tbody>
            {sortedAssets.map((a) => {
              const varPct = a.openPrice > 0 ? ((a.currentPrice - a.openPrice) / a.openPrice) * 100 : 0
              return (
                <tr key={a.ticker} className="border-b border-zinc-700/50 hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-2 font-mono font-semibold text-indigo-300">{a.ticker}</td>
                  <td className="px-4 py-2 font-mono">{formatCurrency(a.currentPrice)}</td>
                  <td className={`px-4 py-2 font-mono font-bold ${varPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {varPct >= 0 ? '+' : ''}{formatPercent(varPct)}
                  </td>
                  <td className="px-4 py-2 font-mono opacity-60">{formatCurrency(a.targetClose)}</td>
                  <td className="px-4 py-2 text-xs uppercase tracking-wider opacity-80">{a.trend}</td>
                  <td className="px-4 py-2 text-xs uppercase opacity-80">{a.status}</td>
                  <td className="px-4 py-2 font-mono text-zinc-400">{a.availableShares}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
