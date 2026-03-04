// ==================== ENUMS ====================

export type GameStatus = 'setup' | 'running' | 'paused' | 'transition' | 'finished'
export type Trend = 'bullish' | 'bearish' | 'neutral' | 'volatile'
export type AssetType = 'stock' | 'fii'
export type AssetStatus = 'active' | 'suspended' | 'bankrupt' | 'ipo_pending' | 'ipo_open'
export type TransactionType = 'buy' | 'sell' | 'dividend' | 'fii_dividend' | 'loan_take' | 'loan_pay' | 'loan_interest' | 'fixed_income_invest' | 'fixed_income_redeem' | 'fixed_income_yield' | 'offer_buy' | 'offer_sell' | 'ipo_buy'
export type OwnerType = 'player' | 'holding'
export type CardType = 'global' | 'sector' | 'company' | 'fii' | 'master'
export type CardProbability = 'common' | 'uncommon' | 'rare' | 'very_rare'
export type NewsScope = 'global' | 'sector' | 'company' | 'fii'
export type PlayerProfile = 'conservador' | 'moderado' | 'arrojado'
export type FixedIncomeType = 'tesouro_selic' | 'cdb' | 'lci_lca' | 'debenture' | 'poupanca'
export type FIISegment = 'logistica' | 'lajes_corp' | 'shopping' | 'residencial' | 'papel' | 'hospital' | 'agro' | 'hibrido'

// ==================== GAME ====================

export interface Game {
  id: string
  name: string
  status: GameStatus
  currentRound: number
  maxRounds: number
  initialCapital: number
  createdAt: string
  config: GameConfig
}

export interface GameConfig {
  allowLoans: boolean
  allowShort: boolean
  allowDayTrade: boolean
  allowP2PTrade: boolean
  maxLoanPercent: number
  defaultLoanInterest: number
  taxRate: number
  tickIntervalMs: number
  candleIntervalMs: number
  cardDrawIntervalMs: number
  maxCardsPerRound: number
  autoRevealNews: boolean
  allowAfterHours: boolean
  afterHoursFixedPrice: boolean
  marketMood?: 'bull' | 'bear' | 'neutral'
  scheduledEvents?: GlobalScheduledEvent[]
}

export interface GlobalScheduledEvent {
  id: string
  triggerRound: number
  type: 'news' | 'market_shift'
  newsData?: {
    title: string
    body: string
  }
  marketShiftData?: {
    ticker: string
    priceShiftAmount: number
  }
}

// ==================== ROUND ====================

export interface Round {
  number: number
  status: 'pending' | 'active' | 'paused' | 'completed'
  theme: string
  startedAt?: string
  pausedAt?: string
  completedAt?: string
  roundEndsAt?: string
  lastUpdateAt?: string
  totalPausedMs: number
  config: RoundConfig
  summary?: RoundSummary
}

export interface RoundConfig {
  description: string
  allowLoans: boolean
  allowShort: boolean
  allowDayTrade: boolean
  tickIntervalMs: number
  candleIntervalMs: number
  cardDrawIntervalMs: number
  maxCardsPerRound: number
  marketMood?: 'bull' | 'bear' | 'neutral'
  assets: AssetRoundConfig[]
  scheduledEvents: ScheduledEvent[]
  fixedIncomeRates: FixedIncomeRateConfig[]
}

export interface AssetRoundConfig {
  ticker: string
  targetClose: number
  trend: Trend
  volatility: number
  momentum: number
  status: AssetStatus
  dividendPercent?: number
  ipoPrice?: number
  ipoShares?: number
}

export interface ScheduledEvent {
  id: string
  triggerAt: 'round_start' | 'round_mid' | 'round_end' | 'manual'
  triggered: boolean
  news: News
}

export interface RoundSummary {
  totalTransactions: number
  totalVolume: number
  biggestGainer: { ticker: string; percent: number }
  biggestLoser: { ticker: string; percent: number }
  mostTraded: { ticker: string; volume: number }
  cardsDrawn: string[]
  newsPublished: string[]
}

