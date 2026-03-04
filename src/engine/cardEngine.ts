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
      // compute stability factor: assets with lower volatility are more consolidated
      const stabilityFactor = 1 - Math.min(0.5, asset.volatility)
      const impact = applyPriceModifier(asset, effect.priceModifier, { stabilityFactor })
      impactMap[asset.ticker] = impact
      // also give a bump to volatility so prices swing more before settling
      asset.volatility = Math.min(0.3, asset.volatility * 1.4)
    }
    if (effect.volatilityModifier != null) {
      asset.volatility = Math.min(0.2, asset.volatility * (1 + effect.volatilityModifier))
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
