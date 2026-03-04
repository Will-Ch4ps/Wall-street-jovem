import type { Stock } from '@/types'

/**
 * Default Companies
 * ─────────────────────────────────────────────────────────────────────────────
 * Each company has deliberate trend + momentum values to create clear
 * bullish or bearish chart patterns from round 1:
 *
 * trend    → 'bullish' | 'bearish' | 'volatile' | 'neutral'
 * momentum → 0.01–0.20 (how strongly price is pulled toward targetClose)
 * volatility → 0.02–0.20 (price noise per tick)
 * targetClose → starting target; updated each round by master
 *
 * Design principle: not all stocks should go up — the game needs losers.
 * Group: obvious buys (TNOV3, NUCL3, BSOL3), obvious sells (BRIS3, AERV3),
 * and interesting middle ground (PMAX3, AGFT3, DGCR3).
 */

const glos: Record<string, string> = {
  preco: 'Valor atual de 1 ação no mercado',
  variacao: 'Diferença percentual desde a abertura do pregão',
  volatilidade: 'Quão rápido o preço oscila — maior = mais arriscado',
  tendencia: 'Direção esperada do preço a médio prazo',
  dividendos: 'Percentual do lucro distribuído aos acionistas',
  pe: 'Preço/Lucro: quantas vezes o lucro anual está embutido no preço',
}

interface StockConfig {
  ticker: string
  name: string
  sector: string
  profile: string
  price: number
  targetClose: number   // round 1 target — clear direction signal
  trend: Stock['trend']
  volatility: number
  momentum: number      // pull strength toward targetClose (0.01–0.20)
  dividendYield: number
  peRatio: number
  tags: string[]
  story: string         // educational context for master to share
}

