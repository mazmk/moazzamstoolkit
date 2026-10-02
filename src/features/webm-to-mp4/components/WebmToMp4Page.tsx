import { AlertTriangle, FileVideo, RefreshCw } from 'lucide-react'
import { useRef, useState } from 'react'

import { FileDropzone } from '@/shared/ui/FileDropzone'
import { Button } from '@/shared/ui/Button'
import { Panel } from '@/shared/ui/Panel'
import { InlineError } from '@/shared/ui/InlineError'
import { PageHeader } from '@/shared/ui/PageHeader'

import { isResolutionAvailable, type CompressionChoice, type ResolutionChoice } from '../lib/args'
import { LARGE_FILE_BYTES, isWebmFile } from '../lib/files'
import { probeVideo, type ProbedVideo } from '../lib/probe'
import { useFfmpegConverter } from '../lib/useFfmpegConverter'
import { ConversionProgress } from './ConversionProgress'
import { ConversionResult } from './ConversionResult'
import { EngineStatus } from './EngineStatus'
import { QualityPicker } from './QualityPicker'
import { SourceFileCard } from './SourceFileCard'

interface Source {
  file: File
  probe: ProbedVideo | null
  probeFailed: boolean
}

export default function WebmToMp4Page() {
  const { engine, job, convert, cancel, reset, retryLoad } = useFfmpegConverter()
  const [source, setSource] = useState<Source | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [resolution, setResolution] = useState<ResolutionChoice>('original')
  const [compression, setCompression] = useState<CompressionChoice>('balanced')
  const pickTokenRef = useRef(0)

  const dimensions = source?.probe?.dimensions ?? null
  // Fall back to Original if the chosen size is larger than this source.
  const effectiveResolution = isResolutionAvailable(resolution, dimensions)
    ? resolution
    : 'original'
  const converting = job.status === 'converting'

  const pickFile = (files: File[]) => {
    const file = files[0]
    if (!file) return
    if (!isWebmFile(file)) {
      setFileError(`“${file.name}” isn’t a WebM file. Choose a .webm video.`)
      return
    }
    setFileError(null)
    reset()
    const token = ++pickTokenRef.current
    setSource({ file, probe: null, probeFailed: false })
    probeVideo(file)
      .then((probe) => {
        if (token === pickTokenRef.current) setSource({ file, probe, probeFailed: false })
      })
      .catch(() => {
        if (token !== pickTokenRef.current) return
        // The browser couldn't read it, but ffmpeg might — let the user try.
        const probe = { file, durationSec: null, dimensions: null, hasVideo: false }
        setSource({ file, probe, probeFailed: true })
      })
  }

  const removeFile = () => {
    pickTokenRef.current++
    setSource(null)
    reset()
  }

  const startConversion = () => {
    if (!source?.probe) return
    void convert({
      file: source.probe.file,
      fileName: source.file.name,
      durationSec: source.probe.durationSec,
      dimensions: source.probe.dimensions,
      resolution: effectiveResolution,
      compression,
    })
  }

  return (
    <div>
      <PageHeader
        toolId="webm-to-mp4"
        title="WebM to MP4"
        description="Convert browser recordings to MP4 that plays everywhere. Nothing leaves your device."
      />

      <div className="flex flex-col gap-4">
        <Panel className="p-4 sm:p-5">
          <EngineStatus engine={engine} onRetry={retryLoad} />
        </Panel>

        <Panel className="p-4 sm:p-6">
          {source ? (
            <SourceFileCard
              file={source.file}
              probe={source.probe}
              onRemove={removeFile}
              disabled={converting}
            />
          ) : (
            <FileDropzone
              accept=".webm,video/webm"
              onFiles={pickFile}
              title="Drop a WebM video here"
              hint="Or choose one from your device. Files over 500 MB may run out of memory."
              icon={<FileVideo size={24} aria-hidden />}
            />
          )}

          {fileError && <InlineError className="mt-4">{fileError}</InlineError>}

          {source && source.file.size > LARGE_FILE_BYTES && (
            <p className="mt-4 flex items-start gap-2 rounded-control border border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--warning)_7%,transparent)] px-4 py-3 text-sm text-warning">
              <AlertTriangle size={17} className="mt-px shrink-0" aria-hidden />
              This file is over 500 MB. The in-browser converter may run out of memory — a lower
              resolution helps.
            </p>
          )}
          {source?.probeFailed && (
            <p className="mt-4 flex items-start gap-2 rounded-control border border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--warning)_7%,transparent)] px-4 py-3 text-sm text-warning">
              <AlertTriangle size={17} className="mt-px shrink-0" aria-hidden />
              Your browser couldn’t read this video’s details. Conversion may still work, but
              progress will be approximate.
            </p>
          )}
        </Panel>

        {source && job.status !== 'done' && (
          <Panel className="p-4 sm:p-6">
            {converting ? (
              <ConversionProgress
                ratio={job.ratio}
                elapsedMs={job.elapsedMs}
                remainingMs={job.remainingMs}
                waitingForEngine={engine.status !== 'ready'}
                onCancel={cancel}
              />
            ) : (
              <div className="flex flex-col gap-6">
                <QualityPicker
                  source={dimensions}
                  resolution={effectiveResolution}
                  compression={compression}
                  onResolutionChange={setResolution}
                  onCompressionChange={setCompression}
                />

                {job.status === 'error' && (
                  <InlineError>
                    <p>{job.error.message}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      icon={<RefreshCw size={14} />}
                      onClick={startConversion}
                    >
                      Try again
                    </Button>
                  </InlineError>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  onClick={startConversion}
                  disabled={!source.probe || engine.status === 'error'}
                  className="w-full"
                >
                  {source.probe ? 'Convert to MP4' : 'Reading video…'}
                </Button>
              </div>
            )}
          </Panel>
        )}

        {source && job.status === 'done' && (
          <Panel className="p-4 sm:p-6">
            <ConversionResult
              result={job.result}
              inputBytes={source.file.size}
              elapsedMs={job.elapsedMs}
              onConvertAnother={removeFile}
            />
          </Panel>
        )}
      </div>
    </div>
  )
}
