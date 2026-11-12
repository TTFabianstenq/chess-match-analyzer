import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { analyzeGame, type Classification, type MoveAnalysis } from './analysis'
import { ClassificationPanel } from './ClassificationPanel'
import { loadStockfish } from './stockfish'

const SAMPLE_PGN = `[Event "Sample"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 1-0`

export default function App() {
  const [pgnInput, setPgnInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [game, setGame] = useState<Chess | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [currentPly, setCurrentPly] = useState(0)
  const [analyses, setAnalyses] = useState<MoveAnalysis[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const engineReady = useRef(false)

  const fen = useMemo(() => {
    if (!game) return 'start'
    const g = new Chess()
    const moves = history.slice(0, currentPly)
    for (const m of moves) g.move(m)
    return g.fen()
  }, [game, history, currentPly])

  const loadPgn = useCallback((raw: string) => {
    setError(null)
    setStatus(null)
    setAnalyses([])
    try {
      const chess = new Chess()
      chess.loadPgn(raw.trim())
      const moves = chess.history()
      setGame(chess)
      setHistory(moves)
      setCurrentPly(moves.length)
      setStatus(`Loaded ${moves.length} moves`)
    } catch (e: any) {
      setError(e?.message || 'Invalid PGN')
      setGame(null)
      setHistory([])
    }
  }, [])

  const onFile = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => loadPgn(String(reader.result || ''))
    reader.readAsText(file)
  }

  const tryChessComUrl = async () => {
    setError(null)
    setStatus('Chess.com single-game fetch is limited by CORS. Best path: Share → Download PGN, then paste or upload.')
    // Optional: try public archive if user pastes a username later. For now be honest.
  }

  const runAnalysis = async () => {
    if (!game || history.length === 0) {
      setError('Load a game first')
      return
    }
    setAnalyzing(true)
    setProgress(0)
    setError(null)
    setStatus('Starting Stockfish…')

    try {
      if (!engineReady.current) {
        await loadStockfish()
        engineReady.current = true
      }
      const results = await analyzeGame(history, (done, total) => {
        setProgress(Math.round((done / total) * 100))
        setStatus(`Analyzing… ${done}/${total}`)
      })
      setAnalyses(results)
      setStatus('Analysis complete')
    } catch (e: any) {
      console.error(e)
      setError(
        e?.message ||
          'Stockfish failed to load. Put Stockfish 19 files in public/stockfish/ (see README).'
      )
    } finally {
      setAnalyzing(false)
    }
  }

  const counts = useMemo(() => {
    const empty: Record<Classification, number> = {
      Brilliant: 0,
      Great: 0,
      Book: 0,
      Best: 0,
      Excellent: 0,
      Good: 0,
      Inaccuracy: 0,
      Mistake: 0,
      Miss: 0,
      Blunder: 0,
    }
    for (const a of analyses) {
      empty[a.classification]++
    }
    return empty
  }, [analyses])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.25rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Chess Match Analyzer</h1>
        <p style={{ margin: '0.35rem 0 0', opacity: 0.7, fontSize: '0.95rem' }}>
          Paste PGN, upload .pgn, or drop a Chess.com link (PGN preferred). Analysis runs fully in your browser with Stockfish 19.
        </p>
      </header>

      <section style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <label style={{ fontSize: '0.85rem', opacity: 0.8 }}>Chess.com / Lichess game URL</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://www.chess.com/game/live/..."
            />
            <button type="button" className="secondary" onClick={tryChessComUrl}>
              Load
            </button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', opacity: 0.8 }}>Paste PGN</label>
          <textarea
            value={pgnInput}
            onChange={(e) => setPgnInput(e.target.value)}
            placeholder="Paste full PGN here…"
            style={{ marginTop: 4 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => loadPgn(pgnInput)}>
              Load PGN
            </button>
            <button type="button" className="secondary" onClick={() => loadPgn(SAMPLE_PGN)}>
              Sample game
            </button>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <span className="secondary" style={{ padding: '0.5rem 1rem', borderRadius: 6, background: '#333' }}>
                Upload .pgn
              </span>
              <input
                type="file"
                accept=".pgn,text/plain"
                style={{ display: 'none' }}
                onChange={(e) => onFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>
      </section>

      {error && (
        <div style={{ background: '#3b1212', border: '1px solid #7f1d1d', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {status && (
        <div style={{ opacity: 0.85, marginBottom: 12, fontSize: '0.9rem' }}>{status}</div>
      )}

      {game && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 480px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div>
            <Chessboard
              position={fen}
              boardOrientation={orientation}
              arePiecesDraggable={false}
              customBoardStyle={{ borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" className="secondary" onClick={() => setCurrentPly(0)} disabled={currentPly === 0}>
                Start
              </button>
              <button type="button" className="secondary" onClick={() => setCurrentPly((p) => Math.max(0, p - 1))} disabled={currentPly === 0}>
                ←
              </button>
              <button type="button" className="secondary" onClick={() => setCurrentPly((p) => Math.min(history.length, p + 1))} disabled={currentPly >= history.length}>
                →
              </button>
              <button type="button" className="secondary" onClick={() => setCurrentPly(history.length)} disabled={currentPly >= history.length}>
                End
              </button>
              <button type="button" className="secondary" onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>
                Flip
              </button>
              <button type="button" onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? `Analyzing ${progress}%` : 'Analyze game'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <ClassificationPanel counts={counts} />

            <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '0.75rem 1rem', maxHeight: 360, overflow: 'auto' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Moves</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 4 }}>
                {history.map((san, i) => {
                  const a = analyses[i]
                  const active = i === currentPly - 1
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentPly(i + 1)}
                      style={{
                        background: active ? '#2563eb' : '#252525',
                        fontSize: '0.85rem',
                        padding: '0.35rem 0.4rem',
                        textAlign: 'left',
                        border: a ? `1px solid ${colorFor(a.classification)}` : '1px solid transparent',
                      }}
                    >
                      <span style={{ opacity: 0.6 }}>{Math.floor(i / 2) + 1}{i % 2 === 0 ? '.' : '...'}</span>{' '}
                      {san}
                      {a && (
                        <span style={{ float: 'right', fontSize: '0.75rem', color: colorFor(a.classification) }}>
                          {shortLabel(a.classification)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {analyses[currentPly - 1] && (
              <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '0.75rem 1rem' }}>
                <div style={{ fontWeight: 600 }}>Current move</div>
                <div style={{ marginTop: 6 }}>
                  <strong style={{ color: colorFor(analyses[currentPly - 1].classification) }}>
                    {analyses[currentPly - 1].classification}
                  </strong>
                  {' · '}
                  loss {analyses[currentPly - 1].lossPct.toFixed(1)}% win chance
                  {analyses[currentPly - 1].bestSan && (
                    <span> · best was {analyses[currentPly - 1].bestSan}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function colorFor(c: Classification): string {
  const map: Record<Classification, string> = {
    Brilliant: '#00c7b0',
    Great: '#5b9bd5',
    Book: '#d4a574',
    Best: '#81b64c',
    Excellent: '#81b64c',
    Good: '#95b46a',
    Inaccuracy: '#f7c631',
    Mistake: '#e69f00',
    Miss: '#e67e22',
    Blunder: '#e74c3c',
  }
  return map[c] || '#aaa'
}

function shortLabel(c: Classification): string {
  const map: Partial<Record<Classification, string>> = {
    Brilliant: '!!',
    Great: '!',
    Best: '★',
    Excellent: '✓',
    Good: '✓',
    Inaccuracy: '?!',
    Mistake: '?',
    Miss: '✕',
    Blunder: '??',
    Book: '📖',
  }
  return map[c] || ''
}
