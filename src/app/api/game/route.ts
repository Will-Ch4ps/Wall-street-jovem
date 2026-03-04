import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { loadGameState, saveGameState } from '@/lib/gameStorage'
import { prisma } from '@/lib/prisma'
import type { Stock, FII, FixedIncomeProduct, FIISegment } from '@/types'
import type { GameState } from '@/types'

// ══════════════════════════════════════════════════════════════
// MAPPER HELPERS
// ══════════════════════════════════════════════════════════════

const sectorTagMap: Record<string, string[]> = {
  'Tecnologia': ['Tecnologia', 'tech'],
  'Energia': ['Energia', 'energia'],
  'Consumo': ['Consumo', 'consumo'],
  'Financeiro': ['Financeiro', 'financeiro'],
  'Saúde': ['Saúde', 'saude'],
  'Agro': ['Agro', 'agro'],
  'Mobilidade': ['Mobilidade', 'turismo'],
  'FIIs': ['fii'],
}

const profileTagMap: Record<string, string[]> = {
  // Tecnologia
  'Líder consolidada': ['cloud', 'lider', 'dividendos', 'exportadora'],
  'Startup agressiva, volátil': ['IA', 'growth', 'especulativo'],
  'Madura, bons dividendos': ['dividendos', 'defensivo', 'infra'],
  // Energia
  'Renovável, tendência de alta': ['esg', 'renovavel', 'crescimento'],
  'Petróleo, alta volatilidade': ['exportadora', 'commodities', 'petroleo', 'dividendos'],
  'Estável, estatal': ['estatal', 'dividendos', 'defensivo', 'monopolio'],
  // Consumo
  'Varejo popular': ['varejo', 'importadora', 'ciclica'],
  'Varejo premium': ['premium', 'defensivo', 'luxo'],
  'E-commerce agressivo': ['growth', 'especulativo', 'importadora'],
  // Financeiro
  'Conservador, bons dividendos': ['dividendos', 'defensivo', 'banco'],
  'Disruptivo, volátil': ['growth', 'fintech', 'especulativo'],
  'Corretora, ganha no volume': ['corretagem', 'bolsa', 'ciclica'],
  // Saúde
  'Defensiva, estável': ['farmaceutico', 'defensivo', 'recorrencia'],
  'R&D farmacêutica, binária': ['biotech', 'growth', 'especulativo'],
  'Hospitais, margem apertada': ['hospitais', 'servicos', 'defensivo'],
  // Agro
  'Exportadora de grãos': ['exportadora', 'commodities', 'soja'],
  'Frigorífico exportador': ['frigorifico', 'exportadora', 'ciclica'],
  'Máquinas agrícolas': ['maquinas', 'crescimento'],
  // Mobilidade
  'Cíclica, sensível': ['aviacao', 'importadora', 'ciclica', 'endividada'],
  'Locadora de veículos': ['mobilidade', 'locadoras', 'servicos'],
  'Rede de hotéis, sazonal': ['hotelaria', 'servicos'],
  // FIIs
  'Galpões logísticos SP, estável': ['logistica', 'ecommerce', 'aaa'],
  'Galpões logísticos MG, crescimento': ['logistica', 'crescimento', 'risco_medio'],
  'Shopping capitais, sensível ao varejo': ['shopping', 'varejo', 'ciclico'],
  'Shopping interior, defensivo': ['shopping', 'defensivo', 'interior'],
  'Fundo de papel IPCA, renda passiva': ['papel', 'cri', 'ipca', 'defensivo'],
  'CRI de alto risco, dividend yield altíssimo': ['papel', 'cri', 'alto_risco'],
}

const segmentMap: Record<string, FIISegment> = {
  'Logística': 'logistica',
  'Shopping': 'shopping',
  'Papel / CRIs': 'papel',
  'Lajes Corp': 'lajes_corp',
  'logistica': 'logistica',
  'shopping': 'shopping',
  'papel': 'papel',
  'lajes_corp': 'lajes_corp',
  'hospital': 'hospital',
  'agro': 'agro',
  'hibrido': 'hibrido',
  'residencial': 'residencial',
}

// P/VP padrão por segmento (educativo — reflete mercado real)
const pvpDefaults: Record<string, number> = {
  logistica: 0.98,
  shopping: 1.05,
  lajes_corp: 0.85,
  papel: 1.00,
  hospital: 0.95,
  agro: 0.92,
  hibrido: 0.97,
  residencial: 0.90,
}

