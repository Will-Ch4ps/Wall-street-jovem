import type { Card } from '@/types'

/**
 * Card linkage metadata — used to auto-resolve news, IPO, and sector connections
 * when a new card is added or a card is drawn.
 */
export interface CardMeta {
  card: Card
  /** Tickers this card is strongly connected to (for auto-linking) */
  linkedTickers?: string[]
  /** Sectors this card affects */
  linkedSectors?: string[]
  /** Suggest a news template ID to generate when drawn */
  suggestedNewsTemplateId?: string
}

const card = (
  id: string,
  type: Card['type'],
  name: string,
  description: string,
  icon: string,
  probability: Card['probability'],
  effect: Card['effect'],
  opts: Partial<Pick<Card, 'triggerAt' | 'revealToPlayers' | 'generateNews' | 'cooldownRounds' | 'newsTemplate'>> = {}
): Card => ({
  id,
  type,
  name,
  description,
  icon,
  probability,
  effect,
  triggerAt: opts.triggerAt ?? 'random',
  revealToPlayers: opts.revealToPlayers ?? true,
  generateNews: opts.generateNews ?? true,
  newsTemplate: opts.newsTemplate,
  isUsed: false,
  cooldownRounds: opts.cooldownRounds ?? 1,
})

// ─── GLOBAL DECK ────────────────────────────────────────────────────────────
export const globalDeck: Card[] = [
  // 1. GLOBAL POSITIVO (Macro / Bull Market)
  card('gc_macro_bull', 'global',
    'Euforia Macroeconômica',
    'Fluxo recorde de capital estrangeiro entra no país. Juros caem e o PIB surpreende positivamente. Todos os setores em alta.',
    '🚀', 'very_rare',
    { target: 'all', priceModifier: { min: 0.10, max: 0.25 }, volatilityModifier: -0.02, trendOverride: 'bullish' },
    { cooldownRounds: 5 }
  ),

  // 2. GLOBAL POSITIVO (Macro / Câmbio Favorável)
  card('gc_macro_dolar_cai', 'global',
    'Real se Valoriza Forte',
    'Dólar despenca 8% após dados de inflação americana. Empresas ligadas ao consumo interno e importadoras disparam.',
    '💵', 'uncommon',
    { target: 'sector', targetFilter: 'Consumo', priceModifier: { min: 0.08, max: 0.18 }, trendOverride: 'bullish' },
    { cooldownRounds: 3 }
  ),

  // 3. GLOBAL NEGATIVO (Macro / Juros Altos)
  card('gc_macro_selic_dispara', 'global',
    'Choque de Juros (Copom)',
    'Banco Central eleva a Selic de surpresa em 1.5%. Ações desabam, dinheiro foge para a renda fixa e crédito some.',
    '🏦', 'rare',
    { target: 'all', priceModifier: { min: -0.18, max: -0.08 }, volatilityModifier: 0.04, trendOverride: 'bearish' },
    { cooldownRounds: 4 }
  ),
]

// ─── SECTOR DECKS ────────────────────────────────────────────────────────────
export const sectorDecks: Record<string, Card[]> = {
  // 4. SETOR POSITIVO (Agro / Super Safra)
  Agro: [
    card('sc_agro_supersafra', 'sector',
      'Super Safra Recorde',
      'O clima perfeito garante uma colheita histórica. O Brasil lidera as exportações globais. O setor Agro explode de lucrar.',
      '🌾', 'uncommon',
      { target: 'sector', targetFilter: 'Agro', priceModifier: { min: 0.12, max: 0.20 }, trendOverride: 'bullish' },
      { cooldownRounds: 3 }
    ),
  ],
  // 5. SETOR NEGATIVO (Tecnologia / Regulamentação)
  Tecnologia: [
    card('sc_tech_regulacao', 'sector',
      'Cerco Regulatório às Big Techs',
      'Governo impõe taxação pesada e regras de antitruste rígidas. O setor de tecnologia sangra na bolsa.',
      '⚖️', 'uncommon',
      { target: 'sector', targetFilter: 'Tecnologia', priceModifier: { min: -0.15, max: -0.05 }, trendOverride: 'bearish' },
      { cooldownRounds: 3 }
    ),
  ],
}

