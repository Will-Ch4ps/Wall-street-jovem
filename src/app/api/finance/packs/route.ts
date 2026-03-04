import { NextResponse } from 'next/server'
import { loadGameState, saveGameState } from '@/lib/gameStorage'
import { eventPacks } from '@/data/eventPacks'

export async function POST(request: Request) {
    try {
        const state = await loadGameState()
        if (!state) {
            return NextResponse.json({ error: 'No game found' }, { status: 404 })
        }

        const { packId } = await request.json()
        const pack = eventPacks.find(p => p.id === packId)

        if (!pack) {
            return NextResponse.json({ error: 'Event Pack not found' }, { status: 404 })
        }

        const updatedState = { ...state }

        // Execute Pack Logic (modifies state reference indirectly through references or directly inside fn)
        // To be safe, we pass the state and all cards. The function applies target prices / trends.
        const allCards = [
            ...updatedState.cards.globalDeck,
            ...Object.values(updatedState.cards.sectorDecks).flat(),
            ...Object.values(updatedState.cards.companyDecks).flat(),
            ...Object.values(updatedState.cards.fiiDecks).flat(),
            ...updatedState.cards.masterDeck
        ]

        pack.applyPack(updatedState, allCards)

        await saveGameState(updatedState)

        return NextResponse.json({ success: true, packName: pack.name })
    } catch (error) {
        console.error('Failed to trigger pack:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
