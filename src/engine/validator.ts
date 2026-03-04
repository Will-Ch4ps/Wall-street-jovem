import type { Asset, GameConfig, Position, Transaction } from '@/types'

export interface TransactionValidation {
  isValid: boolean
  errors: string[]
}

export function validateTransaction(params: {
  tx: Partial<Transaction>
  config: GameConfig
  asset: Asset
  buyerCash: number
  sellerPosition: Position | undefined
  availableShares: number
  isSameRoundAsBuy?: boolean   // true se o vendedor já comprou esse ativo nesta rodada
  isP2P?: boolean              // true se o vendedor não é 'market'
}): TransactionValidation {
  const errors: string[] = []
  const { tx, config, asset, buyerCash, sellerPosition, availableShares, isSameRoundAsBuy, isP2P } = params

  if (asset.status === 'suspended') {
    errors.push('Empresa suspensa (circuit breaker)')
  }
  if (asset.status !== 'active' && asset.status !== 'ipo_open') {
    errors.push('Empresa não está ativa')
  }

  if (tx.type === 'buy') {
    const total = (tx.price ?? 0) * (tx.quantity ?? 0)
    if (buyerCash < total) errors.push('Saldo insuficiente')
    if (availableShares < (tx.quantity ?? 0)) errors.push('Ações insuficientes no mercado')

    // P2P: compra de outro jogador (não do mercado)
    if (isP2P && !config.allowP2PTrade) {
      errors.push('Negociação P2P entre jogadores não permitida nesta sessão')
    }
  }

  if (tx.type === 'sell') {
    const qty = tx.quantity ?? 0
    const hasPosition = (sellerPosition?.quantity ?? 0) >= qty

    if (!hasPosition) {
      if (!config.allowShort) {
        errors.push('Venda a descoberto (short) não permitida nesta sessão')
      } else {
        // Short permitido — sem erro
      }
    }

    // Day trade: vendendo o que comprou na mesma rodada
    if (isSameRoundAsBuy && !config.allowDayTrade) {
      errors.push('Day trade não permitido nesta sessão (compra e venda na mesma rodada)')
    }
  }

  return { isValid: errors.length === 0, errors }
}
