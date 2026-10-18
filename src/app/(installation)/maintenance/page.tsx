import { SetupWizard } from '@/components/setup/SetupWizard'
import { cookies } from 'next/headers'

export default async function MaintenancePage() {
  const language = (await cookies()).get('zyvavu-setup-language')?.value === 'en' ? 'en' : 'vi'
  return <SetupWizard maintenance initialLanguage={language} />
}
