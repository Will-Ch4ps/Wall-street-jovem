'use client'

import { useState } from 'react'
import type { GameState } from '@/types'


interface RulesTabProps {
    state: GameState
    onUpdate?: () => void
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
    return (
        <label className="flex items-start gap-3 p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-800/60 transition group">
            <div className="relative mt-0.5 flex-shrink-0">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
                <div
                    onClick={() => onChange(!checked)}
                    className={`w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer border ${checked ? 'bg-indigo-600 border-indigo-500' : 'bg-zinc-800 border-zinc-700'}`}
                >
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
            </div>
            <div>
                <span className="font-semibold block text-sm text-zinc-100">{label}</span>
                <span className="text-xs text-zinc-500 leading-relaxed">{description}</span>
            </div>
        </label>
    )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 block">{label}</label>
            {children}
            {hint && <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">{hint}</p>}
        </div>
    )
}

function SectionTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
    return (
        <div className="mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="text-xl">{icon}</span> {title}
            </h3>
            <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>
        </div>
    )
}

function InfoBox({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-3 p-4 bg-blue-950/40 border border-blue-800/40 rounded-xl text-sm text-blue-200 leading-relaxed">
            <span className="text-blue-400 text-base mt-0.5 flex-shrink-0">ℹ️</span>
            <div>{children}</div>
        </div>
    )
}

