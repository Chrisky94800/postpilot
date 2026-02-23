// PostPilot — Page Landing (publique)
// Sprint 5 : landing page complète avec pricing, features, CTA.

import { Link } from 'react-router-dom'
import { ArrowRight, Linkedin, Zap, Clock, BarChart2, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SUBSCRIPTION_PLANS } from '@/lib/constants'

const FEATURES = [
  {
    icon: Zap,
    title: 'Rédaction IA en 30 secondes',
    description:
      "Décrivez votre idée, l'IA rédige un post LinkedIn percutant adapté à votre marque.",
  },
  {
    icon: Clock,
    title: 'Publication automatique',
    description:
      'Programmez vos posts et publiez directement sur LinkedIn sans quitter PostPilot.',
  },
  {
    icon: BarChart2,
    title: 'Analytics intégrés',
    description:
      'Suivez likes, commentaires et impressions. Identifiez ce qui performe.',
  },
  {
    icon: Shield,
    title: 'Votre voix, amplifiée',
    description:
      "L'IA apprend votre style et votre secteur. Chaque post sonne comme vous.",
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-[#0077B5] rounded-lg flex items-center justify-center">
              <Linkedin className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">PostPilot</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Connexion
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="bg-[#0077B5] hover:bg-[#005885]">
                Commencer gratuitement
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <Badge className="mb-6 bg-blue-50 text-blue-700 border-blue-200">
          Agent IA LinkedIn pour les TPE
        </Badge>
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6 max-w-3xl mx-auto">
          Publiez sur LinkedIn{' '}
          <span className="text-[#0077B5]">sans y penser</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          PostPilot génère vos posts LinkedIn en 30 secondes, dans votre style,
          et les publie automatiquement. Concentrez-vous sur votre métier.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/login">
            <Button size="lg" className="bg-[#0077B5] hover:bg-[#005885] h-12 px-8">
              Démarrer gratuitement
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <p className="text-sm text-gray-500">Aucune carte bancaire requise</p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Tout ce dont vous avez besoin
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-white p-6 rounded-xl border">
                <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-[#0077B5]" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — Sprint 5 : intégration Stripe */}
      <section className="py-20 max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          Tarifs simples et transparents
        </h2>
        <p className="text-center text-gray-600 mb-12">Sans engagement, résiliable à tout moment</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
            <div
              key={key}
              className={`rounded-xl border p-8 ${
                key === 'pro' ? 'border-[#0077B5] shadow-lg' : ''
              }`}
            >
              {key === 'pro' && (
                <Badge className="mb-4 bg-[#0077B5] text-white">Populaire</Badge>
              )}
              <h3 className="text-xl font-bold text-gray-900">{plan.label}</h3>
              <p className="text-3xl font-extrabold text-gray-900 mt-2 mb-6">
                {plan.price}
              </p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/login">
                <Button
                  className={`w-full ${
                    key === 'pro'
                      ? 'bg-[#0077B5] hover:bg-[#005885] text-white'
                      : ''
                  }`}
                  variant={key === 'pro' ? 'default' : 'outline'}
                >
                  Choisir {plan.label}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} PostPilot. Tous droits réservés.</p>
      </footer>
    </div>
  )
}
