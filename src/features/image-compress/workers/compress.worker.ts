import {
  FORMAT_LABEL,
  INPUT_MIME,
  OUTPUT_MIME,
  resolveOutputFormat,
  sniffFormat,
  type InputFormat,
} from '../lib/formats'
import { readImageHeader } from '../lib/imageHeader'
import {
  copyableJpegMetadata,
  insertJpegSegments,
  stripJpegMetadata,
  stripPngMetadata,
  stripWebpMetadata,
} from '../lib/metadata'
import type { CompressOutcome, CompressRequest, CompressResponse } from '../lib/protocol'
import { fitWithin, targetDimensions, type Dimensions } from '../lib/resize'
import { TARGET_MAX_ITERATIONS, searchQualityForTarget } from '../lib/targetSize'
import { UserFacingError, getEncoder } from './codecs'

/**
 * One image per message: sniff → guard → decode (EXIF rotation baked in) → resize → encode →
 * keep whichever of original and output is smaller. Runs in a pool of these workers so the page
 * never decodes or encodes on the main thread.
 */

const MAX_PIXELS = 100_000_000
const THUMB_BOX = 160

const post = (message: CompressResponse) => self.postMessage(message)

const megapixels = ({ width, height }: Dimensions) => width * height
const tooLarge = (size: Dimensions) =>
  `Over 100 megapixels (${Math.round(megapixels(size) / 1e6)} MP), skipped`

/** Halves until within 2× of the target, then draws at the target: sharper than one big jump. */
function drawScaled(
  source: CanvasImageSource & { width: number; height: number },
  size: Dimensions,
  background: string | null,
) {
  let current: CanvasImageSource & { width: number; height: number } = source
  while (current.width / 2 >= size.width && current.height / 2 >= size.height) {
    const half = new OffscreenCanvas(Math.round(current.width / 2), Math.round(current.height / 2))
    const ctx = half.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(current, 0, 0, half.width, half.height)
    current = half
  }
  const canvas = new OffscreenCanvas(size.width, size.height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, size.width, size.height)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(current, 0, 0, size.width, size.height)
  return { canvas, ctx }
}

async function makeThumb(bitmap: ImageBitmap): Promise<Blob | null> {
  try {
    const { canvas } = drawScaled(bitmap, fitWithin(bitmap, THUMB_BOX), null)
    return await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 })
  } catch {
    return null
  }
}

async function decode(file: Blob, format: InputFormat): Promise<ImageBitmap> {
  // A typed slice (no copy) helps browsers that won't sniff untyped blobs from archives.
  const typed = file.type ? file : file.slice(0, file.size, INPUT_MIME[format])
  try {
    return await createImageBitmap(typed, { imageOrientation: 'from-image' })
  } catch {
    if (format === 'heic') {
      throw new UserFacingError(
        'This browser can’t open HEIC images. Try Safari, or convert them to JPEG first.',
      )
    }
    throw new UserFacingError(
      `This ${FORMAT_LABEL[format]} couldn’t be decoded. It may be damaged.`,
    )
  }
}

function stripLossless(
  format: InputFormat,
  bytes: Uint8Array<ArrayBuffer>,
): Uint8Array<ArrayBuffer> {
  if (format === 'jpeg') return new Uint8Array(stripJpegMetadata(bytes))
  if (format === 'png') return new Uint8Array(stripPngMetadata(bytes))
  if (format === 'webp') return new Uint8Array(stripWebpMetadata(bytes))
  return bytes
}

