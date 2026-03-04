import type { FII, FIISegment } from '@/types'

/**
 * Default FIIs — with deliberate trend/momentum/targetClose configs
 * to create clear chart patterns.
 *
 * Design:
 *  - LOGI11 (logística): bullish — demanda por e-commerce crescendo
 *  - SHOP11 (shopping): volatile — recuperação pós-pandemia com incerteza
 *  - CORP11 (lajes): bearish — trabalho remoto aumentou vacância
 *  - AGRL11 (agro): bullish — safra recorde, contratos atípicos
 *  - PAPF11 (papel CRI): bullish moderado — Selic alta beneficia
 *  - HOSP11 (hospital): neutral/defensivo — mais estável que o resto
 */

const glos: Record<string, string> = {
  preco: 'Valor atual de 1 cota no mercado',
  pvp: 'Preço / Valor Patrimonial — em 1 = barato, acima de 1 = caro',
  dy: 'Dividend Yield mensal. Ex: 0,8% ao mês = 9,6% ao ano',
  vacancia: '% do imóvel vazio. Mais vacância = menos dividendo',
}

interface FIIConfig {
  ticker: string
  name: string
  segment: FIISegment
  profile: string
  price: number
  targetClose: number    // clear directional target for round 1
  trend: FII['trend']
  volatility: number
  momentum: number
  pvpRatio: number
  dyPerRound: number     // % (0.8 = 0.8% ao mês)
  vacancyRate: number    // % (5 = 5%)
  totalProperties: number
  netArea: number
  story: string
}

const configs: FIIConfig[] = [
  // ────── Logística (E-commerce / Indústria) ──────
  {
    ticker: 'LOGI11', name: 'LogisBR', segment: 'logistica',
    profile: 'Galpões logísticos classe AAA em SP e MG. Foco em clientes de e-commerce.',
    price: 95.00, targetClose: 96.00,
    trend: 'neutral', volatility: 0.035, momentum: 0.02,
    pvpRatio: 0.98,
    dyPerRound: 0.85, vacancyRate: 3,
    totalProperties: 14, netArea: 320000,
    story: 'LOGI11 surfa na onda do Mercado Livre e Amazon. Empresas precisam de estoques perto das capitais para entregar rápido. A vacância é quase zero porque galpão bom falta no mercado.',
  },
  {
    ticker: 'BLG11', name: 'BrioLog', segment: 'logistica',
    profile: 'Galpões logísticos secundários pelo Brasil afora. Maior risco de crédito dos inquilinos.',
    price: 82.00, targetClose: 81.00,
    trend: 'neutral', volatility: 0.05, momentum: 0.02,
    pvpRatio: 0.85,
    dyPerRound: 0.95, vacancyRate: 12,
    totalProperties: 25, netArea: 480000,
    story: 'O BLG11 paga um dividendo maior que o LOGI11 para compensar o risco: os galpões são mais velhos, no interior, e as empresas que alugam podem atrasar o pagamento se a crise bater.',
  },

  // ────── Lajes Corporativas (Escritórios) ──────
  {
    ticker: 'CORP11', name: 'CorpTower', segment: 'lajes_corp',
    profile: 'Prédios espelhados na Faria Lima e Berrini. Foco em bancos e multinacionais.',
    price: 78.00, targetClose: 77.00,
    trend: 'neutral', volatility: 0.06, momentum: 0.02,
    pvpRatio: 0.85,
    dyPerRound: 0.65, vacancyRate: 22,
    totalProperties: 6, netArea: 95000,
    story: 'CORP11 apanha desde a pandemia. O trabalho híbrido esvaziou andares inteiros e a vacância explodiu para 22%. O cotista recebe pouco dividendo porque precisa pagar condomínio das salas vazias.',
  },
  {
    ticker: 'EDFC11', name: 'Edificare', segment: 'lajes_corp',
    profile: 'Lajes corporativas de alto padrão no Rio de Janeiro e Brasília.',
    price: 64.00, targetClose: 65.00,
    trend: 'neutral', volatility: 0.045, momentum: 0.02,
    pvpRatio: 0.72,
    dyPerRound: 0.58, vacancyRate: 31,
    totalProperties: 8, netArea: 110000,
    story: 'Com desconto colossal no P/VP (muito barato), o EDFC11 é uma aposta na volta imperativa dos funcionários ao escritório. Se os escritórios voltarem a encher, a cota dispara.',
  },

  // ────── FIIs de Papel (Recebíveis Imobiliários - CRIs) ──────
  {
    ticker: 'PAPF11', name: 'PapelFix', segment: 'papel',
    profile: 'Fundo que compra dívidas imobiliárias indexadas à inflação (IPCA + 7%).',
    price: 98.00, targetClose: 99.00,
    trend: 'neutral', volatility: 0.03, momentum: 0.02,
    pvpRatio: 1.00,
    dyPerRound: 1.10, vacancyRate: 0,
    totalProperties: 0, netArea: 0,
    story: 'O PapelFix não tem tijolo. Ele empresta dinheiro pra construtora subir prédio e cobra juros. Se a inflação do Brasil sobe, o dividendo que ele paga sobe na mesma proporção.',
  },
  {
    ticker: 'HGLG11', name: 'HighYield', segment: 'papel',
    profile: 'Fundo CRI associado a dívidas de risco (Juros altíssimos atrelados ao CDI).',
    price: 105.00, targetClose: 104.00,
    trend: 'neutral', volatility: 0.06, momentum: 0.02,
    pvpRatio: 1.05,
    dyPerRound: 1.35, vacancyRate: 0,
    totalProperties: 0, netArea: 0,
    story: 'O HighYield paga o maior dividendo da bolsa, mas assume um risco letal: empresta dinheiro para devedores ruins. Se a Selic explodir, esses devedores quebram e o fundo toma calote (default).',
  },
]

export const defaultFIIs: FII[] = configs.map(c => {
  const patrimonyValue = c.price / c.pvpRatio
  return {
    ticker: c.ticker,
    name: c.name,
    type: 'fii' as const,
    sector: 'FIIs',
    profile: c.profile,
    status: 'active' as const,
    initialPrice: c.price,
    currentPrice: c.price,
    openPrice: c.price,
    previousClose: c.price,
    totalShares: 5000,
    availableShares: 5000,
    trend: c.trend,
    volatility: c.volatility,
    momentum: c.momentum,
    targetClose: c.targetClose,
    tags: ['fii', c.segment],
    glossary: glos,
    segment: c.segment,
    patrimonyValue,
    pvpRatio: c.pvpRatio,
    dividendPerRound: c.price * (c.dyPerRound / 100),
    dividendYield: c.dyPerRound * 12,   // anualizado
    vacancyRate: c.vacancyRate / 100,
    totalProperties: c.totalProperties,
    netArea: c.netArea,
  }
})

export const fiiStories: Record<string, string> = Object.fromEntries(
  configs.map(c => [c.ticker, c.story])
)
