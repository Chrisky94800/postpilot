// PostPilot — Tour guidé interactif post-onboarding (Driver.js v2)
// S'affiche une seule fois après le premier accès au dashboard.

import { useEffect } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

interface OnboardingTourProps {
  onDone: () => void
}

export function OnboardingTour({ onDone }: OnboardingTourProps) {
  useEffect(() => {
    const driverObj = driver({
      showProgress: true,
      progressText: '{{current}} sur {{total}}',
      nextBtnText: 'Suivant →',
      prevBtnText: '← Précédent',
      doneBtnText: 'Commencer !',
      popoverClass: 'postpilot-tour',
      steps: [
        {
          element: '#tour-kpi',
          popover: {
            title: 'Vos métriques en un coup d\'oeil',
            description:
              'Retrouvez ici vos publications du mois, les posts restants à rédiger cette semaine et vos performances LinkedIn.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-create-post',
          popover: {
            title: 'Rédigez un post en 30 secondes',
            description:
              'Décrivez votre idée et laissez l\'IA rédiger un post LinkedIn dans votre style.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-create-program',
          popover: {
            title: 'Créez un programme de communication',
            description:
              'Planifiez plusieurs semaines de publications d\'un coup grâce à votre assistant IA.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-nav-calendar',
          popover: {
            title: 'Calendrier éditorial',
            description:
              'Visualisez et gérez tous vos posts planifiés sur une vue mensuelle. Cliquez sur un post pour l\'éditer directement.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-nav-analytics',
          popover: {
            title: 'Suivez vos performances',
            description:
              'Impressions, likes, commentaires, taux d\'engagement — analysez ce qui fonctionne vraiment sur LinkedIn.',
            side: 'right',
            align: 'start',
          },
        },
      ],
      onDestroyStarted: () => {
        onDone()
        driverObj.destroy()
      },
    })

    driverObj.drive()
    return () => driverObj.destroy()
  }, [onDone])

  return null
}
