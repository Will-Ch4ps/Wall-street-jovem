'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/formatters'

interface AssetInfo {
    ticker: string
    name: string
    type: string
    sector: string | null
    segment: string | null
    profile: string
    description: string
    initialPrice: number
    volatility: number
    dividendYield: number | null
    naturalCauses: string | null
    associatedNews: string | null
}

interface EventTemplateInfo {
    id: string
    name: string
    headline: string
    body: string
    icon: string
    scope: string
    category: string
    isPositive: boolean
    duration: number
    expertTip?: string | null
    expertAnalysis?: string | null
}

interface FixedIncomeInfo {
    id: string
    name: string
    type: string
    baseRate: number
    riskOfDefault: boolean
    liquidityType: string
    lockRounds: number
    earlyWithdrawPenalty: number
    availableFromRound: number
    expiresAtRound: number | null
}

interface GameRuleInfo {
    name: string
    configJson: string
}

interface GuideData {
    assets: AssetInfo[]
    events: EventTemplateInfo[]
    fixedIncome: FixedIncomeInfo[]
    rules: GameRuleInfo[]
}

const categoryLabels: Record<string, string> = {
    tesouro_selic: 'Tesouro Selic',
    cdb: 'CDB',
    lci_lca: 'LCI/LCA',
    debenture: 'Debênture',
    poupanca: 'Poupança',
}

const volatilityLabel = (v: number) => {
    if (v <= 0.04) return { text: 'Baixa', color: 'text-green-400' }
    if (v <= 0.08) return { text: 'Média', color: 'text-yellow-400' }
    if (v <= 0.12) return { text: 'Alta', color: 'text-orange-400' }
    return { text: 'Muito Alta', color: 'text-red-400' }
}

const sectorColors: Record<string, string> = {
    Tecnologia: 'bg-blue-900/40 border-blue-500/40',
    Energia: 'bg-yellow-900/40 border-yellow-500/40',
    Consumo: 'bg-purple-900/40 border-purple-500/40',
    Financeiro: 'bg-emerald-900/40 border-emerald-500/40',
    Saúde: 'bg-pink-900/40 border-pink-500/40',
    Agro: 'bg-lime-900/40 border-lime-500/40',
    Aviação: 'bg-cyan-900/40 border-cyan-500/40',
    FIIs: 'bg-indigo-900/40 border-indigo-500/40',
}

