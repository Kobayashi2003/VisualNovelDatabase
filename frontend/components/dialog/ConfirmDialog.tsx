import { BaseDialog } from "./BaseDialog"

interface ConfirmDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

export function ConfirmDialog({
  open, setOpen, title, description,
  confirmText = "Confirm", cancelText = "Cancel",
  onConfirm, onCancel, className
}: ConfirmDialogProps) {
  return (
    <BaseDialog open={open} setOpen={setOpen} title={title} className={className}>
      <p className="text-sm text-muted mb-6">{description}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-full text-sm font-medium text-muted hover:text-white border border-white/20 hover:border-white/40 transition-all"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-full text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-all"
        >
          {confirmText}
        </button>
      </div>
    </BaseDialog>
  )
}
