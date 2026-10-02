// Fractal noise as an inline SVG — the only texture on the flat paper background.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

/**
 * Fixed background layer over flat var(--bg): a faint grain plus a 24px dot grid that fades out
 * toward the bottom. Nothing animates.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(var(--ink) 1px, transparent 1.2px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '12px 12px',
          opacity: 'var(--dots-opacity)',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 70%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ backgroundImage: GRAIN, opacity: 'var(--grain-opacity)' }}
      />
    </div>
  )
}
