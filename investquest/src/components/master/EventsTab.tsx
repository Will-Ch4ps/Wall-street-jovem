'use client'
import { useState, useEffect } from 'react'
import type { GameState } from '@/types'
// We need a lightweight type for templates received from DB
interface EventTemplateDisplay {
  id: string
  name: string
  headline: string
  icon: string
  title: string
  body: string
  expertTip: string
  expertAnalysis: string
  scope: string
  category: string
  isPositive: boolean
  probability: string
  cooldownRounds: number
}

interface EventsTabProps {
  state: GameState
  onEventPlayed?: () => void
}

export function EventsTab({ state, onEventPlayed }: EventsTabProps) {
  const [templates, setTemplates] = useState<EventTemplateDisplay[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [randomTarget, setRandomTarget] = useState<string>('')
  const [randomSentiment, setRandomSentiment] = useState<'any' | 'good' | 'bad'>('any')

  const currentRound = state.game.currentRound
  const maxCardsPerRound = state.game.config.maxCardsPerRound ?? 3
  const eventsPlayedThisRound = (state.events || []).filter(e => e.round === currentRound).length
  const cardsPlayedThisRound = (state.activeCardEffects || []).filter(e => e.round === currentRound).length
  const randomNewsThisRound = (state.news || []).filter(n => n.round === currentRound && n.isRandom).length
  const totalPlayedThisRound = eventsPlayedThisRound + cardsPlayedThisRound + randomNewsThisRound
  const limitReached = totalPlayedThisRound >= maxCardsPerRound

  useEffect(() => {
    fetch('/api/events/templates')
      .then(res => res.json())
      .then(data => { if (data.templates) setTemplates(data.templates) })
      .catch(console.error)
  }, [])

  const handleDrawRandom = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const isPositive = randomSentiment === 'any' ? undefined : randomSentiment === 'good'
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'draw',
          targetTicker: randomTarget || undefined,
          isPositive,
          ignoreLimit: true // <-- MESTRE IGNORA LIMITE AQUI
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to draw event')
      }
      onEventPlayed?.()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handlePlaySpecific = async (templateId: string) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'playSpecific', templateId, ignoreLimit: true }), // <-- MESTRE IGNORA LIMITE AQUI
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to play event')
      }
      onEventPlayed?.()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const activeAssets = state.assets.filter(a => a.status === 'active' || a.status === 'ipo_open')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold font-display text-emerald-400">Painel de Eventos (Notícias e Cards)</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Sorteie eventos aleatórios ou dispare eventos específicos para moldar a narrativa.
          </p>
        </div>
        <div
          className={`flex flex-col items-center px-5 py-3 rounded-xl border font-mono font-bold shadow-inner ${
            limitReached 
              ? 'bg-red-950/40 border-red-700 text-red-300'
              : totalPlayedThisRound >= maxCardsPerRound - 1 
                ? 'bg-amber-950/40 border-amber-700 text-amber-300'
                : 'bg-zinc-800/60 border-zinc-700 text-zinc-300'
            }`}
        >
          <span className="text-2xl leading-none">
            {totalPlayedThisRound}/{maxCardsPerRound}
          </span>
          <span className="text-[10px] uppercase tracking-widest mt-1 font-semibold opacity-70">
            Eventos / Rodada
          </span>
        </div>
      </div>
      
      {errorMsg && (
        <div className="bg-red-900/40 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">
          {errorMsg}
        </div>
      )}

      {limitReached && (
        <div className="bg-amber-950/30 border border-amber-700/50 text-amber-300 p-4 rounded-xl text-sm flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold">Limite atingido, mas o Mestre pode forçar o envio!</p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              O limite é de {maxCardsPerRound} por rodada, mas como Mestre você pode sobrepor essa regra e enviar manualmente o que quiser.
            </p>
          </div>
        </div>
      )}

      <section className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-lg text-zinc-100 flex items-center gap-2">
          🎲 Sortear Evento Aleatório
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <select className="w-full bg-zinc-900/80 border border-zinc-700 text-sm rounded px-3 py-2 text-zinc-100"
              value={randomTarget} onChange={(e) => setRandomTarget(e.target.value)} disabled={loading}>
              <option value="">Qualquer Alvo</option>
              {activeAssets.map(a => <option key={a.ticker} value={a.ticker}>{a.ticker}</option>)}
            </select>
          </div>
          <div>
            <select className="w-full bg-zinc-900/80 border border-zinc-700 text-sm rounded px-3 py-2 text-zinc-100"
              value={randomSentiment} onChange={(e) => setRandomSentiment(e.target.value as any)} disabled={loading}>
              <option value="any">Sentimento Aleatório</option>
              <option value="good">🟢 Positivo</option>
              <option value="bad">🔴 Negativo</option>
            </select>
          </div>
        </div>
        
        {/* ESSE É O BOTÃO QUE PRECISA SER SEMPRE CLICÁVEL */}
        <button 
          className="w-full sm:w-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          onClick={handleDrawRandom} 
          disabled={loading}
        >
          {loading ? 'Lançando...' : limitReached ? '⚠️ Forçar Lançamento' : 'Lançar Evento Agora'}
        </button>
      </section>

      <section className="space-y-4 pt-4 border-t border-zinc-700/50">
        <h3 className="font-semibold text-lg text-zinc-100">📍 Acionar Evento Específico Manualmente</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {templates.map(t => (
            <div key={t.id} className={`p-4 rounded-xl border flex flex-col gap-3 ${t.isPositive ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-red-950/20 border-red-900/50'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{t.icon}</span><h4 className="font-bold text-zinc-100">{t.name}</h4>
                  </div>
                  <p className="text-xs font-mono text-zinc-400">Scope: {t.scope} | Prob: {t.probability}</p>
                </div>
                <button 
                  onClick={() => handlePlaySpecific(t.id)} 
                  disabled={loading}
                  className={`px-3 py-1.5 text-xs font-bold rounded shadow transition-colors whitespace-nowrap disabled:opacity-50 ${t.isPositive ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
                >
                  {limitReached ? '⚠️ Forçar' : 'Acionar'}
                </button>
              </div>
              <div className="bg-zinc-900/50 p-2 rounded text-sm text-zinc-300">
                <p className="font-bold mb-1 text-zinc-200">{t.headline}</p>
                <p className="text-xs opacity-80">{t.title}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}