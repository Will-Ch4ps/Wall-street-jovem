import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { loadGameState, saveGameState } from '@/lib/gameStorage'
import { validateTransaction } from '@/engine/validator'
import type { GameState, OwnerType, Position, Portfolio, Transaction } from '@/types'

function getOrCreatePortfolio(
  portfolios: Portfolio[],
  ownerId: string,
  ownerType: OwnerType
): Portfolio {
  const existing = portfolios.find((p) => p.ownerId === ownerId && p.ownerType === ownerType)
  if (existing) return existing
  return { ownerId, ownerType, positions: [] }
}

export async function POST(request: NextRequest) {
  try {
    const state = await loadGameState()
    if (!state) {
      return NextResponse.json({ error: 'No game found' }, { status: 404 })
    }

    const body = await request.json()
    const { type, buyerId, buyerType, sellerId, sellerType, ticker, quantity, price } = body

    if (type !== 'buy' && type !== 'sell') {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 })
    }

    const asset = state.assets.find((a) => a.ticker === ticker)
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })

    // After-hours trading check
    const currentRoundData = state.rounds.find(r => r.number === state.game.currentRound)
    const roundEnded = currentRoundData?.roundEndsAt
      ? new Date(currentRoundData.roundEndsAt).getTime() < Date.now()
      : false
    const gameNotRunning = state.game.status !== 'running'

    if ((gameNotRunning || roundEnded) && !state.game.config.allowAfterHours) {
      return NextResponse.json(
        { error: 'Negociações encerradas — pregão fora do horário. Habilite "Negociações Após Fechamento" nas regras.' },
        { status: 400 }
      )
    }

    // Determine execution price: custom price for P2P, or fixed last close after hours
    let execPriceOverride: number | undefined = price
    if ((gameNotRunning || roundEnded) && state.game.config.allowAfterHours && state.game.config.afterHoursFixedPrice) {
      // After-hours fixed: use last candle close
      const hist = state.priceHistories[ticker]
      execPriceOverride = hist?.candles.slice(-1)[0]?.close ?? asset.currentPrice
    }

    const currentRound = state.game.currentRound
    const buyerCash =
      buyerType === 'player'
        ? state.players.find((p) => p.id === buyerId)?.cash ?? 0
        : state.holdings.find((h) => h.id === buyerId)?.cash ?? 0
    const sellerPortfolio = getOrCreatePortfolio(
      state.portfolios,
      sellerId,
      sellerType as OwnerType
    )
    const sellerPosition = sellerPortfolio.positions.find((p) => p.ticker === ticker)

    const total = (price ?? asset.currentPrice) * (quantity ?? 0)

    // Detect P2P: seller is not market (for buys); buyer is not market (for sells)
    const isP2P = type === 'buy'
      ? (sellerId !== 'market' && sellerId !== undefined)
      : (buyerId !== 'market' && buyerId !== undefined)

    // Detect day trade: seller bought this asset in the current round
    const isSameRoundAsBuy = type === 'sell' && state.transactions.some(
      t => t.type === 'buy' && t.ticker === ticker && t.buyerId === sellerId && t.round === state.game.currentRound
    )

    const validation = validateTransaction({
      tx: { type, price: price ?? asset.currentPrice, quantity, total },
      config: state.game.config,
      asset,
      buyerCash,
      sellerPosition,
      availableShares: asset.availableShares,
      isP2P,
      isSameRoundAsBuy,
    })

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errors.join(', ') },
        { status: 400 }
      )
    }

    const execPrice = execPriceOverride ?? asset.currentPrice
    const execQty = quantity ?? 0
    const execTotal = execPrice * execQty

    const now = new Date().toISOString()
    const txId = nanoid()
    const tx: Transaction = {
      id: txId,
      timestamp: now,
      round: currentRound,
      type,
      buyerId,
      buyerType: buyerType as OwnerType,
      sellerId,
      sellerType: sellerType as OwnerType,
      ticker,
      quantity: execQty,
      price: execPrice,
      total: execTotal,
      description:
        type === 'buy'
          ? `${buyerId} comprou ${execQty} ${ticker} @ R$${execPrice.toFixed(2)}`
          : `${sellerId} vendeu ${execQty} ${ticker} @ R$${execPrice.toFixed(2)}`,
    }

    const portfolios = [...state.portfolios]
    const players = state.players.map((p) => ({ ...p }))
    const holdings = state.holdings.map((h) => ({ ...h }))
    const assets = state.assets.map((a) => (a.ticker === ticker ? { ...a } : a))
    const updatedAsset = assets.find((a) => a.ticker === ticker)!

    if (type === 'buy') {
      const buyerIdx = buyerType === 'player'
        ? players.findIndex((p) => p.id === buyerId)
        : holdings.findIndex((h) => h.id === buyerId)
      if (buyerType === 'player' && buyerIdx >= 0) {
        players[buyerIdx].cash -= execTotal
      }
      if (buyerType === 'holding' && buyerIdx >= 0) {
        holdings[buyerIdx].cash -= execTotal
      }

      const buyerPortfolio: Portfolio = portfolios.find(
        (p) => p.ownerId === buyerId && p.ownerType === (buyerType as OwnerType)
      ) ?? { ownerId: buyerId, ownerType: buyerType as OwnerType, positions: [] as Position[] }
      const posIdx = buyerPortfolio.positions.findIndex((p) => p.ticker === ticker)
      if (posIdx >= 0) {
        const pos = buyerPortfolio.positions[posIdx]
        const newQty = pos.quantity + execQty
        const newInvested = pos.totalInvested + execTotal
        buyerPortfolio.positions[posIdx] = {
          ticker,
          quantity: newQty,
          avgPrice: newInvested / newQty,
          totalInvested: newInvested,
        }
      } else {
        buyerPortfolio.positions.push({
          ticker,
          quantity: execQty,
          avgPrice: execPrice,
          totalInvested: execTotal,
        })
      }
      if (!portfolios.some((p) => p.ownerId === buyerId && p.ownerType === buyerType)) {
        portfolios.push(buyerPortfolio)
      }

      const sellerIdActual = sellerId === 'market' ? 'market' : sellerId
      if (sellerIdActual === 'market') {
        updatedAsset.availableShares -= execQty
      } else {
        const sellerPort = portfolios.find(
          (p) => p.ownerId === sellerId && p.ownerType === (sellerType as OwnerType)
        )
        if (sellerPort) {
          const sp = sellerPort.positions.find((p) => p.ticker === ticker)
          if (sp) {
            sp.quantity -= execQty
            if (sp.quantity <= 0) {
              sellerPort.positions = sellerPort.positions.filter((p) => p.ticker !== ticker)
            }
          }
        }
      }
    } else {
      const sellerIdx = sellerType === 'player'
        ? players.findIndex((p) => p.id === sellerId)
        : holdings.findIndex((h) => h.id === sellerId)
      if (sellerType === 'player' && sellerIdx >= 0) {
        players[sellerIdx].cash += execTotal
      }
      if (sellerType === 'holding' && sellerIdx >= 0) {
        holdings[sellerIdx].cash += execTotal
      }

      const sellerPort = portfolios.find(
        (p) => p.ownerId === sellerId && p.ownerType === (sellerType as OwnerType)
      )
      if (sellerPort) {
        const sp = sellerPort.positions.find((p) => p.ticker === ticker)
        if (sp) {
          sp.quantity -= execQty
          if (sp.quantity <= 0) {
            sellerPort.positions = sellerPort.positions.filter((p) => p.ticker !== ticker)
          }
        }
      }

      if (buyerId === 'market') {
        updatedAsset.availableShares += execQty
      } else {
        const buyerPort: Portfolio = portfolios.find(
          (p) => p.ownerId === buyerId && p.ownerType === (buyerType as OwnerType)
        ) ?? { ownerId: buyerId, ownerType: buyerType as OwnerType, positions: [] as Position[] }
        const bp = buyerPort.positions.find((p) => p.ticker === ticker)
        if (bp) {
          bp.quantity += execQty
          bp.totalInvested += execTotal
          bp.avgPrice = bp.totalInvested / bp.quantity
        } else {
          buyerPort.positions.push({
            ticker,
            quantity: execQty,
            avgPrice: execPrice,
            totalInvested: execTotal,
          })
        }
        if (!portfolios.some((p) => p.ownerId === buyerId && p.ownerType === buyerType)) {
          portfolios.push(buyerPort)
        }
      }
    }

    // --- MARKET REACTION TO STUDENT TRADES (PRICE IMPACT) ---
    // User Request: "a compra dos alunos deve impactar no valor das ações depois"
    // Buying from "market" removes supply -> Target UP
    // Selling to "market" dumps supply -> Target DOWN
    // P2P -> Driven by premium/discount of the negotiated price compared to current list price.
    const baseImpactFactor = 0.00002 // 0.002% per share executed

    if (isP2P) {
      const premiumPct = (execPrice / asset.currentPrice) - 1
      const p2pImpact = (premiumPct * asset.currentPrice) * Math.min(1, execQty / 2000)
      updatedAsset.targetClose = Math.max(0.01, updatedAsset.targetClose + p2pImpact)
    } else {
      const volumeImpact = execQty * asset.currentPrice * baseImpactFactor
      if (type === 'buy') {
        updatedAsset.targetClose += volumeImpact
        // Boost momentum temporarily to quickly react to the large volume
        updatedAsset.momentum = Math.min(0.5, (updatedAsset.momentum || 0.08) + 0.02)
      } else {
        updatedAsset.targetClose = Math.max(0.01, updatedAsset.targetClose - volumeImpact)
        updatedAsset.momentum = Math.min(0.5, (updatedAsset.momentum || 0.08) + 0.02)
      }
    }

    const updatedState: GameState = {
      ...state,
      assets,
      players,
      holdings,
      portfolios,
      transactions: [...state.transactions, tx],
    }
    await saveGameState(updatedState)

    return NextResponse.json({ transaction: tx, state: updatedState })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Transaction failed' },
      { status: 500 }
    )
  }
}
