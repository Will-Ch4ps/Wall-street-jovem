import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { loadGameState, saveGameState } from '@/lib/gameStorage'
import { calculateLoanStatus } from '@/engine/portfolioCalc'
import type { FixedIncomeInvestment, GameState, Loan, LoanPayment, OwnerType, Transaction } from '@/types'
import type { FII } from '@/types'

function calculateFixedIncomeYield(
  investment: FixedIncomeInvestment,
  product: { ratePerRound: number; taxExempt: boolean },
  currentRound: number,
  taxRate: number
) {
  const roundsHeld = currentRound - investment.roundInvested
  const grossYield = investment.amount * product.ratePerRound * roundsHeld
  const tax = product.taxExempt ? 0 : grossYield * taxRate
  return { grossYield, tax, totalNet: investment.amount + grossYield - tax }
}

export async function POST(request: NextRequest) {
  try {
    const state = await loadGameState()
    if (!state) {
      return NextResponse.json({ error: 'No game found' }, { status: 404 })
    }

    const body = await request.json()
    const { action } = body
    const currentRound = state.game.currentRound
    const now = new Date().toISOString()

    if (action === 'fixed_income_invest') {
      const { ownerId, ownerType, productId, amount } = body
      const product = state.fixedIncomeProducts.find((p) => p.id === productId)
      if (!product?.isActive) {
        return NextResponse.json({ error: 'Produto inválido' }, { status: 400 })
      }
      if (amount < product.minAmount) {
        return NextResponse.json({ error: 'Valor abaixo do mínimo' }, { status: 400 })
      }

      const cash =
        ownerType === 'player'
          ? state.players.find((p) => p.id === ownerId)?.cash ?? 0
          : state.holdings.find((h) => h.id === ownerId)?.cash ?? 0
      if (cash < amount) {
        return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 })
      }

      const investment: FixedIncomeInvestment = {
        id: nanoid(),
        productId,
        ownerId,
        ownerType: ownerType as OwnerType,
        amount,
        roundInvested: currentRound,
        accumulatedYield: 0,
        isRedeemed: false,
      }

      const players = state.players.map((p) =>
        p.id === ownerId && ownerType === 'player' ? { ...p, cash: p.cash - amount } : p
      )
      const holdings = state.holdings.map((h) =>
        h.id === ownerId && ownerType === 'holding' ? { ...h, cash: h.cash - amount } : h
      )

      const tx: Transaction = {
        id: nanoid(),
        timestamp: now,
        round: currentRound,
        type: 'fixed_income_invest',
        buyerId: ownerId,
        buyerType: ownerType as OwnerType,
        sellerId: productId,
        sellerType: 'market',
        total: amount,
        description: `${ownerId} investiu R$${amount.toFixed(2)} em ${product.name}`,
      }

      const updatedState: GameState = {
        ...state,
        players,
        holdings,
        fixedIncomeInvestments: [...state.fixedIncomeInvestments, investment],
        transactions: [...state.transactions, tx],
      }
      await saveGameState(updatedState)
      return NextResponse.json({ state: updatedState })
    }

    if (action === 'fixed_income_redeem') {
      const { investmentId } = body
      const inv = state.fixedIncomeInvestments.find(
        (i) => i.id === investmentId && !i.isRedeemed
      )
      if (!inv) {
        return NextResponse.json({ error: 'Investimento não encontrado' }, { status: 400 })
      }

      const product = state.fixedIncomeProducts.find((p) => p.id === inv.productId)
      if (!product) {
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 400 })
      }

      const roundsHeld = currentRound - inv.roundInvested
      if (roundsHeld < product.minRoundsToRedeem) {
        return NextResponse.json(
          { error: `Carência de ${product.minRoundsToRedeem} rodadas` },
          { status: 400 }
        )
      }

      const calc = calculateFixedIncomeYield(
        inv,
        product,
        currentRound,
        state.game.config.taxRate
      )

      const players = state.players.map((p) =>
        p.id === inv.ownerId && inv.ownerType === 'player'
          ? { ...p, cash: p.cash + calc.totalNet }
          : p
      )
      const holdings = state.holdings.map((h) =>
        h.id === inv.ownerId && inv.ownerType === 'holding'
          ? { ...h, cash: h.cash + calc.totalNet }
          : h
      )

      const tx: Transaction = {
        id: nanoid(),
        timestamp: now,
        round: currentRound,
        type: 'fixed_income_redeem',
        buyerId: inv.ownerId,
        buyerType: inv.ownerType,
        sellerId: inv.productId,
        sellerType: 'market',
        total: calc.totalNet,
        description: `${inv.ownerId} resgatou R$${calc.totalNet.toFixed(2)} de ${product.name}`,
      }

      const updatedInvestments = state.fixedIncomeInvestments.map((i) =>
        i.id === investmentId
          ? { ...i, isRedeemed: true, redeemedAt: now }
          : i
      )

      const updatedState: GameState = {
        ...state,
        players,
        holdings,
        fixedIncomeInvestments: updatedInvestments,
        transactions: [...state.transactions, tx],
      }
      await saveGameState(updatedState)
      return NextResponse.json({ state: updatedState })
    }

    if (action === 'fixed_income_update_rate') {
      const { productId, newRate } = body
      const productIndex = state.fixedIncomeProducts.findIndex(p => p.id === productId)

      if (productIndex === -1) {
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
      }

      const updatedProducts = [...state.fixedIncomeProducts]
      updatedProducts[productIndex] = {
        ...updatedProducts[productIndex],
        ratePerRound: newRate
      }

      const updatedState = { ...state, fixedIncomeProducts: updatedProducts }
      await saveGameState(updatedState)
      return NextResponse.json({ state: updatedState })
    }

    if (action === 'loan_take') {
      const { borrowerId, borrowerType, amount } = body
      if (!state.game.config.allowLoans) {
        return NextResponse.json({ error: 'Empréstimos desabilitados' }, { status: 400 })
      }

      // Enforce maxLoanPercent ceiling
      const maxLoanPercent = state.game.config.maxLoanPercent
      if (maxLoanPercent > 0) {
        const borrowerInitialCash = borrowerType === 'player'
          ? (state.players.find(p => p.id === borrowerId)?.initialCash ?? state.game.initialCapital)
          : state.game.initialCapital
        const maxAllowed = borrowerInitialCash * maxLoanPercent
        const existingDebt = state.loans
          .filter(l => l.borrowerId === borrowerId && l.status === 'active')
          .reduce((sum, l) => sum + l.amount, 0)
        if (existingDebt + amount > maxAllowed) {
          return NextResponse.json(
            { error: `Empréstimo excede o teto permitido de ${(maxLoanPercent * 100).toFixed(0)}% do capital inicial (máx R$${maxAllowed.toFixed(2)}, dívida atual R$${existingDebt.toFixed(2)})` },
            { status: 400 }
          )
        }
      }

      const interestPerRound = state.game.config.defaultLoanInterest
      const loan: Loan = {
        id: nanoid(),
        borrowerId,
        borrowerType: borrowerType as OwnerType,
        amount,
        interestPerRound,
        accumulatedInterest: 0,
        roundTaken: currentRound,
        status: 'active',
        payments: [],
      }

      const players = state.players.map((p) =>
        p.id === borrowerId && borrowerType === 'player'
          ? { ...p, cash: p.cash + amount }
          : p
      )
      const holdings = state.holdings.map((h) =>
        h.id === borrowerId && borrowerType === 'holding'
          ? { ...h, cash: h.cash + amount }
          : h
      )

      const tx: Transaction = {
        id: nanoid(),
        timestamp: now,
        round: currentRound,
        type: 'loan_take',
        buyerId: borrowerId,
        buyerType: borrowerType as OwnerType,
        sellerId: 'market',
        sellerType: 'market',
        total: amount,
        description: `${borrowerId} tomou empréstimo de R$${amount.toFixed(2)}`,
      }

      const updatedState: GameState = {
        ...state,
        players,
        holdings,
        loans: [...state.loans, loan],
        transactions: [...state.transactions, tx],
      }
      await saveGameState(updatedState)
      return NextResponse.json({ state: updatedState })
    }

    if (action === 'loan_pay') {
      const { loanId, amount } = body
      const loan = state.loans.find((l) => l.id === loanId && l.status === 'active')
      if (!loan) {
        return NextResponse.json({ error: 'Empréstimo não encontrado' }, { status: 400 })
      }

      const { totalDebt } = calculateLoanStatus(loan, currentRound)
      const payAmount = Math.min(amount ?? totalDebt, totalDebt)

      const players = state.players.map((p) =>
        p.id === loan.borrowerId && loan.borrowerType === 'player'
          ? { ...p, cash: p.cash - payAmount }
          : p
      )
      const holdings = state.holdings.map((h) =>
        h.id === loan.borrowerId && loan.borrowerType === 'holding'
          ? { ...h, cash: h.cash - payAmount }
          : h
      )

      const payment: LoanPayment = {
        round: currentRound,
        amount: payAmount,
        type: payAmount >= totalDebt ? 'full' : 'principal',
        timestamp: now,
      }
      const updatedLoans = state.loans.map((l) =>
        l.id === loanId
          ? {
            ...l,
            payments: [...l.payments, payment],
            status: (payAmount >= totalDebt ? 'paid' : 'active') as Loan['status'],
          }
          : l
      )

      const tx: Transaction = {
        id: nanoid(),
        timestamp: now,
        round: currentRound,
        type: 'loan_pay',
        buyerId: 'market',
        buyerType: 'market',
        sellerId: loan.borrowerId,
        sellerType: loan.borrowerType,
        total: payAmount,
        description: `${loan.borrowerId} pagou R$${payAmount.toFixed(2)} do empréstimo`,
      }

      const updatedState: GameState = {
        ...state,
        players,
        holdings,
        loans: updatedLoans,
        transactions: [...state.transactions, tx],
      }
      await saveGameState(updatedState)
      return NextResponse.json({ state: updatedState })
    }

    if (action === 'time_add') {
      const { amountMs } = body
      const currentRoundData = state.rounds.find((r) => r.number === currentRound)
      if (currentRoundData && currentRoundData.roundEndsAt) {
        const currentEnd = new Date(currentRoundData.roundEndsAt).getTime()
        currentRoundData.roundEndsAt = new Date(currentEnd + amountMs).toISOString()

        const updatedState = { ...state }
        const rIndex = updatedState.rounds.findIndex(r => r.number === currentRound)
        updatedState.rounds[rIndex] = currentRoundData

        await saveGameState(updatedState)
        return NextResponse.json({ state: updatedState })
      }
      return NextResponse.json({ error: 'Rodada atual não encontrada ou sem tempo definido' }, { status: 400 })
    }

    if (action === 'transition') {
      const newRound = currentRound + 1
      const transactions = [...state.transactions]
      const players = state.players.map((p) => ({ ...p }))
      const holdings = state.holdings.map((h) => ({ ...h }))
      const taxRate = state.game.config.taxRate

      for (const portfolio of state.portfolios) {
        for (const pos of portfolio.positions) {
          const asset = state.assets.find((a) => a.ticker === pos.ticker)
          if (!asset || asset.status !== 'active') continue

          if (asset.type === 'fii') {
            // FII dividends (tax-exempt by nature in this simulation)
            const fii = asset as FII
            const dividend = fii.dividendPerRound * pos.quantity * (1 - fii.vacancyRate)
            if (dividend <= 0) continue
            const owner =
              portfolio.ownerType === 'player'
                ? players.find((p) => p.id === portfolio.ownerId)
                : holdings.find((h) => h.id === portfolio.ownerId)
            if (owner) {
              owner.cash += dividend
              transactions.push({
                id: nanoid(),
                timestamp: now,
                round: newRound,
                type: 'fii_dividend',
                buyerId: portfolio.ownerId,
                buyerType: portfolio.ownerType,
                sellerId: 'market',
                sellerType: 'market',
                ticker: pos.ticker,
                quantity: pos.quantity,
                total: dividend,
                description: `Dividendo FII ${pos.ticker}: R$${dividend.toFixed(2)}`,
              } as Transaction)
            }
          } else if (asset.type === 'stock') {
            // Stock dividends — dividendYield is annual%, we pay 1/12 per round, taxable
            const stock = asset as import('@/types').Stock
            if (stock.dividendYield <= 0) continue
            const grossDividend = (stock.currentPrice * pos.quantity * (stock.dividendYield / 100)) / 12
            const tax = grossDividend * taxRate
            const netDividend = grossDividend - tax
            if (netDividend <= 0) continue
            const owner =
              portfolio.ownerType === 'player'
                ? players.find((p) => p.id === portfolio.ownerId)
                : holdings.find((h) => h.id === portfolio.ownerId)
            if (owner) {
              owner.cash += netDividend
              transactions.push({
                id: nanoid(),
                timestamp: now,
                round: newRound,
                type: 'dividend',
                buyerId: portfolio.ownerId,
                buyerType: portfolio.ownerType,
                sellerId: 'market',
                sellerType: 'market',
                ticker: pos.ticker,
                quantity: pos.quantity,
                total: netDividend,
                description: `Dividendo Ação ${pos.ticker}: R$${netDividend.toFixed(2)} (bruto R$${grossDividend.toFixed(2)}, IR R$${tax.toFixed(2)})`,
              } as Transaction)
            }
          }
        }
      }

      for (const inv of state.fixedIncomeInvestments) {
        if (inv.isRedeemed) continue
        const product = state.fixedIncomeProducts.find((p) => p.id === inv.productId)
        if (!product) continue
        const roundsHeld = newRound - inv.roundInvested
        const grossYield = inv.amount * product.ratePerRound
        const tax = product.taxExempt ? 0 : grossYield * taxRate
        const netYield = grossYield - tax
        const owner =
          inv.ownerType === 'player'
            ? players.find((p) => p.id === inv.ownerId)
            : holdings.find((h) => h.id === inv.ownerId)
        if (owner) {
          owner.cash += netYield
          transactions.push({
            id: nanoid(),
            timestamp: now,
            round: newRound,
            type: 'fixed_income_yield',
            buyerId: inv.ownerId,
            buyerType: inv.ownerType,
            sellerId: inv.productId,
            sellerType: 'market',
            total: netYield,
            description: `Rendimento ${product.name} R$${netYield.toFixed(2)}`,
          } as Transaction)
        }
      }

      const rounds = [...state.rounds]
      const currentRoundData = rounds.find((r) => r.number === currentRound)
      if (currentRoundData) {
        currentRoundData.status = 'completed'
        currentRoundData.completedAt = now
      }
      const nextStartedAt = new Date()
      const newRoundConfig = {
        ...(currentRoundData?.config ?? {
          description: '',
          allowLoans: state.game.config.allowLoans,
          allowShort: state.game.config.allowShort,
          allowDayTrade: state.game.config.allowDayTrade,
          tickIntervalMs: state.game.config.tickIntervalMs,
          candleIntervalMs: state.game.config.candleIntervalMs,
          cardDrawIntervalMs: state.game.config.cardDrawIntervalMs,
          maxCardsPerRound: state.game.config.maxCardsPerRound,
          assets: [],
          scheduledEvents: [],
          fixedIncomeRates: [],
        }),
        assets: state.assets.map((a) => ({
          ticker: a.ticker,
          targetClose: a.targetClose,
          trend: a.trend,
          volatility: a.volatility,
          momentum: a.momentum,
          status: a.status,
        })),
        scheduledEvents: [],
        fixedIncomeRates: [],
      }

      // Process Scheduled Events for the New Round
      const finalAssets = [...state.assets]
      const finalNews = [...state.news]
      const scheduledEvents = state.game.config.scheduledEvents || []

      const eventsToTrigger = scheduledEvents.filter(ev => ev.triggerRound === newRound)
      const pendingEvents = scheduledEvents.filter(ev => ev.triggerRound !== newRound)

      if (eventsToTrigger.length > 0) {
        eventsToTrigger.forEach(ev => {
          if (ev.type === 'news' && ev.newsData) {
            finalNews.push({
              id: crypto.randomUUID(),
              round: newRound,
              title: ev.newsData.title,
              body: ev.newsData.body,
              source: 'Agência Master',
              category: 'economy',
              scope: 'global',
              targets: [],
              isRandom: false,
              isPublic: true,
              masterOnly: false,
              isActive: true,
              timestamp: new Date().toISOString()
            })
          }
          if (ev.type === 'market_shift' && ev.marketShiftData) {
            const assetIndex = finalAssets.findIndex(a => a.ticker === ev.marketShiftData!.ticker)
            if (assetIndex !== -1) {
              finalAssets[assetIndex] = {
                ...finalAssets[assetIndex],
                targetClose: ev.marketShiftData!.priceShiftAmount
              }
            }
          }
        })
      }

      rounds.push({
        number: newRound,
        status: 'active',
        theme: `Rodada ${newRound}`,
        startedAt: nextStartedAt.toISOString(),
        roundEndsAt: new Date(nextStartedAt.getTime() + 10 * 60000).toISOString(),
        lastUpdateAt: nextStartedAt.toISOString(),
        totalPausedMs: 0,
        config: newRoundConfig,
      })

      // Archive current round news, start fresh for next round
      const newsArchive = [...(state.newsArchive ?? []), ...state.news]
      const newRoundNews = finalNews.filter(n => n.round === newRound)

      // Auto-deduct loan interest from borrowers
      const updatedLoans = state.loans.map(l => ({ ...l }))
      for (const loan of updatedLoans) {
        if (loan.status !== 'active') continue
        const roundsHeld = newRound - loan.roundTaken
        const interestOwed = loan.amount * loan.interestPerRound * roundsHeld
        const totalOwed = loan.amount + interestOwed
        const borrower = loan.borrowerType === 'player'
          ? players.find(p => p.id === loan.borrowerId)
          : holdings.find(h => h.id === loan.borrowerId)
        if (!borrower) continue
        // Try to auto-deduct interest installment (1 round's interest)
        const installment = loan.amount * loan.interestPerRound
        if (borrower.cash >= installment) {
          borrower.cash -= installment
          loan.accumulatedInterest = (loan.accumulatedInterest ?? 0) + installment
          transactions.push({
            id: nanoid(), timestamp: now, round: newRound,
            type: 'loan_interest',
            buyerId: 'market', buyerType: 'market',
            sellerId: loan.borrowerId, sellerType: loan.borrowerType,
            total: installment,
            description: `Juros automáticos empréstimo: R$${installment.toFixed(2)}`,
          } as Transaction)
        } else {
          // Can't pay interest — check for bankruptcy
          const portfolio = state.portfolios.find(p => p.ownerId === loan.borrowerId)
          const hasAssets = (portfolio?.positions.length ?? 0) > 0
          const hasFixedIncome = state.fixedIncomeInvestments.some(i => i.ownerId === loan.borrowerId && !i.isRedeemed)
          if (!hasAssets && !hasFixedIncome && borrower.cash < installment) {
            // Bankrupt — no cash, no assets, can't pay
            if ('profile' in borrower) {
              (borrower as typeof borrower & { bankrupted?: boolean }).bankrupted = true
            }
            loan.status = 'defaulted'
            newRoundNews.push({
              id: crypto.randomUUID(), round: newRound, timestamp: now,
              title: `🚨 Falência: ${borrower.name}`,
              body: `${borrower.name} não conseguiu pagar seus empréstimos e foi declarado(a) falido(a). Dívida de R$${totalOwed.toFixed(2)} foi perdida.`,
              source: 'Central de Riscos', category: 'crisis', scope: 'global',
              targets: [], isRandom: false, isPublic: true, masterOnly: false, isActive: true,
            })
          }
        }
      }

      // Deactivate all active market offers on round transition (unless they are designed to last across rounds, 
      // but for this game's simplicity, we clear the board each round unless manual).
      const finalMarketOffers = state.marketOffers.map(o => ({ ...o, isActive: false }))

      const updatedState: GameState = {
        ...state,
        assets: finalAssets,
        news: newRoundNews,
        newsArchive,
        game: {
          ...state.game,
          currentRound: newRound,
          status: 'running',
          config: {
            ...state.game.config,
            scheduledEvents: pendingEvents
          }
        },
        rounds,
        players,
        holdings,
        loans: updatedLoans,
        transactions,
        marketOffers: finalMarketOffers,
      }
      await saveGameState(updatedState)
      return NextResponse.json({ state: updatedState })
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
