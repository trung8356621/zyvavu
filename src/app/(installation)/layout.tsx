import type { ReactNode } from 'react'
import { ThemeProvider } from '@/components/admin/ThemeProvider'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Zyvavu', robots: { index: false, follow: false } }
export default async function InstallationLayout({ children }: { children: ReactNode }) {
  const language = (await cookies()).get('zyvavu-setup-language')?.value === 'en' ? 'en' : 'vi'
  return <html lang={language}><body style={{ margin: 0 }}><ThemeProvider>{children}</ThemeProvider></body></html>
}