export function RulesTab({ state, onUpdate }: RulesTabProps) {
    const cfg = state.game.config

    // === Section 1: Mesa ===
    const [taxRate, setTaxRate] = useState((cfg.taxRate * 100).toString())
    const [maxRounds, setMaxRounds] = useState(state.game.maxRounds.toString())
    const [initialCapital, setInitialCapital] = useState(state.game.initialCapital.toString())

    // === Section 2: Trading Permissions ===
    const [allowLoans, setAllowLoans] = useState(cfg.allowLoans)
    const [allowShort, setAllowShort] = useState(cfg.allowShort)
    const [allowDayTrade, setAllowDayTrade] = useState(cfg.allowDayTrade)
    const [allowP2PTrade, setAllowP2PTrade] = useState(cfg.allowP2PTrade)
    const [maxLoanPercent, setMaxLoanPercent] = useState((cfg.maxLoanPercent * 100).toString())
    const [defaultLoanInterest, setDefaultLoanInterest] = useState((cfg.defaultLoanInterest * 100).toString())

    // === Section 3: Price Engine ===
    const [tickIntervalSec, setTickIntervalSec] = useState((cfg.tickIntervalMs / 1000).toString())
    const [candleIntervalSec, setCandleIntervalSec] = useState((cfg.candleIntervalMs / 1000).toString())
    const [marketMood, setMarketMood] = useState<string>(cfg.marketMood || 'neutral')

    // === Section 4: Cards ===
    const [cardDrawIntervalSec, setCardDrawIntervalSec] = useState((cfg.cardDrawIntervalMs / 1000).toString())
    const [maxCardsPerRound, setMaxCardsPerRound] = useState(cfg.maxCardsPerRound.toString())
    const [autoRevealNews, setAutoRevealNews] = useState(cfg.autoRevealNews)
    const [allowAfterHours, setAllowAfterHours] = useState(cfg.allowAfterHours ?? true)
    const [afterHoursFixedPrice, setAfterHoursFixedPrice] = useState(cfg.afterHoursFixedPrice ?? false)

    const [loading, setLoading] = useState(false)

    const handleUpdateConfig = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update',
                    state: {
                        game: {
                            ...state.game,
                            maxRounds: parseInt(maxRounds) || state.game.maxRounds,
                            initialCapital: parseFloat(initialCapital) || state.game.initialCapital,
                            config: {
                                ...cfg,
                                taxRate: parseFloat(taxRate) / 100,
                                allowLoans,
                                allowShort,
                                allowDayTrade,
                                allowP2PTrade,
                                maxLoanPercent: parseFloat(maxLoanPercent) / 100,
                                defaultLoanInterest: parseFloat(defaultLoanInterest) / 100,
                                tickIntervalMs: Math.round(parseFloat(tickIntervalSec) * 1000),
                                candleIntervalMs: Math.round(parseFloat(candleIntervalSec) * 1000),
                                cardDrawIntervalMs: Math.round(parseFloat(cardDrawIntervalSec) * 1000),
                                maxCardsPerRound: parseInt(maxCardsPerRound) || cfg.maxCardsPerRound,
                                autoRevealNews,
                                allowAfterHours,
                                afterHoursFixedPrice,
                                marketMood,
                            }
                        }
                    }
                }),
            })
            if (res.ok) {
                onUpdate?.()
                alert('✅ Regras Globais Salvas com Sucesso!')
            }
        } finally {
            setLoading(false)
        }
    }



    const inputCls = "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white focus:border-indigo-500 outline-none transition text-sm"

    return (
        <div className="space-y-8">

            {/* Header */}
            <div>
                <h2 className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Regras Globais</h2>
                <p className="text-zinc-400 text-sm mt-1">Configurações master do simulador. Clique em <strong className="text-zinc-300">Salvar Regras</strong> após alterar qualquer campo.</p>
            </div>

            {/* ========== Section 1: Mesa ========== */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm">
                <SectionTitle
                    icon="⚙️"
                    title="Parâmetros da Mesa"
                    subtitle="Configurações gerais da sessão de simulação."
                />
                <div className="grid gap-5 md:grid-cols-3">
                    <Field label="Capital Inicial (R$)" hint="Saldo inicial de cada jogador/holding ao entrar no jogo.">
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-zinc-500 font-mono text-sm">R$</span>
                            <input type="number" value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)} min={100} className={`${inputCls} pl-10`} />
                        </div>
                    </Field>
                    <Field label="Rodadas Máximas" hint="Número de rodadas que compõem a sessão completa.">
                        <input type="number" value={maxRounds} onChange={(e) => setMaxRounds(e.target.value)} min={1} max={99} className={inputCls} />
                    </Field>
                    <Field label="Impostos (% sobre lucro)" hint="Alíquota de IR cobrada sobre ganhos em renda variável tributável (ex: ações).">
                        <div className="relative">
                            <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} min={0} max={100} step={0.5} className={`${inputCls} pr-8`} />
                            <span className="absolute right-4 top-3.5 text-zinc-500 font-bold text-sm">%</span>
                        </div>
                    </Field>
                </div>
            </div>

            {/* ========== Section 2: Trading Permissions ========== */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm">
                <SectionTitle
                    icon="📈"
                    title="Permissões de Negociação"
                    subtitle="Defina quais modalidades de operação os jogadores podem utilizar durante a sessão."
                />
                <div className="grid gap-3 md:grid-cols-2 mb-6">
                    <Toggle
                        checked={allowLoans}
                        onChange={setAllowLoans}
                        label="Permitir Empréstimos Bancários"
                        description="Alunos podem tomar dinheiro emprestado na aba de Renda Fixa com os juros configurados abaixo."
                    />
                    <Toggle
                        checked={allowShort}
                        onChange={setAllowShort}
                        label="Permitir Venda a Descoberto (Short)"
                        description="Jogadores podem vender ações que não possuem, apostando na queda. Operação avançada."
                    />
                    <Toggle
                        checked={allowDayTrade}
                        onChange={setAllowDayTrade}
                        label="Permitir Day Trade"
                        description="Permite comprar e vender o mesmo ativo na mesma rodada. Quando desativado, posições exigem ao menos uma rodada."
                    />
                    <Toggle
                        checked={allowP2PTrade}
                        onChange={setAllowP2PTrade}
                        label="Permitir Negociação P2P (Aluno-Aluno)"
                        description="Habilita ofertas de compra e venda diretas entre jogadores no livro de ordens."
                    />
                </div>

                {allowLoans && (
                    <div className="grid gap-5 md:grid-cols-2 mt-2 p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                        <Field label="Teto do Empréstimo (% do capital inicial)" hint="Ex: 50% → um jogador com R$10.000 pode emprestar até R$5.000.">
                            <div className="relative">
                                <input type="number" value={maxLoanPercent} onChange={(e) => setMaxLoanPercent(e.target.value)} min={0} max={500} step={5} className={`${inputCls} pr-8`} />
                                <span className="absolute right-4 top-3.5 text-zinc-500 font-bold text-sm">%</span>
                            </div>
                        </Field>
                        <Field label="Juros Padrão por Rodada" hint="Taxa de juros simples aplicada ao saldo devedor a cada rodada. Ex: 3% ao round.">
                            <div className="relative">
                                <input type="number" value={defaultLoanInterest} onChange={(e) => setDefaultLoanInterest(e.target.value)} min={0} max={100} step={0.5} className={`${inputCls} pr-8`} />
                                <span className="absolute right-4 top-3.5 text-zinc-500 font-bold text-sm">%</span>
                            </div>
                        </Field>
                    </div>
                )}
            </div>

            {/* ========== Section 3: Candle Engine ========== */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-600/5 rounded-full blur-3xl -mr-20 -mt-20" />
                <div className="relative z-10">
                    <SectionTitle
                        icon="🕯️"
                        title="Motor de Preços & Gráfico de Candles"
                        subtitle="Controla a velocidade de atualização de preços e a formação dos candles no telão."
                    />

                    <InfoBox>
                        <p className="font-semibold mb-2">Como o gráfico de candles é formado?</p>
                        <p className="mb-1">
                            O motor gera um novo <span className="text-white font-medium">tick de preço</span> a cada <strong className="text-blue-300">[Intervalo de Tick]</strong> segundos.
                            Cada tick é uma pequena variação aleatória guiada pelo <em>targetClose</em> e volatilidade de cada ativo.
                        </p>
                        <p className="mb-1">
                            A cada <strong className="text-blue-300">[Intervalo de Candle]</strong> segundos, todos os ticks coletados nesse período são consolidados em uma <span className="text-white font-medium">vela</span>,
                            com <span className="text-green-300">abertura</span>, <span className="text-white">fechamento</span>, <span className="text-green-400">máxima</span> e <span className="text-red-400">mínima</span>.
                            O telão exibe os últimos 50 candles de cada ativo.
                        </p>
                        <p className="text-blue-300/70 text-xs mt-2">
                            Exemplo: Tick = 5s, Candle = 60s → cada vela representa ~12 variações de preço.
                        </p>
                    </InfoBox>

                    <div className="grid gap-5 md:grid-cols-2 mt-5">
                        <Field
                            label="Intervalo de Tick (segundos)"
                            hint="Com que frequência o motor atualiza o preço de cada ativo. Valores menores = mercado mais vivo e agitado."
                        >
                            <div className="relative">
                                <input type="number" value={tickIntervalSec} onChange={(e) => setTickIntervalSec(e.target.value)} min={1} max={300} step={1} className={`${inputCls} pr-12`} />
                                <span className="absolute right-4 top-3.5 text-zinc-500 text-sm font-medium">seg</span>
                            </div>
                        </Field>
                        <Field
                            label="Intervalo de Candle (segundos)"
                            hint="Duração de cada vela no gráfico. Ex: 60s = cada barra representa 1 minuto de atividade. Deve ser maior que o tick."
                        >
                            <div className="relative">
                                <input type="number" value={candleIntervalSec} onChange={(e) => setCandleIntervalSec(e.target.value)} min={10} max={600} step={5} className={`${inputCls} pr-12`} />
                                <span className="absolute right-4 top-3.5 text-zinc-500 text-sm font-medium">seg</span>
                            </div>
                        </Field>
                    </div>
                    <div className="mt-4 grid gap-5 md:grid-cols-2">
                        <Field
                            label="Humor do Mercado"
                            hint="Bias global de alta/baixa para todos os ativos."
                        >
                            <select
                                value={marketMood}
                                onChange={e => setMarketMood(e.target.value)}
                                className={`${inputCls} pr-8`}
                            >
                                <option value="neutral">Neutro</option>
                                <option value="bull">Bull</option>
                                <option value="bear">Bear</option>
                            </select>
                        </Field>
                    </div>

                    {/* Live preview */}
                    {parseFloat(tickIntervalSec) > 0 && parseFloat(candleIntervalSec) > 0 && (
                        <div className="mt-3 p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg flex items-center gap-3 text-sm">
                            <span className="text-zinc-500">📊 Estimativa:</span>
                            <span className="text-zinc-300">
                                <strong className="text-white">{Math.round(parseFloat(candleIntervalSec) / parseFloat(tickIntervalSec))}</strong> ticks por vela
                                <span className="text-zinc-600 mx-2">·</span>
                                ~<strong className="text-white">{(parseFloat(candleIntervalSec) / 60).toFixed(1)}</strong> min por candle
                            </span>
                        </div>
                    )}
                </div>
            </div>



            {/* ========== Section 4: Cards ========== */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl -mr-20 -mt-20" />
                <div className="relative z-10">
                    <SectionTitle
                        icon="🃏"
                        title="Motor de Cartas & Notícias"
                        subtitle="Controla o ritmo de sorteio automático de cartas de evento durante as rodadas."
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                        <InfoBox>
                            <p className="font-semibold mb-2 text-blue-300 border-b border-blue-800/50 pb-1">📈 Física de Preços (Centavos)</p>
                            <p className="mb-2">
                                Os preços agora se movem na escala de <strong>centavos</strong> a cada tick (ruído de ±0.3%). O gráfico acumula essas micro-variações em tendências claras.
                            </p>
                            <p className="text-blue-300/80 text-xs">
                                <strong>Dica:</strong> Em "Análise", altere a <em>Tendência</em> de um ativo para Alta/Baixa e veja a barra de projeção final reagir em tempo real.
                            </p>
                        </InfoBox>

                        <InfoBox>
                            <p className="font-semibold mb-2 text-blue-300 border-b border-blue-800/50 pb-1">🏢 Ações vs FIIs</p>
                            <ul className="list-disc pl-4 space-y-1 mb-2">
                                <li><strong>Ações:</strong> Alta volatilidade, focadas em ganho de capital.</li>
                                <li><strong>FIIs:</strong> Baixa volatilidade (movimentos mais lentos, -50% ruído na engine), pagam dividendos fixos por rodada. Avaliados por P/VP e Vacância.</li>
                            </ul>
                        </InfoBox>

                        <InfoBox>
                            <p className="font-semibold mb-2 text-blue-300 border-b border-blue-800/50 pb-1">📰 Rumores vs Verdades</p>
                            <p className="mb-2">
                                Notícias agora podem conter <strong>Dicas de Especialistas</strong>. O sistema define se a dica é Verdadeira ou um <em>Rumor Falso</em>.
                            </p>
                            <p className="text-blue-300/80 text-xs">
                                <strong>Dica:</strong> Apenas o Master sabe a verdade. Nas notícias do Master, rótulos roxos indicarão `🔒 Verdade` ou `(Rumor)`. Para os alunos, será sempre `📣 Dica`.
                            </p>
                        </InfoBox>

                        <InfoBox>
                            <p className="font-semibold mb-2 text-blue-300 border-b border-blue-800/50 pb-1">🗂️ Controle de Cartas</p>
                            <p className="mb-2">
                                A aba <strong>Cards</strong> foi reformulada. Agora você tem uma <em>Biblioteca de Disparo Manual</em> organizada por cores e setores.
                            </p>
                            <p className="text-blue-300/80 text-xs">
                                <strong>Motor Automático:</strong> Sorteia a cada [Intervalo] segs usando apenas os decks globais e setoriais passivos.
                            </p>
                        </InfoBox>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 mt-5">
                        <Field
                            label="Intervalo de Sorteio (segundos)"
                            hint="Frequência com que o motor sorteia automaticamente uma carta de evento. 0 = desativa o sorteio automático."
                        >
                            <div className="relative">
                                <input type="number" value={cardDrawIntervalSec} onChange={(e) => setCardDrawIntervalSec(e.target.value)} min={0} max={3600} step={10} className={`${inputCls} pr-12`} />
                                <span className="absolute right-4 top-3.5 text-zinc-500 text-sm font-medium">seg</span>
                            </div>
                        </Field>
                        <Field
                            label="Máximo de Cartas por Rodada"
                            hint="Limite de cartas ativas por rodada. Após atingir o limite, o sorteio pausa até a próxima rodada."
                        >
                            <input type="number" value={maxCardsPerRound} onChange={(e) => setMaxCardsPerRound(e.target.value)} min={0} max={20} step={1} className={inputCls} />
                        </Field>
                    </div>

                    <div className="mt-4">
                        <Toggle
                            checked={autoRevealNews}
                            onChange={setAutoRevealNews}
                            label="Revelar Notícias Automaticamente no Telão"
                            description="Quando ativo, notícias geradas por cartas aparecem publicamente no telão. Quando inativo, ficam visíveis apenas no dashboard do Mestre."
                        />
                    </div>

                    <div className="mt-4 space-y-3">
                        <Toggle
                            checked={allowAfterHours}
                            onChange={setAllowAfterHours}
                            label="Permitir Negociações Fora do Pregão"
                            description="Quando ativo, o Mestre pode executar transações mesmo após o prazo da rodada expirar. Desative para encerrar operações com o fim do pregão."
                        />
                        {allowAfterHours && (
                            <Toggle
                                checked={afterHoursFixedPrice}
                                onChange={setAfterHoursFixedPrice}
                                label="Preço Fixo Fora do Pregão (Último Fechamento)"
                                description="Quando ativo, as operações fora do horário usam o último preço de fechamento do candle, em vez do preço atual. Útil para negociações P2P pós-fechamento."
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleUpdateConfig}
                    disabled={loading}
                    className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-base"
                >
                    {loading ? '💾 Salvando...' : '💾 Salvar Regras Globais'}
                </button>
            </div>



        </div>
    )
}
