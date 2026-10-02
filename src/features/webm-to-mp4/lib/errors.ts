export type ConversionErrorKind = 'load' | 'unsupported' | 'corrupt' | 'memory' | 'unknown'

export class ConversionError extends Error {
  readonly kind: ConversionErrorKind

  constructor(kind: ConversionErrorKind, message: string) {
    super(message)
    this.name = 'ConversionError'
    this.kind = kind
  }
}

const MESSAGES: Record<ConversionErrorKind, string> = {
  load: 'The converter couldn’t be loaded. Check your connection and try again.',
  unsupported: 'That file isn’t a WebM video ffmpeg can read.',
  corrupt: 'This WebM looks damaged or incomplete, so it couldn’t be converted.',
  memory:
    'Your browser ran out of memory converting this file. Try a smaller resolution, or a shorter clip.',
  unknown: 'Something went wrong during conversion.',
}

export const messageFor = (kind: ConversionErrorKind) => MESSAGES[kind]

const PATTERNS = {
  memory: [
    'out of memory',
    'aborted(oom)',
    'cannot enlarge memory',
    'memory access out of bounds',
    'allocation failed',
    'rangeerror',
  ],
  corrupt: [
    'invalid data found',
    'ebml header parsing failed',
    'truncat',
    'error while decoding',
    'corrupt',
  ],
  unsupported: [
    'does not contain any stream',
    'unknown format',
    'could not find codec',
    'invalid argument',
  ],
} satisfies Partial<Record<ConversionErrorKind, string[]>>

/** Maps a thrown error and/or ffmpeg's recent log lines to a user-facing error kind. */
export function classifyConversionFailure(error: unknown, logs: string[]): ConversionError {
  if (error instanceof ConversionError) return error
  const text = [
    error instanceof Error ? `${error.name} ${error.message}` : String(error ?? ''),
    ...logs,
  ]
    .join('\n')
    .toLowerCase()

  // Checked in order: memory first, since OOM often surfaces as a decode error too.
  const kind =
    (Object.keys(PATTERNS) as (keyof typeof PATTERNS)[]).find((k) =>
      PATTERNS[k].some((pattern) => text.includes(pattern)),
    ) ?? 'unknown'
  return new ConversionError(kind, messageFor(kind))
}
