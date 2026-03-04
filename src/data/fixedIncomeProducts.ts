import type { FixedIncomeProduct } from '@/types'

/**
 * Fallback fixed income products (used only if DB is empty).
 * The real products are loaded from the database via prisma seed.
 */
export const fixedIncomeProducts: FixedIncomeProduct[] = [
  {
    id: 'tselic',
    name: 'Tesouro Selic',
    type: 'tesouro_selic',
    description: 'O investimento mais seguro do Brasil. Liquidez imediata.',
    ratePerRound: 0.008,
    minAmount: 100,
    minRoundsToRedeem: 0,
    canRedeemAnytime: true,
    taxExempt: false,
    riskOfDefault: false,
    isActive: true,
    availableFromRound: 0,
    liquidityType: 'immediate',
    lockRounds: 0,
    earlyWithdrawPenalty: 0,
    isBadInvestment: false,
  },
  {
    id: 'poupanca',
    name: 'Poupança Nacional',
    type: 'poupanca' as FixedIncomeProduct['type'],
    description: 'A "segurança" que perde para a inflação. Rendimento pífio.',
    ratePerRound: 0.003,
    minAmount: 50,
    minRoundsToRedeem: 0,
    canRedeemAnytime: true,
    taxExempt: true,
    riskOfDefault: false,
    isActive: true,
    availableFromRound: 0,
    liquidityType: 'immediate',
    lockRounds: 0,
    earlyWithdrawPenalty: 0,
    isBadInvestment: true,
  },
]
