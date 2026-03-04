import type {
  Asset,
  FixedIncomeInvestment,
  FixedIncomeProduct,
  Holding,
  Loan,
  Player,
  Portfolio,
} from '@/types'

function getAsset(ticker: string, assets: Asset[]): Asset | undefined {
  return assets.find((a) => a.ticker === ticker)
}

export function calculateLoanStatus(loan: Loan, currentRound: number): {
  totalDebt: number
  interestAccumulated: number
  isOverdue: boolean
  roundsRemaining: number | null
} {
  const roundsActive = currentRound - loan.roundTaken
  const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0)
  const compoundInterest =
    loan.amount * Math.pow(1 + loan.interestPerRound, roundsActive) - loan.amount
  const totalDebt = loan.amount + compoundInterest - totalPaid

  return {
    totalDebt: Math.max(0, totalDebt),
    interestAccumulated: compoundInterest,
    isOverdue: loan.roundDue ? currentRound > loan.roundDue : false,
    roundsRemaining: loan.roundDue ? loan.roundDue - currentRound : null,
  }
}

function calculateFixedIncomeYield(
  investment: FixedIncomeInvestment,
  product: FixedIncomeProduct,
  currentRound: number,
  taxRate: number
): { totalNet: number } {
  const roundsHeld = currentRound - investment.roundInvested
  const grossYield = investment.amount * product.ratePerRound * roundsHeld
  const tax = product.taxExempt ? 0 : grossYield * taxRate
  let totalNet = investment.amount + grossYield - tax

  if (product.liquidityType === 'penalty' && roundsHeld < product.lockRounds) {
    const penaltyAmount = investment.amount * (product.earlyWithdrawPenalty || 0)
    totalNet -= penaltyAmount
  }

  return { totalNet }
}

export interface PortfolioBreakdown {
  cashPercent: number
  stocksPercent: number
  fiisPercent: number
  fixedIncomePercent: number
}

export interface NetWorthResult {
  cash: number
  stocksValue: number
  fiisValue: number
  fixedIncomeValue: number
  totalAssets: number
  totalDebts: number
  netWorth: number
  returnPercent: number
  breakdown: PortfolioBreakdown
}

export function calculateNetWorth(
  owner: Player | Holding,
  portfolio: Portfolio,
  assets: Asset[],
  fixedIncomeInvestments: FixedIncomeInvestment[],
  fixedIncomeProducts: FixedIncomeProduct[],
  loans: Loan[],
  currentRound: number,
  taxRate: number
): NetWorthResult {
  const stocksValue = portfolio.positions
    .filter((p) => getAsset(p.ticker, assets)?.type === 'stock')
    .reduce((sum, pos) => {
      const asset = getAsset(pos.ticker, assets)
      return sum + (asset ? pos.quantity * asset.currentPrice : 0)
    }, 0)

  const fiisValue = portfolio.positions
    .filter((p) => getAsset(p.ticker, assets)?.type === 'fii')
    .reduce((sum, pos) => {
      const asset = getAsset(pos.ticker, assets)
      return sum + (asset ? pos.quantity * asset.currentPrice : 0)
    }, 0)

  const fixedIncomeValue = fixedIncomeInvestments
    .filter((inv) => inv.ownerId === owner.id && !inv.isRedeemed)
    .reduce((sum, inv) => {
      const product = fixedIncomeProducts.find((p) => p.id === inv.productId)
      if (!product) return sum
      const calc = calculateFixedIncomeYield(inv, product, currentRound, taxRate)
      return sum + calc.totalNet
    }, 0)

  const totalDebts = loans
    .filter((l) => l.borrowerId === owner.id && l.status === 'active')
    .reduce((sum, loan) => sum + calculateLoanStatus(loan, currentRound).totalDebt, 0)

  const cash = 'initialCash' in owner ? owner.cash : owner.cash
  const totalAssets = cash + stocksValue + fiisValue + fixedIncomeValue
  const netWorth = totalAssets - totalDebts
  const initialCapital =
    'initialCash' in owner ? owner.initialCash : owner.totalContributed
  const returnPercent =
    initialCapital > 0 ? ((netWorth - initialCapital) / initialCapital) * 100 : 0

  const totalForPercent = totalAssets || 1
  return {
    cash,
    stocksValue,
    fiisValue,
    fixedIncomeValue,
    totalAssets,
    totalDebts,
    netWorth,
    returnPercent,
    breakdown: {
      cashPercent: (cash / totalForPercent) * 100,
      stocksPercent: (stocksValue / totalForPercent) * 100,
      fiisPercent: (fiisValue / totalForPercent) * 100,
      fixedIncomePercent: (fixedIncomeValue / totalForPercent) * 100,
    },
  }
}
