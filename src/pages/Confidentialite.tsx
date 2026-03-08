// Confidentialite.tsx — Politique de Confidentialité de PostPilot (RGPD)

import { Link } from 'react-router-dom'

export default function Confidentialite() {
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
          Politique de Confidentialité
        </h1>
        <p className="text-gray-500 mb-10">
          PostPilot — Conforme au Règlement Général sur la Protection des Données (RGPD)
        </p>

        <div className="space-y-10">

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Responsable du traitement</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-gray-700">
              <p><strong>Rocket Solution</strong> — SASU</p>
              <p>SIRET : 98485178200016</p>
              <p>13 rue Guynemer, 94800 Villejuif, France</p>
              <p>Représentant légal : Christopher Mesquita</p>
              <p>Contact DPO : <a href="mailto:contact@rocket-solution.fr" className="text-[#0077B5] hover:underline">contact@rocket-solution.fr</a></p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Données collectées</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              PostPilot collecte uniquement les données nécessaires au fonctionnement du service :
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Type de donnée</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Finalité</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Base légale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-gray-900 font-medium">Adresse email</td>
                    <td className="px-4 py-3 text-gray-700">Création de compte, authentification, notifications</td>
                    <td className="px-4 py-3 text-gray-700">Exécution du contrat</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-900 font-medium">Nom / Prénom</td>
                    <td className="px-4 py-3 text-gray-700">Personnalisation du service</td>
                    <td className="px-4 py-3 text-gray-700">Exécution du contrat</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-900 font-medium">Contenu des posts</td>
                    <td className="px-4 py-3 text-gray-700">Génération et publication des posts LinkedIn</td>
                    <td className="px-4 py-3 text-gray-700">Exécution du contrat</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-900 font-medium">Tokens OAuth LinkedIn</td>
                    <td className="px-4 py-3 text-gray-700">Publication automatique sur LinkedIn</td>
                    <td className="px-4 py-3 text-gray-700">Consentement explicite (connexion LinkedIn)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-900 font-medium">Profil de marque</td>
                    <td className="px-4 py-3 text-gray-700">Personnalisation IA (ton, style, mots-clés)</td>
                    <td className="px-4 py-3 text-gray-700">Exécution du contrat</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-900 font-medium">Données d'usage (analytics)</td>
                    <td className="px-4 py-3 text-gray-700">Amélioration du service, statistiques</td>
                    <td className="px-4 py-3 text-gray-700">Intérêt légitime</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800">
              <strong>Nous ne collectons pas :</strong> numéros de carte bancaire (gérés directement par Stripe), données de santé, données biométriques, ni aucune donnée sensible au sens du RGPD.
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Hébergement et localisation des données</h2>
            <p className="text-gray-700 leading-relaxed">
              Vos données sont hébergées en <strong>Europe</strong> par les prestataires suivants :
            </p>
            <ul className="mt-3 space-y-3">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#0077B5] flex-shrink-0"></span>
                <div>
                  <p className="text-gray-900 font-medium">Supabase (base de données, authentification, stockage)</p>
                  <p className="text-gray-600 text-sm">Hébergé sur AWS Europe (région eu-west-1, Irlande)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#0077B5] flex-shrink-0"></span>
                <div>
                  <p className="text-gray-900 font-medium">Vercel (hébergement de l'application web)</p>
                  <p className="text-gray-600 text-sm">Serveurs en Europe, CDN mondial pour les assets statiques</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#0077B5] flex-shrink-0"></span>
                <div>
                  <p className="text-gray-900 font-medium">Anthropic Claude API (traitement IA des posts)</p>
                  <p className="text-gray-600 text-sm">Serveurs aux États-Unis — transfert encadré par des clauses contractuelles types (CCT)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#0077B5] flex-shrink-0"></span>
                <div>
                  <p className="text-gray-900 font-medium">Stripe (paiement)</p>
                  <p className="text-gray-600 text-sm">Prestataire certifié PCI-DSS — les données bancaires ne transitent pas par nos serveurs</p>
                </div>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Durée de conservation</h2>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Donnée</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Durée de conservation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Données de compte (email, nom)</td>
                    <td className="px-4 py-3 text-gray-700">Durée de vie du compte + 3 ans après suppression</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Posts et contenus</td>
                    <td className="px-4 py-3 text-gray-700">Durée de vie du compte + 1 an après suppression</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Tokens OAuth LinkedIn</td>
                    <td className="px-4 py-3 text-gray-700">Jusqu'à déconnexion du compte LinkedIn ou suppression du compte</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Données de facturation</td>
                    <td className="px-4 py-3 text-gray-700">10 ans (obligation légale comptable)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Logs techniques</td>
                    <td className="px-4 py-3 text-gray-700">12 mois maximum</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cookies et traceurs</h2>
            <p className="text-gray-700 leading-relaxed">
              PostPilot utilise des cookies et technologies de traçage pour les finalités suivantes :
            </p>
            <ul className="mt-3 space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="font-medium text-gray-900 min-w-fit">Cookies essentiels :</span>
                <span>nécessaires au fonctionnement de l'application (session d'authentification, préférences). Pas de consentement requis.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-gray-900 min-w-fit">Google Analytics :</span>
                <span>mesure d'audience anonymisée (pages vues, sources de trafic, comportement utilisateur). Soumis à votre consentement via notre bannière cookies.</span>
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              Vous pouvez gérer vos préférences cookies à tout moment depuis le bandeau affiché lors de votre première visite ou via les paramètres de votre navigateur.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Communications par email</h2>
            <p className="text-gray-700 leading-relaxed">
              PostPilot vous envoie deux types d'emails :
            </p>
            <ul className="mt-3 space-y-3 text-gray-700">
              <li>
                <span className="font-medium text-gray-900">Emails transactionnels</span> : notifications de publication, alertes de dysfonctionnement, confirmation de paiement. Ces emails sont nécessaires à l'exécution du service et ne peuvent pas être désactivés.
              </li>
              <li>
                <span className="font-medium text-gray-900">Emails marketing</span> : nouveautés, conseils LinkedIn, offres promotionnelles. Envoyés uniquement avec votre consentement. Vous pouvez vous désabonner à tout moment via le lien présent dans chaque email ou depuis les paramètres de votre compte.
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Partage des données</h2>
            <p className="text-gray-700 leading-relaxed">
              <strong>Nous ne vendons jamais vos données personnelles.</strong> Vos données sont uniquement partagées avec :
            </p>
            <ul className="mt-3 space-y-2 text-gray-700 list-disc list-inside">
              <li>Nos sous-traitants techniques (Supabase, Vercel, n8n, Anthropic) dans le cadre strict de la fourniture du service</li>
              <li>LinkedIn, lors de la publication de vos posts via leur API</li>
              <li>Stripe, pour le traitement de vos paiements</li>
              <li>Les autorités légalement habilitées, sur demande judiciaire</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              Tous nos sous-traitants sont liés par des accords de traitement de données (DPA) conformes au RGPD.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Vos droits (RGPD)</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Conformément au RGPD (articles 15 à 22), vous disposez des droits suivants sur vos données personnelles :
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { droit: "Droit d'accès", desc: 'Obtenir une copie de vos données' },
                { droit: 'Droit de rectification', desc: 'Corriger vos données inexactes' },
                { droit: "Droit à l'effacement", desc: 'Supprimer votre compte et données' },
                { droit: 'Droit à la portabilité', desc: 'Exporter vos données (format JSON/CSV)' },
                { droit: "Droit d'opposition", desc: "S'opposer au traitement pour prospection" },
                { droit: 'Droit de limitation', desc: 'Suspendre temporairement un traitement' },
              ].map(({ droit, desc }) => (
                <div key={droit} className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="font-semibold text-gray-900 text-sm">{droit}</p>
                  <p className="text-gray-600 text-sm mt-1">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-700 leading-relaxed mt-4">
              Pour exercer ces droits, contactez-nous à{' '}
              <a href="mailto:contact@rocket-solution.fr" className="text-[#0077B5] hover:underline">
                contact@rocket-solution.fr
              </a>{' '}
              avec une preuve d'identité. Nous nous engageons à répondre dans un délai de <strong>30 jours</strong>.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              En cas de réponse insatisfaisante, vous pouvez introduire une réclamation auprès de la{' '}
              <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" className="text-[#0077B5] hover:underline">
                CNIL (Commission Nationale de l'Informatique et des Libertés)
              </a>.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Sécurité des données</h2>
            <p className="text-gray-700 leading-relaxed">
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles adaptées :
            </p>
            <ul className="mt-3 space-y-2 text-gray-700 list-disc list-inside">
              <li>Chiffrement des communications en transit (HTTPS/TLS)</li>
              <li>Chiffrement des données au repos chez nos hébergeurs</li>
              <li>Row Level Security (RLS) : chaque organisation n'accède qu'à ses propres données</li>
              <li>Tokens LinkedIn stockés de manière sécurisée dans Supabase</li>
              <li>Authentification multi-facteurs disponible</li>
              <li>Revue régulière des accès et permissions</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              En cas de violation de données susceptible d'engendrer un risque pour vos droits et libertés, nous vous en informerons dans les 72 heures conformément à l'article 33 du RGPD.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Intelligence artificielle</h2>
            <p className="text-gray-700 leading-relaxed">
              PostPilot utilise l'API Claude d'Anthropic pour générer et réviser vos posts. Vos contenus (posts, profil de marque, documents uploadés) sont transmis à Anthropic pour le traitement IA. Anthropic s'engage à ne pas utiliser ces données pour entraîner ses modèles sans consentement explicite.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              Tous les contenus générés par l'IA sont soumis à votre validation avant publication. Aucune publication automatique n'a lieu sans votre approbation préalable.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Mineurs</h2>
            <p className="text-gray-700 leading-relaxed">
              PostPilot est accessible aux personnes mineures sous réserve de l'accord de leur représentant légal. Nous ne collectons pas sciemment de données personnelles relatives à des enfants de moins de 13 ans. Si vous êtes le parent ou tuteur d'un mineur ayant utilisé notre service sans votre consentement, contactez-nous pour procéder à la suppression des données concernées.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Modifications de cette politique</h2>
            <p className="text-gray-700 leading-relaxed">
              Nous pouvons mettre à jour cette politique de confidentialité périodiquement. Toute modification substantielle sera notifiée par email ou par une bannière dans l'application au moins 15 jours avant son entrée en vigueur. La date de dernière mise à jour est indiquée en haut de cette page.
            </p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Contact</h2>
            <p className="text-gray-700 leading-relaxed">
              Pour toute question relative à cette politique ou à l'exercice de vos droits :
            </p>
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-700">
              <p><strong>Rocket Solution</strong></p>
              <p>13 rue Guynemer, 94800 Villejuif, France</p>
              <p>Email : <a href="mailto:contact@rocket-solution.fr" className="text-[#0077B5] hover:underline">contact@rocket-solution.fr</a></p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© 2026 Rocket Solution — Tous droits réservés</p>
          <div className="flex gap-4">
            <Link to="/cgu" className="text-[#0077B5] hover:underline">
              Conditions générales d'utilisation
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