const configs: StockConfig[] = [
  // ════════════ TECNOLOGIA ════════════
  {
    ticker: 'TNOV3', name: 'TechNova', sector: 'Tecnologia',
    profile: 'Líder consolidada em cloud B2B. Resultados consistentes, baixa alavancagem.',
    price: 45.00, targetClose: 46.00, // Starts neutral, ends higher
    trend: 'neutral', volatility: 0.05, momentum: 0.02,
    dividendYield: 0.02, peRatio: 22,
    tags: ['tech', 'cloud', 'exportadora', 'lider'],
    story: 'TechNova é segura. Tem contratos longos e muita receita recorrente. É o porto seguro do setor de TI para quem não quer sustos. Como é sólida, tem um P/L esticado.',
  },
  {
    ticker: 'BRIS3', name: 'ByteRise', sector: 'Tecnologia',
    profile: 'Startup de IA com crescimento explosivo. Sem lucro. Alto risco.',
    price: 18.00, targetClose: 18.00, // Starts neutral, ends volatile
    trend: 'neutral', volatility: 0.18, momentum: 0.02,
    dividendYield: 0.00, peRatio: -1,
    tags: ['tech', 'IA', 'growth', 'especulativo'],
    story: 'ByteRise é uma aposta binária: Ou a IA deles revoluciona o mercado, ou eles ficam sem dinheiro e vão a falência. Ideal para operar notícias e eventos rápidos.',
  },
  {
    ticker: 'DGCR3', name: 'DigiCore', sector: 'Tecnologia',
    profile: 'Empresa madura de cibersegurança e servidores físicos. Crescimento lento.',
    price: 72.00, targetClose: 72.00, // Starts neutral, ends stable
    trend: 'neutral', volatility: 0.04, momentum: 0.02,
    dividendYield: 0.04, peRatio: 18,
    tags: ['tech', 'dividendos', 'defensivo', 'infra'],
    story: 'A "vaca leiteira" do setor de tecnologia. Cresce a passos de tartaruga, mas os lucros são imensos e viram gordos dividendos mensais. Imune a modinhas passageiras de IA.',
  },

  // ════════════ ENERGIA ════════════
  {
    ticker: 'ENVD3', name: 'EnergiaVerde', sector: 'Energia',
    profile: 'Focada 100% em matriz eólica e solar. Beneficiada por selos ESG.',
    price: 28.00, targetClose: 29.00,
    trend: 'neutral', volatility: 0.07, momentum: 0.02,
    dividendYield: 0.015, peRatio: 28,
    tags: ['energia', 'esg', 'renovável', 'crescimento'],
    story: 'EnergiaVerde ganha todos leilões do governo. O mercado aceita pagar caro (P/L de 28) pela previsibilidade da energia limpa por décadas.',
  },
  {
    ticker: 'PMAX3', name: 'PetroMax', sector: 'Energia',
    profile: 'Petrolífera clássica. Alta correlação com Brent e Dólar.',
    price: 55.00, targetClose: 55.00,
    trend: 'neutral', volatility: 0.12, momentum: 0.02,
    dividendYield: 0.06, peRatio: 8,
    tags: ['energia', 'exportadora', 'commodities', 'petróleo'],
    story: 'PetroMax não controla o próprio destino: se há guerra no mundo e o petróleo sobe, ela jorra dinheiro. Se a economia global freia, ela afunda. É cíclica e barata.',
  },
  {
    ticker: 'NUCL3', name: 'NuclearBR', sector: 'Energia',
    profile: 'Estatal monopolista de energia de base. Ultra-estável, altos dividendos.',
    price: 90.00, targetClose: 90.00,
    trend: 'neutral', volatility: 0.025, momentum: 0.02,
    dividendYield: 0.07, peRatio: 12,
    tags: ['energia', 'estatal', 'dividendos', 'defensivo', 'monopolio'],
    story: 'O grande risco da NuclearBR é político. Se falarem em interferência estatal, ela desmorona. Caso contrário, é um relógio suíço de pagar dividendos.',
  },

  // ════════════ CONSUMO ════════════
  {
    ticker: 'MCFC3', name: 'MercaFácil', sector: 'Consumo',
    profile: 'Hipermercados atacarejo. Margem líquida minúscula, vive de giro rápido.',
    price: 22.00, targetClose: 21.00,
    trend: 'neutral', volatility: 0.09, momentum: 0.02,
    dividendYield: 0.025, peRatio: 14,
    tags: ['consumo', 'varejo', 'importadora', 'cíclica'],
    story: 'MercaFácil lucra centavos em cada pacote de arroz. Inflação destrói essa empresa rapidamente porque o cliente pobre some do caixa.',
  },
  {
    ticker: 'LUXM3', name: 'LuxMart', sector: 'Consumo',
    profile: 'Varejo premium/luxo de alta classe. Clientela não liga para preço.',
    price: 110.00, targetClose: 112.00,
    trend: 'neutral', volatility: 0.05, momentum: 0.02,
    dividendYield: 0.03, peRatio: 20,
    tags: ['consumo', 'premium', 'defensivo', 'luxo'],
    story: 'Quando o país entra em crise, a LuxMart nem percebe. O público AA continua comprando bolsas caríssimas. O P/L é maior pois o modelo é resiliente a recessões.',
  },
  {
    ticker: 'ONLS3', name: 'OnlineShop', sector: 'Consumo',
    profile: 'Mega e-commerce chinês no Brasil. Preço baixo, frete grátis, lucro nulo.',
    price: 35.00, targetClose: 33.00,
    trend: 'neutral', volatility: 0.16, momentum: 0.02,
    dividendYield: 0.00, peRatio: -1,
    tags: ['consumo', 'tech', 'growth', 'especulativo', 'importadora'],
    story: 'A OnlineShop queima bilhões para asfixiar a concorrência. É uma operação insustentável caso os juros subam rápido. Alta volatilidade.',
  },

  // ════════════ FINANCEIRO ════════════
  {
    ticker: 'BSOL3', name: 'BancoSólido', sector: 'Financeiro',
    profile: 'Um dos maiores bancos do país. Foco em crédito consignado e prêmio de risco.',
    price: 85.00, targetClose: 86.00,
    trend: 'neutral', volatility: 0.04, momentum: 0.02,
    dividendYield: 0.08, peRatio: 10,
    tags: ['financeiro', 'dividendos', 'defensivo', 'banco'],
    story: 'No Brasil, bancão sempre ganha com spread (diferença entre o que pega emprestado e repassa). O BSOL3 lucra em qualquer cenário e distribui fortunas.',
  },
  {
    ticker: 'FTPY3', name: 'FinTechPay', sector: 'Financeiro',
    profile: 'Banco 100% digital focado em desbancarização. Carteira de crédito arriscada.',
    price: 15.00, targetClose: 14.50,
    trend: 'neutral', volatility: 0.18, momentum: 0.02,
    dividendYield: 0.00, peRatio: -1,
    tags: ['financeiro', 'tech', 'growth', 'fintech', 'especulativo'],
    story: 'FinTechPay não cobra taxa, não lucra e dá limite de crédito alto no app. Se a inadimplência nacional subir, eles quebram em semanas.',
  },
  {
    ticker: 'INVS3', name: 'InvestCorp', sector: 'Financeiro',
    profile: 'Mega corretora. O lucro é baseado nas taxas de corretagem dos clientes operando ações.',
    price: 38.00, targetClose: 39.00,
    trend: 'neutral', volatility: 0.14, momentum: 0.02,
    dividendYield: 0.03, peRatio: 15,
    tags: ['financeiro', 'corretagem', 'bolsa', 'cíclica'],
    story: 'Quando a economia vai bem e todo mundo vai investir na bolsa (Bull Market), a corretora nada de braçada em taxas. Em Bear Market, ela murcha.',
  },

  // ════════════ SAÚDE ════════════
  {
    ticker: 'VSAU3', name: 'VidaSaúde', sector: 'Saúde',
    profile: 'Laboratório fabricante de analgésicos genéricos. Produção em escala.',
    price: 48.00, targetClose: 49.00,
    trend: 'neutral', volatility: 0.05, momentum: 0.02,
    dividendYield: 0.025, peRatio: 19,
    tags: ['saúde', 'farmacêutico', 'defensivo', 'recorrência'],
    story: 'É a ação defensiva por excelência: Ninguém deixa de comprar insulina e dipirona na crise. A previsibilidade de faturamento é gigantesca.',
  },
  {
    ticker: 'BLAB3', name: 'BioLab', sector: 'Saúde',
    profile: 'Pesquisa biológica focada num tratamento revolucionário para oncologia.',
    price: 12.00, targetClose: 11.00,
    trend: 'neutral', volatility: 0.22, momentum: 0.02,
    dividendYield: 0.00, peRatio: -1,
    tags: ['saúde', 'biotech', 'growth', 'especulativo'],
    story: 'Se o remédio em testes for aprovado pela Anvisa/FDA, a ação multiplica por dez. Se for reprovado, a empresa fecha e a ação vira zero. Binária.',
  },
  {
    ticker: 'HOSP3', name: 'RedeHosp', sector: 'Saúde',
    profile: 'Maior operadora de leitos de alto padrão do Brasil. Custo fixo astronômico.',
    price: 33.00, targetClose: 33.00,
    trend: 'neutral', volatility: 0.06, momentum: 0.02,
    dividendYield: 0.02, peRatio: 24,
    tags: ['saúde', 'hospitais', 'serviços', 'defensivo'],
    story: 'Manter um hospital com enfermeiros qualificados e máquinas importadas custa ouro. A inflação médica corrói a paciência de quem compra HOSP3.',
  },

  // ════════════ AGRO ════════════
  {
    ticker: 'AGFT3', name: 'AgroForte', sector: 'Agro',
    profile: 'Plantadora e exportadora de Soja em grão.',
    price: 62.00, targetClose: 63.00,
    trend: 'neutral', volatility: 0.09, momentum: 0.02,
    dividendYield: 0.04, peRatio: 9,
    tags: ['agro', 'exportadora', 'commodities', 'soja'],
    story: 'Duas coisas mandam na AgroForte: Choveu na hora certa lá fora? E o dólar subiu perante o Real? Se a resposta for dupla sim, os donos ficam bilionários.',
  },
  {
    ticker: 'FRIG3', name: 'BoiGlobal', sector: 'Agro',
    profile: 'Abatedouro e exportador global de carnes (Bovina, Frango).',
    price: 14.50, targetClose: 14.00,
    trend: 'neutral', volatility: 0.13, momentum: 0.02,
    dividendYield: 0.05, peRatio: 6,
    tags: ['agro', 'frigoríficos', 'exportadora', 'cíclica'],
    story: 'Eles não criam os bois. Eles compram do produtor, matam e vendem para China. Quando o boi fica escasso (e caro), as margens deles derretem feito faca quente.',
  },
  {
    ticker: 'TRTR3', name: 'TerraTech', sector: 'Agro',
    profile: 'Fabricante de colheitadeiras 100% automatizadas com GPS.',
    price: 54.00, targetClose: 55.50,
    trend: 'neutral', volatility: 0.06, momentum: 0.02,
    dividendYield: 0.035, peRatio: 12,
    tags: ['agro', 'tech', 'máquinas', 'crescimento'],
    story: 'Eles não plantam nem abatem. Eles vendem as pás! Quando o campo tem uma colheita recorde, o produtor rural rico corre para comprar tratores melhores.',
  },

  // ════════════ MEIOS DE TRANSPORTE E TURISMO ════════════
  {
    ticker: 'AERV3', name: 'AeroViagem', sector: 'Mobilidade',
    profile: 'Companhia aérea focada na ponte aérea nacional.',
    price: 25.00, targetClose: 24.00,
    trend: 'neutral', volatility: 0.14, momentum: 0.02,
    dividendYield: 0.00, peRatio: -1,
    tags: ['turismo', 'aviação', 'importadora', 'cíclica', 'endividada'],
    story: 'Fazer um jatinho voar todo dia com margens seguras é milagre administrativo. O querosene é importado (em dólar) e a passagem é cobrada em R$ em 12x no cartão.',
  },
  {
    ticker: 'MOVB3', name: 'RotaLivre', sector: 'Mobilidade',
    profile: 'Locadora de frota para motoristas de app e empresas.',
    price: 40.00, targetClose: 40.50,
    trend: 'neutral', volatility: 0.08, momentum: 0.02,
    dividendYield: 0.015, peRatio: 16,
    tags: ['turismo', 'mobilidade', 'locadoras', 'serviços'],
    story: 'O segredo da locadora é comprar o carro zero na fábrica com 30% de desconto e vender depois de um ano pelo preço do zero para o brasileiro otário comprar. Lucro fenomenal.',
  },
  {
    ticker: 'HOTE3', name: 'HospedaBem', sector: 'Mobilidade',
    profile: 'Rede executiva hoteleira no interior de SP.',
    price: 18.00, targetClose: 18.20,
    trend: 'neutral', volatility: 0.05, momentum: 0.02,
    dividendYield: 0.025, peRatio: 22,
    tags: ['turismo', 'hotelaria', 'serviços'],
    story: 'Operação imobiliária pesada. O custo pra rodar o hotel existe estando cheio ou vazio. Se eventos explodem na região, é uma máquina de gerar caixa. Responde à melhora do PIB.',
  },
]

const defaultGlossary = glos

export const defaultCompanies: Stock[] = configs.map(c => ({
  ticker: c.ticker,
  name: c.name,
  type: 'stock' as const,
  sector: c.sector,
  profile: c.profile,
  status: 'active' as const,
  initialPrice: c.price,
  currentPrice: c.price,
  openPrice: c.price,
  previousClose: c.price,
  totalShares: 10000,
  availableShares: 10000,
  trend: c.trend,
  volatility: c.volatility,
  momentum: c.momentum,
  targetClose: c.targetClose,
  tags: c.tags,
  glossary: defaultGlossary,
  dividendYield: c.dividendYield,
  peRatio: c.peRatio,
  marketCap: c.price * 10000,
}))

// Export story map for use in master panel (company scenario config)
export const companyStories: Record<string, string> = Object.fromEntries(
  configs.map(c => [c.ticker, c.story])
)
