import { NextRequest, NextResponse } from 'next/server'
import { loadGameState, saveGameState } from '@/lib/gameStorage'
import { drawCard, decideWhichDeck, applyCardEffect } from '@/engine/cardEngine'
import { globalDeck, companyDeck, fiiDeck } from '@/data/defaultCards'

export async function GET() {
  const state = await loadGameState()
  if (!state) return NextResponse.json({ error: 'No game found' }, { status: 404 })
  return NextResponse.json({ cards: state.cards, activeCardEffects: state.activeCardEffects })
}

export async function POST(request: NextRequest) {
  try {
    const state = await loadGameState()
    if (!state) return NextResponse.json({ error: 'No game found' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const { action, cardType, cardId, ignoreLimit } = body
    const currentRound = state.game.currentRound

    const cardsPlayedThisRound = (state.activeCardEffects || []).filter((e) => e.round === currentRound).length
    const eventsPlayedThisRound = (state.events || []).filter((e) => e.round === currentRound).length
    const randomNewsThisRound = (state.news || []).filter((n) => n.round === currentRound && n.isRandom).length
    const totalPlayedThisRound = cardsPlayedThisRound + eventsPlayedThisRound + randomNewsThisRound
    const maxCardsPerRound = state.game.config.maxCardsPerRound ?? 3

    if ((action === 'draw' || action === 'playSpecific') && !ignoreLimit) {
      if (totalPlayedThisRound >= maxCardsPerRound) {
        return NextResponse.json(
          { error: `Limite de rodada atingido.`, limitReached: true },
          { status: 400 }
        )
      }
    }

    if (action === 'draw') {
      const deckType = cardType ?? decideWhichDeck()
      let deck = globalDeck
      if (deckType === 'company') deck = companyDeck
      else if (deckType === 'fii') deck = fiiDeck

      const drawn = drawCard(deck.map((c) => ({ ...c, isUsed: false, lastUsedRound: undefined })), currentRound)
      if (!drawn) return NextResponse.json({ error: 'No card available', state })

      applyCardEffect(drawn, state.assets, state)

      const newsEntries = [...(state.news || [])]
      if (drawn.generateNews) {
        newsEntries.push({
          id: crypto.randomUUID(),
          round: currentRound,
          timestamp: new Date().toISOString(),
          title: `📰 ${drawn.name}`,
          body: drawn.description ?? `O evento "${drawn.name}" foi ativado e está impactando o mercado.`,
          source: 'Rádio Market',
          category: 'economy',
          scope: 'global',
          targets: drawn.effect?.targetFilter ? [drawn.effect.targetFilter] : [],
          templateId: drawn.newsTemplate,
          isRandom: false,
          isPublic: state.game.config.autoRevealNews !== false,
          masterOnly: state.game.config.autoRevealNews === false,
          isActive: true,
        })
      }

      const updatedState = {
        ...state,
        news: newsEntries,
        activeCardEffects: [...(state.activeCardEffects || []), { cardId: drawn.id, appliedAt: new Date().toISOString(), round: currentRound, effect: drawn.effect }],
      }
      await saveGameState(updatedState)
      return NextResponse.json({ card: drawn, state: updatedState })
    }

    if (action === 'playSpecific') {
      const allCards = [...globalDeck, ...companyDeck, ...fiiDeck]
      const cardToPlay = allCards.find((c) => c.id === cardId)
      if (!cardToPlay) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

      applyCardEffect(cardToPlay, state.assets, state)

      const updatedState = {
        ...state,
        activeCardEffects: [...(state.activeCardEffects || []), { cardId: cardToPlay.id, appliedAt: new Date().toISOString(), round: currentRound, effect: cardToPlay.effect }],
      }
      await saveGameState(updatedState)
      return NextResponse.json({ card: cardToPlay, state: updatedState })
    }

    return NextResponse.json(state)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
          targets: drawn.effect?.targetFilter ? [drawn.effect.targetFilter] : [],
          templateId: drawn.newsTemplate,
          isRandom: false,
          isPublic: state.game.config.autoRevealNews !== false,
          masterOnly: state.game.config.autoRevealNews === false,
          isActive: true,
        }
        newsEntries.push(newsItem)
      }

      const activeEffect = {
        cardId: drawn.id,
        appliedAt: new Date().toISOString(),
        round: currentRound,
        effect: drawn.effect,
      }

      const updatedState = {
        ...state,
        news: newsEntries,
        activeCardEffects: [...(state.activeCardEffects || []), activeEffect],
      }
      await saveGameState(updatedState)

      return NextResponse.json({
        card: drawn,
        state: updatedState,
        cardsPlayedThisRound: totalPlayedThisRound + 1,
        maxCardsPerRound,
        limitReached: totalPlayedThisRound + 1 >= maxCardsPerRound,
      })
    }

    if (action === 'playSpecific') {
      const { cardId } = body
      const allCards = [...globalDeck, ...companyDeck, ...fiiDeck]
      const cardToPlay = allCards.find((c) => c.id === cardId)

      if (!cardToPlay) {
        return NextResponse.json({ error: 'Card not found' }, { status: 404 })
      }

      applyCardEffect(cardToPlay, state.assets, state)

      const activeEffect = {
        cardId: cardToPlay.id,
        appliedAt: new Date().toISOString(),
        round: currentRound,
        effect: cardToPlay.effect,
      }

      const updatedState = {
        ...state,
        activeCardEffects: [...(state.activeCardEffects || []), activeEffect],
      }

      await saveGameState(updatedState)

      return NextResponse.json({
        card: cardToPlay,
        state: updatedState,
        cardsPlayedThisRound: totalPlayedThisRound + 1,
        maxCardsPerRound,
        limitReached: totalPlayedThisRound + 1 >= maxCardsPerRound,
      })
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