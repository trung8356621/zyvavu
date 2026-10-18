'use client'

import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Checkbox, Container, Fieldset, Group, Paper, PasswordInput, Select, Stack, Stepper, Text, TextInput, Title } from '@mantine/core'
import { setupMessages, type SetupLanguage } from '@/lib/installation/messages'
import { validateAdmin, type DatabaseInput, type WebsiteInput } from '@/lib/installation/input'
import { TIMEZONE_OPTIONS } from '@/lib/dateTime'
import styles from './SetupWizard.module.css'

export function SetupWizard({ locked = false, maintenance = false, availableThemes = [], initialLanguage = 'vi', initialSiteUrl = '', environmentAvailable = false, initialDatabase }: { locked?: boolean; maintenance?: boolean; availableThemes?: { value: string; label: string }[]; initialLanguage?: SetupLanguage; initialSiteUrl?: string; environmentAvailable?: boolean; initialDatabase?: Partial<Pick<DatabaseInput, 'host' | 'port'>> }) {
  const [language, setLanguage] = useState<SetupLanguage>(initialLanguage)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [completed, setCompleted] = useState(false)
  const [useEnvironment, setUseEnvironment] = useState(environmentAvailable)
  const [database, setDatabase] = useState<DatabaseInput>({ host: initialDatabase?.host ?? '127.0.0.1', port: initialDatabase?.port ?? '5432', database: '', username: '', password: '', ssl: 'verify-full' })
  const [admin, setAdmin] = useState({ email: '', password: '' })
  const [website, setWebsite] = useState<WebsiteInput>({ siteName: '', siteUrl: initialSiteUrl, language: 'vi', timezone: 'Asia/Ho_Chi_Minh', activeThemeId: 'corporate' })
  const t = setupMessages[language]
  useEffect(() => { document.documentElement.lang = language }, [language])
  async function request(action: string, data = {}) {
    if (submitting.current) return null
    submitting.current = true
    setError(''); setNotice(''); setBusy(true)
    try {
      const response = await fetch('/api/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...data }) })
      const result = await response.json()
      if (!response.ok) { setError(result.error || 'installationFailed'); return null }
      return result
    } catch { setError('network'); return null }
    finally { submitting.current = false; setBusy(false) }
  }
  async function next() {
    if (step === 0) {
      const result = await request('database', { database, useEnvironment })
      if (result) {
        setDatabase(v => ({ ...v, password: '' }))
        if (result.website) { setWebsite(result.website); setNotice('saved') }
        setStep(1)
      }
    } else if (step === 1) {
      try { validateAdmin(admin); setError(''); setStep(2) }
      catch { setError('adminValidation') }
    } else if (step === 2) {
      if (await request('website', { website })) setStep(3)
    } else {
      if (await request('finish', { admin })) { setCompleted(true); setAdmin({ email: '', password: '' }) }
    }
  }
  const errorText = t.errors[error as keyof typeof t.errors] || t.errors.installationFailed
  const labels = [t.database, t.administrator, t.website, t.finish]
  return <Container size="sm" py="xl">
    <Paper p="xl" withBorder>
      <Stack gap="lg">
        <Select label={t.language} value={language} allowDeselect={false} data={[{ value: 'vi', label: t.vi }, { value: 'en', label: t.en }]}
          onChange={value => { const next = value === 'en' ? 'en' : 'vi'; setLanguage(next); document.cookie = `zyvavu-setup-language=${next}; Path=/; SameSite=Lax; Max-Age=31536000` }} />
        <Title order={1}>{maintenance ? t.maintenance : t.title}</Title>
        {maintenance ? <Alert role="alert">{t.maintenanceHelp}</Alert> : locked || completed ? <>
          <Alert role="status">{completed ? t.success : t.installed}</Alert>
          <Group><Button component="a" href="/admin">{t.adminLink}</Button><Button component="a" href="/" variant="default">{t.homeLink}</Button></Group>
        </> : <>
          <Text>{t.intro}</Text>
          {error && <Alert color="red" role="alert">{errorText}</Alert>}
          {notice && <Alert role="status">{t.saved}</Alert>}
          {busy && <Text role="status" aria-live="polite">{step === 0 ? t.testing : t.processing}</Text>}
            <Stepper active={step} size="sm" orientation="horizontal" labelPosition="bottom" wrap={false} role="group" tabIndex={0} aria-label={t.progress}
              className={styles.progress} classNames={{ steps: styles.steps, step: styles.step, stepBody: styles.stepBody, stepLabel: styles.stepLabel, separator: styles.separator }}>
              {labels.map((label, index) => <Stepper.Step key={label} label={label} aria-label={label} aria-current={index === step ? 'step' : undefined} />)}
            </Stepper>
            <Text className={styles.currentStep} aria-live="polite">{labels[step]}</Text>
            <form noValidate aria-busy={busy} onSubmit={event => { event.preventDefault(); void next() }}>
              <Fieldset disabled={busy} variant="unstyled" aria-label={labels[step]}>
              <Stack gap="md">
                {step === 0 && <>
                  {environmentAvailable && <Checkbox label={t.useEnvironment} checked={useEnvironment} onChange={event => setUseEnvironment(event.currentTarget.checked)} />}
                  {!useEnvironment && <>
                  {(['host', 'port', 'database', 'username'] as const).map(field => <TextInput key={field} required label={field === 'database' ? t.databaseName : t[field]} value={database[field]} onChange={event => setDatabase({ ...database, [field]: event.currentTarget.value })} inputMode={field === 'port' ? 'numeric' : undefined} />)}
                  <PasswordInput label={t.password} value={database.password} onChange={event => setDatabase({ ...database, password: event.currentTarget.value })} visibilityToggleButtonProps={{ 'aria-label': t.passwordToggle }} />
                  <Select label={t.ssl} description={t.sslHelp} value={database.ssl} allowDeselect={false} data={[{ value: 'verify-full', label: t.sslVerify }, { value: 'disable', label: t.sslDisable }]} onChange={value => setDatabase({ ...database, ssl: value || 'verify-full' })} />
                  </>}
                </>}
                {step === 1 && <>
                  <Text>{t.adminHelp}</Text><TextInput type="email" label={t.email} required value={admin.email} autoComplete="username" onChange={event => setAdmin({ ...admin, email: event.currentTarget.value })} />
                  <PasswordInput label={t.adminPassword} required minLength={12} maxLength={128} value={admin.password} autoComplete="new-password" onChange={event => setAdmin({ ...admin, password: event.currentTarget.value })} visibilityToggleButtonProps={{ 'aria-label': t.passwordToggle }} />
                </>}
                {step === 2 && <>
                  <TextInput label={t.siteName} required maxLength={120} value={website.siteName} onChange={event => setWebsite({ ...website, siteName: event.currentTarget.value })} />
                  <TextInput label={t.siteUrl} required type="url" value={website.siteUrl} onChange={event => setWebsite({ ...website, siteUrl: event.currentTarget.value })} />
                  <Select label={t.siteLanguage} value={website.language} allowDeselect={false} data={[{ value: 'vi', label: t.vi }, { value: 'en', label: t.en }]} onChange={value => setWebsite({ ...website, language: value || 'vi' })} />
                  <Select label={t.timezone} value={website.timezone} allowDeselect={false} data={TIMEZONE_OPTIONS} onChange={value => setWebsite({ ...website, timezone: value || 'Asia/Ho_Chi_Minh' })} />
                  <Select label={t.theme} value={website.activeThemeId} allowDeselect={false} data={availableThemes.map(theme => ({ ...theme, label: t[theme.value as 'corporate' | 'industrial' | 'editorial'] || theme.label }))} onChange={value => setWebsite({ ...website, activeThemeId: value || 'corporate' })} />
                </>}
                {step === 3 && <><Text>{t.review}</Text><Text fw={600}>{website.siteName} · {website.siteUrl}</Text><Text>{admin.email} · {website.language} · {website.timezone}</Text><Alert>{t.restartHelp}</Alert></>}
                <Group justify="space-between">
                  {step > 0 && <Button variant="default" disabled={busy} onClick={() => setStep(step - 1)}>{t.back}</Button>}
                  <Button type="submit" loading={busy}>{step === 0 ? t.test : step === 3 ? t.install : t.next}</Button>
                </Group>
              </Stack>
              </Fieldset>
            </form>
        </>}
      </Stack>
    </Paper>
  </Container>
}