// ─── COMPANY DECK (specific tickers) ─────────────────────────────────────────
export const companyDeck: Card[] = [
  // 6. AÇÃO ESPECÍFICA POSITIVA (Micro / Fusão)
  card('cc_empresa_fusao', 'company',
    'TechNova (TNOV3): Oferta de Compra',
    'Rumores fortíssimos indicam que um magnata árabe quer comprar a TechNova com um belo prêmio na cotação.',
    '💼', 'rare',
    { target: 'company', targetFilter: 'TNOV3', priceModifier: { min: 0.15, max: 0.35 }, trendOverride: 'bullish' },
    { linkedTickers: ['TNOV3'] } as never
  ),

  // 7. AÇÃO ESPECÍFICA NEGATIVA (Micro / Escândalo)
  card('cc_empresa_escandalo', 'company',
    'MercaFácil (MCFC3): Fraude Contábil!',
    'A CVM descobre um rombo bilionário escondido nos balanços. Ações entram em leilão de queda. Pânico absoluto!',
    '🔥', 'rare',
    { target: 'company', targetFilter: 'MCFC3', priceModifier: { min: -0.40, max: -0.20 }, trendOverride: 'bearish' },
    { linkedTickers: ['MCFC3'] } as never
  ),

  // 8. FII ESPECÍFICO POSITIVO (Micro / FII / Venda de Ativo)
  card('cc_fii_venda_lucro', 'fii',
    'LogisBR (LOGI11): Venda de Galpão',
    'O Fundo vendeu um galpão logístico pelo dobro do preço que valia. Pagará um super-dividendo extraordinário este mês.',
    '🏢', 'uncommon',
    { target: 'fii', targetFilter: 'LOGI11', priceModifier: { min: 0.08, max: 0.15 }, trendOverride: 'bullish' },
    { linkedTickers: ['LOGI11'] } as never
  ),

  // 9. EVENTO POSITIVO EXTRA (Saúde / Remédio Aprovado)
  card('cc_saude_cura', 'company',
    'BioLab (BLAB3): Tratamento Aprovado!',
    'A ANVISA aprovou o novo e revolucionário tratamento oncológico. A empresa ganhou exclusividade na patente de bilhões.',
    '💉', 'very_rare',
    { target: 'company', targetFilter: 'BLAB3', priceModifier: { min: 0.40, max: 0.80 }, trendOverride: 'volatile' },
    { linkedTickers: ['BLAB3'] } as never
  ),

  // 10. EVENTO NEGATIVO EXTRA (Financeiro / Calote)
  card('cc_fin_calote', 'company',
    'FinTechPay (FTPY3): Calote em Massa',
    'Inadimplência explode entre os clientes mais jovens da instituição. O banco digital reporta prejuízo avassalador.',
    '📉', 'uncommon',
    { target: 'company', targetFilter: 'FTPY3', priceModifier: { min: -0.25, max: -0.15 }, trendOverride: 'bearish' },
    { linkedTickers: ['FTPY3'] } as never
  ),
]

// ─── FII DECK ────────────────────────────────────────────────────────────────
export const fiiDeck: Card[] = [
  // 11. FII NEGATIVO EXTRA (Lajes / Vacância)
  card('cc_fii_corp11_saida', 'fii',
    'CORP11 — Saída de Locatário Âncora',
    'Maior banco de investimentos do país rescinde contrato e desocupa 4 andares. Vacância dispara.',
    '🏢', 'uncommon',
    { target: 'fii', targetFilter: 'CORP11', priceModifier: { min: -0.12, max: -0.06 }, trendOverride: 'bearish' },
    { linkedTickers: ['CORP11'] } as never
  ),
]

// ─── DYNAMIC EXPORTS ─────────────────────────────────────────────────────────
export const allCards: Card[] = [
  ...globalDeck,
  ...Object.values(sectorDecks).flat(),
  ...companyDeck,
  ...fiiDeck,
]
