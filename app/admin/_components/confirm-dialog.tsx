'use client'

import { useEffect, useId, useRef } from 'react'
import { Button } from '@/components/ui/button'

/**
 * A confirmation modal built on the native <dialog>, which gives focus
 * trapping, Escape-to-close and the top layer without any extra dependency.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmTone = 'default',
  pending,
  onCancel,
  onConfirm,
  children,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  confirmTone?: 'default' | 'destructive'
  pending?: boolean
  onCancel: () => void
  onConfirm: () => void
  children?: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onCancel()
      }}
      onClose={onCancel}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl backdrop:bg-navy-deep/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1.5">
          <h2 id={titleId} className="font-serif text-xl font-medium text-navy-deep">
            {title}
          </h2>
          <p id={descId} className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>

        {children}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" size="lg" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            size="lg"
            variant={confirmTone === 'destructive' ? 'destructive' : 'default'}
            disabled={pending}
            onClick={onConfirm}
            className={
              confirmTone === 'destructive'
                ? undefined
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }
          >
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
