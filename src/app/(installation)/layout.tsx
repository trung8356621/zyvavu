import type { ReactNode } from 'react'
import { ThemeProvider } from '@/components/admin/ThemeProvider'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Zyvavu', robots: { index: false, follow: false } }
export default function InstallationLayout({ children }: { children: ReactNode }) {
  return <html lang="vi"><body style={{ margin: 0 }}><ThemeProvider>{children}</ThemeProvider></body></html>
}
