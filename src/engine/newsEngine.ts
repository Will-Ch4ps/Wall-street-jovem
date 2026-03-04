import { nanoid } from 'nanoid'
import type { News, NewsScope } from '@/types'
import type { NewsTemplate } from '@/data/newsTemplates'

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function resolveValue(v: string[]): string {
  return pick(v)
}

export function generateNewsFromTemplate(
  template: NewsTemplate,
  round: number,
  replacements: Record<string, string> = {}
): News {
  let title = template.title
  let body = template.body

  for (const [key, values] of Object.entries(template.variables)) {
    const val = replacements[key] ?? resolveValue(values)
    title = title.replace(`{${key}}`, val)
    body = body.replace(`{${key}}`, val)
  }

  return {
    id: nanoid(),
    round,
    timestamp: new Date().toISOString(),
    title,
    body,
    source: 'Jornal do Pregão',
    category: 'economy',
    scope: template.scope as NewsScope,
    targets: [],
    isRandom: true,
    isPublic: true,
    masterOnly: false,
    isActive: true,
  }
}
