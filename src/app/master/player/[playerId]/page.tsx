import { PlayerOperator } from '@/components/master/PlayerOperator'

interface Props {
    params: Promise<{ playerId: string }>
    searchParams: Promise<{ type?: string }>
}

export default async function PlayerProfilePage({ params, searchParams }: Props) {
    const { playerId } = await params
    const { type } = await searchParams
    const ownerType = (type === 'holding' ? 'holding' : 'player') as 'player' | 'holding'

    return (
        <main className="min-h-screen bg-zinc-950 text-white font-sans">
            <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <a href="/master?tab=transacoes" className="text-zinc-400 hover:text-white transition text-sm">← Painel Mestre</a>
                    <span className="text-zinc-700">/</span>
                    <span className="text-sm font-semibold text-white">Perfil do Investidor</span>
                </div>
                <a href="/master?tab=transacoes" className="text-xs bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-bold transition">
                    ⚡ Painel Completo
                </a>
            </div>
            <div className="max-w-7xl mx-auto p-6">
                <PlayerOperator playerId={playerId} ownerType={ownerType} />
            </div>
        </main>
    )
}