export default function GuidePage() {
    const [data, setData] = useState<GuideData | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'empresas' | 'fiis' | 'renda_fixa' | 'regras' | 'eventos'>('empresas')

    useEffect(() => {
        fetch('/api/guide')
            .then(r => r.json())
            .then((d: GuideData) => { setData(d); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const tabs = [
        { id: 'empresas', label: '📈 Empresas', count: data?.assets.filter(a => a.type === 'stock').length ?? 0 },
        { id: 'fiis', label: '🏢 FIIs', count: data?.assets.filter(a => a.type === 'fii').length ?? 0 },
        { id: 'renda_fixa', label: '🏦 Renda Fixa', count: data?.fixedIncome.length ?? 0 },
        { id: 'regras', label: '📋 Regras do Jogo', count: null },
        { id: 'eventos', label: '⚡ Livro de Eventos', count: data?.events.length ?? 0 },
    ] as const

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900/80 to-zinc-900 border-b border-zinc-800 px-6 py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-4 mb-2">
                        <span className="text-4xl">📖</span>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Guia do InvestQuest</h1>
                            <p className="text-zinc-400 mt-1">Manual completo das empresas, regras e instrumentos financeiros do jogo</p>
                        </div>
                    </div>
                    <a href="/" className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block transition-colors">
                        ← Voltar ao Início
                    </a>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                                }`}
                        >
                            {tab.label}
                            {tab.count !== null && (
                                <span className="ml-2 text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-full">{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-zinc-400 text-lg animate-pulse">Carregando guia...</div>
                    </div>
                )}

                {!loading && data && (
                    <>
                        {/* EMPRESAS TAB */}
                        {activeTab === 'empresas' && (
                            <div>
                                <p className="text-zinc-400 mb-6">As ações disponíveis para negociação no InvestQuest estão agrupadas por Setor. Eventos setoriais (notícias ou cards) afetam todas as empresas listadas no mesmo bloco.</p>

                                {Array.from(new Set(data.assets.filter(a => a.type === 'stock').map(a => a.sector))).filter(Boolean).sort().map(sector => (
                                    <div key={sector as string} className="mb-10">
                                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2">
                                            {sector}
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                            {data.assets.filter(a => a.type === 'stock' && a.sector === sector).map(asset => {
                                                const vol = volatilityLabel(asset.volatility)
                                                const causes: string[] = asset.naturalCauses ? JSON.parse(asset.naturalCauses) : []
                                                const news: string[] = asset.associatedNews ? JSON.parse(asset.associatedNews) : []
                                                const sectorClass = sectorColors[asset.sector || ''] || 'bg-zinc-800/40 border-zinc-600/40'
                                                return (
                                                    <div key={asset.ticker} className={`rounded-xl border p-5 flex flex-col justify-between ${sectorClass}`}>
                                                        <div>
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div>
                                                                    <span className="text-xs font-mono bg-zinc-800 text-indigo-300 px-2 py-0.5 rounded">{asset.ticker}</span>
                                                                    <h3 className="text-lg font-bold text-white mt-1">{asset.name}</h3>
                                                                    <span className="text-xs text-zinc-400">{asset.sector} • {asset.profile}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-lg font-bold text-white">R${asset.initialPrice.toFixed(2)}</div>
                                                                    <div className={`text-xs font-medium ${vol.color}`}>Volatilidade {vol.text}</div>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-zinc-300 leading-relaxed mb-3">{asset.description}</p>
                                                            {causes.length > 0 && (
                                                                <div className="mb-3">
                                                                    <div className="text-xs text-zinc-500 uppercase font-semibold mb-1.5">⚡ Causas Naturais de Variação</div>
                                                                    <ul className="space-y-1">
                                                                        {causes.map((c, i) => (
                                                                            <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5"><span className="text-orange-400 mt-0.5">•</span>{c}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {news.length > 0 && (
                                                                <div>
                                                                    <div className="text-xs text-zinc-500 uppercase font-semibold mb-1.5">📰 Exemplos de Notícias</div>
                                                                    <ul className="space-y-1">
                                                                        {news.map((n, i) => (
                                                                            <li key={i} className="text-xs text-zinc-400 italic flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">»</span>"{n}"</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {(asset.dividendYield ?? 0) > 0 && (
                                                            <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-white/10">
                                                                <span className="text-zinc-500 uppercase tracking-widest font-bold">Dividend Yield A.A.</span>
                                                                <span className="text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded">{((asset.dividendYield ?? 0) * 100).toFixed(1)}%</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* FIIs TAB */}
                        {activeTab === 'fiis' && (
                            <div>
                                <p className="text-zinc-400 mb-6">Fundos de Investimento Imobiliário — ativos que pagam dividendos mensais. Estão organizados por segmento imobiliário. Fundos do mesmo segmento são concorrentes ou expostos à mesma variação setorial.</p>

                                {Array.from(new Set(data.assets.filter(a => a.type === 'fii').map(a => a.segment))).filter(Boolean).sort().map(segment => (
                                    <div key={segment as string} className="mb-10">
                                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2 border-b border-indigo-900/50 pb-2">
                                            🏢 Setor {segment}
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                            {data.assets.filter(a => a.type === 'fii' && a.segment === segment).map(asset => {
                                                const causes: string[] = asset.naturalCauses ? JSON.parse(asset.naturalCauses) : []
                                                return (
                                                    <div key={asset.ticker} className="rounded-xl border border-indigo-500/30 bg-indigo-900/20 p-5 flex flex-col justify-between">
                                                        <div>
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div>
                                                                    <span className="text-xs font-mono bg-zinc-800 text-indigo-300 px-2 py-0.5 rounded">{asset.ticker}</span>
                                                                    <h3 className="text-lg font-bold text-white mt-1">{asset.name}</h3>
                                                                    <span className="text-xs text-zinc-400">{asset.segment} • {asset.profile}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-lg font-bold text-white">R${asset.initialPrice.toFixed(2)}</div>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-zinc-300 leading-relaxed mb-3">{asset.description}</p>
                                                            {causes.length > 0 && (
                                                                <div>
                                                                    <div className="text-xs text-zinc-500 uppercase font-semibold mb-1.5">⚡ O que afeta este FII</div>
                                                                    <ul className="space-y-1">
                                                                        {causes.map((c, i) => (
                                                                            <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5"><span className="text-indigo-400 mt-0.5">•</span>{c}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-indigo-500/20">
                                                            <span className="text-zinc-500 uppercase tracking-widest font-bold">Dividend Yield A.A.</span>
                                                            <span className="text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded">{((asset.dividendYield ?? 0) * 100).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* RENDA FIXA TAB */}
                        {activeTab === 'renda_fixa' && (
                            <div>
                                <p className="text-zinc-400 mb-6">Investimentos de renda fixa disponíveis no jogo. São mais seguros que ações mas possuem menor retorno. Atente-se às regras de liquidez, pois saques antecipados podem incutir multas!</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {data.fixedIncome.map(fi => (
                                        <div key={fi.id} className={`rounded-xl border p-5 ${fi.riskOfDefault ? 'border-orange-500/40 bg-orange-900/20' : 'border-green-500/30 bg-green-900/10'} flex flex-col justify-between`}>
                                            <div className="flex flex-col mb-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-white leading-tight">{fi.name}</h3>
                                                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded mt-1 inline-block">{categoryLabels[fi.type] || fi.type}</span>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-2xl font-bold text-emerald-400 leading-none">{(fi.baseRate * 100).toFixed(2)}%</div>
                                                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">por rodada</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                                <div className="bg-black/30 rounded p-2 text-center border border-white/5">
                                                    <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Período de Ativação</div>
                                                    <div className="text-xs font-mono font-semibold text-zinc-300">
                                                        Rodada {fi.availableFromRound} {fi.expiresAtRound ? `até ${fi.expiresAtRound}` : 'em diante'}
                                                    </div>
                                                </div>

                                                <div className="bg-black/30 rounded p-2 text-center border border-white/5">
                                                    <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Liquidez</div>
                                                    <div className="text-xs font-semibold text-zinc-300">
                                                        {fi.liquidityType === 'immediate' ? 'Irrestrita' :
                                                            fi.liquidityType === 'on_maturity' ? `Venc. em ${fi.lockRounds} rod` :
                                                                `Multa de ${(fi.earlyWithdrawPenalty * 100).toFixed(0)}% antes de R+${fi.lockRounds}`}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 flex-wrap mt-3">
                                                <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${fi.riskOfDefault ? 'bg-orange-900/80 text-orange-200 border border-orange-500/50' : 'bg-emerald-900/80 text-emerald-200 border border-emerald-500/50'}`}>
                                                    {fi.riskOfDefault ? '⚠️ Risco de Calote' : '✅ Crédito Seguro'}
                                                </div>
                                                {['lci_lca', 'poupanca'].includes(fi.type) && (
                                                    <div className="flex items-center gap-1.5 text-xs bg-blue-900/80 text-blue-200 border border-blue-500/50 px-2.5 py-1 rounded-full">
                                                        🏦 Isento de IR
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* REGRAS TAB */}
                        {activeTab === 'regras' && (
                            <div className="max-w-3xl">
                                <h2 className="text-xl font-bold text-white mb-6">📋 Como Funciona o InvestQuest</h2>
                                <div className="space-y-6">
                                    {[
                                        { icon: '🎯', title: 'Objetivo do Jogo', body: 'Cada jogador começa com um capital inicial e deve gerenciar seus investimentos entre ações, FIIs e renda fixa para terminar o jogo com o maior patrimônio possível. O vencedor é quem tiver o maior saldo total (dinheiro + valor das posições).' },
                                        { icon: '🔄', title: 'Rodadas', body: 'O jogo é dividido em rodadas cronometradas. A cada rodada, o mercado se move, notícias surgem e cards de evento podem ser jogados pelo Mestre. Os preços de ações e FIIs variam com base em tendências, eventos e aleatoriedade.' },
                                        { icon: '📊', title: 'Mercado e Preços', body: 'Os preços seguem uma simulação estilo B3 com candles de 1 minuto. Cada ativo possui volatilidade e momentum que definem o perfil de oscilação. Empresas mais voláteis oferecem maior risco mas também maior potencial de ganho.' },
                                        { icon: '🏦', title: 'Renda Fixa', body: 'Jogadores podem investir parte do capital em produtos de renda fixa. Eles rendem um percentual fixo por rodada. Certifique-se de analisar as Multas de Saque e Carências.' },
                                        { icon: '📰', title: 'Eventos Dinâmicos (Notícias/Cards)', body: 'Os templates de ventos moldam o jogo, simulando altas na Selic, quebras de safras, crises, bonificações, ou até colapsos gerais. A mecânica substituiu o antigo sistema duplo de cartas/notícias.' },
                                        { icon: '🏢', title: 'Holdings', body: 'Grupos de jogadores podem se unir em uma holding para investir juntos em ativos. Cada membro contribui com uma parte do capital e divide os retornos proporcionalmente.' },
                                    ].map((rule, i) => (
                                        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
                                            <div className="flex items-start gap-4">
                                                <span className="text-2xl">{rule.icon}</span>
                                                <div>
                                                    <h3 className="text-base font-semibold text-white mb-1">{rule.title}</h3>
                                                    <p className="text-sm text-zinc-400 leading-relaxed">{rule.body}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {data.rules.length > 0 && (
                                    <div className="mt-8">
                                        <h3 className="text-lg font-bold text-white mb-4">⚙️ Configuração Padrão do Jogo</h3>
                                        {data.rules.map(r => {
                                            const cfg = JSON.parse(r.configJson)
                                            return (
                                                <div key={r.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                                                    <h4 className="text-sm font-bold text-indigo-400 mb-3">{r.name}</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                                        {[
                                                            { label: 'Imposto sobre Lucro', value: `${(cfg.taxRate * 100).toFixed(0)}%` },
                                                            { label: 'Empréstimos', value: cfg.allowLoans ? '✅ Habilitado' : '❌ Desabilitado' },
                                                            { label: 'Juros do Empréstimo', value: `${(cfg.defaultLoanInterest * 100).toFixed(0)}% por rodada` },
                                                            { label: 'Máximo de Empréstimo', value: `${(cfg.maxLoanPercent * 100).toFixed(0)}% do saldo` },
                                                            { label: 'Eventos Sorteados por Rodada', value: cfg.maxCardsPerRound },
                                                            { label: 'Revelação de Notícias', value: cfg.autoRevealNews ? 'Automática' : 'Manual' },
                                                        ].map((item, i) => (
                                                            <div key={i} className="bg-zinc-800/50 rounded-lg p-3">
                                                                <div className="text-xs text-zinc-500 mb-1">{item.label}</div>
                                                                <div className="text-sm font-semibold text-white">{item.value}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* EVENTOS TAB */}
                        {activeTab === 'eventos' && (
                            <div>
                                <p className="text-zinc-400 mb-6 flex flex-col gap-2">
                                    <span>O Mestre pode ativar e configurar estes Eventos para reagir às suas escolhas ou impactar de surpresa o mercado. Os eventos unificam o que antes eram Cartas e Notícias! Eles contam com Duração, Efeitos Mecânicos no preço, e Escopo.</span>
                                </p>

                                {['global', 'sector', 'company', 'fii'].map(scope => {
                                    const scopeEvents = data.events.filter(e => e.scope === scope)
                                    if (scopeEvents.length === 0) return null

                                    const scopeTitles: Record<string, string> = { global: '🌍 Eventos Macro-Econômicos', sector: '🏭 Eventos Setoriais', company: '🏢 Eventos Focados em Empresas', fii: '🏢 Fundos Imobiliários e Mercado' }
                                    return (
                                        <div key={scope} className="mb-14">
                                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-2">
                                                {scopeTitles[scope]}
                                            </h2>
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                                {scopeEvents.map(e => (
                                                    <div key={e.id} className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5 relative overflow-hidden flex flex-col justify-between shadow-lg">
                                                        <div className={`absolute top-0 left-0 w-1.5 h-full ${e.isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

                                                        <div>
                                                            <div className="flex items-start justify-between mb-4 ml-2">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-2xl">{e.icon}</span>
                                                                    <div>
                                                                        <h3 className="text-base font-bold text-white leading-tight">{e.name}</h3>
                                                                        <span className={`text-[10px] uppercase tracking-widest font-bold ${e.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                            {e.isPositive ? 'Positivo' : 'Negativo'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="ml-2 mb-4 bg-black/30 p-3 rounded-xl border border-white/5">
                                                                <h4 className="text-sm font-bold text-zinc-200 mb-1">{e.headline}</h4>
                                                                <p className="text-sm text-zinc-400 leading-relaxed italic">{e.body}</p>
                                                            </div>

                                                            {e.expertAnalysis && (
                                                                <div className="ml-2 mb-4">
                                                                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Dica do Professor</div>
                                                                    <p className="text-sm text-blue-300 leading-relaxed font-semibold">{e.expertAnalysis}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="mt-2 ml-2 flex items-center gap-2 pt-3 border-t border-white/5">
                                                            <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs font-mono font-semibold flex items-center gap-1.5 border border-zinc-700">
                                                                ⏳ {e.duration > 1 ? `${e.duration} Rodadas` : 'Imediato'}
                                                            </span>
                                                            <span className="bg-indigo-900/40 text-indigo-300 px-2 py-1 rounded text-xs font-mono font-semibold border border-indigo-500/20">
                                                                📋 {e.category}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
