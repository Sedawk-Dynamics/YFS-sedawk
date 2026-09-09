'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Fields never written to browser storage.
 *
 * Passwords are excluded outright. File inputs cannot be restored anyway — the
 * browser will not let a page set a file input's value — so the applicant must
 * re-attach documents after a reload.
 */
const NEVER_PERSIST = new Set([
  'password',
  'confirmPassword',
  'panCard',
  'aadhaarFront',
  'aadhaarBack',
  'photograph',
  'addressProof',
  'cheque',
])

export type Draft = Record<string, string>

/**
 * Keeps the registration form's typed values in sessionStorage so a failed
 * submit, an accidental reload or a back-navigation does not throw the whole
 * application away.
 *
 * sessionStorage rather than localStorage: the draft contains KYC and bank
 * details, so it should not outlive the tab. It is cleared on success.
 */
export function useFormDraft(storageKey: string) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [restored, setRestored] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Read once on mount. Storage can throw in private modes, so never assume it.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw) setDraft(JSON.parse(raw) as Draft)
    } catch {
      // No draft is a perfectly good outcome.
    } finally {
      setRestored(true)
    }
  }, [storageKey])

  const save = useCallback(
    (form: HTMLFormElement) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      // Coalesce keystrokes so we are not serialising on every character.
      saveTimer.current = setTimeout(() => {
        try {
          const values: Draft = {}
          for (const [name, value] of new FormData(form).entries()) {
            if (NEVER_PERSIST.has(name)) continue
            if (typeof value !== 'string') continue
            if (value === '') continue
            values[name] = value
          }
          sessionStorage.setItem(storageKey, JSON.stringify(values))
        } catch {
          // Storage full or blocked — losing the draft is preferable to
          // breaking the form.
        }
      }, 300)
    },
    [storageKey],
  )

  /** Reads the saved values back synchronously, for restoring after a reset. */
  const readSaved = useCallback((): Draft | null => {
    try {
      const raw = sessionStorage.getItem(storageKey)
      return raw ? (JSON.parse(raw) as Draft) : null
    } catch {
      return null
    }
  }, [storageKey])

  const clear = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    try {
      sessionStorage.removeItem(storageKey)
    } catch {
      // Nothing to do.
    }
    setDraft(null)
  }, [storageKey])

  return { draft, restored, save, clear, readSaved }
}

/** Writes saved values back into a form's uncontrolled inputs. */
export function applyDraft(form: HTMLFormElement, draft: Draft) {
  for (const [name, value] of Object.entries(draft)) {
    const field = form.elements.namedItem(name)

    if (field instanceof HTMLInputElement) {
      if (field.type === 'file') continue
      if (field.type === 'checkbox') {
        field.checked = value === 'on'
        continue
      }
      if (field.type === 'radio') continue // handled by React state
      field.value = value
      continue
    }

    if (field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
      field.value = value
    }
  }
}
