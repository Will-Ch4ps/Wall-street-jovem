'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/formatters'
import { calculateLoanStatus } from '@/engine/portfolioCalc'
import type { GameState, OwnerType } from '@/types'

interface FinanceTabProps {
  state: GameState
  onUpdate?: () => void
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000]

export function FinanceTab({ state, onUpdate }: FinanceTabProps) {
  const [activeSection, setActiveSection] = useState<'invest' | 'loans'>('invest')
  const [productId, setProductId] = useState('')
  const [amount, setAmount] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [ownerType, setOwnerType] = useState<OwnerType>('player')
  const [loanAmount, setLoanAmount] = useState('')
  const [loanBorrowerId, setLoanBorrowerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payingLoanId, setPayingLoanId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')

  const owners = [
    ...state.players.filter((p) => p.isActive && !p.holdingId).map((p) => ({ id: p.id, name: p.name, type: 'player' as OwnerType, cash: p.cash })),
    ...state.holdings.filter((h) => h.isActive).map((h) => ({ id: h.id, name: h.name, type: 'holding' as OwnerType, cash: h.cash })),
  ]

  const selectedOwner = owners.find(o => o.id === ownerId)
  const selectedProduct = state.fixedIncomeProducts.find(p => p.id === productId)
  const parsedAmount = parseFloat(amount) || 0

  const handleInvest = async () => {
    if (!productId || parsedAmount < (selectedProduct?.minAmount ?? 100)) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fixed_income_invest', ownerId, ownerType, productId, amount: parsedAmount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao investir')
      setAmount('')
      onUpdate?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = async (investmentId: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fixed_income_redeem', investmentId }),
      })
      if (res.ok) onUpdate?.()
    } finally {
      setLoading(false)
    }
  }

  const handleLoan = async () => {
    const amt = parseFloat(loanAmount)
    if (!loanBorrowerId || amt < 100) return
    setLoading(true)
    setError(null)
    try {
      const borrower = owners.find((o) => o.id === loanBorrowerId)
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'loan_take',
          borrowerId: loanBorrowerId,
          borrowerType: borrower?.type ?? 'player',
          amount: amt,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao conceder empréstimo')
      setLoanAmount('')
      onUpdate?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  const handleLoanPay = async (loanId: string) => {
    const amt = parseFloat(payAmount)
    if (!amt || amt <= 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'loan_pay', loanId, amount: amt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao pagar empréstimo')
      setPayingLoanId(null)
      setPayAmount('')
      onUpdate?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  const activeInvestments = state.fixedIncomeInvestments.filter(i => !i.isRedeemed)
  const activeLoans = state.loans.filter(l => l.status === 'active')

  const TypeBadge: Record<string, { label: string; color: string }> = {
    tesouro_selic: { label: 'Tesouro', color: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50' },
    cdb: { label: 'CDB', color: 'bg-blue-900/50 text-blue-300 border-blue-700/50' },
    lci_lca: { label: 'LCI/LCA', color: 'bg-violet-900/50 text-violet-300 border-violet-700/50' },
    debenture: { label: 'Debênture', color: 'bg-amber-900/50 text-amber-300 border-amber-700/50' },
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">💰 Financeiro</h2>
        <div className="flex bg-zinc-800 rounded-lg p-0.5">
          <button onClick={() => setActiveSection('invest')}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition ${activeSection === 'invest' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
            Renda Fixa
          </button>
          <button onClick={() => setActiveSection('loans')}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition ${activeSection === 'loans' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
            Empréstimos {activeLoans.length > 0 && <span className="ml-1 bg-red-600 text-white text-xs px-1.5 rounded-full">{activeLoans.length}</span>}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-300">{error}</div>}

      {activeSection === 'invest' && (
        <div className="space-y-5">
          {/* Invest Form */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
            <h3 className="font-semibold text-white">Novo Investimento em Renda Fixa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Owner */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">Investidor</label>
                <select value={ownerId} onChange={e => {
                  const o = owners.find(x => x.id === e.target.value)
                  setOwnerId(e.target.value)
                  if (o) setOwnerType(o.type)
                }} className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Selecione o investidor...</option>
                  {owners.map(o => (
                    <option key={o.id} value={o.id}>{o.name} ({formatCurrency(o.cash)} disponível)</option>
                  ))}
                </select>
              </div>

              {/* Product */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">Produto</label>
                <select value={productId} onChange={e => setProductId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Escolha o produto...</option>
                  {state.fixedIncomeProducts.filter(p => {
                    if (!p.isActive) return false;
                    if (p.availableFromRound > 0 && state.game.currentRound < p.availableFromRound) return false;
                    if (p.expiresAtRound && state.game.currentRound > p.expiresAtRound) return false;
                    return true;
                  }).map(p => {
                    const expiresTag = p.expiresAtRound ? `(R${p.availableFromRound}-R${p.expiresAtRound})` : ''
                    const badTag = p.isBadInvestment ? '🔻' : ''
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} {badTag} — {(p.ratePerRound * 100).toFixed(2)}%/rod {expiresTag} {p.taxExempt ? '(Isento)' : ''} {p.riskOfDefault ? '⚠️' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            {/* Product Info Card */}
            {selectedProduct && (
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Taxa/Rodada</p>
                  <p className="font-mono font-bold text-emerald-400 text-sm">{(selectedProduct.ratePerRound * 100).toFixed(2)}%</p>
                </div>
                <div className="bg-zinc-800/60 rounded-lg p-3 text-center flex flex-col items-center justify-center">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Liquidez</p>
                  <p className="font-bold text-white text-[11px] leading-tight text-balance">
                    {selectedProduct.liquidityType === 'immediate' ? 'Diária (R+0)' :
                      selectedProduct.liquidityType === 'on_maturity' ? `Vencimento (R+${selectedProduct.lockRounds})` :
                        `Multa ${(selectedProduct.earlyWithdrawPenalty * 100).toFixed(0)}% até R+${selectedProduct.lockRounds}`}
                  </p>
                </div>
                <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">IR</p>
                  <p className={`font-mono font-bold text-sm ${selectedProduct.taxExempt ? 'text-emerald-400' : 'text-red-400'}`}>
                    {selectedProduct.taxExempt ? 'Isento' : `${(state.game.config.taxRate * 100).toFixed(0)}%`}
                  </p>
                </div>
                <div className="bg-zinc-800/60 rounded-lg p-3 text-center flex flex-col items-center justify-center">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Risco</p>
                  <p className={`font-mono font-bold text-[11px] leading-tight text-balance ${selectedProduct.riskOfDefault ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {selectedProduct.riskOfDefault ? (selectedProduct.linkedTicker ? `Risco ${selectedProduct.linkedTicker}` : 'Risco de Crédito') : 'Soberano (Sem Risco)'}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Amounts */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">Valor</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {QUICK_AMOUNTS.map(a => (
                  <button key={a} onClick={() => setAmount(String(a))}
                    className={`px-3 py-1.5 text-xs rounded-lg border font-mono transition ${amount === String(a) ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                    {formatCurrency(a)}
                  </button>
                ))}
              </div>
              <input type="number" placeholder="Ou insira outro valor..." value={amount}
                onChange={e => setAmount(e.target.value)} min={selectedProduct?.minAmount ?? 100}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
              {selectedOwner && parsedAmount > selectedOwner.cash && (
                <p className="text-xs text-red-400 mt-1">⚠️ Valor excede o saldo disponível ({formatCurrency(selectedOwner.cash)})</p>
              )}
            </div>

            {/* Summary + Invest Button */}
            {selectedProduct && parsedAmount > 0 && (
              <div className="bg-zinc-800/40 rounded-lg p-3 text-sm flex justify-between items-center">
                <div className="text-zinc-400">
                  Rendimento estimado por rodada: <span className="text-emerald-400 font-mono font-bold">
                    +{formatCurrency(parsedAmount * selectedProduct.ratePerRound * (selectedProduct.taxExempt ? 1 : (1 - state.game.config.taxRate)))}
                  </span>
                </div>
              </div>
            )}

            <button onClick={handleInvest}
              disabled={loading || !productId || !ownerId || parsedAmount < (selectedProduct?.minAmount ?? 100) || (selectedOwner ? parsedAmount > selectedOwner.cash : false)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition disabled:opacity-40">
              {loading ? 'Investindo...' : '📈 Confirmar Investimento'}
            </button>
          </div>

          {/* Active Investments */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-white">Investimentos Ativos</h3>
              <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full">{activeInvestments.length}</span>
            </div>
            {activeInvestments.length === 0 ? (
              <p className="text-center text-zinc-600 text-sm py-8 italic">Nenhum investimento ativo.</p>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {activeInvestments.map(inv => {
                  const product = state.fixedIncomeProducts.find(p => p.id === inv.productId)
                  if (!product) return null
                  const owner = owners.find(o => o.id === inv.ownerId)
                  const roundsHeld = state.game.currentRound - inv.roundInvested
                  const canRedeem = roundsHeld >= product.minRoundsToRedeem
                  const grossYield = inv.amount * product.ratePerRound * roundsHeld
                  const tax = product.taxExempt ? 0 : grossYield * state.game.config.taxRate
                  const totalNet = inv.amount + grossYield - tax
                  const badge = TypeBadge[product.type] ?? { label: product.type, color: 'bg-zinc-800/50 text-zinc-300 border-zinc-700/50' }

                  return (
                    <div key={inv.id} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded border ${badge.color}`}>{badge.label}</span>
                        <div>
                          <p className="text-sm font-semibold text-white">{product.name}</p>
                          <p className="text-xs text-zinc-500">{owner?.name ?? inv.ownerId} · {roundsHeld} rod. · {(product.ratePerRound * 100).toFixed(2)}%/rod</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-mono text-zinc-400">{formatCurrency(inv.amount)}</p>
                          <p className={`text-xs font-mono font-bold ${totalNet >= inv.amount ? 'text-emerald-400' : 'text-red-400'}`}>→ {formatCurrency(totalNet)}</p>
                        </div>
                        <button onClick={() => handleRedeem(inv.id)} disabled={loading || (!canRedeem && product.liquidityType !== 'penalty')}
                          className={`px-3 py-1.5 text-xs text-white rounded-lg font-bold transition disabled:opacity-40 whitespace-nowrap ${!canRedeem && product.liquidityType === 'penalty' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                            }`}>
                          {canRedeem ? 'Resgatar' :
                            (product.liquidityType === 'penalty' ? 'Sacar c/ Multa' : `Bloqueado (${product.lockRounds - roundsHeld} rod.)`)
                          }
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'loans' && (
        <div className="space-y-5">
          {/* Loan Form (only if allowLoans) */}
          {state.game.config.allowLoans ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
              <h3 className="font-semibold text-white">Conceder Empréstimo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">Tomador</label>
                  <select value={loanBorrowerId} onChange={e => setLoanBorrowerId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Selecione o tomador...</option>
                    {owners.map(o => (
                      <option key={o.id} value={o.id}>{o.name} ({formatCurrency(o.cash)} disponível)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">Valor</label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {[500, 1000, 2000, 5000].map(a => (
                      <button key={a} onClick={() => setLoanAmount(String(a))}
                        className={`px-2 py-1 text-xs rounded border font-mono transition ${loanAmount === String(a) ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                        {formatCurrency(a)}
                      </button>
                    ))}
                  </div>
                  <input type="number" placeholder="Valor..." value={loanAmount}
                    onChange={e => setLoanAmount(e.target.value)} min={100}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="bg-zinc-800/40 rounded-lg p-3 text-xs text-zinc-400">
                Taxa de juros: <span className="text-amber-400 font-mono font-bold">{(state.game.config.defaultLoanInterest * 100).toFixed(1)}%/rodada</span>
                {state.game.config.maxLoanPercent > 0 && (
                  <span className="ml-3">Teto: <span className="text-zinc-300 font-mono">{(state.game.config.maxLoanPercent * 100).toFixed(0)}% do capital inicial</span></span>
                )}
              </div>
              <button onClick={handleLoan} disabled={loading || !loanBorrowerId || parseFloat(loanAmount) < 100}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition disabled:opacity-40">
                {loading ? 'Concedendo...' : '💳 Conceder Empréstimo'}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-center text-zinc-500 text-sm">
              Empréstimos desabilitados nas Regras Gerais.
            </div>
          )}

          {/* Active Loans */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-white">Empréstimos Ativos</h3>
              <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full">{activeLoans.length}</span>
            </div>
            {activeLoans.length === 0 ? (
              <p className="text-center text-zinc-600 text-sm py-8 italic">Nenhum empréstimo ativo.</p>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {activeLoans.map(loan => {
                  const { totalDebt } = calculateLoanStatus(loan, state.game.currentRound)
                  const borrower = owners.find(o => o.id === loan.borrowerId)
                  const isPaying = payingLoanId === loan.id
                  const parsedPay = parseFloat(payAmount) || 0
                  return (
                    <div key={loan.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <p className="font-semibold text-white text-sm">{borrower?.name ?? loan.borrowerId}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Principal: {formatCurrency(loan.amount)} · {(loan.interestPerRound * 100).toFixed(1)}%/rod
                          </p>
                          <p className="text-xs text-amber-400 mt-0.5">
                            Juros acumulados: {formatCurrency(totalDebt - loan.amount)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="text-red-300 font-mono font-bold text-sm">Total: {formatCurrency(totalDebt)}</p>
                          <button onClick={() => { setPayingLoanId(isPaying ? null : loan.id); setPayAmount('') }}
                            className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 font-medium transition">
                            {isPaying ? 'Cancelar' : '💰 Receber Pagamento'}
                          </button>
                        </div>
                      </div>
                      {isPaying && (
                        <div className="mt-3 bg-zinc-800/60 rounded-lg p-3 space-y-3">
                          <p className="text-xs text-zinc-400">Quanto o aluno está pagando agora?</p>
                          <div className="flex gap-2 flex-wrap">
                            {[parseFloat((loan.amount * loan.interestPerRound).toFixed(2)), parseFloat((loan.amount / 2).toFixed(2)), parseFloat(totalDebt.toFixed(2))].map(preset => (
                              <button key={preset} onClick={() => setPayAmount(String(preset))}
                                className={`px-2 py-1 text-xs rounded border font-mono transition ${payAmount === String(preset) ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                                {formatCurrency(preset)}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input type="number" placeholder="Valor..." value={payAmount} onChange={e => setPayAmount(e.target.value)} min={1}
                              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
                            <button onClick={() => handleLoanPay(loan.id)} disabled={loading || parsedPay <= 0}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition disabled:opacity-40">
                              Confirmar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Defaulted / Paid History */}
          {state.loans.filter(l => l.status !== 'active').length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-800">
                <h3 className="font-medium text-zinc-400 text-sm">Histórico de Empréstimos</h3>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {state.loans.filter(l => l.status !== 'active').map(loan => {
                  const borrower = owners.find(o => o.id === loan.borrowerId)
                  return (
                    <div key={loan.id} className="px-5 py-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="text-zinc-300">{borrower?.name ?? loan.borrowerId}</p>
                        <p className="text-xs text-zinc-600">{formatCurrency(loan.amount)} principal</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${loan.status === 'paid' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'}`}>
                        {loan.status === 'paid' ? '✅ Quitado' : '🚨 Calote'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
