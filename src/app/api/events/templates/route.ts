import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const templates = await prisma.eventTemplate.findMany({
            orderBy: { scope: 'asc' }
        })
        return NextResponse.json({ templates })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }
}
