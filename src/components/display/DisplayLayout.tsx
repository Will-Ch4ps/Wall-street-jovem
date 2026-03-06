'use client'

import { useEffect, useState } from 'react'
import { Ticker } from '@/components/shared/Ticker'
import { NewsFeed } from '@/components/display/NewsFeed'
import { ActiveOffer } from '@/components/display/ActiveOffer'
import { AssetCard } from '@/components/shared/AssetCard'
import { CandlestickChart } from '@/components/shared/CandlestickChart'
import { Ranking } from '@/components/display/Ranking'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import { EventRevealModal } from '@/components/display/EventRevealModal'
import type { GameEvent, GameState, FII, News, Stock } from '@/types'

interface DisplayLayoutProps {
    initialState?: GameState | null
}

type TabType = 'geral' | 'empresa' | 'jogadores' | 'noticias'

export function DisplayLayout({ initialState }: DisplayLayoutProps) {
    const [state, setState] = useState<GameState | null>(initialState ?? null)
    const [activeTab, setActiveTab] = useState<TabType>('geral')
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
    const [theme, setTheme] = useState<'light' | 'dark'>('light')

    useEffect(() => {
        const saved = localStorage.getItem('projector-theme') as 'light' | 'dark'
        if (saved) setTheme(saved)
    }, [])

    // Live clock for any countdown displays
    const [now, setNow] = useState(Date.now())

    // Modal popup logic for new events
    const [initialEventsLoaded, setInitialEventsLoaded] = useState(false)
    const [knownEventIds, setKnownEventIds] = useState<Set<string>>(new Set())
    const [knownNewsIds, setKnownNewsIds] = useState<Set<string>>(new Set())
    const [revealedEvents, setRevealedEvents] = useState<GameEvent[]>([])

    // helper to convert a News entry into a faux GameEvent for modal display
    const newsToEvent = (n: News): GameEvent => ({
        id: n.id,
        round: n.round,
        timestamp: n.timestamp,
        icon: '📰',
        name: n.title,
        headline: n.title,
        body: n.body,
        isPositive: true,
        duration: 1,
        targets: n.targets && n.targets.length > 0 ? n.targets : ['Todos'],
        scope: n.scope,
        templateId: n.templateId || 'manual',
        effect: { target: 'all' } as any,
        expiresAtRound: n.round + 1,
        isRevealed: true,
    } as unknown as GameEvent)

    const fetchFullState = async () => {
        try {
            const res = await fetch('/api/game')
            if (res.ok) {
                const data = await res.json()
                setState(data)
                setSelectedTicker((prev) => {
                    if (!prev && data.assets?.length > 0) {
                        return data.assets[0].ticker
                    }
                    return prev
                })
            }
        } catch { /* ignore */ }
    }

    useEffect(() => { fetchFullState() }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // 1-second ticker for live countdowns
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])

    // Full state sync every 10s (news, cards, players, loans, etc.)
    useEffect(() => {
        const id = setInterval(fetchFullState, 5000)
        return () => clearInterval(id)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Event Reveal detection
    useEffect(() => {
        if (!state) return
        if (!initialEventsLoaded) {
            const newKnownE = new Set<string>()
            state.events?.forEach(x => newKnownE.add(x.id))
            const newKnownN = new Set<string>()
            state.news?.forEach(n => newKnownN.add(n.id))
            setKnownEventIds(newKnownE)
            setKnownNewsIds(newKnownN)
            setInitialEventsLoaded(true)
            return
        }

        let additions: GameEvent[] = []

        const newEvents = state.events.filter(e => e.isActive && e.isRevealed && !knownEventIds.has(e.id))
        if (newEvents.length > 0) {
            additions.push(...newEvents)
            const newKnown = new Set(knownEventIds)
            newEvents.forEach(x => newKnown.add(x.id))
            setKnownEventIds(newKnown)
        }

        const newNews = (state.news || []).filter(n => n.isActive && n.isPublic && !knownNewsIds.has(n.id))
        if (newNews.length > 0) {
            additions.push(...newNews.map(newsToEvent))
            const newKnownN = new Set(knownNewsIds)
            newNews.forEach(n => newKnownN.add(n.id))
            setKnownNewsIds(newKnownN)
        }

        if (additions.length > 0) {
            setRevealedEvents(prev => [...prev, ...additions])
        }
    }, [state?.events, state?.news, initialEventsLoaded, knownEventIds, knownNewsIds])


    useEffect(() => {
        if (state?.game?.status !== 'running') return
        // Use tickIntervalMs from config (minimum 5s to avoid hammering the server)
        const pollIntervalMs = Math.max(3000, state.game.config.tickIntervalMs ?? 7000)
        const id = setInterval(async () => {
            try {
                const res = await fetch('/api/prices')
                if (res.ok) {
                    const data = await res.json()
                    setState((prev) => (prev ? { ...prev, ...data } : null))
                }
            } catch {
                // ignore
            }
        }, pollIntervalMs)
        return () => clearInterval(id)
    }, [state?.game?.status, state?.game?.config?.tickIntervalMs])

    // Visual animation interval — runs always for smoother live feel
    useEffect(() => {
        const isActive = state?.game?.status === 'running' || state?.game?.status === 'paused'
        if (!isActive) return

        // --- STOP ANIMATION IF ROUND HAS ENDED ---
        const currentRound = state.rounds.find(r => r.number === state.game.currentRound)
        if (currentRound?.roundEndsAt && new Date() > new Date(currentRound.roundEndsAt)) {
            return // Round over, freeze screen
        }

        const animIntervalMs = Math.max(5000, (state.game.config.tickIntervalMs ?? 7000) * 2)
        const id = setInterval(() => {
            setState(prev => {
                if (!prev) return prev;
                const r = prev.rounds.find(x => x.number === prev.game.currentRound)
                if (r?.roundEndsAt && new Date() > new Date(r.roundEndsAt)) {
                    clearInterval(id) // freeze if it expired during interval
                    return prev
                }

                const mood = prev.game.config.marketMood || 'neutral';

                const newAssets = prev.assets.map((a, i) => {
                    if (a.status !== 'active' && a.status !== 'ipo_open') return a;
                    const safePrice = Math.max(0.01, a.currentPrice);
                    // Match priceEngine.ts: 1% noise, weak pull (early in round), 1.4% wave
                    const noise = (Math.random() * 2 - 1) * a.volatility * 0.010 * safePrice;
                    const pull = (a.targetClose - safePrice) * 0.025 * Math.max(0.05, a.momentum ?? 0.08);

                    const phase = (i * 7) / 28
                    const wave = Math.sin(Math.PI * 2 * phase) * 0.014 * a.volatility * safePrice

                    const trendBias = (
                        a.trend === 'bullish' ? 0.0012 * safePrice :
                            a.trend === 'bearish' ? -0.0012 * safePrice :
                                a.trend === 'volatile' ? (Math.random() * 2 - 1) * 0.0024 * safePrice :
                                    0
                    );

                    const moodBias = (
                        mood === 'bull' ? 0.0012 * safePrice :
                            mood === 'bear' ? -0.0012 * safePrice : 0
                    )

                    // Micro-spike chance (3.5%)
                    let spike = 0
                    if (Math.random() < 0.035) {
                        spike = safePrice * (0.012 + Math.random() * 0.023) * (Math.random() < 0.5 ? 1 : -1)
                    }

                    const newPrice = Math.max(0.01, Math.round((safePrice + noise + pull + trendBias + wave + moodBias + spike) * 100) / 100);
                    return { ...a, currentPrice: newPrice };
                });

                const newHist = { ...prev.priceHistories };
                newAssets.forEach(a => {
                    const h = newHist[a.ticker];
                    if (h && h.formingCandle) {
                        newHist[a.ticker] = {
                            ...h,
                            formingCandle: {
                                ...h.formingCandle,
                                high: Math.max(h.formingCandle.high, a.currentPrice),
                                low: Math.min(h.formingCandle.low, a.currentPrice),
                                close: a.currentPrice
                            }
                        };
                    }
                });
                return { ...prev, assets: newAssets, priceHistories: newHist };
            });
        }, animIntervalMs);
        return () => clearInterval(id);
    }, [state?.game?.status, state?.game?.config?.tickIntervalMs])

    if (!state) {
        return (
            <main className={`${theme} flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-400 font-sans`}>
                <p className="text-slate-500 dark:text-zinc-500 font-medium">Nenhum jogo ativo. Crie um jogo no painel Master.</p>
            </main>
        )
    }

    const { game, assets, players, holdings, portfolios, priceHistories, fixedIncomeInvestments, fixedIncomeProducts, loans } = state
    const round = state.rounds.find((r) => r.number === game.currentRound)
    const activeAssets = assets.filter((a) => a.status === 'active' || a.status === 'ipo_open')
    const stocks = activeAssets.filter((a) => a.type === 'stock') as Stock[]
    const fiis = activeAssets.filter((a) => a.type === 'fii') as FII[]
    const selectedHistory = selectedTicker ? priceHistories[selectedTicker] : null
    const selectedAsset = activeAssets.find((a) => a.ticker === selectedTicker)
    const activeOffers = state.marketOffers.filter(
        (o) => o.isActive && new Date(o.expiresAt) > new Date()
    )
    const topOffer = activeOffers[0]

    const renderGeral = () => {
        // Group stocks by sector
        const stocksBySector = stocks.reduce((acc, stock) => {
            if (!acc[stock.sector]) acc[stock.sector] = []
            acc[stock.sector].push(stock)
            return acc
        }, {} as Record<string, Stock[]>)

        return (
            <div className="grid grid-cols-1 gap-3 px-3 lg:grid-cols-4 max-w-[1920px] mx-auto">
                <div className="space-y-3 lg:col-span-3">
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Mercados e Setores da Economia</h2>
                            {game.config.marketMood && game.config.marketMood !== 'neutral' && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${game.config.marketMood === 'bull' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                                    {game.config.marketMood === 'bull' ? '🐂 Bull Market' : '🐻 Bear Market'}
                                </span>
                            )}
                        </div>

                        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 space-y-3">
                            {Object.entries(stocksBySector).map(([sector, sectorStocks]) => (
                                <div key={sector} className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-700/50 inline-block w-full">
                                    <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        {sector}
                                    </h3>
                                    <div className="flex flex-col gap-2">
                                        {sectorStocks.map((a) => (
                                            <AssetCard key={a.ticker} asset={a} compact />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-3 shadow-sm mt-3">
                        <h2 className="mb-2 text-lg font-bold text-slate-800 dark:text-white">Fundos Imobiliários (FIIs)</h2>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                            {fiis.map((a) => (
                                <AssetCard key={a.ticker} asset={a} compact />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-3 lg:col-span-1">
                    <div className="sticky top-[90px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 shadow-sm overflow-hidden">
                        <Ranking
                            players={players}
                            holdings={holdings}
                            portfolios={portfolios}
                            assets={assets}
                            fixedIncomeInvestments={fixedIncomeInvestments}
                            fixedIncomeProducts={fixedIncomeProducts}
                            loans={loans}
                            currentRound={game.currentRound}
                            taxRate={game.config.taxRate}
                        />
                    </div>
                </div>
            </div>
        )
    }

    const renderNoticias = () => (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-6 shadow-sm dark:shadow-xl min-h-[70vh]">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-500 dark:from-orange-400 dark:to-amber-300 bg-clip-text text-transparent">
                        Notícias do Mercado
                    </h2>
                    <span className="text-slate-500 dark:text-zinc-400 text-sm font-medium">Acompanhe as especulações e todos os eventos públicos da economia.</span>
                </div>
                <NewsFeed events={state.events} news={state.news} maxItems={50} allowDetails={true} />
            </div>
        </div>
    )

    const renderEmpresa = () => (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900/80 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded text-sm tracking-widest border border-indigo-200 dark:border-indigo-800/50">{selectedTicker}</span>
                        {selectedAsset?.name}
                    </h2>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1">{selectedAsset?.sector} • {selectedAsset?.profile}</p>
                </div>
                <select
                    value={selectedTicker ?? ''}
                    onChange={(e) => setSelectedTicker(e.target.value || null)}
                    className="rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-base font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64"
                >
                    {activeAssets.map((a) => (
                        <option key={a.ticker} value={a.ticker}>
                            {a.ticker} - {a.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-5 shadow-sm relative">
                        <div className="absolute top-4 right-4 text-right">
                            <p className="text-3xl font-mono font-bold text-slate-800 dark:text-white">{selectedAsset ? formatCurrency(selectedAsset.currentPrice) : ''}</p>
                            {selectedAsset && selectedAsset.openPrice > 0 && (() => {
                                const vari = ((selectedAsset.currentPrice - selectedAsset.openPrice) / selectedAsset.openPrice) * 100
                                const isUp = vari >= 0
                                return <p className={`text-sm font-mono font-bold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{isUp ? '▲' : '▼'} {Math.abs(vari).toFixed(2)}% (Hoje)</p>
                            })()}
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 dark:text-zinc-300 mb-6">Gráfico de Cotação (B3)</h3>
                        {selectedHistory && (
                            <div className="bg-slate-900 rounded-lg p-2">
                                <CandlestickChart
                                    candles={selectedHistory.candles}
                                    ticker={selectedTicker!}
                                    formingCandle={selectedHistory.formingCandle}
                                    className="mt-4"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {selectedAsset?.type === 'stock' ? (
                            <>
                                <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/50 rounded-lg p-4 text-center">
                                    <p className="text-slate-500 dark:text-zinc-400 text-xs uppercase tracking-wider mb-1 font-semibold">P/L</p>
                                    <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{(selectedAsset as Stock).peRatio.toFixed(2)}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/50 rounded-lg p-4 text-center">
                                    <p className="text-slate-500 dark:text-zinc-400 text-xs uppercase tracking-wider mb-1 font-semibold">Div. Yield</p>
                                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{((selectedAsset as Stock).dividendYield).toFixed(2)}%</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/50 rounded-lg p-4 text-center">
                                    <p className="text-slate-500 dark:text-zinc-400 text-xs uppercase tracking-wider mb-1 font-semibold">Ações Livres</p>
                                    <p className="text-xl font-bold text-slate-700 dark:text-zinc-300">{selectedAsset.availableShares.toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/50 rounded-lg p-4 text-center">
                                    <p className="text-slate-500 dark:text-zinc-400 text-xs uppercase tracking-wider mb-1 font-semibold">Volatilidade</p>
                                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{(selectedAsset.volatility * 100).toFixed(1)}%</p>
                                </div>
                            </>
                        ) : selectedAsset?.type === 'fii' ? (
                            <>
                                <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/50 rounded-lg p-4 text-center">
                                    <p className="text-slate-500 dark:text-zinc-400 text-xs uppercase tracking-wider mb-1 font-semibold">P/VP</p>
                                    <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{(selectedAsset as FII).pvpRatio.toFixed(2)}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/50 rounded-lg p-4 text-center">
                                    <p className="text-slate-500 dark:text-zinc-400 text-xs uppercase tracking-wider mb-1 font-semibold">Vacância</p>
                                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{((selectedAsset as FII).vacancyRate * 100).toFixed(1)}%</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/50 rounded-lg p-4 text-center">
                                    <p className="text-slate-500 dark:text-zinc-400 text-xs uppercase tracking-wider mb-1 font-semibold">Imóveis</p>
                                    <p className="text-xl font-bold text-slate-700 dark:text-zinc-300">{(selectedAsset as FII).totalProperties}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/50 rounded-lg p-4 text-center">
                                    <p className="text-slate-500 dark:text-zinc-400 text-xs uppercase tracking-wider mb-1 font-semibold">DY / Rodada</p>
                                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{((selectedAsset as FII).dividendYield / 12).toFixed(2)}%</p>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-5 shadow-sm h-[724px] flex flex-col">
                        <h3 className="text-lg font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Eventos em {selectedTicker}
                        </h3>
                        <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            {state.events
                                .filter(e => e.isActive && e.isRevealed && (e.targets.includes('Todos') || e.targets.includes(selectedTicker!)))
                                .map(e => {
                                    const borderLeft = e.isPositive ? 'border-l-emerald-500' : 'border-l-red-500';
                                    const iconColor = e.isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400';

                                    return (
                                        <div key={e.id} className={`p-4 bg-slate-50 dark:bg-zinc-800/40 rounded-lg border border-slate-200 dark:border-zinc-700/50 transition-colors ${borderLeft} border-l-4`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 dark:text-zinc-400">
                                                    <span>Round {e.round} {e.duration > 1 ? `➡ R${e.expiresAtRound}` : ''}</span>
                                                </div>
                                                <span className="text-xl">{e.icon}</span>
                                            </div>
                                            <span className={`${iconColor} font-bold text-sm block mb-1`}>{e.name}</span>
                                            <p className="text-slate-800 dark:text-zinc-200 text-xs font-bold mb-1">{e.headline}</p>
                                            <p className="text-slate-600 dark:text-zinc-400 text-xs leading-relaxed">{e.body}</p>
                                        </div>
                                    )
                                })}
                            {state.events.filter(e => e.isActive && e.isRevealed && (e.targets.includes('Todos') || e.targets.includes(selectedTicker!))).length === 0 && (
                                <div className="flex h-full items-center justify-center">
                                    <p className="text-slate-500 dark:text-zinc-500 text-sm italic text-center text-balance font-medium">Nenhum evento focado nesta empresa no momento.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* painel de notícias da empresa */}
                    <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-5 shadow-sm h-[724px] flex flex-col">
                        <h3 className="text-lg font-bold text-slate-700 dark:text-white mb-4">Notícias Relacionadas{selectedTicker ? ` – ${selectedTicker}` : ''}</h3>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <NewsFeed
                                events={[]}
                                news={(state.news || []).filter(n =>
                                    n.isActive && n.isPublic &&
                                    ((n.targets && n.targets.length > 0 ? n.targets : ['Todos']).includes('Todos') || (selectedTicker && (n.targets && n.targets.length > 0 ? n.targets : ['Todos']).includes(selectedTicker)))
                                )}
                                maxItems={6}
                                allowDetails={true}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    const renderJogadores = () => {
        const combinedEntities = [
            ...players.map(p => ({ id: p.id, name: p.name, type: 'Jogador', cash: p.cash })),
            ...holdings.map(h => ({ id: h.id, name: h.name, type: 'Holding', cash: h.cash }))
        ].sort((a, b) => a.name.localeCompare(b.name))

        const activeId = selectedPlayerId || (combinedEntities.length > 0 ? combinedEntities[0].id : null)
        const entity = combinedEntities.find(e => e.id === activeId)
        const portfolio = portfolios.find(p => p.ownerId === activeId)

        const myFixedIncome = fixedIncomeInvestments.filter(fi => fi.ownerId === activeId)
        const myLoans = loans.filter(l => l.borrowerId === activeId && l.status === 'active')

        let patrimony = entity?.cash || 0
        let variableIncomeTotal = 0
        if (portfolio) {
            portfolio.positions.forEach(pos => {
                const asset = assets.find(a => a.ticker === pos.ticker)
                if (asset) {
                    const val = pos.quantity * asset.currentPrice
                    patrimony += val
                    variableIncomeTotal += val
                }
            })
        }
        let fixedIncomeTotal = 0
        myFixedIncome.forEach(fi => {
            const fiTotal = fi.amount + fi.accumulatedYield
            patrimony += fiTotal
            fixedIncomeTotal += fiTotal
        })
        let loansTotal = 0
        myLoans.forEach(l => {
            const lTotal = l.amount + l.accumulatedInterest
            patrimony -= lTotal
            loansTotal += lTotal
        })

        return (
            <div className="p-4 max-w-5xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center bg-zinc-900/80 p-6 rounded-xl border border-zinc-800 shadow-xl gap-4">
                    <div className="flex-1 w-full text-center md:text-left">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Consultar Investidor</h2>
                        <p className="text-zinc-400 mt-1">Veja a carteira detalhada de jogadores e holdings.</p>
                    </div>
                    <select
                        value={activeId ?? ''}
                        onChange={(e) => setSelectedPlayerId(e.target.value)}
                        className="rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-4 py-3 text-base font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none w-full md:w-80"
                    >
                        {combinedEntities.map((e) => (
                            <option key={e.id} value={e.id}>
                                {e.name} ({e.type})
                            </option>
                        ))}
                    </select>
                </div>

                {entity && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                        {/* Resumo Card (Left Column) */}
                        <div className="md:col-span-1 space-y-6 sticky top-[90px]">
                            <div className="bg-slate-50 dark:bg-zinc-900/80 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm text-center">
                                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-sm">
                                    {entity.name.substring(0, 2).toUpperCase()}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{entity.name}</h3>
                                <span className="inline-block mt-2 px-3 py-1 bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs rounded-full uppercase tracking-widest font-bold">{entity.type}</span>
                            </div>

                            <div className="bg-slate-50 dark:bg-zinc-900/80 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                                <h4 className="text-sm font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-4">Resumo Financeiro</h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-800 pb-2">
                                        <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium">Patrimônio Líquido</p>
                                        <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(patrimony)}</p>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-800 pb-2">
                                        <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium">Caixa Livre</p>
                                        <p className="text-lg font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(entity.cash)}</p>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-800 pb-2">
                                        <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium">Inv. Renda Variável</p>
                                        <p className="text-md font-mono text-indigo-600 dark:text-indigo-400">{formatCurrency(variableIncomeTotal)}</p>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-800 pb-2">
                                        <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium">Renda Fixa</p>
                                        <p className="text-md font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(fixedIncomeTotal)}</p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium">Empréstimos Ativos</p>
                                        <p className="text-md font-mono text-red-600 dark:text-red-400">{formatCurrency(loansTotal)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Listas Detalhadas (Right Column) */}
                        <div className="md:col-span-2">
                            <div className="bg-slate-50 dark:bg-zinc-900/80 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm min-h-[600px] flex flex-col">
                                <h4 className="flex items-center gap-3 text-lg font-bold text-slate-900 dark:text-white mb-6 pb-3 border-b border-slate-200 dark:border-zinc-800">
                                    Detalhamento da Carteira
                                </h4>

                                <div className="space-y-8 flex-1">
                                    {/* Renda Variável */}
                                    <section>
                                        <h5 className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Renda Variável ({portfolio?.positions.length || 0})
                                        </h5>
                                        {(!portfolio || portfolio.positions.length === 0) ? (
                                            <p className="text-slate-500 dark:text-zinc-500 text-sm italic border-l-2 border-slate-300 dark:border-zinc-700 pl-3">Nenhum ativo de renda variável.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                {portfolio.positions.map(pos => {
                                                    const asset = assets.find(a => a.ticker === pos.ticker)
                                                    const currentVal = asset ? asset.currentPrice * pos.quantity : 0
                                                    const rentabilidade = pos.totalInvested > 0 ? ((currentVal - pos.totalInvested) / pos.totalInvested) * 100 : 0
                                                    const isUp = rentabilidade >= 0
                                                    return (
                                                        <div key={pos.ticker} className="flex justify-between items-center p-3 bg-white dark:bg-zinc-950/50 rounded-lg border border-slate-200 dark:border-zinc-700/80 hover:bg-slate-100 dark:hover:bg-zinc-800/50 transition">
                                                            <div>
                                                                <p className="font-bold text-slate-800 dark:text-white bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 inline-block px-2 py-0.5 rounded text-xs mb-1">{pos.ticker}</p>
                                                                <p className="text-xs text-slate-500 dark:text-zinc-400">{pos.quantity} cotas a PM {formatCurrency(pos.avgPrice)}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{formatCurrency(currentVal)}</p>
                                                                <p className={`text-xs font-mono font-bold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                    {isUp ? '+' : ''}{rentabilidade.toFixed(1)}%
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </section>

                                    {/* Renda Fixa */}
                                    <section>
                                        <h5 className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Renda Fixa ({myFixedIncome.length})
                                        </h5>
                                        {myFixedIncome.length === 0 ? (
                                            <p className="text-slate-500 dark:text-zinc-500 text-sm italic border-l-2 border-slate-300 dark:border-zinc-700 pl-3">Nenhum investimento direto em renda fixa.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {myFixedIncome.map(fi => {
                                                    const prod = fixedIncomeProducts.find(p => p.id === fi.productId)
                                                    return (
                                                        <div key={fi.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-white dark:bg-zinc-950/50 rounded-lg border border-slate-200 dark:border-zinc-700/80 gap-2">
                                                            <div>
                                                                <p className="font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 inline-block px-2 py-0.5 rounded text-xs mb-1">{prod?.name}</p>
                                                                <p className="text-xs text-slate-500 dark:text-zinc-400">Investido: {formatCurrency(fi.amount)} (Round {fi.roundInvested})</p>
                                                            </div>
                                                            <div className="text-left sm:text-right w-full sm:w-auto">
                                                                <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{formatCurrency(fi.amount + fi.accumulatedYield)}</p>
                                                                <p className="text-xs font-medium text-emerald-600/70 dark:text-emerald-500/80">Total Acumulado</p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </section>

                                    {/* Empréstimos */}
                                    <section>
                                        <h5 className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500"></span> Empréstimos Ativos ({myLoans.length})
                                        </h5>
                                        {myLoans.length === 0 ? (
                                            <p className="text-slate-500 dark:text-zinc-500 text-sm italic border-l-2 border-slate-300 dark:border-zinc-700 pl-3">Nenhuma dívida ativa no momento.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {myLoans.map(l => (
                                                    <div key={l.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/40 gap-2">
                                                        <div>
                                                            <p className="font-bold text-red-800 dark:text-red-400 text-xs mb-1">Empréstimo (Round {l.roundTaken})</p>
                                                            <p className="text-[11px] font-mono text-red-600/80 dark:text-red-400/80">Principal: {formatCurrency(l.amount)} • Juros/R: {formatPercent(l.interestPerRound)}</p>
                                                        </div>
                                                        <div className="text-left sm:text-right w-full sm:w-auto">
                                                            <p className="font-bold text-red-700 dark:text-red-500 text-sm">-{formatCurrency(l.amount + l.accumulatedInterest)}</p>
                                                            <p className="text-xs font-bold text-red-600/70 dark:text-red-500/80">{l.roundDue ? (l.roundDue - game.currentRound) + 'R Restantes' : 'Sem prazo'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                </div>
                            </div>
                        </div>
                    </div>
                )}</div>
        )
    }

    const renderFinalRanking = () => {
        return (
            <div className="min-h-screen bg-white text-slate-800 flex flex-col items-center justify-center p-8 bg-[url('/bg-pattern.svg')] bg-cover relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/50 via-slate-50 to-purple-100/50 z-0"></div>

                <div className="relative z-10 w-full max-w-4xl bg-white/90 backdrop-blur-xl border border-slate-200 p-10 rounded-3xl shadow-xl text-center flex flex-col items-center">
                    <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent drop-shadow-sm">
                        FIM DE JOGO
                    </h1>
                    <p className="text-xl text-slate-600 mb-10 font-medium">O mercado fechou. Confira o resultado final dos investidores!</p>

                    <div className="w-full">
                        <Ranking
                            players={players}
                            holdings={holdings}
                            portfolios={portfolios}
                            assets={assets}
                            fixedIncomeInvestments={fixedIncomeInvestments}
                            fixedIncomeProducts={fixedIncomeProducts}
                            loans={loans}
                            currentRound={game.currentRound}
                            taxRate={game.config.taxRate}
                        />
                    </div>
                </div>
            </div>
        )
    }

    if (game.status === 'finished') {
        return (
            <div className={`${theme} min-h-screen flex flex-col`}>
                {renderFinalRanking()}
            </div>
        )
    }

    return (
        <main className={`${theme} min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white font-sans selection:bg-indigo-500/30`}>
            <Ticker assets={assets} className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-50 shadow-md text-slate-800 dark:text-zinc-200" />

            {topOffer && (
                <div className="border-b border-slate-200 dark:border-zinc-800 p-4 bg-gradient-to-r from-indigo-100 to-blue-50/50 dark:from-indigo-950/40 dark:to-blue-900/20">
                    <ActiveOffer
                        offer={topOffer}
                        currentPrice={assets.find((a) => a.ticker === topOffer.ticker)?.currentPrice}
                    />
                </div>
            )}

            <div className="border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 px-4 py-2 flex gap-2 justify-center sticky top-[38px] z-40 backdrop-blur-md overflow-x-auto whitespace-nowrap custom-scrollbar shadow-sm">
                <button
                    onClick={() => setActiveTab('geral')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'geral' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-transparent text-slate-600 dark:text-zinc-400 hover:text-indigo-700 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
                >
                    Visão Geral
                </button>
                <button
                    onClick={() => setActiveTab('empresa')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'empresa' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-transparent text-slate-600 dark:text-zinc-400 hover:text-indigo-700 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
                >
                    Visão por Empresa (Homebroker)
                </button>
                <button
                    onClick={() => setActiveTab('jogadores')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'jogadores' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' : 'bg-transparent text-slate-600 dark:text-zinc-400 hover:text-purple-700 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
                >
                    Consultar Jogador/Holding
                </button>
                <button
                    onClick={() => setActiveTab('noticias')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'noticias' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-transparent text-slate-600 dark:text-zinc-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
                >
                    Notícias do Mercado
                </button>
            </div>

            <div className="min-h-[calc(100vh-140px)] pb-10 pt-4">
                {activeTab === 'geral' && renderGeral()}
                {activeTab === 'empresa' && renderEmpresa()}
                {activeTab === 'jogadores' && renderJogadores()}
                {activeTab === 'noticias' && renderNoticias()}
            </div>

            <footer className="fixed bottom-0 w-full flex justify-between items-center border-t border-slate-300 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-6 py-2 text-xs font-mono z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-none">
                <div className="text-slate-700 dark:text-zinc-400 font-semibold">
                    Rodada {game.currentRound} • {round?.theme ?? '—'} • {game.status.toUpperCase()}
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            const next = theme === 'light' ? 'dark' : 'light'
                            setTheme(next)
                            localStorage.setItem('projector-theme', next)
                        }}
                        className="bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg font-sans text-xs font-bold hover:bg-slate-300 dark:hover:bg-zinc-700 transition shadow-sm"
                    >
                        {theme === 'light' ? '🌙 Modo Noturno' : '☀️ Modo Claro'}
                    </button>
                    <div className={`font-bold text-sm ${(() => {
                        if (!round?.roundEndsAt) return 'text-slate-400 dark:text-zinc-500'
                        const remaining = new Date(round.roundEndsAt).getTime() - new Date().getTime();
                        return remaining < 60000 && remaining > 0 ? 'text-red-500 animate-pulse' : 'text-slate-500 dark:text-zinc-400';
                    })()
                        }`}>
                        ⏱ {(() => {
                            if (!round?.roundEndsAt) return '--:--';
                            const remaining = new Date(round.roundEndsAt).getTime() - new Date().getTime();
                            if (remaining <= 0) return '00:00';
                            const m = Math.floor(remaining / 60000);
                            const s = Math.floor((remaining % 60000) / 1000);
                            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                        })()}
                    </div>
                </div>
            </footer>
            {revealedEvents.length > 0 && (
                <EventRevealModal
                    events={revealedEvents}
                    onClose={() => setRevealedEvents([])}
                />
            )}
        </main>
    )
}
