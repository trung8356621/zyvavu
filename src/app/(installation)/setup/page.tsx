import { SetupWizard } from '@/components/setup/SetupWizard'
import { installationStatus } from '@/lib/installation/status'
import { getAllInstalledThemes } from '@/lib/theme-engine/themes'
import { cookies, headers } from 'next/headers'
import { normalizeSiteUrl } from '@/lib/site/origin'

export default async function SetupPage() {
  let status
  try { status = await installationStatus() } catch { status = 'DATABASE_UNAVAILABLE' }
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()])
  const language = cookieStore.get('zyvavu-setup-language')?.value === 'en' ? 'en' : 'vi'
  const protocol = requestHeaders.get('x-forwarded-proto') === 'https' ? 'https' : 'http'
  const siteUrl = normalizeSiteUrl(`${protocol}://${requestHeaders.get('host') || ''}`) || ''
  return <SetupWizard initialLanguage={language} initialSiteUrl={siteUrl} environmentAvailable={Boolean(process.env.DATABASE_URL)} locked={status === 'INSTALLED'} maintenance={status === 'DATABASE_UNAVAILABLE'} availableThemes={getAllInstalledThemes().map(theme => ({ value: theme.id, label: theme.label }))} />
}