// Vacância padrão por segmento
const vacancyDefaults: Record<string, number> = {
  logistica: 0.03,
  shopping: 0.08,
  lajes_corp: 0.22,
  papel: 0.00,
  hospital: 0.05,
  agro: 0.04,
  hibrido: 0.10,
  residencial: 0.07,
}

function buildTags(sector: string, profile: string): string[] {
  const sectorTags = sectorTagMap[sector] ?? []
  const profileTags = profileTagMap[profile] ?? []
  return [...new Set([...sectorTags, ...profileTags])]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStock(a: any): Stock {
  return {
    ticker: a.ticker,
    name: a.name,
    type: 'stock',
    sector: a.sector || 'Desconhecido',
    profile: a.profile || '',
    status: 'active',
    initialPrice: a.initialPrice,
    currentPrice: a.initialPrice,
    openPrice: a.initialPrice,
    previousClose: a.initialPrice,
    totalShares: 10000,
    availableShares: 10000,
    trend: 'neutral',
    volatility: a.volatility,
    momentum: a.momentum,
    targetClose: a.initialPrice,   // neutro — mestre ajusta por rodada
    tags: buildTags(a.sector || '', a.profile || ''),
    glossary: {
      preco: 'Valor atual de 1 ação no mercado',
      variacao: 'Diferença percentual desde a abertura do pregão',
      volatilidade: 'Quão rápido o preço oscila — maior = mais arriscado',
      tendencia: 'Direção esperada do preço a médio prazo',
      dividendos: 'Percentual do lucro distribuído aos acionistas',
      pe: 'Preço/Lucro: quantas vezes o lucro anual está embutido no preço',
    },
    dividendYield: a.dividendYield || 0,
    peRatio: 15,
    marketCap: a.initialPrice * 10000,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFII(a: any): FII {
  const rawSegment = a.segment ?? 'logistica'
  const segment = segmentMap[rawSegment] ?? 'logistica'
  const pvpRatio = pvpDefaults[segment] ?? 1.00
  const patrimonyValue = a.initialPrice / pvpRatio
  const dyAnual = a.dividendYield || 0
  const dividendPerRound = a.initialPrice * (dyAnual / 12)
  const vacancyRate = vacancyDefaults[segment] ?? 0.05

  return {
    ticker: a.ticker,
    name: a.name,
    type: 'fii',
    sector: 'FIIs',
    segment,
    profile: a.profile || '',
    status: 'active',
    initialPrice: a.initialPrice,
    currentPrice: a.initialPrice,
    openPrice: a.initialPrice,
    previousClose: a.initialPrice,
    totalShares: 5000,
    availableShares: 5000,
    trend: 'neutral',
    volatility: a.volatility,
    momentum: a.momentum,
    targetClose: a.initialPrice,   // neutro — mestre ajusta por rodada
    tags: buildTags('FIIs', a.profile || ''),
    glossary: {
      preco: 'Valor atual de 1 cota no mercado',
      pvp: 'Preço / Valor Patrimonial — abaixo de 1 = barato, acima de 1 = caro',
      dy: 'Dividend Yield mensal. Ex: 0,8% ao mês = 9,6% ao ano',
      vacancia: '% do imóvel vazio. Mais vacância = menos dividendo',
    },
    patrimonyValue,
    pvpRatio,
    dividendPerRound,
    dividendYield: dyAnual * 100,    // armazenado como % (ex: 9.6)
    vacancyRate,
    totalProperties: segment === 'papel' ? 0 : 10,
    netArea: segment === 'papel' ? 0 : 50000,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFixedIncome(f: any): FixedIncomeProduct {
  return {
    id: f.id,
    name: f.name,
    type: f.type,
    description: f.description || '',
    ratePerRound: f.baseRate,
    minAmount: 100,
    minRoundsToRedeem: f.lockRounds || 0,
    canRedeemAnytime: f.liquidityType === 'immediate',
    taxExempt: f.taxExempt || f.type === 'lci_lca',
    riskOfDefault: f.riskOfDefault,
    isActive: true,
    availableFromRound: f.availableFromRound || 0,
    expiresAtRound: f.expiresAtRound ?? undefined,
    liquidityType: f.liquidityType || 'immediate',
    lockRounds: f.lockRounds || 0,
    earlyWithdrawPenalty: f.earlyWithdrawPenalty || 0,
    isBadInvestment: f.isBadInvestment || false,
    linkedTicker: f.linkedTicker ?? undefined,
  }
}

function buildEmptyState(fixedIncomeProducts: FixedIncomeProduct[]): GameState {
  return {
    game: {
      id: '',
      name: '',
      status: 'setup',
      currentRound: 0,
      maxRounds: 10,
      initialCapital: 10000,
      createdAt: '',
      config: {
        allowLoans: true,
        allowShort: false,
        allowDayTrade: false,
        allowP2PTrade: false,
        maxLoanPercent: 0.4,
        defaultLoanInterest: 0.03,
        taxRate: 0.15,
        tickIntervalMs: 25000,
        candleIntervalMs: 60000,
        cardDrawIntervalMs: 120000,
        maxCardsPerRound: 3,
        autoRevealNews: true,
        allowAfterHours: true,
        afterHoursFixedPrice: false,
        marketMood: 'neutral',
        scheduledEvents: [],
      },
    },
    rounds: [],
    assets: [],
    players: [],
    holdings: [],
    portfolios: [],
    transactions: [],
    priceHistories: {},
    fixedIncomeProducts,
    fixedIncomeInvestments: [],
    loans: [],
    news: [],
    newsArchive: [],
    cards: {
      globalDeck: [],
      sectorDecks: {},
      companyDecks: {},
      fiiDecks: {},
      masterDeck: [],
    },
    marketOffers: [],
    activeCardEffects: [],
    events: [],
  }
}

// ══════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ══════════════════════════════════════════════════════════════

export async function GET() {
  const state = await loadGameState()
  if (!state) {
    return NextResponse.json({ error: 'No game found' }, { status: 404 })
  }
  return NextResponse.json(state)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const existing = await loadGameState()

    // ── CREATE ────────────────────────────────────────────────
    if (body.action === 'create' || !existing) {
      const [dbAssets, dbRule, dbFixed, dbCards] = await Promise.all([
        prisma.assetTemplate.findMany(),
        prisma.gameRuleTemplate.findUnique({ where: { name: 'Padrão Clássico' } }),
        prisma.fixedIncomeTemplate.findMany(),
        prisma.cardTemplate.findMany(),
      ])

      // Config: vem do DB ou fallback seguro
      const config = dbRule
        ? {
          ...JSON.parse(dbRule.configJson),
          // Garante campos que podem faltar em configs antigas
          allowAfterHours: true,
          afterHoursFixedPrice: false,
          marketMood: 'neutral' as const,
        }
        : {
          allowLoans: true,
          allowShort: false,
          allowDayTrade: true,
          allowP2PTrade: true,
          maxLoanPercent: 0.4,
          defaultLoanInterest: 0.05,
          taxRate: 0.15,
          tickIntervalMs: 10000,
          candleIntervalMs: 30000,
          cardDrawIntervalMs: 60000,
          maxCardsPerRound: 3,
          autoRevealNews: true,
          allowAfterHours: true,
          afterHoursFixedPrice: false,
          marketMood: 'neutral' as const,
          scheduledEvents: [],
        }

      // Assets: mapeados do DB com tags e segments corretos
      const assets: (Stock | FII)[] = dbAssets.map((a) =>
        a.type === 'stock' ? mapStock(a) : mapFII(a)
      )

      // Renda fixa
      const fixedIncomeProducts: FixedIncomeProduct[] = dbFixed.map(mapFixedIncome)

      // Cards do DB (masterDeck)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const masterDeck = dbCards.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        type: c.type,
        probability: c.probability,
        effect: JSON.parse(c.effectJson),
        icon: '🃏',
        triggerAt: 'random' as const,
        revealToPlayers: true,
        generateNews: false,
        isUsed: false,
        cooldownRounds: 0,
      }))

      // priceHistories: uma entrada vazia por ativo
      const priceHistories: GameState['priceHistories'] = {}
      for (const a of assets) {
        priceHistories[a.ticker] = { ticker: a.ticker, ticks: [], candles: [] }
      }

      const state: GameState = {
        game: {
          id: nanoid(),
          name: body.name ?? 'InvestQuest',
          status: 'setup',
          currentRound: 0,
          maxRounds: body.maxRounds ?? 10,
          initialCapital: body.initialCapital ?? 10000,
          createdAt: new Date().toISOString(),
          config,
        },
        rounds: [],
        assets,
        players: [],
        holdings: [],
        portfolios: [],
        transactions: [],
        priceHistories,
        fixedIncomeProducts,
        fixedIncomeInvestments: [],
        loans: [],
        news: [],
        newsArchive: [],
        cards: {
          globalDeck: masterDeck.filter((c) => c.type === 'global'),
          sectorDecks: {},
          companyDecks: {},
          fiiDecks: {},
          masterDeck,
        },
        marketOffers: [],
        activeCardEffects: [],
        events: [],
      }

      await saveGameState(state)
      return NextResponse.json(state)
    }

    // ── ADD PLAYER ────────────────────────────────────────────
    if (body.action === 'addPlayer' && existing) {
      const name = body.name ?? 'Jogador'
      const id = nanoid()
      const capital = existing.game.initialCapital

      const player = {
        id,
        name,
        profile: 'moderado' as const,
        cash: capital,
        initialCash: capital,
        isActive: true,
        createdAt: new Date().toISOString(),
      }

      const players = [...existing.players, player]
      const portfolios = [
        ...existing.portfolios,
        { ownerId: id, ownerType: 'player' as const, positions: [] },
      ]

      const merged: GameState = { ...existing, players, portfolios }
      await saveGameState(merged)
      return NextResponse.json(merged)
    }

    // ── UPDATE ASSET (mestre ajusta trend/targetClose/etc) ────
    if (body.action === 'update_asset' && existing) {
      type Trend = 'bullish' | 'bearish' | 'volatile' | 'neutral'
      const { ticker, updates } = body as {
        ticker: string
        updates: {
          trend?: Trend
          targetClose?: number
          momentum?: number
          volatility?: number
          status?: string
        }
      }

      const updatedAssets = existing.assets.map((a) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        a.ticker === ticker ? ({ ...a, ...updates } as any) : a
      )

      const merged: GameState = { ...existing, assets: updatedAssets }
      await saveGameState(merged)
      return NextResponse.json(merged)
    }

    // ── UPDATE FULL STATE (sync do frontend) ─────────────────
    if (body.action === 'update' && existing) {
      // ⚠️  Merge PROFUNDO do config para não perder campos salvos pelo usuário
      // O frontend pode enviar apenas { game: { config: { maxCardsPerRound: 5 } } }
      // sem o restante do game — o spread raso sobrescreveria tudo com undefined.
      const incomingGame = body.state?.game
      const incomingConfig = incomingGame?.config

      const mergedConfig = incomingConfig
        ? { ...existing.game.config, ...incomingConfig }   // deep-merge config
        : existing.game.config

      const mergedGame = incomingGame
        ? { ...existing.game, ...incomingGame, config: mergedConfig }
        : existing.game

      const merged: GameState = {
        ...existing,
        ...(body.state ?? {}),
        // Campos críticos: nunca sobrescrever com undefined
        game: mergedGame,
        assets: body.state?.assets ?? existing.assets,
        rounds: body.state?.rounds ?? existing.rounds,
        players: body.state?.players ?? existing.players,
        holdings: body.state?.holdings ?? existing.holdings,
        portfolios: body.state?.portfolios ?? existing.portfolios,
        transactions: body.state?.transactions ?? existing.transactions,
        priceHistories: body.state?.priceHistories ?? existing.priceHistories,
        // Nunca apagar estes arrays com undefined
        news: body.state?.news ?? existing.news,
        newsArchive: body.state?.newsArchive ?? existing.newsArchive,
        activeCardEffects: body.state?.activeCardEffects ?? existing.activeCardEffects,
        fixedIncomeProducts: body.state?.fixedIncomeProducts ?? existing.fixedIncomeProducts,
        fixedIncomeInvestments: body.state?.fixedIncomeInvestments ?? existing.fixedIncomeInvestments,
        loans: body.state?.loans ?? existing.loans,
        events: body.state?.events ?? existing.events,
        marketOffers: body.state?.marketOffers ?? existing.marketOffers,
        cards: body.state?.cards ?? existing.cards,
      }
      await saveGameState(merged)
      return NextResponse.json(merged)
    }

    // ── FALLBACK ──────────────────────────────────────────────
    return NextResponse.json(existing)

  } catch (err) {
    console.error('[/api/game POST]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save game' },
      { status: 500 }
    )
  }
}

// ── DELETE: reset para estado vazio ──────────────────────────
export async function DELETE() {
  try {
    const dbFixed = await prisma.fixedIncomeTemplate.findMany()
    const fixedIncomeProducts: FixedIncomeProduct[] = dbFixed.map(mapFixedIncome)

    const emptyState = buildEmptyState(fixedIncomeProducts)
    await saveGameState(emptyState)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/game DELETE]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to reset game' },
      { status: 500 }
    )
  }
}