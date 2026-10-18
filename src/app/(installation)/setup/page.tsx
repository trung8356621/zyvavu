import { SetupWizard } from '@/components/setup/SetupWizard'
import { installationStatus } from '@/lib/installation/status'

export default async function SetupPage() {
  let status
  try { status = await installationStatus() } catch { status = 'DATABASE_UNAVAILABLE' }
  return <SetupWizard locked={status === 'INSTALLED'} maintenance={status === 'DATABASE_UNAVAILABLE'} />
}
