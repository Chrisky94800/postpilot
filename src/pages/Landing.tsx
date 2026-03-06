// PostPilot — Page Landing (publique)
// Design moderne : hero gradient mesh, social proof, features avec icônes colorées, pricing amélioré.

import { Link } from 'react-router-dom'
import { ArrowRight, Zap, Clock, BarChart2, Shield, Check, Sparkles, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SUBSCRIPTION_PLANS } from '@/lib/constants'

const FEATURES = [
  {
    icon: Zap,
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Rédaction IA en 30 secondes',
    description:
      "Décrivez votre idée, l'IA rédige un post LinkedIn percutant adapté à votre marque et votre secteur.",
  },
  {
    icon: Clock,
    color: 'from-violet-500 to-violet-600',
    bg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    title: 'Publication automatique',
    description:
      'Programmez vos posts et publiez directement sur LinkedIn sans jamais quitter PostPilot.',
  },
  {
    icon: BarChart2,
    color: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'Analytics intégrés',
    description:
      'Suivez likes, commentaires et impressions. Identifiez ce qui performe vraiment.',
  },
  {
    icon: Shield,
    color: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'Votre voix, amplifiée',
    description:
      "L'IA apprend votre style et votre secteur. Chaque post sonne authentiquement comme vous.",
  },
]

const SOCIAL_PROOF = [
  { stat: '2 400+', label: 'posts publiés' },
  { stat: '98%', label: 'satisfaction' },
  { stat: '3×', label: 'plus d\'engagement' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-gradient-to-br from-[#0077B5] to-[#005885] rounded-lg flex items-center justify-center shadow-sm">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">PostPilot</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Tarifs</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                Connexion
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="bg-gradient-to-r from-[#0077B5] to-[#005885] hover:from-[#005885] hover:to-[#004a73] text-white shadow-sm">
                Commencer gratuitement
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────────── */}
      <section className="hero-gradient relative pt-20 pb-24 overflow-hidden">
        {/* Décorations de fond */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-b from-blue-100/40 to-transparent blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            Agent IA LinkedIn pour les TPE &amp; indépendants
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-6">
            Publiez sur LinkedIn{' '}
            <span className="text-gradient">sans y penser</span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            PostPilot génère vos posts LinkedIn en 30 secondes, dans votre style,
            et les publie automatiquement. Concentrez-vous sur votre métier.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <Link to="/login">
              <Button size="lg" className="bg-gradient-to-r from-[#0077B5] to-[#005885] hover:from-[#005885] hover:to-[#004a73] text-white h-12 px-8 shadow-lg shadow-blue-200 text-base font-semibold">
                Démarrer gratuitement
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-gray-400 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              Aucune carte bancaire requise
            </p>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-8 sm:gap-12">
            {SOCIAL_PROOF.map(({ stat, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-extrabold text-gray-900">{stat}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gray-50/60">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-50 text-blue-700 border-blue-100 font-medium">
              Fonctionnalités
            </Badge>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Une suite complète pour votre présence LinkedIn, sans la complexité.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm card-hover"
              >
                <div className={`h-11 w-11 ${feature.bg} rounded-xl flex items-center justify-center mb-5`}>
                  <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-[15px]">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bandeau conviction ─────────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-[#0077B5] to-[#7C3AED]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TrendingUp className="h-6 w-6 text-white/80" />
            <span className="text-white/80 font-medium">Résultats mesurables</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Nos utilisateurs publient 3× plus,<br />avec 2× moins d'efforts
          </h2>
          <p className="text-white/70 max-w-lg mx-auto">
            En automatisant la rédaction et la publication, PostPilot libère en moyenne 4h par semaine.
          </p>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-violet-50 text-violet-700 border-violet-100 font-medium">
            Tarifs
          </Badge>
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Simple et transparent
          </h2>
          <p className="text-gray-500 flex items-center justify-center gap-1.5">
            <Users className="h-4 w-4" />
            Sans engagement · résiliable à tout moment
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
            <div
              key={key}
              className={`relative rounded-2xl p-8 transition-all ${
                key === 'pro'
                  ? 'bg-gradient-to-b from-[#0077B5] to-[#005885] shadow-xl shadow-blue-200 scale-[1.03]'
                  : 'bg-white border border-gray-100 shadow-sm card-hover'
              }`}
            >
              {key === 'pro' && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-amber-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                    ⭐ Populaire
                  </span>
                </div>
              )}

              <h3 className={`text-lg font-bold mb-1 ${key === 'pro' ? 'text-white' : 'text-gray-900'}`}>
                {plan.label}
              </h3>
              <p className={`text-4xl font-extrabold mt-3 mb-6 tracking-tight ${key === 'pro' ? 'text-white' : 'text-gray-900'}`}>
                {plan.price}
              </p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2.5 text-sm ${key === 'pro' ? 'text-white/90' : 'text-gray-600'}`}>
                    <Check className={`h-4 w-4 mt-0.5 shrink-0 ${key === 'pro' ? 'text-white' : 'text-emerald-500'}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to="/login">
                <Button
                  className={`w-full font-semibold ${
                    key === 'pro'
                      ? 'bg-white text-[#0077B5] hover:bg-gray-50'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  Choisir {plan.label}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Prêt à gagner du temps ?
          </h2>
          <p className="text-gray-500 mb-8 text-lg">
            Rejoignez les entrepreneurs qui automatisent leur LinkedIn avec PostPilot.
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-gradient-to-r from-[#0077B5] to-[#005885] hover:from-[#005885] hover:to-[#004a73] text-white h-12 px-10 shadow-lg shadow-blue-200 font-semibold">
              Démarrer gratuitement
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-gradient-to-br from-[#0077B5] to-[#005885] rounded-md flex items-center justify-center">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">PostPilot</span>
          </div>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} PostPilot. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
