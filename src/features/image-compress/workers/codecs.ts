import { FORMAT_LABEL, OUTPUT_MIME, type OutputFormat } from '../lib/formats'
import { pngColors } from '../lib/settings'

/**
 * WASM encoders (jSquash: MozJPEG, libwebp, libavif, oxipng), each imported the first time its
 * format is needed. Only single-threaded builds are loaded, so the site needs no COOP/COEP headers;
 * the AVIF and oxipng entry points are bypassed because they would pick a multi-threaded build.
 */

export type Encode = (image: ImageData, quality: number) => Promise<Uint8Array<ArrayBuffer>>

export class UserFacingError extends Error {}

/** libavif speed 0–10: 8 is a few times faster than the default 6 for a slightly larger file. */
const AVIF_SPEED = 8
const OXIPNG_LEVEL = 2

const loaders: Record<OutputFormat, () => Promise<Encode>> = {
  async jpeg() {
    const { default: encode } = await import('@jsquash/jpeg/encode.js')
    return async (image, quality) => new Uint8Array(await encode(image, { quality }))
  },
  async webp() {
    const { default: encode } = await import('@jsquash/webp/encode.js')
    return async (image, quality) => new Uint8Array(await encode(image, { quality }))
  },
  async avif() {
    const [{ default: factory }, { initEmscriptenModule }, { defaultOptions }] = await Promise.all([
      import('@jsquash/avif/codec/enc/avif_enc.js'),
      import('@jsquash/avif/utils.js'),
      import('@jsquash/avif/meta.js'),
    ])
    const module = await initEmscriptenModule(factory)
    return async (image, quality) => {
      const output = module.encode(new Uint8Array(image.data.buffer), image.width, image.height, {
        ...defaultOptions,
        quality,
        speed: AVIF_SPEED,
      })
      if (!output) throw new Error('AVIF encoding failed')
      return new Uint8Array(output)
    }
  },
  async png() {
    const [oxipng, upng] = await Promise.all([
      import('@jsquash/oxipng/codec/pkg/squoosh_oxipng.js'),
      import('upng-js'),
    ])
    await oxipng.default()
    return async (image, quality) => {
      const colors = pngColors(quality)
      if (colors === 0) {
        return new Uint8Array(
          oxipng.optimise_raw(image.data, image.width, image.height, OXIPNG_LEVEL, false, false),
        )
      }
      // Lossy: quantize to a palette (UPNG), then let oxipng pick the best filters and deflate.
      const rgba = image.data.buffer.slice(0)
      const quantized = new Uint8Array(upng.encode([rgba], image.width, image.height, colors))
      return new Uint8Array(oxipng.optimise(quantized, OXIPNG_LEVEL, false, false))
    }
  },
}

/** The browser's own encoder, used when a codec fails to load. Quality is ignored for PNG. */
function canvasEncoder(format: OutputFormat): Encode {
  const mime = OUTPUT_MIME[format]
  return async (image, quality) => {
    const canvas = new OffscreenCanvas(image.width, image.height)
    canvas.getContext('2d')!.putImageData(image, 0, 0)
    const blob = await canvas.convertToBlob({ type: mime, quality: quality / 100 })
    // Browsers silently return PNG for types they can't write (e.g. AVIF everywhere, WebP in Safari).
    if (blob.type !== mime) {
      throw new UserFacingError(
        `The ${FORMAT_LABEL[format]} encoder couldn’t load and this browser can’t write ${FORMAT_LABEL[format]} itself. Try another format.`,
      )
    }
    return new Uint8Array(await blob.arrayBuffer())
  }
}

const cache = new Map<OutputFormat, Promise<Encode | null>>()

export async function getEncoder(
  format: OutputFormat,
): Promise<{ encode: Encode; fallback: boolean }> {
  let loading = cache.get(format)
  if (!loading) {
    loading = loaders[format]().catch((err: unknown) => {
      console.warn(`[image-compress] ${format} codec failed to load; using the canvas encoder`, err)
      return null
    })
    cache.set(format, loading)
  }
  const encode = await loading
  return encode ? { encode, fallback: false } : { encode: canvasEncoder(format), fallback: true }
}
