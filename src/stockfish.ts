/**
 * Stockfish 19 browser worker wrapper.
 *
 * EXPECTED FILES (you will add these):
 *   public/stockfish/stockfish-19-lite-single.js
 *   public/stockfish/stockfish-19-lite-single.wasm
 *
 * Or adjust ENGINE_PATH below to match the filenames you upload.
 *
 * Recommended: Stockfish 19 lite single-threaded from
 * https://github.com/nmrugg/stockfish.js/releases
 */

const ENGINE_PATH = '/stockfish/stockfish-19-lite-single.js'

let worker: Worker | null = null
let ready = false
let msgId = 0
const pending = new Map<
  number,
  { resolve: (v: any) => void; reject: (e: any) => void; type: string }
>()

function send(cmd: string) {
  worker?.postMessage(cmd)
}

export function loadStockfish(): Promise<void> {
  if (ready && worker) return Promise.resolve()

  return new Promise((resolve, reject) => {
    try {
      worker = new Worker(ENGINE_PATH)
    } catch (e) {
      reject(
        new Error(
          `Failed to create Stockfish worker. Make sure ${ENGINE_PATH} exists (and the matching .wasm).`
        )
      )
      return
    }

    const timeout = setTimeout(() => {
      reject(new Error('Stockfish did not become ready in time. Check the worker path and files.'))
    }, 15000)

    worker.onmessage = (e: MessageEvent) => {
      const line = String(e.data)

      if (line === 'uciok' || line.includes('uciok')) {
        // continue init
      }
      if (line === 'readyok' || line.includes('readyok')) {
        ready = true
        clearTimeout(timeout)
        resolve()
        return
      }

      // bestmove
      if (line.startsWith('bestmove')) {
        const parts = line.split(/\s+/)
        const move = parts[1]
        // resolve any waiting bestmove
        for (const [id, p] of pending) {
          if (p.type === 'bestmove') {
            pending.delete(id)
            p.resolve(move)
            break
          }
        }
      }

      // info score
      if (line.startsWith('info') && line.includes('score')) {
        // handled when we get bestmove / or we can track last score
      }
    }

    worker.onerror = (err) => {
      clearTimeout(timeout)
      reject(new Error(`Stockfish worker error: ${err.message || 'unknown'}`))
    }

    send('uci')
    send('isready')
  })
}

/** Return evaluation in centipawns from the side-to-move perspective */
export function evaluatePosition(fen: string, depth = 12): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!worker || !ready) {
      reject(new Error('Engine not ready'))
      return
    }

    let lastCp = 0
    const id = ++msgId

    const handler = (e: MessageEvent) => {
      const line = String(e.data)
      if (line.startsWith('info') && line.includes('score')) {
        const mateMatch = line.match(/score mate (-?\d+)/)
        const cpMatch = line.match(/score cp (-?\d+)/)
        if (mateMatch) {
          const mate = parseInt(mateMatch[1], 10)
          lastCp = mate > 0 ? 10000 - mate * 10 : -10000 - mate * 10
        } else if (cpMatch) {
          lastCp = parseInt(cpMatch[1], 10)
        }
      }
      if (line.startsWith('bestmove')) {
        worker?.removeEventListener('message', handler)
        pending.delete(id)
        resolve(lastCp)
      }
    }

    pending.set(id, { resolve, reject, type: 'eval' })
    worker.addEventListener('message', handler)

    send('ucinewgame')
    send(`position fen ${fen}`)
    send(`go depth ${depth}`)
  })
}

export function getBestMove(fen: string, depth = 12): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!worker || !ready) {
      reject(new Error('Engine not ready'))
      return
    }

    const id = ++msgId
    const handler = (e: MessageEvent) => {
      const line = String(e.data)
      if (line.startsWith('bestmove')) {
        worker?.removeEventListener('message', handler)
        const move = line.split(/\s+/)[1] || '(none)'
        pending.delete(id)
        resolve(move)
      }
    }

    pending.set(id, { resolve, reject, type: 'bestmove' })
    worker.addEventListener('message', handler)

    send('ucinewgame')
    send(`position fen ${fen}`)
    send(`go depth ${depth}`)
  })
}
