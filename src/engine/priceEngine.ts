import type { BaseAsset, FII } from '@/types'

/**
 * Price Engine — Brownian Motion with TIME-WEIGHTED Pull
 * ─────────────────────────────────────────────────────────────────────────────
 * Pull toward targetClose is WEAK at the start of a round and STRONG near
 * the end. Prices can wander freely early (trends, dips, rallies) and
 * converge to target in the final portion.
 *
 * The quadratic curve (progress²) keeps pull low for the first ~50% of
 * the round, then ramps up steadily in the second half.
 */

// ─── TUNING CONSTANTS ───

// Noise per tick: ~1% of price
const NOISE_SCALE = 0.010

// Directional trend drift per tick
const DRIFT_SCALE = 0.0012

// Pull toward targetClose: scales from BASE → END as round progresses
const PULL_BASE = 0.025      // light pull from the start (keeps prices trending)
const PULL_END = 0.22         // very strong pull near end (forces convergence)

// Wave mechanics
const WAVE_PERIOD = 28
const WAVE_AMPLITUDE = 0.014

// FII scale
const FII_SCALE = 0.55

// ─── MICRO-CRASH / SPIKE ───
const SPIKE_CHANCE = 0.03
const SPIKE_MIN = 0.010
const SPIKE_MAX = 0.030

// ─── MOMENTUM REVERSAL ───
const REVERSAL_CHANCE = 0.010
const REVERSAL_MIN_TICKS = 6
const REVERSAL_MAX_TICKS = 16
const REVERSAL_STRENGTH = 0.65

const reversalState: Map<string, { remaining: number; direction: number }> = new Map()

/**
 * @param roundProgress - 0.0 to 1.0 indicating how far through the round we are
 */
export function generateTick(
  asset: BaseAsset,
  tickIndex: number = 0,
  marketMood: 'bull' | 'bear' | 'neutral' = 'neutral',
  roundProgress: number = 0.5
): number {
  const { currentPrice, targetClose, volatility, momentum, trend } = asset
  const safePrice = Math.max(0.01, currentPrice)

  // ── 1. Time-weighted pull (QUADRATIC: stays low early, ramps in second half) ──
  const progressCurve = Math.pow(Math.min(1, roundProgress), 2)
  const pullStrength = PULL_BASE + (PULL_END - PULL_BASE) * progressCurve

  const gap = targetClose - safePrice
  const pull = gap * pullStrength * Math.max(0.05, momentum)

  // ── 2. Noise ──
  const noise = (Math.random() * 2 - 1) * volatility * NOISE_SCALE * safePrice

  // ── 3. Wave ──
  const phase = (tickIndex + asset.ticker.charCodeAt(0) * 7) / WAVE_PERIOD
  const wave = Math.sin(Math.PI * 2 * phase) * WAVE_AMPLITUDE * volatility * safePrice

  // ── 4. Trend bias ──
  let trendBias =
    trend === 'bullish' ? DRIFT_SCALE * safePrice :
      trend === 'bearish' ? -DRIFT_SCALE * safePrice :
        trend === 'volatile' ? (Math.random() * 2 - 1) * DRIFT_SCALE * 2 * safePrice :
          0

  // ── 5. Momentum reversal ──
  const key = asset.ticker
  let rev = reversalState.get(key)
  if (rev && rev.remaining > 0) {
    trendBias = -trendBias * REVERSAL_STRENGTH * rev.direction
    rev.remaining--
    if (rev.remaining <= 0) reversalState.delete(key)
  } else if (trend !== 'neutral' && Math.random() < REVERSAL_CHANCE) {
    const dur = REVERSAL_MIN_TICKS + Math.floor(Math.random() * (REVERSAL_MAX_TICKS - REVERSAL_MIN_TICKS))
    reversalState.set(key, { remaining: dur, direction: 1 })
    trendBias = -trendBias * REVERSAL_STRENGTH
  }

  // ── 6. Market mood ──
  const moodBias =
    marketMood === 'bull' ? DRIFT_SCALE * 0.7 * safePrice :
      marketMood === 'bear' ? -DRIFT_SCALE * 0.7 * safePrice : 0

  // ── 7. Spike ──
  let spike = 0
  if (Math.random() < SPIKE_CHANCE) {
    const mag = SPIKE_MIN + Math.random() * (SPIKE_MAX - SPIKE_MIN)
    const dir = Math.random() < 0.5 ? 1 : -1
    const trendDir = trend === 'bullish' ? 0.3 : trend === 'bearish' ? -0.3 : 0
    spike = safePrice * mag * (dir + trendDir)
  }

  const newPrice = safePrice + noise + pull + trendBias + wave + moodBias + spike
  return Math.max(0.01, Math.round(newPrice * 100) / 100)
}

