'use client'

import { useEffect, useState } from 'react'
import { Alert, Button, Checkbox, Container, Group, Paper, PasswordInput, Select, Stack, Stepper, Text, TextInput, Title } from '@mantine/core'
import { setupMessages, type SetupLanguage } from '@/lib/installation/messages'
import { validateAdmin, type DatabaseInput, type WebsiteInput } from '@/lib/installation/validation'
import { TIMEZONE_OPTIONS } from '@/lib/dateTime'
import { getAllInstalledThemes } from '@/lib/theme-engine/themes'

export function SetupWizard({ locked = false, maintenance = false }: { locked?: boolean; maintenance?: boolean }) {
  const [language, setLanguage] = useState<SetupLanguage>('vi')
  const [token, setToken] = useState('')
  const [opened, setOpened] = useState(false)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [completed, setCompleted] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [environmentAvailable, setEnvironmentAvailable] = useState(false)
  const [useEnvironment, setUseEnvironment] = useState(false)
  const [database, setDatabase] = useState<DatabaseInput>({ host: '', port: '5432', database: '', username: '', password: '', ssl: 'verify-full' })
  const [admin, setAdmin] = useState({ email: '', password: '' })
  const [website, setWebsite] = useState<WebsiteInput>({ siteName: '', siteUrl: '', language: 'vi', timezone: 'Asia/Ho_Chi_Minh', activeThemeId: 'corporate' })
  const t = setupMessages[language]
  useEffect(() => {
    const saved = localStorage.getItem('zyvavu.setup.language')
    if (saved === 'vi' || saved === 'en') setLanguage(saved)
    setWebsite(value => ({ ...value, siteUrl: window.location.origin }))
  }, [])
  useEffect(() => { document.documentElement.lang = language }, [language])
  async function request(action: string, data = {}) {
    setError(''); setNotice(''); setBusy(true)
    try {
      const response = await fetch('/api/setup', { method: 'POST', headers: { 'content-type': 'application/json', 'x-setup-token': token }, body: JSON.stringify({ action, ...data }) })
      const result = await response.json()
      if (!response.ok) { setError(result.error || 'installationFailed'); return null }
      return result
    } catch { setError('network'); return null }
    finally { setBusy(false) }
  }
  async function resume() {
    const result = await request('resume')
    if (!result) return
    setOpened(true)
    setEnvironmentAvailable(result.environmentAvailable === true)
    setUseEnvironment(result.environmentAvailable === true)
    if (result.website) setWebsite(result.website)
    setProvisioning(result.phase === 'provisioning')
    if (result.phase !== 'started') { setStep(1); setNotice('saved') }
  }
  async function next() {
    if (step === 0) {
      if (await request('database', { database, useEnvironment })) { setDatabase(v => ({ ...v, password: '' })); setStep(1) }
    } else if (step === 1) {
      try { validateAdmin(admin); setError(''); setStep(provisioning ? 3 : 2) }
      catch { setError('adminValidation') }
    } else if (step === 2) {
      if (await request('website', { website })) setStep(3)
    } else {
      if (await request('finish', { admin })) { setCompleted(true); setAdmin({ email: '', password: '' }); setToken('') }
    }
  }
  const errorText = t.errors[error as keyof typeof t.errors] || t.errors.installationFailed
  const labels = [t.database, t.administrator, t.website, t.finish]
  return <Container size="sm" py="xl">
    <Paper p="xl" withBorder>
      <Stack gap="lg">
        <Select label={t.language} value={language} allowDeselect={false} data={[{ value: 'vi', label: t.vi }, { value: 'en', label: t.en }]}
          onChange={value => { const next = value === 'en' ? 'en' : 'vi'; setLanguage(next); localStorage.setItem('zyvavu.setup.language', next) }} />
        <Title order={1}>{maintenance ? t.maintenance : t.title}</Title>
        {maintenance ? <Alert role="alert">{t.maintenanceHelp}</Alert> : locked || completed ? <>
          <Alert role="status">{completed ? t.success : t.installed}</Alert>
          <Group><Button component="a" href="/admin">{t.adminLink}</Button><Button component="a" href="/" variant="default">{t.homeLink}</Button></Group>
        </> : <>
          <Text>{t.intro}</Text>
          {error && <Alert color="red" role="alert">{errorText}</Alert>}
          {notice && <Alert role="status">{t.saved}</Alert>}
          {!opened ? <form onSubmit={event => { event.preventDefault(); void resume() }}>
            <Stack><PasswordInput label={t.token} description={t.tokenHelp} required value={token} onChange={event => setToken(event.currentTarget.value)} visibilityToggleButtonProps={{ 'aria-label': t.passwordToggle }} />
              <Button type="submit" loading={busy}>{t.resume}</Button></Stack>
          </form> : <>
            <Stepper active={step} size="sm" orientation="vertical">{labels.map(label => <Stepper.Step key={label} label={label} />)}</Stepper>
            <form onSubmit={event => { event.preventDefault(); void next() }}>
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
                  <Select label={t.theme} value={website.activeThemeId} allowDeselect={false} data={getAllInstalledThemes().map(theme => ({ value: theme.id, label: t[theme.id as 'corporate' | 'industrial' | 'editorial'] }))} onChange={value => setWebsite({ ...website, activeThemeId: value || 'corporate' })} />
                </>}
                {step === 3 && <><Text>{t.review}</Text><Text fw={600}>{website.siteName} · {website.siteUrl}</Text><Text>{admin.email} · {website.language} · {website.timezone}</Text><Alert>{t.restartHelp}</Alert></>}
                <Group justify="space-between">
                  {step > 0 && <Button variant="default" disabled={busy} onClick={() => setStep(provisioning ? 1 : step - 1)}>{t.back}</Button>}
                  <Button type="submit" loading={busy}>{step === 0 ? t.test : step === 3 ? t.install : t.next}</Button>
                </Group>
              </Stack>
            </form>
          </>}
        </>}
      </Stack>
    </Paper>
  </Container>
}
