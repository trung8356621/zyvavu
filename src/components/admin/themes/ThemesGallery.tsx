'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Flex,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  Layers,
  Palette,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import type { InstalledTheme } from '@/lib/theme-engine/themes'

export type ThemesGalleryProps = {
  installedThemes: InstalledTheme[]
  initialActiveThemeId: string
}

export function ThemesGallery({
  installedThemes,
  initialActiveThemeId,
}: ThemesGalleryProps) {
  const [activeThemeId, setActiveThemeId] = useState<string>(initialActiveThemeId)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [confirmTheme, setConfirmTheme] = useState<InstalledTheme | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleActivate = async (theme: InstalledTheme) => {
    setActivatingId(theme.id)
    setFeedback(null)
    setConfirmTheme(null)

    try {
      const res = await fetch('/api/themes/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: theme.id }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setActiveThemeId(theme.id)
        setFeedback({
          type: 'success',
          message: `Theme "${theme.label}" has been activated site-wide! Public requests will now render with this theme.`,
        })
      } else {
        setFeedback({
          type: 'error',
          message: data.message || 'Failed to activate theme.',
        })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error activating theme.' })
    } finally {
      setActivatingId(null)
    }
  }

  const handleLivePreview = async (theme: InstalledTheme) => {
    try {
      // Set secure staff preview cookie
      await fetch('/api/themes/preview-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: theme.id }),
      })
      // Open frontend in new tab
      window.open(`/?preview_theme=${encodeURIComponent(theme.id)}`, '_blank')
    } catch {
      window.open(`/?preview_theme=${encodeURIComponent(theme.id)}`, '_blank')
    }
  }

  return (
    <Box p="xl" style={{ maxWidth: 1280, margin: '0 auto', width: '100%' }}>
      {/* Header bar */}
      <Paper p="lg" radius="md" withBorder mb="xl" bg="var(--mantine-color-body, #ffffff)">
        <Flex justify="space-between" align="center" wrap="wrap" gap="md">
          <Stack gap={4}>
            <Group gap="xs" align="center">
              <Palette size={22} color="var(--mantine-color-primary, #0e6b66)" />
              <Title order={2} size="h3" fw={700}>
                Installed Themes
              </Title>
            </Group>
            <Text size="sm" c="dimmed">
              Manage installed themes. Exactly one theme is active site-wide at any time.
            </Text>
          </Stack>

          <Group gap="sm">
            <Badge size="lg" color="teal" variant="light" leftSection={<Check size={14} />}>
              Active:{' '}
              {installedThemes.find((t) => t.id === activeThemeId)?.label || activeThemeId}
            </Badge>
            <Button
              component={Link}
              href={`/admin/theme-customizer?theme=${activeThemeId}`}
              variant="default"
              size="sm"
              leftSection={<Palette size={14} />}
            >
              Customize Active Styles
            </Button>
          </Group>
        </Flex>
      </Paper>

      {/* Feedback banner */}
      {feedback && (
        <Alert
          mb="xl"
          icon={feedback.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
          color={feedback.type === 'success' ? 'teal' : 'red'}
          withCloseButton
          onClose={() => setFeedback(null)}
        >
          {feedback.message}
        </Alert>
      )}

      {/* Theme Cards Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {installedThemes.map((theme) => {
          const isActive = theme.id === activeThemeId
          const preview = theme.preview

          return (
            <Card
              key={theme.id}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderColor: isActive ? 'var(--mantine-color-teal-6, #0e6b66)' : undefined,
                borderWidth: isActive ? 2 : 1,
                position: 'relative',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              {/* Top Visual Mockup Preview */}
              <Box
                mb="md"
                style={{
                  height: 180,
                  borderRadius: 6,
                  border: '1px solid var(--mantine-color-default-border, #e5e7eb)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: preview.background,
                  boxShadow: 'inset 0 0 12px rgba(0,0,0,0.03)',
                }}
              >
                {/* Header Mockup */}
                <Box
                  p="xs"
                  style={{
                    backgroundColor: preview.headerBackground,
                    borderBottom: '1px solid var(--mantine-color-default-border, #e5e7eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Group gap={6}>
                    <Box
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: preview.primary,
                      }}
                    />
                    <Text size="xs" fw={700} style={{ color: preview.headerText }}>
                      {theme.label.toUpperCase()}
                    </Text>
                  </Group>
                  <Group gap={4}>
                    <Box style={{ width: 24, height: 4, borderRadius: 2, backgroundColor: preview.headerText, opacity: 0.4 }} />
                    <Box style={{ width: 24, height: 4, borderRadius: 2, backgroundColor: preview.headerText, opacity: 0.4 }} />
                  </Group>
                </Box>

                {/* Hero / Body Mockup */}
                <Box p="md" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Box
                    style={{
                      height: 12,
                      width: '75%',
                      borderRadius: 3,
                      backgroundColor: preview.primary,
                      marginBottom: 8,
                    }}
                  />
                  <Box
                    style={{
                      height: 8,
                      width: '90%',
                      borderRadius: 2,
                      backgroundColor: preview.text,
                      opacity: 0.25,
                      marginBottom: 6,
                    }}
                  />
                  <Box
                    style={{
                      height: 8,
                      width: '60%',
                      borderRadius: 2,
                      backgroundColor: preview.text,
                      opacity: 0.25,
                      marginBottom: 12,
                    }}
                  />

                  {/* Button badge simulation */}
                  <Group gap={6}>
                    <Box
                      style={{
                        padding: '4px 10px',
                        borderRadius: 3,
                        backgroundColor: preview.primary,
                        color: '#ffffff',
                        fontSize: '9px',
                        fontWeight: 600,
                      }}
                    >
                      Action Button
                    </Box>
                    <Box
                      style={{
                        padding: '4px 10px',
                        borderRadius: 3,
                        border: `1px solid ${preview.accent}`,
                        color: preview.accent,
                        fontSize: '9px',
                        fontWeight: 600,
                      }}
                    >
                      Accent Slot
                    </Box>
                  </Group>
                </Box>
              </Box>

              {/* Title & Badge */}
              <Flex justify="space-between" align="flex-start" mb="xs">
                <div>
                  <Title order={4} size="h5" fw={700}>
                    {theme.label}
                  </Title>
                  <Text size="xs" c="dimmed">
                    ID: <code>{theme.id}</code> • v{theme.version}
                  </Text>
                </div>
                {isActive ? (
                  <Badge color="teal" variant="filled" size="sm">
                    Active Theme
                  </Badge>
                ) : (
                  <Badge color="gray" variant="light" size="sm">
                    Installed
                  </Badge>
                )}
              </Flex>

              {/* Description */}
              <Text size="xs" c="dimmed" mb="md" style={{ flex: 1, minHeight: 36, lineHeight: 1.5 }}>
                {theme.description}
              </Text>

              {/* Color Swatches Strip */}
              <Group gap={6} mb="md">
                <Text size="xs" fw={600} c="dimmed">
                  Palette:
                </Text>
                {[
                  preview.primary,
                  preview.accent,
                  preview.headerBackground,
                  preview.surface,
                  preview.text,
                ].map((color, i) => (
                  <Tooltip key={i} label={color} withArrow>
                    <Box
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 3,
                        backgroundColor: color,
                        border: '1px solid rgba(0,0,0,0.15)',
                      }}
                    />
                  </Tooltip>
                ))}
              </Group>

              <Divider mb="md" />

              {/* Action Buttons */}
              <Stack gap="xs">
                {isActive ? (
                  <>
                    <Button
                      component={Link}
                      href={`/admin/theme-customizer?theme=${theme.id}`}
                      variant="filled"
                      color="teal"
                      fullWidth
                      leftSection={<Palette size={14} />}
                    >
                      Customize Styles
                    </Button>
                    <Button
                      component={Link}
                      href={`/admin/theme-builder?theme=${theme.id}`}
                      variant="default"
                      fullWidth
                      leftSection={<Layers size={14} />}
                    >
                      Edit Templates
                    </Button>
                  </>
                ) : (
                  <>
                    <Group grow gap="xs">
                      <Button
                        variant="filled"
                        color="teal"
                        loading={activatingId === theme.id}
                        onClick={() => setConfirmTheme(theme)}
                        leftSection={<Check size={14} />}
                      >
                        Activate
                      </Button>
                      <Button
                        variant="light"
                        color="blue"
                        onClick={() => handleLivePreview(theme)}
                        leftSection={<Eye size={14} />}
                      >
                        Live Preview
                      </Button>
                    </Group>
                    <Group grow gap="xs">
                      <Button
                        component={Link}
                        href={`/admin/theme-customizer?theme=${theme.id}`}
                        variant="subtle"
                        size="compact-sm"
                        leftSection={<Palette size={12} />}
                      >
                        Customize
                      </Button>
                      <Button
                        component={Link}
                        href={`/admin/theme-builder?theme=${theme.id}`}
                        variant="subtle"
                        size="compact-sm"
                        leftSection={<Layers size={12} />}
                      >
                        Templates
                      </Button>
                    </Group>
                  </>
                )}
              </Stack>
            </Card>
          )
        })}
      </SimpleGrid>

      {/* Confirmation Modal for Theme Activation */}
      <Modal
        opened={Boolean(confirmTheme)}
        onClose={() => setConfirmTheme(null)}
        title={
          <Group gap="xs">
            <Sparkles size={18} color="var(--mantine-color-teal-6, #0e6b66)" />
            <Text fw={700}>Activate Theme</Text>
          </Group>
        }
        centered
      >
        {confirmTheme && (
          <Stack gap="md">
            <Text size="sm">
              Are you sure you want to activate <strong>{confirmTheme.label}</strong> site-wide?
            </Text>
            <Paper p="sm" withBorder bg="var(--mantine-color-gray-0, #f9fafb)" radius="sm">
              <Text size="xs" c="dimmed">
                • Public frontend visitors will immediately see the layout and styles of{' '}
                <strong>{confirmTheme.label}</strong>.<br />
                • Posts, Pages, URLs, Categories, and Menus remain shared and intact.<br />
                • Your previous theme customizations and templates are preserved and will not be overwritten.
              </Text>
            </Paper>
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={() => setConfirmTheme(null)}>
                Cancel
              </Button>
              <Button
                color="teal"
                loading={activatingId === confirmTheme.id}
                onClick={() => handleActivate(confirmTheme)}
              >
                Confirm & Activate
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  )
}
