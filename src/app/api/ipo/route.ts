import { NextRequest, NextResponse } from 'next/server'
import { loadGameState, saveGameState } from '@/lib/gameStorage'
import type { GameState, Asset, MarketOffer, News } from '@/types'

export async function POST(request: NextRequest) {
    try {
        const state = await loadGameState()
        if (!state) return NextResponse.json({ error: 'No game found' }, { status: 404 })

        const body = await request.json()
        const { ticker, offerPrice } = body
        const currentRound = state.game.currentRound

        // 1. Encontrar o asset na lista
        const assetIndex = state.assets.findIndex(a => a.ticker === ticker)
        if (assetIndex === -1) {
            return NextResponse.json({ error: 'Ativo não encontrado.' }, { status: 404 })
        }
        const asset = state.assets[assetIndex]

        if (asset.status !== 'ipo_pending') {
            return NextResponse.json({ error: 'Ativo não está em status de IPO pendente.' }, { status: 400 })
        }

        // 2. Atualizar o asset para ativo e o preço atual para o preço de oferta
        const quantity = asset.availableShares || 1000 // default as 1000 if not set
        const updatedAsset = {
            ...asset,
            status: 'active' as const,
            currentPrice: offerPrice,
            openPrice: offerPrice,
            initialPrice: offerPrice
        }

        const newAssets = [...state.assets]
        newAssets[assetIndex] = updatedAsset

        // 3. Criar a MarketOffer para que os jogadores possam comprar o montante
        const newOffer: MarketOffer = {
            id: crypto.randomUUID(),
            ticker: ticker,
            type: 'sell', // mercado vendendo ações para os jogadores
            offerPrice: offerPrice,
            currentPriceAtCreation: offerPrice,
            totalQuantity: quantity,
            remainingQuantity: quantity,
            reason: `IPO Oficial de ${asset.name}`,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // won't expire basically
            isActive: true,
            transactions: []
        }

        // 4. Criar Notícia Pública
        const newsEntry: News = {
            id: crypto.randomUUID(),
            round: currentRound,
            timestamp: new Date().toISOString(),
            title: `🔔 JANELA DE IPO ABERTA: ${ticker}`,
            body: `A empresa ${asset.name} (${asset.sector}) acaba de fazer sua Oferta Pública Inicial (IPO) no mercado. Cotas estão disponíveis em Oferta de Destaque no valor de R$${offerPrice.toFixed(2)}. Corra para aproveitar!`,
            source: 'B3 Oficial',
            category: 'economy',
            scope: 'global',
            targets: [ticker],
            isRandom: false,
            isPublic: true,
            masterOnly: false,
            isActive: true,
        }

        const newPriceHistories = { ...state.priceHistories }
        newPriceHistories[ticker] = {
            ticker: ticker,
            ticks: [],
            candles: []
        }

        const updatedState = {
            ...state,
            assets: newAssets,
            marketOffers: [newOffer, ...state.marketOffers], // coloca no topo
            news: [newsEntry, ...(state.news || [])],
            priceHistories: newPriceHistories
        }

        await saveGameState(updatedState)
        return NextResponse.json({ success: true, state: updatedState })

    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 })
    }
}
