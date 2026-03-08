// CGU.tsx — Conditions Générales d'Utilisation de PostPilot

import { Link } from 'react-router-dom'

export default function CGU() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link to="/" className="text-[#0077B5] font-semibold text-lg hover:opacity-80">
            ← PostPilot
          </Link>
          <p className="text-sm text-gray-500">Dernière mise à jour : 7 mars 2026</p>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Conditions Générales d'Utilisation
        </h1>
        <p className="text-gray-500 mb-10">
          PostPilot — Service édité par Rocket Solution
        </p>

        <div className="prose prose-gray max-w-none space-y-10">

          {/* Article 1 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Article 1 — Éditeur du service</h2>
            <p className="text-gray-700 leading-relaxed">
              PostPilot est un service édité par <strong>Rocket Solution</strong>, société par actions simplifiée unipersonnelle (SASU) immatriculée au Registre du Commerce et des Sociétés sous le numéro SIRET <strong>98485178200016</strong>, dont le siège social est situé au <strong>13 rue Guynemer, 94800 Villejuif, France</strong>.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              Directeur de la publication : <strong>Christopher Mesquita</strong><br />
              Contact : <a href="mailto:contact@rocket-solution.fr" className="text-[#0077B5] hover:underline">contact@rocket-solution.fr</a>
            </p>
          </section>

          {/* Article 2 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Article 2 — Objet et acceptation</h2>
            <p className="text-gray-700 leading-relaxed">
              Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation du service PostPilot, une plateforme SaaS d'assistance à la rédaction et à la publication de contenus professionnels sur LinkedIn, accessible sur <strong>postpilot.rocket-solution.fr</strong>.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              L'utilisation du service implique l'acceptation pleine et entière des présentes CGU. En cas de désaccord, l'utilisateur est invité à ne pas utiliser le service.
            </p>
          </section>

          {/* Article 3 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Article 3 — Description du service</h2>
            <p className="text-gray-700 leading-relaxed">
              PostPilot est un assistant de communication propulsé par intelligence artificielle qui permet aux professionnels et entreprises de :
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-gray-700">
              <li>Générer et réviser des posts LinkedIn personnalisés à leur marque</li>
              <li>Planifier et publier automatiquement des contenus sur LinkedIn</li>
              <li>Créer des programmes de communication multi-posts</li>
              <li>Analyser les performances de leurs publications</li>
              <li>Gérer leur calendrier éditorial</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              Le service repose sur des modèles d'intelligence artificielle (Claude d'Anthropic) et des outils d'automatisation. Les contenus générés par l'IA sont soumis à validation humaine avant publication.
            </p>
          </section>

          {/* Article 4 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Article 4 — Accès au service et inscription</h2>
            <p className="text-gray-700 leading-relaxed">
              Le service est accessible à toute personne physique ou morale disposant d'un compte LinkedIn valide. L'accès est ouvert à tout public. Les personnes mineures peuvent utiliser le service avec l'accord explicite de leur représentant légal.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              L'inscription nécessite de fournir une adresse email valide et de créer un mot de passe sécurisé. L'utilisateur est responsable de la confidentialité de ses identifiants de connexion et de toutes les actions effectuées depuis son compte.
            </p>
          </section>

          {/* Article 5 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Article 5 — Plans d'abonnement et tarification</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              PostPilot propose les plans tarifaires suivants :
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Plan</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Description</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Engagement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">Gratuit</td>
                    <td className="px-4 py-3 text-gray-700">Fonctionnalités limitées, sans carte bancaire requise</td>
                    <td className="px-4 py-3 text-gray-700">Sans engagement</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">Solo</td>
                    <td className="px-4 py-3 text-gray-700">Pour les indépendants et solopreneurs</td>
                    <td className="px-4 py-3 text-gray-700">Mensuel ou annuel</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">Pro</td>
                    <td className="px-4 py-3 text-gray-700">Pour les équipes et agences</td>
                    <td className="px-4 py-3 text-gray-700">Mensuel ou annuel</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-gray-700 leading-relaxed mt-4">
              Les abonnements <strong>mensuels</strong> sont sans engagement et se renouvellent automatiquement chaque mois. Les abonnements <strong>annuels</strong> sont engagés pour une durée d'un an et se renouvellent automatiquement à l'échéance.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              Le paiement est traité par <strong>Stripe</strong> et prélevé en début de période. Les prix s'entendent hors taxes pour les entreprises assujetties à la TVA, et TTC pour les particuliers.
            </p>
          </section>

          {/* Article 6 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Article 6 — Résiliation et remboursement</h2>
            <p className="text-gray-700 leading-relaxed">
              L'utilisateur peut résilier son abonnement à tout moment depuis les paramètres de son compte. La résiliation prend effet à la fin de la période en cours (mensuelle ou annuelle). L'accès au service reste disponible jusqu'à l'échéance de la période déjà payée.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              <strong>Politique de remboursement :</strong> Aucun remboursement ne sera effectué pour les périodes déjà facturées, qu'il s'agisse d'abonnements mensuels ou annuels. En cas de bug ou dysfonctionnement grave imputable à PostPilot, un geste commercial pourra être accordé au cas par cas sur demande adressée à <a href="mailto:contact@rocket-solution.fr" className="text-[#0077B5] hover:underline">contact@rocket-solution.fr</a>.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation de 14 jours ne s'applique pas aux abonnements SaaS dont l'exécution a commencé avec l'accord de l'utilisateur.
            </p>
          </section>

          {/* Article 7 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Article 7 — Connexion LinkedIn et données tierces</h2>
            <p className="text-gray-700 leading-relaxed">
              Pour publier sur LinkedIn, l'utilisateur doit connecter son compte LinkedIn via le protocole OAuth2. En effectuant cette connexion, l'utilisateur autorise PostPilot à :
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-gray-700">
              <li>Publier des posts en son nom sur LinkedIn</li>
              <li>Collecter les statistiques de performance de ses publications</li>
              <li>Stocker les tokens d'accès OAuth de manière sécurisée dans nos bases de données</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              L'utilisateur reconnaît que l'utilisation de PostPilot est soumise aux{' '}
              <a href="https://www.linkedin.com/legal/user-agreement" target="_blank" rel="noopener noreferrer" className="text-[#0077B5] hover:underline">
                Conditions d'utilisation de LinkedIn
              </a>. Rocket Solution décline toute responsabilité en cas de suspension de compte LinkedIn imputable à une violation des règles de LinkedIn par l'utilisateur.
            </p>
          </section>

          {/* Article 8 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Article 8 — Propriété intellectuelle et contenus</h2>
            <p className="text-gray-700 leading-relaxed">
              L'utilisateur conserve l'intégralité des droits sur les contenus qu'il crée ou valide via PostPilot. Rocket Solution ne revendique aucun droit de propriété sur les posts générés.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              L'utilisateur accorde à Rocket Solution une licence non exclusive et non transférable pour traiter ses données et contenus dans le seul but de fournir le service. Ces données ne sont ni vendues ni utilisées à des fins publicitaires.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              La plateforme PostPilot, son code source, son design et ses algorithmes restent la propriété exclusive de Rocket Solution.
            </p>
          </section>

          {/* Article 9 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Article 9 — Responsabilités et limitations</h2>
            <p className="text-gray-700 leading-relaxed">
              L'utilisateur est seul responsable des contenus publiés en son nom sur LinkedIn. PostPilot est un outil d'assistance ; la validation et la publication finale restent sous la responsabilité de l'utilisateur.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              Rocket Solution s'engage à mettre en œuvre tous les moyens raisonnables pour assurer la disponibilité du service (objectif de disponibilité : 99 %). Toutefois, Rocket Solution ne peut être tenu responsable en cas de :
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-gray-700">
              <li>Interruption du service due à des maintenances planifiées ou incidents techniques</li>
              <li>Défaillance des services tiers (LinkedIn API, Anthropic API, Supabase)</li>
              <li>Contenus générés par l'IA inexacts ou inappropriés (l'utilisateur doit toujours relire avant publication)</li>
              <li>Perte de données due à une cause extérieure</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              La responsabilité de Rocket Solution est limitée au montant des sommes effectivement versées par l'utilisateur au cours des 3 derniers mois précédant le dommage.
            </p>
          </section>

          {/* Article 10 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Article 10 — Comportements interdits</h2>
            <p className="text-gray-700 leading-relaxed">Il est strictement interdit d'utiliser PostPilot pour :</p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-gray-700">
              <li>Publier des contenus illicites, haineux, diffamatoires ou portant atteinte aux droits des tiers</li>
              <li>Automatiser massivement la publication en violation des conditions de LinkedIn</li>
              <li>Tenter d'accéder sans autorisation aux données d'autres utilisateurs</li>
              <li>Utiliser le service à des fins de spam ou de manipulation de l'opinion</li>
              <li>Revendre ou céder l'accès au service à des tiers non autorisés</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              En cas de violation, Rocket Solution se réserve le droit de suspendre ou supprimer le compte sans préavis ni remboursement.
            </p>
          </section>

          {/* Article 11 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Article 11 — Modification des CGU</h2>
            <p className="text-gray-700 leading-relaxed">
              Rocket Solution se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle par email ou notification in-app au moins 15 jours avant l'entrée en vigueur des nouvelles conditions. La poursuite de l'utilisation du service après ce délai vaut acceptation des nouvelles CGU.
            </p>
          </section>

          {/* Article 12 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Article 12 — Loi applicable et litiges</h2>
            <p className="text-gray-700 leading-relaxed">
              Les présentes CGU sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant toute action judiciaire. À défaut d'accord, les tribunaux compétents du ressort de Paris seront seuls compétents.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              Pour toute réclamation : <a href="mailto:contact@rocket-solution.fr" className="text-[#0077B5] hover:underline">contact@rocket-solution.fr</a>
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© 2026 Rocket Solution — Tous droits réservés</p>
          <div className="flex gap-4">
            <Link to="/confidentialite" className="text-[#0077B5] hover:underline">
              Politique de confidentialité
            </Link>
            <Link to="/" className="hover:text-gray-700">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
