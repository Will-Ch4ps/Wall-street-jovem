import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { loadGameState, saveGameState } from '@/lib/gameStorage'
import { generateNewsFromTemplate } from '@/engine/newsEngine'
import { newsTemplates } from '@/data/newsTemplates'
import type { News } from '@/types'

export async function GET(request: NextRequest) {
  const state = await loadGameState()
  if (!state) {
    return NextResponse.json({ error: 'No game found' }, { status: 404 })
  }
  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope')
  const news = scope
    ? (state.news || []).filter((n) => n.scope === scope)
    : (state.news || [])
  return NextResponse.json({ news })
}

export async function POST(request: NextRequest) {
  try {
    const state = await loadGameState()
    if (!state) {
      return NextResponse.json({ error: 'No game found' }, { status: 404 })
    }

    const reqBody = await request.json().catch(() => ({}))
    const { action, title, body: newsBody, scope, templateId, targets, ignoreLimit } = reqBody
    const currentRound = state.game.currentRound

    const maxCardsPerRound = state.game.config.maxCardsPerRound ?? 3
    const eventsPlayedThisRound = (state.events || []).filter(e => e.round === currentRound).length
    const cardsPlayedThisRound = (state.activeCardEffects || []).filter(e => e.round === currentRound).length
    const randomNewsThisRound = (state.news || []).filter(n => n.round === currentRound && n.isRandom).length
    const totalPlayed = eventsPlayedThisRound + cardsPlayedThisRound + randomNewsThisRound

    // Limita se não for forçado pelo mestre
    if (action === 'random' && !ignoreLimit) {
      if (totalPlayed >= maxCardsPerRound) {
        return NextResponse.json(
          { error: `Limite de ${maxCardsPerRound} evento(s) por rodada atingido.`, limitReached: true },
          { status: 400 }
        )
      }
    }

    if (action === 'create') {
      const news: News = {
        id: nanoid(),
        round: currentRound,
        timestamp: new Date().toISOString(),
        title: title ?? 'Notícia',
        body: newsBody ?? '',
        source: 'Jornal do Pregão',
        category: 'economy',
        scope: scope ?? 'global',
        targets: targets ?? [],
        isRandom: false,
        isPublic: true,
        masterOnly: false,
        isActive: true,
      }
      const updatedState = { ...state, news: [...(state.news || []), news] }
      await saveGameState(updatedState)
      return NextResponse.json({ news, state: updatedState })
    }

    if (action === 'random' && templateId) {
      const template = newsTemplates.find((t) => t.id === templateId)
      if (template) {
        const news = generateNewsFromTemplate(template, currentRound)
        const updatedState = { ...state, news: [...(state.news || []), news] }
        await saveGameState(updatedState)
        return NextResponse.json({ news, state: updatedState })
      }
    }

    if (action === 'random' && !templateId) {
      if (newsTemplates.length > 0) {
        const template = newsTemplates[Math.floor(Math.random() * newsTemplates.length)]
        const news = generateNewsFromTemplate(template, currentRound)
        if ((news.scope === 'company' || news.scope === 'fii') && news.targets.length === 0) {
          const possibleAssets = state.assets.filter(a => a.type === (news.scope === 'company' ? 'stock' : 'fii'))
          if (possibleAssets.length > 0) {
            const randomAsset = possibleAssets[Math.floor(Math.random() * possibleAssets.length)]
            news.targets = [randomAsset.ticker]
            news.title = news.title.replace(`{${news.scope === 'company' ? 'empresa' : 'fii'}}`, randomAsset.ticker)
            news.body = news.body.replace(`{${news.scope === 'company' ? 'empresa' : 'fii'}}`, randomAsset.ticker)
          }
        }
        const updatedState = { ...state, news: [...(state.news || []), news] }
        await saveGameState(updatedState)
        return NextResponse.json({ news, state: updatedState })
      }
    }

    return NextResponse.json(state)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
            news.title = news.title.replace(`{${news.scope === 'company' ? 'empresa' : 'fii'}}`, randomAsset.ticker)
            news.body = news.body.replace(`{${news.scope === 'company' ? 'empresa' : 'fii'}}`, randomAsset.ticker)
          }
        }

        const updatedState = {
          ...state,
          news: [...(state.news || []), news],
        }
        await saveGameState(updatedState)
        return NextResponse.json({ news, state: updatedState })
      }
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