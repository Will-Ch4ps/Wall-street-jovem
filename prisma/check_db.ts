import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
    const count = await p.assetTemplate.count()
    console.log('Assets in DB:', count)
    if (count === 0) {
        console.log('DB IS EMPTY - need to re-seed!')
    } else {
        const first = await p.assetTemplate.findFirst()
        console.log('First asset ticker:', first?.ticker, 'name:', first?.name)
    }
}
main().finally(() => p.$disconnect())
