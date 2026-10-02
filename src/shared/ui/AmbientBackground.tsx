// Fractal noise as an inline SVG, tiled at low opacity to break up gradient banding.
const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

const BLOBS = [
  {
    color: 'var(--blob-1)',
    className: '-top-[20vmax] -left-[15vmax] size-[60vmax]',
    animation: 'drift-1 46s',
  },
  {
    color: 'var(--blob-2)',
    className: 'top-[10vh] -right-[20vmax] size-[55vmax]',
    animation: 'drift-2 58s',
  },
  {
    color: 'var(--blob-3)',
    className: '-bottom-[25vmax] left-[10vw] size-[55vmax]',
    animation: 'drift-3 52s',
  },
  // The fourth (pink) blob is a light-theme accent; dark mode stays to three for calm.
  {
    color: 'var(--blob-4)',
    className: 'bottom-[5vh] -right-[10vmax] size-[40vmax] dark:hidden',
    animation: 'drift-4 38s',
  },
]

/** Fixed, full-viewport ambient layer: slow-drifting gradient blobs plus a faint noise texture. */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {BLOBS.map((blob) => (
        <div
          key={blob.animation}
          className={`ambient-blob ${blob.className}`}
          style={{
            background: `radial-gradient(circle at center, ${blob.color} 0%, transparent 65%)`,
            animation: `${blob.animation} ease-in-out infinite`,
          }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: NOISE, opacity: 'var(--noise-opacity)' }}
      />
    </div>
  )
}
