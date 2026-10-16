'use client'

import React, { useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from '@mantine/core'
import { AlertTriangle, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react'
import type { ColorPreset, ThemeTokens } from '@/lib/theme-engine/types'
import { mapCoolorsPalette, parseCoolorsCsv } from '@/lib/theme-engine/coolors'

export interface CoolorsImportModalProps {
  opened: boolean
  onClose: () => void
  currentTokens: ThemeTokens
  onImportSuccess: (preset: ColorPreset) => void
}

export function CoolorsImportModal({
  opened,
  onClose,
  currentTokens,
  onImportSuccess,
}: CoolorsImportModalProps) {
  const [csvInput, setCsvInput] = useState('')
  const [paletteName, setPaletteName] = useState('')
  const [allowLowContrast, setAllowLowContrast] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Parse CSV whenever input changes
  const parsed = useMemo(() => {
    if (!csvInput.trim()) return null
    return parseCoolorsCsv(csvInput)
  }, [csvInput])

  // Deterministically map colors if exactly 5 valid colors parsed
  const mappingResult = useMemo(() => {
    if (!parsed || !parsed.success || !parsed.colors) return null
    try {
      return mapCoolorsPalette(parsed.colors, currentTokens)
    } catch {
      return null
    }
  }, [parsed, currentTokens])

  const canImport = useMemo(() => {
    if (!mappingResult) return false
    if (!mappingResult.isReadable && !allowLowContrast) return false
    return true
  }, [mappingResult, allowLowContrast])

  const handleResetAndClose = () => {
    setCsvInput('')
    setPaletteName('')
    setAllowLowContrast(false)
    setErrorMsg(null)
    onClose()
  }

  const handleImport = async () => {
    if (!mappingResult) return
    setIsSubmitting(true)
    setErrorMsg(null)

    const finalName = paletteName.trim() || `Coolors Palette ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    const newPreset: ColorPreset = {
      id: `coolors-${Date.now()}`,
      name: finalName,
      isCustom: true,
      colors: mappingResult.colors,
    }

    try {
      const res = await fetch('/api/theme-customizer/custom-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'colors', preset: newPreset }),
      })

      if (res.ok) {
        onImportSuccess(newPreset)
        handleResetAndClose()
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.message || 'Failed to save imported palette.')
      }
    } catch {
      setErrorMsg('Network error saving imported palette.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={handleResetAndClose}
      title={
        <Group gap={6}>
          <Sparkles size={18} color="var(--mantine-color-teal-7, #0e6b66)" />
          <Text fw={700} size="sm">
            Import Color Palette
          </Text>
        </Group>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        {/* Instructions */}
        <Box p="xs" style={{ background: 'var(--mantine-color-gray-0, #f8f9fa)', borderRadius: 6 }}>
          <Text size="xs" fw={600} mb={4}>
            How to import from Coolors:
          </Text>
          <Text size="xs" c="dimmed" component="ol" style={{ paddingLeft: 18, margin: 0 }}>
            <li>Open Coolors generator.</li>
            <li>Choose a palette with 5 colors.</li>
            <li>Select <strong>Export → Code → CSV</strong>.</li>
            <li>Copy the comma-separated CSV colors.</li>
            <li>Paste the CSV code below.</li>
          </Text>
          <Button
            component="a"
            href="https://coolors.co/generate"
            target="_blank"
            rel="noreferrer"
            variant="subtle"
            size="compact-xs"
            color="teal"
            rightSection={<ExternalLink size={12} />}
            mt={6}
          >
            Open Coolors Generator
          </Button>
        </Box>

        {/* CSV Input */}
        <Box>
          <Text size="xs" fw={600} mb={4}>
            Coolors CSV Colors
          </Text>
          <Textarea
            placeholder="e.g. 93827f,f3f9d2,bdc4a7,2f2f2f,92b4a7"
            rows={3}
            value={csvInput}
            onChange={(e) => setCsvInput(e.currentTarget.value)}
            error={parsed && !parsed.success ? parsed.error : undefined}
          />
        </Box>

        {/* Palette Name (Optional) */}
        <TextInput
          size="xs"
          label="Palette Name (Optional)"
          placeholder="e.g. Modern Terracotta"
          value={paletteName}
          onChange={(e) => setPaletteName(e.currentTarget.value)}
        />

        {/* Live Parsed Colors Preview */}
        {parsed?.success && parsed.colors && (
          <Box>
            <Text size="xs" fw={600} mb={6}>
              Parsed Colors
            </Text>
            <Group gap={6}>
              {parsed.colors.map((c, idx) => (
                <Tooltip key={idx} label={c.toUpperCase()} withArrow>
                  <Box
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      backgroundColor: c,
                      border: '1px solid rgba(0,0,0,0.15)',
                    }}
                  />
                </Tooltip>
              ))}
            </Group>
          </Box>
        )}

        {/* Semantic Role Mapping & Contrast Verification */}
        {mappingResult && (
          <Paper withBorder p="xs" radius="sm">
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700}>
                  Semantic Role Mapping:
                </Text>
                <Badge
                  size="xs"
                  color={mappingResult.isReadable ? 'teal' : 'orange'}
                  variant={mappingResult.isReadable ? 'light' : 'filled'}
                >
                  {mappingResult.contrastRatio}:1 {mappingResult.isReadable ? 'AA Pass' : 'Low Contrast'}
                </Badge>
              </Group>

              {/* Roles Breakdown */}
              <Flex gap="xs" wrap="wrap">
                <Box style={{ flex: '1 1 45%' }}>
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                    Main Text
                  </Text>
                  <Group gap={6} align="center">
                    <Box style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: mappingResult.roles.text, border: '1px solid #ccc' }} />
                    <Text size="xs" fw={600}>{mappingResult.roles.text.toUpperCase()}</Text>
                  </Group>
                </Box>
                <Box style={{ flex: '1 1 45%' }}>
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                    Page Background
                  </Text>
                  <Group gap={6} align="center">
                    <Box style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: mappingResult.roles.background, border: '1px solid #ccc' }} />
                    <Text size="xs" fw={600}>{mappingResult.roles.background.toUpperCase()}</Text>
                  </Group>
                </Box>
                <Box style={{ flex: '1 1 30%' }}>
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                    Primary Brand
                  </Text>
                  <Group gap={6} align="center">
                    <Box style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: mappingResult.roles.primary, border: '1px solid #ccc' }} />
                    <Text size="xs" fw={600}>{mappingResult.roles.primary.toUpperCase()}</Text>
                  </Group>
                </Box>
                <Box style={{ flex: '1 1 30%' }}>
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                    Accent Highlight
                  </Text>
                  <Group gap={6} align="center">
                    <Box style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: mappingResult.roles.accent, border: '1px solid #ccc' }} />
                    <Text size="xs" fw={600}>{mappingResult.roles.accent.toUpperCase()}</Text>
                  </Group>
                </Box>
                <Box style={{ flex: '1 1 30%' }}>
                  <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                    Surface / Card
                  </Text>
                  <Group gap={6} align="center">
                    <Box style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: mappingResult.roles.surface, border: '1px solid #ccc' }} />
                    <Text size="xs" fw={600}>{mappingResult.roles.surface.toUpperCase()}</Text>
                  </Group>
                </Box>
              </Flex>

              {/* Low Contrast Warning & Explicit Confirmation */}
              {!mappingResult.isReadable && (
                <Alert color="orange" p="xs" icon={<AlertTriangle size={14} />}>
                  <Text size="xs" mb={4}>
                    {mappingResult.warning || `Contrast ratio between text and background is below 4.5:1 (${mappingResult.contrastRatio}:1).`}
                  </Text>
                  <Checkbox
                    size="xs"
                    label="I confirm importing this low-contrast palette"
                    checked={allowLowContrast}
                    onChange={(e) => setAllowLowContrast(e.currentTarget.checked)}
                  />
                </Alert>
              )}
            </Stack>
          </Paper>
        )}

        {/* Server Error Message */}
        {errorMsg && (
          <Alert color="red" p="xs" withCloseButton onClose={() => setErrorMsg(null)}>
            <Text size="xs">{errorMsg}</Text>
          </Alert>
        )}

        {/* Actions */}
        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="default" size="xs" onClick={handleResetAndClose}>
            Cancel
          </Button>
          <Button
            color="teal"
            size="xs"
            loading={isSubmitting}
            disabled={!canImport}
            leftSection={<Sparkles size={14} />}
            onClick={handleImport}
          >
            Import Palette
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
