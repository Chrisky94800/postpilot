// PostPilot — Onboarding Step 1 : Informations entreprise

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { INDUSTRIES } from '@/lib/constants'

export interface StepCompanyData {
  company_name: string
  description: string
  industry: string
  target_audience: string
}

interface Props {
  data: StepCompanyData
  onChange: (data: Partial<StepCompanyData>) => void
}

export function StepCompany({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Parlez-nous de votre entreprise</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ces informations permettront à l'IA de rédiger des posts parfaitement adaptés à votre marque.
        </p>
      </div>

      <div className="space-y-4">
        {/* Nom de l'entreprise */}
        <div className="space-y-1.5">
          <Label htmlFor="company_name">
            Nom de l'entreprise <span className="text-red-500">*</span>
          </Label>
          <Input
            id="company_name"
            placeholder="ex : Acme Solutions"
            value={data.company_name}
            onChange={(e) => onChange({ company_name: e.target.value })}
            maxLength={100}
          />
        </div>

        {/* Secteur d'activité */}
        <div className="space-y-1.5">
          <Label htmlFor="industry">
            Secteur d'activité <span className="text-red-500">*</span>
          </Label>
          <select
            id="industry"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0077B5]"
            value={data.industry}
            onChange={(e) => onChange({ industry: e.target.value })}
          >
            <option value="">Choisissez votre secteur…</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description">
            Décrivez votre activité <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Expliquez ce que vous faites, comment vous aidez vos clients, votre valeur ajoutée…"
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={4}
            maxLength={1000}
          />
          <p className="text-xs text-gray-400 text-right">{data.description.length}/1000</p>
        </div>

        {/* Audience cible */}
        <div className="space-y-1.5">
          <Label htmlFor="target_audience">
            Audience cible <span className="text-red-500">*</span>
          </Label>
          <Input
            id="target_audience"
            placeholder="ex : Dirigeants de PME, DRH, fondateurs de startups…"
            value={data.target_audience}
            onChange={(e) => onChange({ target_audience: e.target.value })}
            maxLength={200}
          />
          <p className="text-xs text-gray-500">
            Qui lisez-vous sur LinkedIn ? Qui souhaitez-vous atteindre ?
          </p>
        </div>
      </div>
    </div>
  )
}
