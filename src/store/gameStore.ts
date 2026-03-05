import { create } from 'zustand'
import type { GameState } from '@/types'

interface GameStore extends GameState {
  setState: (state: GameState) => void
  reset: () => void
}

const emptyGameState: GameState = {
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
      maxLoanPercent: 50,
      defaultLoanInterest: 0.03,
      taxRate: 0,
      tickIntervalMs: 7000,
      candleIntervalMs: 12000,
      cardDrawIntervalMs: 180000,
      maxCardsPerRound: 4,
      autoRevealNews: true,
      allowAfterHours: true,
      afterHoursFixedPrice: false,
    },
  },
  rounds: [],
  assets: [],
  players: [],
  holdings: [],
  portfolios: [],
  transactions: [],
  priceHistories: {},
  fixedIncomeProducts: [],
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

export const useGameStore = create<GameStore>((set) => ({
  ...emptyGameState,
  setState: (state) => set(state),
  reset: () => set(emptyGameState),
}))
