import { useEffect, useState } from 'react'

const TOUR_KEY = 'postpilot_tour_seen'
const RESTART_KEY = 'postpilot_tour_restart'

export const TOUR_EVENT = 'postpilot:start-tour'

/** Demande le démarrage du tour (fonctionne depuis n'importe quelle page) */
export function requestTourStart() {
  sessionStorage.setItem(RESTART_KEY, '1')
  window.dispatchEvent(new CustomEvent(TOUR_EVENT))
}

export function useOnboardingTour() {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    const start = () => {
      sessionStorage.removeItem(RESTART_KEY)
      const timer = setTimeout(() => setShouldShow(true), 400)
      return timer
    }

    // 1ère visite : pas encore vu le tour
    const seen = localStorage.getItem(TOUR_KEY)
    const forceRestart = sessionStorage.getItem(RESTART_KEY)

    let timer: ReturnType<typeof setTimeout> | undefined
    if (!seen || forceRestart) {
      timer = start()
    }

    // Redémarrage depuis un autre page (event)
    const handleEvent = () => { timer = start() }
    window.addEventListener(TOUR_EVENT, handleEvent)

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener(TOUR_EVENT, handleEvent)
    }
  }, [])

  const markSeen = () => {
    localStorage.setItem(TOUR_KEY, 'true')
    setShouldShow(false)
  }

  return { shouldShow, markSeen }
}
