import { promises as fs } from 'fs'
import path from 'path'
import type { GameState } from '@/types'

const GAME_DATA_DIR = path.join(process.cwd(), 'game-data')
const GAME_FILE = path.join(GAME_DATA_DIR, 'game.json')

export async function loadGameState(): Promise<GameState | null> {
  try {
    const data = await fs.readFile(GAME_FILE, 'utf-8')
    return JSON.parse(data) as GameState
  } catch {
    return null
  }
}

export async function saveGameState(state: GameState): Promise<void> {
  try {
    await fs.mkdir(GAME_DATA_DIR, { recursive: true })
    await fs.writeFile(GAME_FILE, JSON.stringify(state, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save game state:', err)
    throw err
  }
}
