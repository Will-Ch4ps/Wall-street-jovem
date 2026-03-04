'use client'

import { useState } from 'react'
import { formatShortTime } from '@/lib/formatters'
import type { GameState, News } from '@/types'

interface NewsTabProps {
  state: GameState
  onNewsCreate?: () => void
}

export function NewsTab({ state, onNewsCreate }: NewsTabProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [scope, setScope] = useState<'global' | 'company' | 'fii'>('global')
  const [targetTicker, setTargetTicker] = useState('')

  const news = [...state.news].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const handleCreate = async () => {
    if (!title.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: title.trim(),
          body: body.trim(),
          scope,
          targets: targetTicker ? [targetTicker] : [],
          ignoreLimit: true // <-- MESTRE IGNORA LIMITE AQUI
        }),
      })
      if (res.ok) {
        setTitle('')
        setBody('')
        setTargetTicker('')
        onNewsCreate?.()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRandom = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'random', ignoreLimit: true }), // <-- MESTRE IGNORA LIMITE AQUI
      })
      if (res.ok) onNewsCreate?.()
    } finally {
      setLoading(false)
    }
  }

  const targetOptions = scope === 'company'
    ? state.assets.filter(a => a.type === 'stock')
    : scope === 'fii'
      ? state.assets.filter(a => a.type === 'fii')
      : []

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Central de Notícias</h2>
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
        <h3 className="mb-3 text-sm font-medium">Criar Notícia Manual</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <select value={scope} onChange={(e) => { setScope(e.target.value as any); setTargetTicker('') }} className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm flex-1">
              <option value="global">Global</option>
              <option value="company">Empresa</option>
              <option value="fii">FII</option>
            </select>
            {scope !== 'global' && (
              <select value={targetTicker} onChange={(e) => setTargetTicker(e.target.value)} className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm flex-1">
                <option value="">Selecione o Alvo (Opcional)</option>
                {targetOptions.map(a => <option key={a.ticker} value={a.ticker}>{a.ticker} - {a.name}</option>)}
              </select>
            )}
          </div>
          <input type="text" placeholder="Título da Notícia" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm" />
          <textarea placeholder="Escreva a mensagem (corpo da notícia)..." value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={loading || !title.trim() || (scope !== 'global' && !targetTicker)} className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              Publicar Forçado
            </button>
            <button onClick={handleRandom} disabled={loading} className="rounded bg-amber-600 px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
              Gerar Aleatória
            </button>
          </div>
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-medium">Feed (Visualização do Mestre)</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {news.map((n) => <NewsItem key={n.id} news={n} />)}
        </div>
      </div>
    </div>
  )
}

function NewsItem({ news }: { news: News }) {
  return (
    <div className="rounded border border-zinc-700 bg-zinc-800/50 p-3 text-sm">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>R{news.round}</span>
        <span>{formatShortTime(news.timestamp)}</span>
        <span className="uppercase text-indigo-400">{news.scope}</span>
        {news.targets && news.targets.length > 0 && (
          <span className="font-mono text-amber-500 font-bold ml-1">[{news.targets.join(', ')}]</span>
        )}
      </div>
      <div className="mt-1 font-medium text-zinc-100">{news.title}</div>
      <div className="mt-0.5 text-zinc-400">{news.body}</div>
    </div>
  )
}
  )
}

function NewsItem({ news }: { news: News }) {
  return (
    <div className="rounded border border-zinc-700 bg-zinc-800/50 p-3 text-sm">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>R{news.round}</span>
        <span>{formatShortTime(news.timestamp)}</span>
        <span className="uppercase text-indigo-400">{news.scope}</span>
        {news.targets && news.targets.length > 0 && (
          <span className="font-mono text-amber-500 font-bold ml-1">
            [{news.targets.join(', ')}]
          </span>
        )}
      </div>
      <div className="mt-1 font-medium">{news.title}</div>
      <div className="mt-0.5 text-zinc-400">{news.body}</div>
    </div>
  )
}
