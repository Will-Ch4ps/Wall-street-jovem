import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { loadGameState, saveGameState } from '@/lib/gameStorage'
import type { GameState, MarketOffer } from '@/types'

export async function GET(request: NextRequest) {
  const state = await loadGameState()
  if (!state) {
    return NextResponse.json({ error: 'No game found' }, { status: 404 })
  }
  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('active') !== 'false'
  const offers = activeOnly
    ? state.marketOffers.filter((o) => o.isActive && new Date(o.expiresAt) > new Date())
    : state.marketOffers
  return NextResponse.json({ offers })
}

export async function POST(request: NextRequest) {
  try {
    const state = await loadGameState()
    if (!state) {
      return NextResponse.json({ error: 'No game found' }, { status: 404 })
    }

    const body = await request.json()
    const { action, ticker, type, offerPrice, totalQuantity, reason, expiresInMinutes } = body
    const asset = state.assets.find((a) => a.ticker === ticker)
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if (action === 'create') {
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + (expiresInMinutes ?? 3))
      const offer: MarketOffer = {
        id: nanoid(),
        ticker,
        type: type ?? 'sell',
        offerPrice,
        currentPriceAtCreation: asset.currentPrice,
        totalQuantity,
        remainingQuantity: totalQuantity,
        reason: reason ?? '',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        isActive: true,
        transactions: [],
      }
      const updatedState: GameState = {
        ...state,
        marketOffers: [...state.marketOffers, offer],
      }
      await saveGameState(updatedState)
      return NextResponse.json({ offer, state: updatedState })
    }

    return NextResponse.json(state)
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
