import type { BaseAsset, Candle } from '@/types'

export interface CandleBuilder {
  ticker: string
  startTime: string
  ticks: number[]
  volume: number
  round: number
}

export function buildCandle(builder: CandleBuilder): Candle {
  const { startTime, ticks, volume, round } = builder
  if (ticks.length === 0) {
    return {
      timestamp: startTime,
      open: 0,
      high: 0,
      low: 0,
      close: 0,
      volume,
      round,
    }
  }
  return {
    timestamp: startTime,
    open: ticks[0],
    high: Math.max(...ticks),
    low: Math.min(...ticks),
    close: ticks[ticks.length - 1],
    volume,
    round,
  }
}

export function applyPriceModifier(
  asset: BaseAsset,
  modifier: { min: number; max: number },
  options?: { stabilityFactor?: number }
): number {
  let impact = modifier.min + Math.random() * (modifier.max - modifier.min)

  // apply optional stability adjustment (lower impact for "consolidated" assets)
  if (options?.stabilityFactor != null) {
    impact *= options.stabilityFactor
  }

  // Asymmetric rebalancing: smooth out crashes and boost upswings
  if (impact < 0) {
    impact = impact * 0.6 // Reduce negative severity by 40%
  } else {
    impact = Math.max(0.01, impact * 1.2) // Boost positives by 20%
  }

  asset.targetClose = asset.targetClose * (1 + impact)
  // bump volatility so price oscillates for a while after an event
  asset.volatility = Math.min(0.25, asset.volatility * 1.5)

  return impact
}
