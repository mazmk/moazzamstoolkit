export type ResolutionChoice = 'original' | '1080' | '720' | '480'
export type CompressionChoice = 'small' | 'balanced' | 'best'

export interface VideoDimensions {
  width: number
  height: number
}

export const RESOLUTION_CHOICES: {
  value: ResolutionChoice
  label: string
  target: number | null
}[] = [
  { value: 'original', label: 'Original', target: null },
  { value: '1080', label: '1080p', target: 1080 },
  { value: '720', label: '720p', target: 720 },
  { value: '480', label: '480p', target: 480 },
]

/** x264 CRF per compression preset: lower is higher quality and a bigger file. */
export const CRF: Record<CompressionChoice, number> = { small: 28, balanced: 23, best: 18 }

/** Browser recordings are variable frame rate; forcing a constant rate avoids A/V drift. */
export const OUTPUT_FPS = 30

const targetOf = (choice: ResolutionChoice) =>
  RESOLUTION_CHOICES.find((c) => c.value === choice)?.target ?? null

/** "1080p" etc. refer to the short side, so portrait videos are treated the same as landscape. */
const shortSide = ({ width, height }: VideoDimensions) => Math.min(width, height)

/**
 * Options larger than the source are disabled — never upscale. Unknown dimensions (metadata
 * failed to load) leave every option available, since there's nothing to compare against.
 */
export function isResolutionAvailable(choice: ResolutionChoice, source: VideoDimensions | null) {
  const target = targetOf(choice)
  return target === null || source === null || target <= shortSide(source)
}

/** The output size for a choice, with both sides rounded down to even numbers (x264 needs that). */
export function outputDimensions(
  choice: ResolutionChoice,
  source: VideoDimensions,
): VideoDimensions {
  const even = (n: number) => Math.max(2, Math.floor(n / 2) * 2)
  const target = targetOf(choice)
  if (target === null || target >= shortSide(source)) {
    return { width: even(source.width), height: even(source.height) }
  }
  const scale = target / shortSide(source)
  return source.height <= source.width
    ? { width: even(source.width * scale), height: target }
    : { width: target, height: even(source.height * scale) }
}

/**
 * The -vf scale filter. Downscaling uses `-2` for the free side so ffmpeg keeps it even. Keeping
 * the original size still forces even dimensions, because libx264 with yuv420p rejects odd ones.
 */
export function scaleFilter(choice: ResolutionChoice, source: VideoDimensions | null): string {
  const target = targetOf(choice)
  const downscale = target !== null && (source === null || target < shortSide(source))
  if (!downscale) return 'scale=trunc(iw/2)*2:trunc(ih/2)*2'
  const portrait = source !== null && source.height > source.width
  return portrait ? `scale=${target}:-2` : `scale=-2:${target}`
}

export interface BuildArgsOptions {
  input: string
  output: string
  resolution: ResolutionChoice
  compression: CompressionChoice
  source: VideoDimensions | null
}

export function buildFfmpegArgs({
  input,
  output,
  resolution,
  compression,
  source,
}: BuildArgsOptions): string[] {
  return [
    '-i',
    input,
    // First video stream, plus audio only if there is one — `?` keeps silent inputs working.
    '-map',
    '0:v:0',
    '-map',
    '0:a?',
    '-vf',
    scaleFilter(resolution, source),
    '-r',
    String(OUTPUT_FPS),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    String(CRF[compression]),
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    // Moves the index to the front so the MP4 starts playing before it fully downloads.
    '-movflags',
    '+faststart',
    output,
  ]
}
