import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  EncodedAudioPacketSource,
  EncodedPacketSink,
  EncodedVideoPacketSource,
  Input,
  Output,
  WebMOutputFormat,
  type EncodedPacket,
  type InputAudioTrack,
  type InputVideoTrack,
} from 'mediabunny'

/**
 * Combines a video-only and an audio-only WebM into one file by copying the encoded packets —
 * no re-encoding, so it's fast and lossless. Packets are interleaved by timestamp as they're written.
 */
export async function muxWebm(
  video: Blob,
  audio: Blob | null,
  /** Overrides the frame size in the container header (see videoWriter). */
  size?: { width: number; height: number },
): Promise<Blob> {
  const videoInput = new Input({ formats: ALL_FORMATS, source: new BlobSource(video) })
  const audioInput = audio
    ? new Input({ formats: ALL_FORMATS, source: new BlobSource(audio) })
    : null

  try {
    const videoTrack = await videoInput.getPrimaryVideoTrack()
    if (!videoTrack?.codec) throw new Error('The video stream could not be read.')
    const audioTrack = audioInput ? await audioInput.getPrimaryAudioTrack() : null

    const output = new Output({ format: new WebMOutputFormat(), target: new BufferTarget() })
    const videoSource = new EncodedVideoPacketSource(videoTrack.codec)
    output.addVideoTrack(videoSource)

    let audioSource: EncodedAudioPacketSource | null = null
    if (audioTrack?.codec) {
      audioSource = new EncodedAudioPacketSource(audioTrack.codec)
      output.addAudioTrack(audioSource)
    }

    await output.start()
    await interleave(
      videoWriter(videoTrack, videoSource, size),
      audioTrack && audioSource ? audioWriter(audioTrack, audioSource) : null,
    )
    await output.finalize()

    const buffer = output.target.buffer
    if (!buffer) throw new Error('Muxing produced no output.')
    return new Blob([buffer], { type: 'video/webm' })
  } finally {
    videoInput.dispose()
    audioInput?.dispose()
  }
}

interface TrackWriter {
  packets: AsyncIterator<EncodedPacket>
  write: (packet: EncodedPacket) => Promise<void>
}

// The first packet of each track must carry its decoder config so the muxer can write the codec header.
// Loom reuses the top rendition's init segment for every quality, so a 720p stream arrives with a
// 1080p header. Players decode the real size from the bitstream, but the file metadata would lie.
function videoWriter(
  track: InputVideoTrack,
  source: EncodedVideoPacketSource,
  size?: { width: number; height: number },
): TrackWriter {
  let config: Promise<VideoDecoderConfig | null> | null = track
    .getDecoderConfig()
    .then((c) => (c && size ? { ...c, codedWidth: size.width, codedHeight: size.height } : c))
  return {
    packets: new EncodedPacketSink(track).packets(),
    write: async (packet) => {
      if (!config) return source.add(packet)
      const decoderConfig = await config
      config = null
      return source.add(packet, decoderConfig ? { decoderConfig } : undefined)
    },
  }
}

function audioWriter(track: InputAudioTrack, source: EncodedAudioPacketSource): TrackWriter {
  let config: Promise<AudioDecoderConfig | null> | null = track.getDecoderConfig()
  return {
    packets: new EncodedPacketSink(track).packets(),
    write: async (packet) => {
      if (!config) return source.add(packet)
      const decoderConfig = await config
      config = null
      return source.add(packet, decoderConfig ? { decoderConfig } : undefined)
    },
  }
}

async function interleave(a: TrackWriter, b: TrackWriter | null) {
  let nextA = await a.packets.next()
  let nextB = b ? await b.packets.next() : null

  while (!nextA.done || (nextB && !nextB.done)) {
    const takeA =
      !nextA.done && (!nextB || nextB.done || nextA.value.timestamp <= nextB.value.timestamp)
    if (takeA && !nextA.done) {
      await a.write(nextA.value)
      nextA = await a.packets.next()
    } else if (b && nextB && !nextB.done) {
      await b.write(nextB.value)
      nextB = await b.packets.next()
    }
  }
}
