'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string
  label: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setFailed(false)
    } catch {
      // Clipboard access can be blocked; say so rather than silently doing nothing.
      setFailed(true)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={copy}
      aria-label={label}
      className={className}
    >
      {copied ? (
        <>
          <Check className="size-4 text-emerald-600" aria-hidden />
          Copied
        </>
      ) : failed ? (
        'Copy failed'
      ) : (
        <>
          <Copy className="size-4" aria-hidden />
          Copy
        </>
      )}
    </Button>
  )
}
