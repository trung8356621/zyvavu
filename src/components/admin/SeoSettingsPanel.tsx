'use client'

import React, { useMemo, useState } from 'react'
import { Alert, Anchor, Button, Group, List, Select, Stack, Tabs, Text, Textarea, TextInput, Title } from '@mantine/core'

import type { SeoAdminSnapshot } from '@/lib/seo/admin-status'
import { SAME_AS_MAX, validateSeoSettingsInput, type PublisherType } from '@/lib/seo/settings'

function statusLabel(available: boolean, httpStatus: number | null): string {
  if (available) return `Available${httpStatus ? ` (HTTP ${httpStatus})` : ''}`
  if (httpStatus) return `Unavailable (HTTP ${httpStatus})`
  return 'Unavailable'
}

export function SeoSettingsPanel({ snapshot }: { snapshot: SeoAdminSnapshot }) {
  const [homeTitle, setHomeTitle] = useState(snapshot.settings.homeTitle)
  const [homeDescription, setHomeDescription] = useState(snapshot.settings.homeDescription)
  const [publisherType, setPublisherType] = useState<PublisherType>(snapshot.settings.publisherType)
  const [publisherName, setPublisherName] = useState(snapshot.settings.publisherName)
  const [sameAs, setSameAs] = useState<string[]>(snapshot.settings.sameAs)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')

  const dirty = useMemo(() => {
    const initial = snapshot.settings
    return (
      homeTitle !== initial.homeTitle ||
      homeDescription !== initial.homeDescription ||
      publisherType !== initial.publisherType ||
      publisherName !== initial.publisherName ||
      sameAs.join('\n') !== initial.sameAs.join('\n')
    )
  }, [homeDescription, homeTitle, publisherName, publisherType, sameAs, snapshot.settings])

  async function save() {
    const next = {
      homeTitle: homeTitle.trim(),
      homeDescription: homeDescription.trim(),
      publisherType,
      publisherName: publisherName.trim(),
      sameAs: sameAs.map((url) => url.trim()).filter(Boolean),
    }
    const validation = validateSeoSettingsInput(next)
    setErrors(validation)
    if (Object.keys(validation).length > 0) {
      setSaveState('error')
      setSaveMessage('Fix the highlighted fields before saving.')
      return
    }

    setSaveState('saving')
    setSaveMessage('')
    try {
      const response = await fetch('/api/globals/seo-settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...next,
          sameAs: next.sameAs.map((url) => ({ url })),
        }),
      })
      if (!response.ok) {
        setSaveState('error')
        setSaveMessage(response.status === 403 ? 'You do not have permission to save SEO settings.' : 'Save failed.')
        return
      }
      setHomeTitle(next.homeTitle)
      setHomeDescription(next.homeDescription)
      setPublisherName(next.publisherName)
      setSameAs(next.sameAs)
      setSaveState('saved')
      setSaveMessage('Saved.')
    } catch {
      setSaveState('error')
      setSaveMessage('Save failed.')
    }
  }

  const saveControl = (
    <Group justify="space-between">
      <Text size="sm" c={saveState === 'error' ? 'red' : 'dimmed'}>
        {saveState === 'saving' ? 'Saving…' : saveMessage || (dirty ? 'Unsaved changes' : 'No unsaved changes')}
      </Text>
      <Button loading={saveState === 'saving'} onClick={() => void save()}>
        Save
      </Button>
    </Group>
  )

  return (
    <Stack gap="lg">
      <Title order={1} size="h2">
        SEO Settings
      </Title>
      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="appearance">Search appearance</Tabs.Tab>
          <Tabs.Tab value="graph">Knowledge graph</Tabs.Tab>
          <Tabs.Tab value="crawl">Crawl & diagnostics</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Stack gap="sm">
            {snapshot.developmentCrawlBlocked ? (
              <Alert color="yellow" title="Development robots policy">
                robots.txt currently disallows all crawlers. Production allows public crawling and still publishes the sitemap URL.
              </Alert>
            ) : null}
            <Text>
              Public origin:{' '}
              <Anchor href={snapshot.origin} target="_blank" rel="noreferrer">
                {snapshot.origin}
              </Anchor>
            </Text>
            <Text>
              Sitemap:{' '}
              <Anchor href={snapshot.sitemap.url} target="_blank" rel="noreferrer">
                {snapshot.sitemap.url}
              </Anchor>{' '}
              — {statusLabel(snapshot.sitemap.available, snapshot.sitemap.httpStatus)}
            </Text>
            <Text>
              robots.txt:{' '}
              <Anchor href={snapshot.robots.url} target="_blank" rel="noreferrer">
                {snapshot.robots.url}
              </Anchor>{' '}
              — {statusLabel(snapshot.robots.available, snapshot.robots.httpStatus)}. Policy: {snapshot.robots.policy === 'allow' ? 'Allow /' : 'Disallow /'}.
            </Text>
            <Text>
              RSS:{' '}
              <Anchor href={snapshot.feed.url} target="_blank" rel="noreferrer">
                {snapshot.feed.url}
              </Anchor>{' '}
              — {statusLabel(snapshot.feed.available, snapshot.feed.httpStatus)}
            </Text>
            <Text>
              Schema graph adapters: {snapshot.schemaAdapters.join(', ')}. JSON-LD is emitted only for indexable public documents.
            </Text>
            <Text>
              Canonical URL Registry:{' '}
              {snapshot.registry.map((row) => `${row.resourceType} ${row.canonical} canonical, ${row.redirect} redirect`).join('; ')}.
            </Text>
            <Text>
              Site name, tagline, site URL, logo and favicon stay in{' '}
              <Anchor href={snapshot.siteSettingsHref}>Site settings</Anchor>.
            </Text>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="appearance" pt="md">
          <Stack gap="md">
            <TextInput
              label="Homepage SEO title"
              description={`Fallback: ${snapshot.homeFallbackTitle}`}
              value={homeTitle}
              onChange={(event) => {
                setHomeTitle(event.currentTarget.value)
                setSaveState('idle')
              }}
              error={errors.homeTitle}
            />
            <Textarea
              label="Homepage SEO description"
              description={`Fallback: ${snapshot.homeFallbackDescription}`}
              value={homeDescription}
              minRows={3}
              onChange={(event) => {
                setHomeDescription(event.currentTarget.value)
                setSaveState('idle')
              }}
              error={errors.homeDescription}
            />
            <Text size="sm" c="dimmed">
              Leave either field empty to keep the current public homepage title or description.
            </Text>
            {saveControl}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="graph" pt="md">
          <Stack gap="md">
            <Select
              label="Publisher type"
              allowDeselect={false}
              data={[
                { value: 'Organization', label: 'Organization' },
                { value: 'Person', label: 'Person' },
              ]}
              value={publisherType}
              onChange={(value) => {
                setPublisherType(value === 'Person' ? 'Person' : 'Organization')
                setSaveState('idle')
              }}
              error={errors.publisherType}
            />
            <TextInput
              label="Publisher display name"
              description="Empty uses the site name from Site settings."
              value={publisherName}
              onChange={(event) => {
                setPublisherName(event.currentTarget.value)
                setSaveState('idle')
              }}
              error={errors.publisherName}
            />
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Social profile URLs
              </Text>
              {sameAs.map((url, index) => (
                <Group key={index} align="flex-start">
                  <TextInput
                    style={{ flex: 1 }}
                    aria-label={`Profile URL ${index + 1}`}
                    value={url}
                    error={errors[`sameAs.${index}`]}
                    onChange={(event) => {
                      const next = [...sameAs]
                      next[index] = event.currentTarget.value
                      setSameAs(next)
                      setSaveState('idle')
                    }}
                  />
                  <Button
                    variant="default"
                    onClick={() => {
                      setSameAs(sameAs.filter((_, item) => item !== index))
                      setSaveState('idle')
                    }}
                  >
                    Remove
                  </Button>
                </Group>
              ))}
              {errors.sameAs ? (
                <Text size="sm" c="red">
                  {errors.sameAs}
                </Text>
              ) : null}
              <Button
                variant="default"
                disabled={sameAs.length >= SAME_AS_MAX}
                onClick={() => setSameAs([...sameAs, ''])}
              >
                Add profile URL
              </Button>
            </Stack>
            <Text size="sm" c="dimmed">
              Publisher image uses the site logo from Site settings. {snapshot.logoConfigured ? 'A logo is configured.' : 'No logo is configured.'}
            </Text>
            {saveControl}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="crawl" pt="md">
          <Stack gap="sm">
            <Text>Current robots.txt body:</Text>
            <Text component="pre" size="sm">
              {snapshot.robots.excerpt}
            </Text>
            <Text>Sitemap index:</Text>
            {snapshot.sitemap.indexLocs.length > 0 ? (
              <List>
                {snapshot.sitemap.indexLocs.map((loc) => (
                  <List.Item key={loc}>
                    <Anchor href={loc} target="_blank" rel="noreferrer">
                      {loc}
                    </Anchor>
                  </List.Item>
                ))}
              </List>
            ) : (
              <Text c="dimmed">No sitemap groups are currently published.</Text>
            )}
            <Text>
              RSS feed:{' '}
              <Anchor href={snapshot.feed.url} target="_blank" rel="noreferrer">
                {snapshot.feed.url}
              </Anchor>
            </Text>
            <Text>
              Indexability: published public pages, posts, categories and tags with a canonical URL can be indexed. Draft, private, missing, redirect, 404 and noindex documents are excluded from the sitemap and public SEO output.
            </Text>
            <Text>Sitemap publication delay D: not configured. Inclusion follows current indexability. No scheduler is active.</Text>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
