import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formate une date ISO en date lisible française */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Formate une date ISO en date + heure lisible française */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Retourne un texte relatif ("il y a 3 min", "dans 2 jours") */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const abs = Math.abs(diff)
  const future = diff < 0

  const units: [number, string][] = [
    [60_000, 'minute'],
    [3_600_000, 'heure'],
    [86_400_000, 'jour'],
    [604_800_000, 'semaine'],
    [2_592_000_000, 'mois'],
  ]

  for (const [ms, unit] of units) {
    if (abs < ms * 60 || unit === 'mois') {
      const value = Math.round(abs / ms)
      if (value === 0) return "à l'instant"
      const label = value > 1 && unit !== 'mois' ? `${unit}s` : unit
      return future ? `dans ${value} ${label}` : `il y a ${value} ${label}`
    }
  }
  return formatDate(iso)
}

/** Tronque un texte à N caractères avec ellipse */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}
