import type { BaseAsset, FII } from '@/types'

/**
 * Price Engine — Brownian Motion with Drift
 * ─────────────────────────────────────────────────────────────────────────────
 * Design goals:
 *  1. Per-tick changes are in CENTAVOS (small), not percent swings
 *  2. Trend/momentum causes CUMULATIVE drift → clear chart direction over time
 *  3. Chart looks horizontal only if trend is truly neutral; volatility adds
 *     texture but direction is driven by bias + pull
 *
 * Model per tick:
 *   noise  = ±volatility * NOISE_SCALE * price       → "textural" centavo noise
 *   pull   = (targetClose - price) * pullStrength     → gravity toward target
 *   drift  = trendBias * price * DRIFT_SCALE          → directional trend per tick
 *   change = noise + pull + drift
 *   newPrice = price + change   (absolute addition, not %)
 *
 * NOISE_SCALE: tiny fraction so per-tick noise is much smaller than drift
 * DRIFT_SCALE: small but non-zero so trend accumulates across many ticks
 * pullStrength: strongest factor — ensures price reaches targetClose by round end
 */

// Controls how much textural noise there is per tick (keeps chart from being flat)
// 0.003 = 0.3% of price per tick → for R$50 stock = ±R$0.15 centavo noise
const NOISE_SCALE = 0.003

// Directional drift per tick — small but accumulates into clear trend
// 0.0008 = 0.08% per tick → over 100 ticks = ~8.3% cumulative bias
const DRIFT_SCALE = 0.0008

// Pull toward targetClose per tick — main mechanism for clear charts
// 0.04 = 4% of gap closed per tick (multiplied by momentum ~0.08 = 0.32% per tick)
const PULL_STRENGTH = 0.04

// Wave mechanics to create bull/bear traps (zig-zags)
// The wave period is how many ticks it takes to complete a full sine cycle.
// e.g. 50 ticks = ~1 minute if ticks are 1s, creating satisfying local peaks/troughs
const WAVE_PERIOD = 60
const WAVE_AMPLITUDE = 0.005 // 0.5% max wave swing per tick

// FIIs are calmer — use 60% scale
const FII_SCALE = 0.6

export function generateTick(
  asset: BaseAsset,
  tickIndex: number = 0,
  marketMood: 'bull' | 'bear' | 'neutral' = 'neutral'
): number {
  const { currentPrice, targetClose, volatility, momentum, trend } = asset

  const safePrice = Math.max(0.01, currentPrice)

  // Tiny random textural noise — contributes centavos, not Reais
  const noise = (Math.random() * 2 - 1) * volatility * NOISE_SCALE * safePrice

  // Pull toward targetClose — grows stronger when far from target
  const gap = targetClose - safePrice
  const pull = gap * PULL_STRENGTH * momentum

  // Wave factor: creates artificial short-term cycles (bull traps / bear traps)
  // We offset it slightly per asset length so they don't all wave identically
  const phase = (tickIndex + asset.ticker.length * 10) / WAVE_PERIOD
  const wave = Math.sin(Math.PI * 2 * phase) * WAVE_AMPLITUDE * volatility * safePrice

  // Directional trend bias — accumulates over time into visible chart slope
  const trendBias = (
    trend === 'bullish' ? DRIFT_SCALE * safePrice :
      trend === 'bearish' ? -DRIFT_SCALE * safePrice :
        trend === 'volatile' ? (Math.random() * 2 - 1) * DRIFT_SCALE * 2 * safePrice :
    /* neutral */           0
  )

  // Global market mood
  const moodBias = (
    marketMood === 'bull' ? DRIFT_SCALE * safePrice :
      marketMood === 'bear' ? -DRIFT_SCALE * safePrice : 0
  )

  // small extra bias toward the target to help candles close correctly
  const longTermBias = (targetClose - safePrice) * 0.0005
  const newPrice = safePrice + noise + pull + trendBias + wave + moodBias + longTermBias

  return Math.max(0.01, Math.round(newPrice * 100) / 100)
}

export function generateFIITick(
  fii: FII,
  tickIndex: number = 0,
  marketMood: 'bull' | 'bear' | 'neutral' = 'neutral'
): number {
  const safePrice = Math.max(0.01, fii.currentPrice)

  // FIIs are much calmer: smaller noise, still pulled toward target
  const noise = (Math.random() * 2 - 1) * fii.volatility * NOISE_SCALE * FII_SCALE * safePrice

  const gap = fii.targetClose - safePrice
  const pull = gap * PULL_STRENGTH * fii.momentum * FII_SCALE

  // FII drift is gentler — mainly driven by pull and P/VP gravity
  const pvpGravity = (1 - fii.pvpRatio) * 0.004 * safePrice
  const trendBias = (
    fii.trend === 'bullish' ? DRIFT_SCALE * FII_SCALE * safePrice :
      fii.trend === 'bearish' ? -DRIFT_SCALE * FII_SCALE * safePrice :
        fii.trend === 'volatile' ? (Math.random() * 2 - 1) * DRIFT_SCALE * safePrice :
          0
  )

  const moodBias = (
    marketMood === 'bull' ? DRIFT_SCALE * FII_SCALE * safePrice :
      marketMood === 'bear' ? -DRIFT_SCALE * FII_SCALE * safePrice : 0
  )

  // FIIs wave slower and much weaker
  const phase = (tickIndex + fii.ticker.length * 10) / (WAVE_PERIOD * 2)
  const wave = Math.sin(Math.PI * 2 * phase) * (WAVE_AMPLITUDE * 0.3) * fii.volatility * safePrice

  const newPrice = safePrice + noise + pull + trendBias + pvpGravity + wave + moodBias
  const rounded = Math.max(0.01, Math.round(newPrice * 100) / 100)

  // Update P/VP after price move
  fii.pvpRatio = rounded / fii.patrimonyValue
  return rounded
}

/**
 * Estimate price at end of N more ticks, given current trend.
 * Used by AnalysisTab for end-of-round/end-of-game projection.
 * Note: estimate is simplified; ignores sine waves and local noise
 */
export function estimatePriceAfterTicks(
  price: number,
  targetClose: number,
  trend: BaseAsset['trend'],
  momentum: number,
  ticks: number,
  marketMood: 'bull' | 'bear' | 'neutral' = 'neutral'
): number {
  const pullDecay = Math.pow(1 - PULL_STRENGTH * momentum, ticks)
  const converged = targetClose - (targetClose - price) * pullDecay

  const driftPerTick = (
    trend === 'bullish' ? DRIFT_SCALE * price :
      trend === 'bearish' ? -DRIFT_SCALE * price :
        0
  )

  const moodDrift = (
    marketMood === 'bull' ? DRIFT_SCALE * price :
      marketMood === 'bear' ? -DRIFT_SCALE * price : 0
  )

  const cumulativeDrift = (driftPerTick + moodDrift) * ticks

  return Math.max(0.01, converged + cumulativeDrift)
}
