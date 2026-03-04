import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const [assets, events, fixedIncome, rules] = await Promise.all([
            prisma.assetTemplate.findMany({ orderBy: { type: 'asc' } }),
            prisma.eventTemplate.findMany({ orderBy: { category: 'asc' } }),
            prisma.fixedIncomeTemplate.findMany({ orderBy: { baseRate: 'asc' } }),
            prisma.gameRuleTemplate.findMany(),
        ])

        return NextResponse.json({ assets, events, fixedIncome, rules })
    } catch (err) {
        console.error('[/api/guide] Error fetching guide data:', err)
        return NextResponse.json({ error: 'Failed to load guide data' }, { status: 500 })
    }
}