export function generateFIITick(
  fii: FII,
  tickIndex: number = 0,
  marketMood: 'bull' | 'bear' | 'neutral' = 'neutral',
  roundProgress: number = 0.5
): number {
  const safePrice = Math.max(0.01, fii.currentPrice)

  const progressCurve = Math.pow(Math.min(1, roundProgress), 2)
  const pullStrength = (PULL_BASE + (PULL_END - PULL_BASE) * progressCurve) * FII_SCALE

  const noise = (Math.random() * 2 - 1) * fii.volatility * NOISE_SCALE * FII_SCALE * safePrice
  const gap = fii.targetClose - safePrice
  const pull = gap * pullStrength * Math.max(0.05, fii.momentum)

  const pvpGravity = (1 - fii.pvpRatio) * 0.003 * safePrice
  const trendBias =
    fii.trend === 'bullish' ? DRIFT_SCALE * FII_SCALE * safePrice :
      fii.trend === 'bearish' ? -DRIFT_SCALE * FII_SCALE * safePrice :
        fii.trend === 'volatile' ? (Math.random() * 2 - 1) * DRIFT_SCALE * safePrice : 0

  const moodBias =
    marketMood === 'bull' ? DRIFT_SCALE * FII_SCALE * safePrice :
      marketMood === 'bear' ? -DRIFT_SCALE * FII_SCALE * safePrice : 0

  const phase = (tickIndex + fii.ticker.charCodeAt(0) * 7) / (WAVE_PERIOD * 1.5)
  const wave = Math.sin(Math.PI * 2 * phase) * (WAVE_AMPLITUDE * 0.35) * fii.volatility * safePrice

  let spike = 0
  if (Math.random() < SPIKE_CHANCE * 0.5) {
    const mag = SPIKE_MIN * 0.5 + Math.random() * (SPIKE_MAX * 0.5 - SPIKE_MIN * 0.5)
    spike = safePrice * mag * (Math.random() < 0.5 ? 1 : -1)
  }

  const newPrice = safePrice + noise + pull + trendBias + pvpGravity + wave + moodBias + spike
  const rounded = Math.max(0.01, Math.round(newPrice * 100) / 100)
  fii.pvpRatio = rounded / fii.patrimonyValue
  return rounded
}

export function estimatePriceAfterTicks(
  price: number,
  targetClose: number,
  trend: BaseAsset['trend'],
  momentum: number,
  ticks: number,
  marketMood: 'bull' | 'bear' | 'neutral' = 'neutral'
): number {
  const pullDecay = Math.pow(1 - PULL_END * Math.max(0.05, momentum), ticks)
  const converged = targetClose - (targetClose - price) * pullDecay
  const driftPerTick =
    trend === 'bullish' ? DRIFT_SCALE * price :
      trend === 'bearish' ? -DRIFT_SCALE * price : 0
  const moodDrift =
    marketMood === 'bull' ? DRIFT_SCALE * price :
      marketMood === 'bear' ? -DRIFT_SCALE * price : 0
  return Math.max(0.01, converged + (driftPerTick + moodDrift) * ticks)
}
