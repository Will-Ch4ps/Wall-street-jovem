import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadGameState, saveGameState } from '@/lib/gameStorage'
import { applyCardEffect } from '@/engine/cardEngine'
import type { CardEffect, GameEvent, NewsScope, Card } from '@/types'

function pickRandom<T>(items: T[], weights: number[]): T | null {
    if (items.length === 0) return null
    const totalWeight = weights.reduce((acc, w) => acc + w, 0)
    let random = Math.random() * totalWeight
    for (let i = 0; i < items.length; i++) {
        random -= weights[i]
        if (random <= 0) return items[i]
    }
    return items[items.length - 1]
}

const weightMap: Record<string, number> = {
    common: 40,
    uncommon: 25,
    rare: 15,
    very_rare: 5,
}

export async function GET() {
    const state = await loadGameState()
    if (!state) {
        return NextResponse.json({ error: 'No game found' }, { status: 404 })
    }
    return NextResponse.json({ events: state.events })
}

export async function POST(request: NextRequest) {
    try {
        const state = await loadGameState()
        if (!state) {
            return NextResponse.json({ error: 'No game found' }, { status: 404 })
        }

        const body = await request.json().catch(() => ({}))
        const { action, templateId, targetTicker, isPositive, ignoreLimit } = body
        const currentRound = state.game.currentRound

        // --- VERIFICAÇÃO DE LIMITE GLOBAL ---
        const maxCardsPerRound = state.game.config.maxCardsPerRound ?? 3
        const eventsPlayedThisRound = (state.events || []).filter(e => e.round === currentRound).length
        const cardsPlayedThisRound = (state.activeCardEffects || []).filter(e => e.round === currentRound).length
        const randomNewsThisRound = (state.news || []).filter(n => n.round === currentRound && n.isRandom).length
        const totalPlayed = eventsPlayedThisRound + cardsPlayedThisRound + randomNewsThisRound

        // Se a call não tiver a flag ignoreLimit (ex: sorteio automático do sistema), trava. Se tiver (mestre clicando), passa.
        if ((action === 'draw' || action === 'playSpecific') && !ignoreLimit) {
            if (totalPlayed >= maxCardsPerRound) {
                return NextResponse.json(
                    {
                        error: `Limite de ${maxCardsPerRound} evento(s) por rodada atingido.`,
                        limitReached: true
                    },
                    { status: 400 }
                )
            }
        }


        // Fetch all active event templates from DB
        const templates = await prisma.eventTemplate.findMany()

        let selectedTemplate = null

        if (action === 'playSpecific' && templateId) {
            selectedTemplate = templates.find(t => t.id === templateId)
            if (!selectedTemplate) {
                return NextResponse.json({ error: 'Event Template not found' }, { status: 404 })
            }
        } else if (action === 'draw') {
            // 1. Convert DB records and apply optional master filters
            let eligible = templates.filter(t => {
                // Master filters: Good/Bad
                if (isPositive !== undefined && t.isPositive !== isPositive) return false

                // Master filters: Target Ticker
                if (targetTicker) {
                    // If a target ticker is specified, we must ensure this event CAN affect it
                    const linkedTickers = t.linkedTickers ? JSON.parse(t.linkedTickers) : []
                    if (t.scope === 'global') {
                        // Global events affect everyone or specific sectors. 
                        if (linkedTickers.length > 0 && !linkedTickers.includes(targetTicker)) return false
                    } else {
                        // For company/fii/sector, if it has strict tickers, it must match
                        if (linkedTickers.length > 0 && !linkedTickers.includes(targetTicker)) return false
                    }
                }

                // 2. Cooldown check
                const cooldown = t.cooldownRounds || 0
                if (cooldown > 0) {
                    // Find last time this template was played
                    const lastUses = (state.events || []).filter(e => e.templateId === t.id)
                    const lastUse = lastUses[lastUses.length - 1]
                    if (lastUse && (currentRound - lastUse.round < cooldown)) {
                        return false // Still on cooldown
                    }
                }
                return true
            })

            if (eligible.length === 0) {
                return NextResponse.json({ error: 'No eligible events found for these filters or all on cooldown.' }, { status: 400 })
            }

            // Pick random by probability weight
            const weights = eligible.map(t => weightMap[t.probability] || 25)
            selectedTemplate = pickRandom(eligible, weights)
        }

        if (!selectedTemplate) {
            return NextResponse.json({ error: 'Failed to pick event' }, { status: 500 })
        }

        // Parse effect
        const effect: CardEffect = JSON.parse(selectedTemplate.effectJson)
        const duration = effect.duration || 1

        // Determine actual targets based on the effect and optionally the forced targetTicker
        let appliedTargets: string[] = []
        if (targetTicker) { // Master forced a target, so we override the template's default target mapping
            effect.target = 'company'
            effect.targetFilter = targetTicker
            appliedTargets = [targetTicker]
        } else if (effect.target === 'all') {
            appliedTargets = ['Todos']
        } else if (effect.targetFilter) {
            appliedTargets = [effect.targetFilter]
        }

        // Apply the mechanical card effect and capture actual per-asset impacts
        const dummyCard = { effect } as Card
        const impactMap = applyCardEffect(dummyCard, state.assets, state)

        // Ensure icon exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const iconStr = (selectedTemplate as any).icon || '📰'

        // Build the GameEvent object
        const gameEvent: GameEvent = {
            id: crypto.randomUUID(),
            templateId: selectedTemplate.id,
            name: selectedTemplate.name,
            headline: selectedTemplate.headline || selectedTemplate.name,
            icon: iconStr,
            title: selectedTemplate.title,
            body: selectedTemplate.body,
            expertTip: selectedTemplate.expertTip || undefined,
            expertAnalysis: selectedTemplate.expertAnalysis || undefined,
            scope: selectedTemplate.scope as NewsScope,
            category: selectedTemplate.category as import('@/types').News['category'],
            isPositive: selectedTemplate.isPositive,
            effect,
            duration,
            targets: appliedTargets,
            round: currentRound,
            timestamp: new Date().toISOString(),
            expiresAtRound: currentRound + duration,
            isActive: true,
            isRevealed: state.game.config.autoRevealNews ?? true,
            impactMap: Object.keys(impactMap).length ? impactMap : undefined,
        }

        // Add to game state
        const updatedState = {
            ...state,
            events: [...(state.events || []), gameEvent],
        }

        await saveGameState(updatedState)
        return NextResponse.json({ event: gameEvent, state: updatedState })

    } catch (err) {
        console.error(err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed' },
            { status: 500 }
        )
    }
}