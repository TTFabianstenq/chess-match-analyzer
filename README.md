# Chess Match Analyzer

Client-side chess game analyzer.

- Paste PGN or upload a `.pgn` file
- Board + move navigation
- Full-game Stockfish analysis
- Move classifications (Brilliant / Great / Book / Best / Excellent / Good / Inaccuracy / Mistake / Miss / Blunder) with a stats panel matching the Chess.com-style report

## Add Stockfish 19 (required)

1. Download **Stockfish 19 lite single-threaded** from  
   https://github.com/nmrugg/stockfish.js/releases  
   (files named similar to `stockfish-19-lite-single.js` + `.wasm`)

2. Put them here:

```
public/stockfish/stockfish-19-lite-single.js
public/stockfish/stockfish-19-lite-single.wasm
```

3. If your filenames differ, edit `ENGINE_PATH` in `src/stockfish.ts`.

The engine runs entirely in the browser (Web Worker). No game data is sent to a server.

## Chess.com links

Chess.com does not expose a simple CORS-friendly single-game PGN endpoint.  
**Recommended:** on Chess.com open the game → Share → Download PGN → paste or upload here.

## Dev

```bash
npm install
npm run dev
```

## Deploy (Vercel)

Already set up to deploy from this repo. After you push the Stockfish files, Vercel will rebuild automatically.

## Classification notes

Classifications use win-probability loss vs the engine best move (logistic conversion of centipawns).  
Book moves are currently a simple early-game heuristic. True Brilliant (sound sacrifice) detection is simplified and can be improved later.
