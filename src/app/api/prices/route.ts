import { NextResponse } from 'next/server'
import { loadGameState, saveGameState } from '@/lib/gameStorage'
import { generateTick, generateFIITick } from '@/engine/priceEngine'
import { buildCandle } from '@/engine/candleEngine'
import type { Asset, FII, PriceTick } from '@/types'

export async function GET() {
  const state = await loadGameState()
  if (!state) {
    return NextResponse.json({ error: 'No game found' }, { status: 404 })
  }

  const { game, assets, priceHistories } = state
  const currentRound = game.currentRound
  const round = state.rounds.find((r) => r.number === currentRound)

  if (
    game.status !== 'running' ||
    !round ||
    round.status !== 'active' ||
    assets.length === 0
  ) {
    return NextResponse.json({
      game,
      assets,
      priceHistories,
    })
  }

  const now = new Date()
  const lastUpdate = new Date(round.lastUpdateAt || round.startedAt || now.toISOString())
  let elapsedMs = now.getTime() - lastUpdate.getTime()

  // To avoid spam, only update if at least 1 second passed
  if (elapsedMs < 1000) {
    return NextResponse.json({ game, assets, priceHistories })
  }

  // --- STOP PRICE GENERATION IF ROUND HAS ENDED ---
  if (round.roundEndsAt) {
    const roundEndTime = new Date(round.roundEndsAt).getTime()
    if (lastUpdate.getTime() >= roundEndTime) {
      // We were already past the end time on previous run -> fully frozen
      return NextResponse.json({ game, assets, priceHistories })
    }
    if (now.getTime() > roundEndTime) {
      // Round expired during this specific elapsedMs chunk -> truncate elapsedTime
      elapsedMs = roundEndTime - lastUpdate.getTime()
      if (elapsedMs < 1000) {
        return NextResponse.json({ game, assets, priceHistories }) // Too small to tick
      }
    }
  }

  round.lastUpdateAt = now.toISOString()
  const secondsToSimulate = Math.min(120, Math.floor(elapsedMs / 1000)) // Cap at 120 ticks max to avoid hang
  const candleIntervalMs = game.config.candleIntervalMs || 60000

  const updatedAssets = [...assets]
  const updatedHistories = { ...priceHistories }

  for (let i = 0; i < updatedAssets.length; i++) {
    const asset = updatedAssets[i]
    if (asset.status !== 'active' && asset.status !== 'ipo_open') continue

    const hist = updatedHistories[asset.ticker] ?? {
      ticker: asset.ticker,
      ticks: [] as PriceTick[],
      candles: [],
    }

    if (!hist.formingCandle) {
      hist.formingCandle = {
        timestamp: now.toISOString(),
        open: asset.currentPrice,
        high: asset.currentPrice,
        low: asset.currentPrice,
        close: asset.currentPrice,
        volume: 0,
        round: currentRound
      }
    }

    // Run the engine for elapsed seconds
    for (let s = 0; s < secondsToSimulate; s++) {
      // Use priceHistories length as a persistent tickIndex for wave mechanics
      const tickIndex = hist.ticks ? hist.ticks.length + s : s
      const mood = game.config.marketMood || 'neutral'

      let tickPrice: number
      if (asset.type === 'fii') {
        tickPrice = generateFIITick(asset as FII, tickIndex, mood)
      } else {
        tickPrice = generateTick(asset, tickIndex, mood)
      }
      asset.currentPrice = tickPrice

      hist.formingCandle.high = Math.max(hist.formingCandle!.high, tickPrice)
      hist.formingCandle.low = Math.min(hist.formingCandle!.low, tickPrice)
      hist.formingCandle.close = tickPrice
    }

    // Check if candle should be closed based on time
    const currentCandleStart = new Date(hist.formingCandle.timestamp).getTime()
    if (now.getTime() - currentCandleStart >= candleIntervalMs) {
      // enforce closure near target so data matches projections
      asset.currentPrice = asset.targetClose
      hist.formingCandle.close = asset.targetClose

      // directional shadow hint: make upper/lower wick pull toward long‑term trend
      const open = hist.formingCandle.open
      const direction = asset.targetClose - open
      if (direction > 0) {
        // bullish candle: accentuate upper wick
        hist.formingCandle.high = Math.max(hist.formingCandle.high, asset.targetClose + Math.abs(direction) * 0.02)
      } else if (direction < 0) {
        // bearish candle: accentuate lower wick
        hist.formingCandle.low = Math.min(hist.formingCandle.low, asset.targetClose - Math.abs(direction) * 0.02)
      }

      hist.candles.push(hist.formingCandle)
      if (hist.candles.length > 50) hist.candles = hist.candles.slice(-50)

      // setup next forming candle
      hist.formingCandle = {
        timestamp: now.toISOString(),
        open: asset.currentPrice,
        high: asset.currentPrice,
        low: asset.currentPrice,
        close: asset.currentPrice,
        volume: 0,
        round: currentRound
      }
    }

    updatedHistories[asset.ticker] = hist
  }

  // Find round index and update it
  const rounds = [...state.rounds]
  const rIndex = rounds.findIndex(r => r.number === currentRound)
  if (rIndex >= 0) {
    rounds[rIndex] = round
  }

  await saveGameState({
    ...state,
    rounds,
    assets: updatedAssets,
    priceHistories: updatedHistories,
  })

  return NextResponse.json({
    game,
    assets: updatedAssets,
    priceHistories: updatedHistories,
  })
}