async function compress(
  req: CompressRequest,
  onProgress: (value: number) => void,
): Promise<CompressOutcome> {
  const { settings } = req
  const bytes = new Uint8Array(await req.file.arrayBuffer())
  const format = sniffFormat(bytes)
  if (!format) {
    throw new UserFacingError(
      'Not a supported image: the contents aren’t JPEG, PNG, WebP, AVIF, BMP, GIF or HEIC.',
    )
  }
  const header = readImageHeader(bytes, format)
  if (header.size && megapixels(header.size) > MAX_PIXELS) {
    return {
      kind: 'skipped',
      reason: tooLarge(header.size),
      inputFormat: format,
      sourceSize: header.size,
      thumb: null,
    }
  }

  const bitmap = await decode(req.file, format)
  let sourceSize: Dimensions
  let thumb: Blob | null
  let image: ImageData
  const outputFormat = resolveOutputFormat(format, settings.format)
  let size: Dimensions
  try {
    sourceSize = { width: bitmap.width, height: bitmap.height }
    if (megapixels(sourceSize) > MAX_PIXELS) {
      return {
        kind: 'skipped',
        reason: tooLarge(sourceSize),
        inputFormat: format,
        sourceSize,
        thumb: null,
      }
    }
    thumb = req.wantThumb ? await makeThumb(bitmap) : null
    if (header.animated) {
      return {
        kind: 'skipped',
        reason: 'Animated, skipped',
        inputFormat: format,
        sourceSize,
        thumb,
      }
    }
    size = targetDimensions(sourceSize, settings.resize)
    // JPEG has no alpha: flatten transparent pixels onto the chosen background.
    const { ctx } = drawScaled(bitmap, size, outputFormat === 'jpeg' ? settings.background : null)
    image = ctx.getImageData(0, 0, size.width, size.height)
  } finally {
    bitmap.close()
  }

  const { encode, fallback } = await getEncoder(outputFormat)
  const keepJpegMetadata = !settings.stripMetadata && format === 'jpeg' && outputFormat === 'jpeg'
  const extraSegments = keepJpegMetadata ? copyableJpegMetadata(bytes) : []
  const encodeAt = async (quality: number) => {
    let data = await encode(image, quality)
    if (extraSegments.length) data = new Uint8Array(insertJpegSegments(data, extraSegments))
    return { data, size: data.length }
  }

  let data: Uint8Array<ArrayBuffer>
  let quality: number | null
  let targetReached = true
  if (settings.targetBytes !== null) {
    let pass = 0
    const search = await searchQualityForTarget(
      async (q) => {
        const result = await encodeAt(q)
        onProgress(Math.min(0.95, ++pass / TARGET_MAX_ITERATIONS))
        return result
      },
      settings.targetBytes,
      // PNG: 100 (lossless) first, then smaller palettes.
      outputFormat === 'png' ? { min: 0, max: 100 } : { min: 1, max: 95 },
    )
    data = search.result.data
    quality = search.quality
    targetReached = search.reached
  } else {
    data = (await encodeAt(settings.quality)).data
    quality = settings.quality
  }

  // Same format at the same size and the output grew: keep the original bytes instead.
  const resized = size.width !== sourceSize.width || size.height !== sourceSize.height
  const keptOriginal = outputFormat === format && !resized && data.length >= bytes.length
  if (keptOriginal) data = settings.stripMetadata ? stripLossless(format, bytes) : bytes

  return {
    kind: 'result',
    blob: new Blob([data], { type: OUTPUT_MIME[outputFormat] }),
    format: outputFormat,
    inputFormat: format,
    size: keptOriginal ? sourceSize : size,
    sourceSize,
    quality: keptOriginal ? null : quality,
    keptOriginal,
    targetReached:
      settings.targetBytes === null || targetReached || data.length <= settings.targetBytes,
    thumb,
    usedFallback: fallback,
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof UserFacingError) return err.message
  const text = err instanceof Error ? `${err.name} ${err.message}` : String(err)
  if (/memory|allocation|RangeError/i.test(text)) {
    return 'Ran out of memory on this image. Try resizing it, or close other tabs.'
  }
  return `Couldn’t compress this image (${err instanceof Error ? err.message : 'unknown error'}).`
}

self.onmessage = (event: MessageEvent<CompressRequest>) => {
  const req = event.data
  compress(req, (value) => post({ jobId: req.jobId, type: 'progress', value }))
    .then((outcome) => post({ jobId: req.jobId, type: 'done', outcome }))
    .catch((err: unknown) => post({ jobId: req.jobId, type: 'error', message: errorMessage(err) }))
}
