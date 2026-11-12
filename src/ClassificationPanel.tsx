import type { Classification } from './analysis'

const ORDER: Classification[] = [
  'Brilliant',
  'Great',
  'Book',
  'Best',
  'Excellent',
  'Good',
  'Inaccuracy',
  'Mistake',
  'Miss',
  'Blunder',
]

const ICONS: Record<Classification, string> = {
  Brilliant: '!!',
  Great: '!',
  Book: '📖',
  Best: '★',
  Excellent: '👍',
  Good: '✓',
  Inaccuracy: '?!',
  Mistake: '?',
  Miss: '✕',
  Blunder: '??',
}

const COLORS: Record<Classification, string> = {
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

export function ClassificationPanel({ counts }: { counts: Record<Classification, number> }) {
  return (
    <div
      style={{
        background: '#1a1a1a',
        borderRadius: 8,
        padding: '0.85rem 1rem',
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: '0.35rem 0.75rem',
        alignItems: 'center',
        fontSize: '0.92rem',
      }}
    >
      {ORDER.map((label) => (
        <>
          <div key={`${label}-name`} style={{ color: COLORS[label], fontWeight: 600 }}>
            {label}
          </div>
          <div key={`${label}-count`} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {counts[label]}
          </div>
          <div
            key={`${label}-icon`}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: COLORS[label] + '33',
              color: COLORS[label],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {ICONS[label]}
          </div>
        </>
      ))}
    </div>
  )
}