// ==================== ASSETS (Ações + FIIs) ====================

export interface BaseAsset {
  ticker: string
  name: string
  type: AssetType
  sector: string
  profile: string
  status: AssetStatus
  initialPrice: number
  currentPrice: number
  openPrice: number
  previousClose: number
  totalShares: number
  availableShares: number
  trend: Trend
  volatility: number
  momentum: number
  targetClose: number
  tags: string[]
  glossary: Record<string, string>
}

export interface Stock extends BaseAsset {
  type: 'stock'
  dividendYield: number
  peRatio: number
  marketCap: number
}

export interface FII extends BaseAsset {
  type: 'fii'
  segment: FIISegment
  patrimonyValue: number
  pvpRatio: number
  dividendPerRound: number
  dividendYield: number
  vacancyRate: number
  totalProperties: number
  netArea: number
}

export type Asset = Stock | FII

// ==================== PRICE HISTORY ====================

export interface PriceTick {
  timestamp: string
  price: number
  round: number
}

export interface Candle {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  round: number
}

export interface PriceHistory {
  ticker: string
  ticks: PriceTick[]
  candles: Candle[]
  formingCandle?: Candle
}

// ==================== PLAYERS & HOLDINGS ====================

export interface Player {
  id: string
  name: string
  avatar?: string
  profile: PlayerProfile
  cash: number
  initialCash: number
  holdingId?: string
  holdingContribution?: number
  isActive: boolean
  bankrupted?: boolean
  createdAt: string
}

export interface Holding {
  id: string
  name: string
  memberIds: string[]
  cash: number
  totalContributed: number
  contributions: Record<string, number>
  isActive: boolean
  createdAt: string
}

// ==================== PORTFOLIO ====================

export interface Position {
  ticker: string
  quantity: number
  avgPrice: number
  totalInvested: number
}

export interface Portfolio {
  ownerId: string
  ownerType: OwnerType
  positions: Position[]
}

// ==================== TRANSACTIONS ====================

export interface Transaction {
  id: string
  timestamp: string
  round: number
  type: TransactionType
  buyerId: string
  buyerType: OwnerType | 'market'
  sellerId: string
  sellerType: OwnerType | 'market'
  ticker?: string
  quantity?: number
  price?: number
  total: number
  description: string
  metadata?: Record<string, unknown>
}

// ==================== FIXED INCOME ====================

export interface FixedIncomeProduct {
  id: string
  name: string
  type: FixedIncomeType
  description: string
  ratePerRound: number
  minAmount: number
  maxAmount?: number
  minRoundsToRedeem: number
  canRedeemAnytime: boolean
  taxExempt: boolean
  riskOfDefault: boolean
  isActive: boolean
  // Dynamic availability per round
  availableFromRound: number   // 0 = always available
  expiresAtRound?: number      // null = never expires
  // Liquidity mechanics
  liquidityType: 'immediate' | 'on_maturity' | 'penalty'
  lockRounds: number           // Rounds money is locked
  earlyWithdrawPenalty: number  // e.g. 0.10 = 10% penalty
  // Pedagogical flags
  isBadInvestment: boolean     // Poupança: loses to inflation
  linkedTicker?: string        // e.g. 'FTPY3' — if company defaults, investment zeroes
}

export interface FixedIncomeInvestment {
  id: string
  productId: string
  ownerId: string
  ownerType: OwnerType
  amount: number
  roundInvested: number
  accumulatedYield: number
  isRedeemed: boolean
  redeemedAt?: string
}

export interface FixedIncomeRateConfig {
  productId: string
  ratePerRound: number
  isActive: boolean
}

// ==================== LOANS ====================

export interface Loan {
  id: string
  borrowerId: string
  borrowerType: OwnerType
  amount: number
  interestPerRound: number
  accumulatedInterest: number
  roundTaken: number
  roundDue?: number
  status: 'active' | 'paid' | 'defaulted'
  payments: LoanPayment[]
}

export interface LoanPayment {
  round: number
  amount: number
  type: 'interest' | 'principal' | 'full'
  timestamp: string
}

