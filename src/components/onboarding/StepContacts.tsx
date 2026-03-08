// StepContacts.tsx — Étape 5 de l'onboarding : import des connexions LinkedIn
// Étape optionnelle — l'utilisateur peut passer directement au dashboard

import { useState } from 'react'
import { Users } from 'lucide-react'
import LinkedInCSVImport from '@/components/contacts/LinkedInCSVImport'
import type { ParsedContact } from '@/components/contacts/LinkedInCSVImport'

interface StepContactsProps {
  organizationId: string | null
  onImport: (contacts: ParsedContact[]) => Promise<{ imported: number; skipped: number; total: number }>
}

export function StepContacts({ onImport }: StepContactsProps) {
  const [imported, setImported] = useState(0)

  const handleImport = async (contacts: ParsedContact[]) => {
    const result = await onImport(contacts)
    setImported((prev) => prev + result.imported)
    return result
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
          <Users className="h-6 w-6 text-[#0077B5]" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Importez vos connexions</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Mentionnez vos contacts directement dans vos posts LinkedIn en important
          votre carnet d'adresses. Vous pourrez aussi le faire plus tard depuis les Paramètres.
        </p>
        {imported > 0 && (
          <p className="text-sm font-medium text-green-600">
            ✓ {imported} contact{imported > 1 ? 's' : ''} importé{imported > 1 ? 's' : ''}
          </p>
        )}
      </div>

      <LinkedInCSVImport
        existingNames={new Set()}
        onImport={handleImport}
        compact
      />
    </div>
  )
}
