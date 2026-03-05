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

/**
 * Box-Muller transform — produces a normally distributed random number
 * centered around 0 with stddev ~1. We use this to make impacts cluster
 * around the middle of the min/max range instead of uniform distribution.
 */
function gaussianRandom(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

/**
 * Sample a value from a Gaussian distribution clamped within [min, max].
 * The mean is the midpoint and stddev is set so ±2σ covers the range.
 */
function gaussianInRange(min: number, max: number): number {
  const mean = (min + max) / 2
  const stddev = (max - min) / 4 // ±2σ covers the range
  const raw = mean + gaussianRandom() * stddev
  return Math.max(min, Math.min(max, raw))
}

/**
 * Apply a price modifier to an asset using Gaussian distribution instead
 * of flat uniform random. Volatility bump is proportional to impact severity.
 */
export function applyPriceModifier(
  asset: BaseAsset,
  modifier: { min: number; max: number },
  options?: { stabilityFactor?: number }
): number {
  // Sample from Gaussian distribution within range
  let impact = gaussianInRange(modifier.min, modifier.max)

  // apply optional stability adjustment (lower impact for "consolidated" assets)
  if (options?.stabilityFactor != null) {
    impact *= options.stabilityFactor
  }

  // Apply to targetClose
  asset.targetClose = asset.targetClose * (1 + impact)

  // Volatility bump proportional to impact severity
  // Bigger events = more market turbulence afterwards
  const impactMagnitude = Math.abs(impact)
  const volBump = 1 + (impactMagnitude * 3) // e.g. 10% impact → 1.3x vol, 30% impact → 1.9x vol
  asset.volatility = Math.min(0.30, asset.volatility * volBump)

  return impact
}