// ==================== NEWS ====================

export interface News {
  id: string
  round: number
  timestamp: string
  title: string
  body: string
  source: string
  category: 'economy' | 'politics' | 'company' | 'sector' | 'fii' | 'crisis' | 'opportunity'
  scope: NewsScope
  targets: string[]
  templateId?: string
  expertTip?: string
  isRumor?: boolean
  immediateEffect?: {
    priceModifier: { min: number; max: number }
    volatilityChange?: number
    affectedTickers: string[]
  }
  delayedEffect?: {
    triggerRound: number
    priceModifier: { min: number; max: number }
    affectedTickers: string[]
    hint: string
    triggered: boolean
  }
  isRandom: boolean
  isPublic: boolean
  masterOnly: boolean
  isActive: boolean
}

// ==================== GAME EVENTS (Unified Cards + News) ====================

export interface GameEvent {
  id: string
  templateId: string
  // Display (board-game card style)
  name: string                 // "Super Safra Recorde"
  headline: string             // "📈 +15% Setor Agro por 3 rodadas"
  icon: string                 // "🌾"
  title: string                // Journalistic title
  body: string                 // Journalistic body
  expertTip?: string
  expertAnalysis?: string
  // Classification
  scope: NewsScope
  category: News['category']
  isPositive: boolean
  // Mechanical effect (actually applied!)
  effect: CardEffect
  duration: number             // Rounds the effect lasts
  targets: string[]            // Tickers/sectors affected
  // Resulting impact per ticker (decimal percent, e.g. 0.03 = +3%)
  impactMap?: Record<string, number>
  // State
  round: number
  timestamp: string
  expiresAtRound: number       // round + duration
  isActive: boolean
  isRevealed: boolean          // For display modal trigger
}

// ==================== CARDS ====================

export interface CardEffect {
  target: 'all' | 'sector' | 'company' | 'fii' | 'player' | 'holding'
  targetFilter?: string
  priceModifier?: { min: number; max: number }
  volatilityModifier?: number
  trendOverride?: Trend
  cashBonus?: number
  dividendBonus?: number
  fixedIncomeRateChange?: number
  suspend?: boolean
  suspendDurationMs?: number
  vacancyChange?: number
  duration?: number
}

export interface Card {
  id: string
  type: CardType
  name: string
  description: string
  icon: string
  probability: CardProbability
  effect: CardEffect
  triggerAt: 'round_start' | 'round_mid' | 'round_end' | 'random'
  revealToPlayers: boolean
  generateNews: boolean
  newsTemplate?: string
  isUsed: boolean
  cooldownRounds: number
  lastUsedRound?: number
}

// ==================== MARKET OFFERS ====================

export interface MarketOffer {
  id: string
  ticker: string
  type: 'buy' | 'sell'
  offerPrice: number
  currentPriceAtCreation: number
  totalQuantity: number
  remainingQuantity: number
  reason: string
  createdAt: string
  expiresAt: string
  isActive: boolean
  transactions: string[]
}

// ==================== GAME STATE ====================

export interface GameStateCards {
  globalDeck: Card[]
  sectorDecks: Record<string, Card[]>
  companyDecks: Record<string, Card[]>
  fiiDecks: Record<string, Card[]>
  masterDeck: Card[]
}

export interface ActiveCardEffect {
  cardId: string
  appliedAt: string
  round: number
  expiresAtRound?: number
  effect: CardEffect
}

export interface GameState {
  game: Game
  rounds: Round[]
  assets: Asset[]
  players: Player[]
  holdings: Holding[]
  portfolios: Portfolio[]
  transactions: Transaction[]
  priceHistories: Record<string, PriceHistory>
  fixedIncomeProducts: FixedIncomeProduct[]
  fixedIncomeInvestments: FixedIncomeInvestment[]
  loans: Loan[]
  news: News[]
  newsArchive: News[]
  cards: GameStateCards
  marketOffers: MarketOffer[]
  activeCardEffects: ActiveCardEffect[]
  events: GameEvent[]
}
