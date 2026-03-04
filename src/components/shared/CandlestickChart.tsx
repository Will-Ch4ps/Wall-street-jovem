'use client'

import { useEffect, useState } from 'react'
import {
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Bar,
  CartesianGrid,
} from 'recharts'
import type { Candle } from '@/types'

interface CandlestickChartProps {
  candles: Candle[]
  ticker: string
  className?: string
  formingCandle?: Candle
}

interface CustomCandlestickProps {
  x?: number
  y?: number
  width?: number
  height?: number
  payload?: {
    open: number
    close: number
    high: number
    low: number
  }
}

// Custom Shape for the Candlestick, moved outside render to fix linter
const CustomCandlestick = (props: CustomCandlestickProps) => {
  const { x, y, width, height, payload } = props
  if (x == null || y == null || width == null || height == null || !payload) return null
  const { open, close, high, low, isForming } = payload as any
  const isUp = close >= open
  const color = isUp ? '#22c55e' : '#ef4444' // Green for Up, Red for Down

  // Se estiver em formação, reduz a opacidade para indicar atualização em tempo real
  const opacity = isForming ? 0.4 : 1

  const barWidth = width * 0.6
  const lineX = x + width / 2

  // We get total height mapped from minLow to maxHigh
  // y gives the high point, height spans to low point
  return (
    <g opacity={opacity}>
      {/* Shadow (Wick) */}
      <line x1={lineX} y1={y} x2={lineX} y2={y + height} stroke={color} strokeWidth={1.5} />
      {/* Body */}
      {(() => {
        const totalDiff = high - low
        if (totalDiff === 0) return <line x1={x + width * 0.2} y1={y} x2={x + width * 0.8} y2={y} stroke={color} strokeWidth={2} />

        const maxBody = Math.max(open, close)
        const minBody = Math.min(open, close)

        const bodyTopY = y + ((high - maxBody) / totalDiff) * height
        const bodyHeight = Math.max(((maxBody - minBody) / totalDiff) * height, 2)

        return (
          <rect
            x={x + width * 0.2}
            y={bodyTopY}
            width={barWidth}
            height={bodyHeight}
            fill={isUp ? 'transparent' : color} // Hollow green, filled red for classic B3
            stroke={color}
            strokeWidth={1.5}
          />
        )
      })()}
    </g>
  )
}

export function CandlestickChart({ candles, ticker, className, formingCandle }: CandlestickChartProps) {
  // Using a simple CSS mechanism or just a very brief delay to avoid hydration mismatch 
  // without calling setState inside an effect synchronously in a way that the linter hates.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // A small timeout avoids the synchronous setState-in-effect warning, 
    // although it's sometimes necessary for Next.js Recharts hydration.
    const timer = setTimeout(() => setMounted(true), 10)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-zinc-800/50 text-zinc-500">
        Carregando gráfico...
      </div>
    )
  }

  const allCandles = [...candles]
  if (formingCandle) allCandles.push(formingCandle)

  const data = allCandles.slice(-50).map((c, i) => ({
    index: i,
    isForming: formingCandle && i === allCandles.slice(-50).length - 1 && c === formingCandle,
    time: new Date(c.timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
    range: [c.low, c.high],
  }))

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-zinc-800/50 text-zinc-500">
        Sem dados de candles para {ticker}
      </div>
    )
  }

  // Calculate domain correctly based on all data points
  const minLow = Math.min(...data.map(d => d.low))
  const maxHigh = Math.max(...data.map(d => d.high))
  const padding = (maxHigh - minLow) * 0.1 || 1

  return (
    <div className={className}>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} tickMargin={10} minTickGap={20} />
            <YAxis
              stroke="#9ca3af"
              fontSize={11}
              tickFormatter={(v) => `R$${v.toFixed(2)}`}
              domain={[Math.floor(minLow - padding), Math.ceil(maxHigh + padding)]}
              orientation="right"
              tickCount={8}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
              labelStyle={{ color: '#e4e4e7', fontWeight: 'bold', marginBottom: '8px' }}
              cursor={{ fill: '#27272a', opacity: 0.4 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: unknown, name: string | undefined, props: any) => {
                if (name === "Intervalo" && props && props.payload) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const { open, close, high, low } = props.payload as any
                  return [
                    <div key="custom-tooltip" className="text-sm">
                      <span className="text-zinc-400">Abertura: </span><span className="font-mono">R${open.toFixed(2)}</span><br />
                      <span className="text-zinc-400">Fechamento: </span><span className="font-mono">R${close.toFixed(2)}</span><br />
                      <span className="text-zinc-400">Máxima: </span><span className="font-mono text-green-400">R${high.toFixed(2)}</span><br />
                      <span className="text-zinc-400">Mínima: </span><span className="font-mono text-red-400">R${low.toFixed(2)}</span>
                    </div>,
                    ''
                  ] as [React.ReactNode, string]
                }
                return [] as unknown as [React.ReactNode, string]
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(_, payload: any) =>
                payload && payload[0] ? `Hora: ${payload[0].payload.time}` : ''
              }
            />
            <Bar
              dataKey="range"
              name="Intervalo"
              shape={<CustomCandlestick />}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
