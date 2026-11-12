import { Chess } from 'chess.js'
import { evaluatePosition, getBestMove } from './stockfish'

export type Classification =
  | 'Brilliant'
  | 'Great'
  | 'Book'
  | 'Best'
  | 'Excellent'
  | 'Good'
  | 'Inaccuracy'
  | 'Mistake'
  | 'Miss'
  | 'Blunder'

export interface MoveAnalysis {
  ply: number
  san: string
  classification: Classification
  lossPct: number
  evalBefore: number
  evalAfter: number
  bestSan?: string
}

/** Convert centipawns (from side-to-move perspective) to win probability 0–1 */
export function cpToWinProb(cp: number): number {
  // Common model used by Lichess / many analyzers
  return 1 / (1 + Math.exp(-0.00368208 * cp))
}

function classify(lossPct: number, isBest: boolean, isBook: boolean): Classification {
  if (isBook) return 'Book'
  if (isBest || lossPct < 0.5) return 'Best'
  if (lossPct < 2) return 'Excellent'
  if (lossPct < 5) return 'Good'
  if (lossPct < 10) return 'Inaccuracy'
  if (lossPct < 20) return 'Mistake'
  return 'Blunder'
}

/**
 * Analyze every move in the game.
 * Depth is kept moderate for browser responsiveness.
 */
export async function analyzeGame(
  sans: string[],
  onProgress?: (done: number, total: number) => void
): Promise<MoveAnalysis[]> {
  const results: MoveAnalysis[] = []
  const chess = new Chess()
  const total = sans.length
  const depth = 12 // increase later if you want deeper / slower

  for (let i = 0; i < sans.length; i++) {
    const fenBefore = chess.fen()
    const turn = chess.turn()

    // Engine eval before the move (side to move)
    const evalBeforeRaw = await evaluatePosition(fenBefore, depth)
    // Normalize to white perspective for consistency
    const evalBefore = turn === 'w' ? evalBeforeRaw : -evalBeforeRaw

    const bestUci = await getBestMove(fenBefore, depth)
    let bestSan: string | undefined
    if (bestUci && bestUci !== '(none)') {
      try {
        const tmp = new Chess(fenBefore)
        const m = tmp.move({
          from: bestUci.slice(0, 2),
          to: bestUci.slice(2, 4),
          promotion: bestUci[4] as any,
        })
        bestSan = m?.san
      } catch {
        /* ignore */
      }
    }

    const played = chess.move(sans[i])
    if (!played) throw new Error(`Illegal move at ply ${i}: ${sans[i]}`)

    const fenAfter = chess.fen()
    const evalAfterRaw = await evaluatePosition(fenAfter, depth)
    // After the move, side to move flipped → convert to white perspective
    const evalAfter = chess.turn() === 'w' ? evalAfterRaw : -evalAfterRaw

    // Win prob from the perspective of the player who just moved
    const playerSign = turn === 'w' ? 1 : -1
    const wpBefore = cpToWinProb(evalBefore * playerSign)
    const wpAfter = cpToWinProb(evalAfter * playerSign)
    const lossPct = Math.max(0, (wpBefore - wpAfter) * 100)

    const isBest = bestSan === played.san || lossPct < 0.3
    // Very crude book detection: first 8–12 plies often theory
    const isBook = i < 10 && lossPct < 3

    let classification = classify(lossPct, isBest, isBook)

    // Simple Brilliant heuristic: low loss + not book + material drop on board (rough)
    // Full sacrifice detection needs more work; this is a placeholder.
    if (lossPct < 1.5 && i > 8 && !isBook && isBest) {
      // leave as Best / Excellent for now; real Brilliant needs SEE / material check
    }

    results.push({
      ply: i,
      san: played.san,
      classification,
      lossPct,
      evalBefore,
      evalAfter,
      bestSan,
    })

    onProgress?.(i + 1, total)
  }

  return results
}
