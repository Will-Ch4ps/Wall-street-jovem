import type { Asset, BaseAsset, Card, CardProbability, GameState } from '@/types'
import { applyPriceModifier } from './candleEngine'

const WEIGHTS: Record<CardProbability, number> = {
  common: 40,
  uncommon: 25,
  rare: 15,
  very_rare: 5,
}

export function drawCard(
  deck: Card[],
  currentRound: number,
  cooldownRounds = 2
): Card | null {
  const eligible = deck.filter((card) => {
    if (card.isUsed && card.lastUsedRound != null) {
      if (currentRound - card.lastUsedRound < cooldownRounds) return false
    }
    return true
  })

  if (eligible.length === 0) return null

  const pool: Card[] = []
  for (const card of eligible) {
    const weight = WEIGHTS[card.probability] ?? 25
    for (let i = 0; i < weight; i++) {
      pool.push(card)
    }
  }

  const drawn = pool[Math.floor(Math.random() * pool.length)]
  drawn.isUsed = true
  drawn.lastUsedRound = currentRound
  return drawn
}

export function decideWhichDeck(): 'global' | 'company' | 'fii' {
  const roll = Math.random() * 100
  if (roll < 50) return 'global'
  if (roll < 80) return 'company'
  return 'fii'
}

// ──────────────────────────────────────────────────────────────
// Per-company multiplier based on consolidation profile
// ──────────────────────────────────────────────────────────────

/**
 * Compute a multiplier that makes consolidated companies less affected
 * and speculative companies more affected by the same event.
 *
 * Returns a number roughly in [0.30, 1.80]:
 *   - Consolidated / defensive → 0.30–0.65
 *   - Normal → 0.70–1.20
 *   - Speculative / growth → 1.20–1.80
 */
function companyImpactMultiplier(asset: BaseAsset): number {
  const tags = asset.tags ?? []
  let base = 1.0

  // ── Defensive traits (reduce impact) ──
  const defensiveTags = ['defensivo', 'lider', 'monopolio', 'dividendos']
  const defensiveHits = defensiveTags.filter(t => tags.includes(t)).length
  if (defensiveHits > 0) {
    // Each defensive tag reduces base by 15-20%
    base -= defensiveHits * (0.15 + Math.random() * 0.05)
  }

  // Low volatility = more consolidated
  if (asset.volatility < 0.06) {
    base -= (0.10 + Math.random() * 0.10) // -10% to -20%
  }

  // ── Speculative traits (amplify impact) ──
  const specTags = ['growth', 'especulativo', 'cíclica']
  const specHits = specTags.filter(t => tags.includes(t)).length
  if (specHits > 0) {
    // Each speculative tag increases base by 15-25%
    base += specHits * (0.15 + Math.random() * 0.10)
  }

  // High volatility = more reactive to news
  if (asset.volatility > 0.14) {
    base += (0.15 + Math.random() * 0.15) // +15% to +30%
  }

  // ── Clamp to sensible range ──
  return Math.max(0.30, Math.min(1.80, base))
}

/**
 * For global events, companies outside the event's target sector
 * receive a reduced and randomized portion of the impact.
 */
function crossSectorDampening(asset: BaseAsset, effectTargetFilter?: string): number {
  if (!effectTargetFilter) return 1.0 // no filter = full impact

  // Check if asset belongs to the target sector
  const tags = asset.tags ?? []
  const sectorMatch =
    asset.sector === effectTargetFilter ||
    tags.includes(effectTargetFilter.toLowerCase())

  if (sectorMatch) return 1.0 // same sector = full impact

  // Other sectors receive 40-90% of the impact
  return 0.40 + Math.random() * 0.50
}

export function applyCardEffect(
  card: Card,
  assets: Asset[],
  state: GameState
): Record<string, number> {
  const { effect } = card
  const targets: BaseAsset[] = []
  const impactMap: Record<string, number> = {}

  if (effect.target === 'all') {
    targets.push(...assets.filter((a) => a.status === 'active' || a.status === 'ipo_open'))
  } else if (effect.target === 'sector' && effect.targetFilter) {
    targets.push(
      ...assets.filter(
        (a) =>
          a.tags?.includes(effect.targetFilter!) &&
          (a.status === 'active' || a.status === 'ipo_open')
      )
    )
  } else if (effect.target === 'company' && effect.targetFilter) {
    const a = assets.find(
      (x) =>
        (x.ticker === effect.targetFilter || x.sector === effect.targetFilter) &&
        (x.type === 'stock' || x.type === 'fii')
    )
    if (a) targets.push(a)
  } else if (effect.target === 'fii') {
    const fiis = assets.filter(
      (a) => a.type === 'fii' && (a.status === 'active' || a.status === 'ipo_open')
    )
    if (effect.targetFilter) {
      const f = fiis.find((x) => x.ticker === effect.targetFilter)
      if (f) targets.push(f)
    } else if (fiis.length > 0) {
      targets.push(fiis[Math.floor(Math.random() * fiis.length)])
    }
  }

  for (const asset of targets) {
    if (effect.priceModifier) {
      // ── Per-company differentiated impact ──
      const companyMult = companyImpactMultiplier(asset)
      const sectorDamp = crossSectorDampening(asset, effect.targetFilter)
      const combinedMult = companyMult * sectorDamp

      // Adjust the modifier range for this specific company
      const adjustedModifier = {
        min: effect.priceModifier.min * combinedMult,
        max: effect.priceModifier.max * combinedMult,
      }

      // applyPriceModifier now uses Gaussian distribution internally
      const impact = applyPriceModifier(asset, adjustedModifier)
      impactMap[asset.ticker] = impact
    }
    if (effect.volatilityModifier != null) {
      asset.volatility = Math.min(0.25, asset.volatility * (1 + effect.volatilityModifier))
    }
    if (effect.suspend) {
      asset.status = 'suspended'
    }
    if (effect.trendOverride) {
      asset.trend = effect.trendOverride
    }
  }

  if (effect.cashBonus && effect.targetFilter) {
    const player = state.players.find((p) => p.id === effect.targetFilter)
    if (player) {
      player.cash += effect.cashBonus
    }
    const holding = state.holdings.find((h) => h.id === effect.targetFilter)
    if (holding) {
      holding.cash += effect.cashBonus
    }
  }

  return impactMap
}
