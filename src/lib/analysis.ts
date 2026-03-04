import type { Asset } from '@/types'

/**
 * Projects the end-game price range based on the current asset state and
 * number of rounds remaining. This mirrors the logic previously living inside
 * AnalysisTab and is useful for any UI that wants to show scenario estimates.
 */
export function projectEndGame(
  asset: Asset,
  remainingRounds: number,
  edit?: {
    trend?: Asset['trend']
    targetClose?: number
    momentum?: number
    volatility?: number
  }
): { low: number; mid: number; high: number; perRoundDrift: number } {
  const trend = edit?.trend ?? asset.trend
  const targetClose = edit ? edit.targetClose ?? asset.targetClose : asset.targetClose
  const momentum = edit ? edit.momentum ?? asset.momentum ?? 0.08 : asset.momentum ?? 0.08
  const volatility = edit ? edit.volatility ?? asset.volatility ?? 0.06 : asset.volatility ?? 0.06

  // Using the same math as the priceEngine approximation
  // Drift is ~ 0.08% per tick * 60 ticks per round... roughly 5% per round
  const trendMultiplier = {
    bullish: 0.048,
    bearish: -0.048,
    volatile: 0,
    neutral: 0,
  }[trend] ?? 0

  const perRoundDrift = trendMultiplier * (1 + momentum * 0.5)
  const volatilityBand = volatility * asset.currentPrice * 1.5

  // Gravity to targetClose over the remaining rounds
  // If momentum is high, we reach targetClose quickly.
  const gap = targetClose - asset.currentPrice
  // rough approximation: closes 50% of the gap per round at 0.10 momentum
  const pullFactor = Math.min(1, momentum * 5)
  const convergedCurrent = asset.currentPrice + gap * pullFactor

  const mid = convergedCurrent * Math.pow(1 + perRoundDrift, Math.max(0, remainingRounds - 1))
  const low = mid - volatilityBand * Math.sqrt(remainingRounds)
  const high = mid + volatilityBand * Math.sqrt(remainingRounds)

  return {
    low: Math.max(0.01, low),
    mid: Math.max(0.01, mid),
    high: Math.max(0.01, high),
    perRoundDrift,
  }
}
