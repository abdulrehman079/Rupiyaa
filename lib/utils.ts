import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Recursively remove `undefined` values from objects and arrays.
 * Firebase Realtime Database rejects writes containing `undefined`
 * (it can't represent the absence of a value the way Firestore can).
 */
export function stripUndefined<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      out[k] = stripUndefined(v)
    }
    return out as T
  }
  return value
}
