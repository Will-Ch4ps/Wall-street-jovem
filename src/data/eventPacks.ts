import type { GameState, Card } from '@/types'

export interface EventPack {
    id: string
    name: string
    description: string
    theme: 'bull' | 'bear' | 'neutral' | 'crisis'
    // Effects to apply when the pack is triggered
    applyPack: (state: GameState, cards: Card[]) => void
}

export const eventPacks: EventPack[] = [
    {
        id: 'ep_tech_boom',
        name: 'Auge Tecnológico',
        description: 'Avanços em IA impulsionam o setor de tecnologia. Empresas de TI disparam.',
        theme: 'bull',
        applyPack: (state, cards) => {
            // Find tech companies
            state.assets.forEach(asset => {
                if (asset.sector === 'Tecnologia' && asset.status === 'active') {
                    asset.targetClose = asset.currentPrice * (1 + (Math.random() * 0.3 + 0.2)) // +20% to +50% target
                    asset.trend = 1 as any
                }
            })
            // We rely on the Action hook to spawn news directly via API
        }
    },
    {
        id: 'ep_aviation_crisis',
        name: 'Crise na Aviação',
        description: 'Greves, atrasos e peças defeituosas afundam o setor aéreo.',
        theme: 'crisis',
        applyPack: (state, cards) => {
            // Find aviation companies
            state.assets.forEach(asset => {
                if (asset.sector === 'Aviação' && asset.status === 'active') {
                    asset.targetClose = asset.currentPrice * (1 - (Math.random() * 0.2 + 0.1)) // -10% to -30% target
                    asset.trend = -1 as any
                }
            })
        }
    },
    {
        id: 'ep_agro_boom',
        name: 'Safra Recorde (Agro)',
        description: 'Clima perfeito e alta do dólar beneficiam exportadoras agrícolas.',
        theme: 'bull',
        applyPack: (state, cards) => {
            state.assets.forEach(asset => {
                if (asset.sector === 'Agronegócio' && asset.status === 'active') {
                    asset.targetClose = asset.currentPrice * (1 + (Math.random() * 0.25 + 0.15))
                    asset.trend = 1 as any
                }
            })
        }
    },
    {
        id: 'ep_bear_market_macro',
        name: 'Bear Market (Crise Global)',
        description: 'Temores de recessão global afetam todos os ativos de risco, beneficiando Renda Fixa.',
        theme: 'bear',
        applyPack: (state, cards) => {
            state.assets.forEach(asset => {
                if (asset.type === 'stock' && asset.status === 'active') {
                    asset.targetClose = asset.currentPrice * (1 - (Math.random() * 0.15 + 0.10))
                    asset.trend = -1 as any
                } else if (asset.type === 'fii' && asset.status === 'active') {
                    asset.targetClose = asset.currentPrice * (1 - (Math.random() * 0.05 + 0.05))
                    asset.trend = -0.5 as any
                }
            })
        }
    },
    {
        id: 'ep_bull_market_macro',
        name: 'Bull Market (Otimismo Geral)',
        description: 'Reformas aprovadas e juros em queda livre geram euforia no mercado nacional.',
        theme: 'bull',
        applyPack: (state, cards) => {
            state.assets.forEach(asset => {
                if (asset.type === 'stock' && asset.status === 'active') {
                    asset.targetClose = asset.currentPrice * (1 + (Math.random() * 0.20 + 0.10))
                    asset.trend = 1 as any
                } else if (asset.type === 'fii' && asset.status === 'active') {
                    asset.targetClose = asset.currentPrice * (1 + (Math.random() * 0.10 + 0.05))
                    asset.trend = 0.5 as any
                }
            })
        }
    }
]
