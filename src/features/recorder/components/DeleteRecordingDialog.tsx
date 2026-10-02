import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { toast } from '@/shared/ui/Toast'

import { useRecorderStore, type SavedRecording } from '../store'

interface DeleteRecordingDialogProps {
  recording: SavedRecording | null
  onClose: () => void
  onDeleted?: (id: string) => void
}

export function DeleteRecordingDialog({
  recording,
  onClose,
  onDeleted,
}: DeleteRecordingDialogProps) {
  const deleteRecording = useRecorderStore((s) => s.deleteRecording)

  const confirm = () => {
    if (recording) {
      void deleteRecording(recording.id)
      onDeleted?.(recording.id)
      toast('Recording deleted')
    }
    onClose()
  }

  return (
    <ConfirmDialog
      open={recording !== null}
      title="Delete recording?"
      description={
        <>
          <span className="font-medium text-fg">{recording?.name}</span> will be permanently removed
          from this browser. This can’t be undone.
        </>
      }
      confirmLabel="Delete"
      tone="danger"
      onConfirm={confirm}
      onCancel={onClose}
    />
  )
}
