import { PrismaClient } from '@prisma/client'
import { assets } from './seedData'
import { eventTemplates } from './seedEvents'

const prisma = new PrismaClient()

async function main() {
    console.log('🔧 Limpando banco antigo...')
    await prisma.eventTemplate.deleteMany()
    await prisma.fixedIncomeTemplate.deleteMany()
    await prisma.cardTemplate.deleteMany()
    await prisma.newsTemplate.deleteMany()
    await prisma.assetTemplate.deleteMany()

    // ══════════════════════════════════════════
    // ASSETS (21 Ações + 6 FIIs)
    // ══════════════════════════════════════════
    console.log('📊 Inserindo 27 ativos...')
    for (const asset of assets) {
        await prisma.assetTemplate.upsert({
            where: { ticker: asset.ticker },
            update: {},
            create: asset,
        })
    }

    // ══════════════════════════════════════════
    // EVENT TEMPLATES (30+ eventos unificados)
    // ══════════════════════════════════════════
    console.log('🎴 Inserindo eventos unificados...')
    for (const evt of eventTemplates) {
        await prisma.eventTemplate.create({ data: evt })
    }

    // ══════════════════════════════════════════
    // RENDA FIXA DINÂMICA (rotação por rodada)
    // ══════════════════════════════════════════
    console.log('💰 Inserindo produtos de renda fixa...')
    const fixedIncomeData = [
        {
            name: 'Poupança Nacional',
            type: 'poupanca',
            description: 'A "segurança" que perde para a inflação. Liquidez imediata, mas rendimento pífio. Ideal para quem quer perder dinheiro lentamente.',
            baseRate: 0.003,
            riskOfDefault: false,
            availableFromRound: 0,
            liquidityType: 'immediate',
            lockRounds: 0,
            earlyWithdrawPenalty: 0,
            isBadInvestment: true,
            taxExempt: true,
        },
        {
            name: 'Tesouro Direto Selic',
            type: 'tesouro_selic',
            description: 'O investimento mais seguro do Brasil. Liquidez imediata, rendimento base do jogo. Zero risco de calote. O benchmark que todo investimento deveria bater.',
            baseRate: 0.008,
            riskOfDefault: false,
            availableFromRound: 0,
            liquidityType: 'immediate',
            lockRounds: 0,
            earlyWithdrawPenalty: 0,
            isBadInvestment: false,
            taxExempt: false,
        },
        {
            name: 'CDB BancoSólido Pré-Fixado',
            type: 'cdb',
            description: 'CDB do maior banco do país. Paga prêmio sobre a Selic mas trava seu dinheiro por 2 rodadas. Sem risco, sem surpresas.',
            baseRate: 0.012,
            riskOfDefault: false,
            availableFromRound: 0,
            expiresAtRound: 6,
            liquidityType: 'on_maturity',
            lockRounds: 2,
            earlyWithdrawPenalty: 0.15,
            isBadInvestment: false,
            taxExempt: false,
            linkedTicker: 'BSOL3',
        },
        {
            name: 'LCI Imobiliária Premium',
            type: 'lci_lca',
            description: 'Letra de Crédito Imobiliário com isenção de IR! Surge apenas no meio do jogo com taxa agressiva. Oportunidade temporária — quem perder, perdeu.',
            baseRate: 0.015,
            riskOfDefault: false,
            availableFromRound: 3,
            expiresAtRound: 6,
            liquidityType: 'on_maturity',
            lockRounds: 2,
            earlyWithdrawPenalty: 0.10,
            isBadInvestment: false,
            taxExempt: true,
        },
        {
            name: 'LCA AgroForte Verde',
            type: 'lci_lca',
            description: 'Letra de Crédito do Agronegócio atrelada à AgroForte. Isenta de IR, taxa excelente, mas só aparece entre as rodadas 2 e 5. Risco baixíssimo pois o Agro sempre exporta.',
            baseRate: 0.014,
            riskOfDefault: false,
            availableFromRound: 2,
            expiresAtRound: 5,
            liquidityType: 'on_maturity',
            lockRounds: 2,
            earlyWithdrawPenalty: 0.10,
            isBadInvestment: false,
            taxExempt: true,
            linkedTicker: 'AGFT3',
        },
        {
            name: 'CDB FinTechPay Turbo',
            type: 'cdb',
            description: 'CDB do banco digital mais agressivo do mercado. Taxa altíssima, mas se o evento "Calote FinTechPay" sair, você perde TUDO. Alta recompensa, altíssimo risco.',
            baseRate: 0.022,
            riskOfDefault: true,
            availableFromRound: 4,
            expiresAtRound: 8,
            liquidityType: 'on_maturity',
            lockRounds: 3,
            earlyWithdrawPenalty: 0.20,
            isBadInvestment: false,
            taxExempt: false,
            linkedTicker: 'FTPY3',
        },
        {
            name: 'Debênture PetroMax Pré-Sal',
            type: 'debenture',
            description: 'Debênture da maior petroleira do país. Taxa interessante atrelada à produção. Se sair evento de descoberta de bacia, o rendimento melhora. Risco político latente.',
            baseRate: 0.018,
            riskOfDefault: false,
            availableFromRound: 2,
            expiresAtRound: 7,
            liquidityType: 'penalty',
            lockRounds: 2,
            earlyWithdrawPenalty: 0.12,
            isBadInvestment: false,
            taxExempt: false,
            linkedTicker: 'PMAX3',
        },
        {
            name: 'CDB Liquidez Diária Simples',
            type: 'cdb',
            description: 'CDB básico com liquidez diária. Rende pouco mais que a Poupança mas menos que o Tesouro. Para quem quer "alguma coisa" sem pensar.',
            baseRate: 0.005,
            riskOfDefault: false,
            availableFromRound: 0,
            liquidityType: 'immediate',
            lockRounds: 0,
            earlyWithdrawPenalty: 0,
            isBadInvestment: false,
            taxExempt: false,
        },
    ]

    for (const fix of fixedIncomeData) {
        await prisma.fixedIncomeTemplate.create({ data: fix })
    }

    // ══════════════════════════════════════════
    // REGRAS DO JOGO (Game Config Base)
    // ══════════════════════════════════════════
    console.log('⚙️ Inserindo regras do jogo...')
    const ruleData = {
        allowLoans: true,
        allowShort: false,
        allowDayTrade: true,
        allowP2PTrade: true,
        maxLoanPercent: 0.4,
        defaultLoanInterest: 0.05,
        taxRate: 0.15,
        tickIntervalMs: 25000,
        candleIntervalMs: 60000,
        cardDrawIntervalMs: 120000,
        maxCardsPerRound: 3,
        autoRevealNews: true,
        scheduledEvents: [],
    }

    await prisma.gameRuleTemplate.upsert({
        where: { name: 'Padrão Clássico' },
        update: { configJson: JSON.stringify(ruleData) },
        create: { name: 'Padrão Clássico', configJson: JSON.stringify(ruleData) },
    })

    console.log('✅ Seeding completo! Banco InvestQuest reestruturado com sucesso.')
    console.log('   📊 27 ativos (21 ações + 6 FIIs)')
    console.log('   🎴 ' + eventTemplates.length + ' eventos unificados')
    console.log('   💰 ' + fixedIncomeData.length + ' produtos de renda fixa')
    console.log('   ⚙️ 1 regra padrão')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
