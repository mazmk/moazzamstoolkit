import { useEffect, useRef } from 'react'

interface StreamVideoProps {
  stream: MediaStream
  mirrored?: boolean
  className?: string
}

/** A muted <video> bound to a live MediaStream (React can't set srcObject declaratively). */
export function StreamVideo({ stream, mirrored = false, className = '' }: StreamVideoProps) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream])

  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className={`${mirrored ? '-scale-x-100' : ''} ${className}`}
    />
  )
}
