import { ArrowRight, CheckCircle2, Download, RotateCcw } from 'lucide-react'

import { formatBytes } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Tag } from '@/shared/ui/Tag'

import { formatClock } from '../lib/files'
import type { ConversionResult as Result } from '../lib/useFfmpegConverter'

interface ConversionResultProps {
  result: Result
  inputBytes: number
  elapsedMs: number
  onConvertAnother: () => void
}

function saveAs(url: string, fileName: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
}

export function ConversionResult({
  result,
  inputBytes,
  elapsedMs,
  onConvertAnother,
}: ConversionResultProps) {
  const change = Math.round(((result.blob.size - inputBytes) / inputBytes) * 100)

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 font-medium text-success" role="status">
        <CheckCircle2 size={20} aria-hidden />
        Converted in {formatClock(elapsedMs)}
      </p>

      <video
        src={result.url}
        controls
        playsInline
        aria-label={`Preview of ${result.fileName}`}
        className="aspect-video w-full rounded-control border border-line bg-black object-contain"
      />

      <div className="flex flex-col gap-3">
        <p className="font-medium break-words">{result.fileName}</p>
        <div className="flex flex-wrap items-center gap-2" aria-label="File size change">
          <Tag mono>{formatBytes(inputBytes)}</Tag>
          <ArrowRight size={14} className="text-muted" aria-hidden />
          <Tag mono tone="ink">
            {formatBytes(result.blob.size)}
          </Tag>
          <span className="text-sm text-muted">
            {change === 0 ? 'same size' : change < 0 ? `${-change}% smaller` : `${change}% larger`}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="primary"
          size="lg"
          icon={<Download size={18} />}
          onClick={() => saveAs(result.url, result.fileName)}
          className="flex-1"
        >
          Download MP4
        </Button>
        <Button
          variant="secondary"
          size="lg"
          icon={<RotateCcw size={18} />}
          onClick={onConvertAnother}
        >
          Convert another
        </Button>
      </div>
    </div>
  )
}
