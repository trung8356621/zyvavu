import React from 'react'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { getPayload } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Button, Paper, Stack, Text, Title } from '@mantine/core'
import { ArrowLeft } from 'lucide-react'

import config from '@payload-config'
import { isSiteStaff } from '@/access/roles'
import { MegaMenuBuilder } from './MegaMenuBuilder'

export async function MegaMenuBuilderView(props: AdminViewServerProps) {
  const anyProps = props as Record<string, any>
  const req = props.initPageResult?.req || anyProps.req
  const user = req?.user || anyProps.user
  const payload = req?.payload || anyProps.payload || (await getPayload({ config }))
  const visibleEntities =
    props.initPageResult?.visibleEntities ||
    anyProps.visibleEntities || { collections: {}, globals: {} }

  if (!isSiteStaff(user)) {
    return (
      <div style={{ padding: '24px' }}>
        <p>Forbidden. Mega Menu Builder is limited to site-admin and system-admin.</p>
      </div>
    )
  }

  // Check global feature switch
  let enableMegaMenu = false
  try {
    const settings = await payload.findGlobal({
      slug: 'settings',
      depth: 0,
      overrideAccess: true,
    })
    enableMegaMenu = Boolean((settings as any)?.enableMegaMenu)
  } catch {
    enableMegaMenu = false
  }

  // Extract menuId and itemId from searchParams
  const resolvedSearchParams = props.searchParams
    ? await Promise.resolve(props.searchParams)
    : undefined
  const rawMenuId = resolvedSearchParams?.menuId
  const menuId = Array.isArray(rawMenuId) ? rawMenuId[0] : rawMenuId

  const rawItemId = resolvedSearchParams?.itemId
  const itemId = Array.isArray(rawItemId) ? rawItemId[0] : rawItemId

  let errorContent: React.ReactNode = null

  if (!enableMegaMenu) {
    errorContent = (
      <Paper
        p="xl"
        radius="md"
        withBorder
        style={{
          backgroundColor: 'var(--zyvavu-surface, #ffffff)',
          maxWidth: '600px',
          margin: '40px auto',
        }}
      >
        <Stack gap="md">
          <Title order={2} size="h3" c="red">
            Mega Menu Disabled
          </Title>
          <Text size="sm">
            The Mega Menu feature is currently disabled in Site Settings. Please enable it under
            Settings &gt; Mega Menu before using the visual builder.
          </Text>
          <Button
            component={Link}
            href="/admin/collections/menus"
            variant="light"
            color="gray"
            leftSection={<ArrowLeft size={16} />}
          >
            Back to Menus
          </Button>
        </Stack>
      </Paper>
    )
  } else if (!menuId || menuId === 'create') {
    errorContent = (
      <Paper
        p="xl"
        radius="md"
        withBorder
        style={{
          backgroundColor: 'var(--zyvavu-surface, #ffffff)',
          maxWidth: '600px',
          margin: '40px auto',
        }}
      >
        <Stack gap="md">
          <Title order={2} size="h3" c="orange">
            Menu Save Required
          </Title>
          <Text size="sm">
            No existing menu was specified. Please save the Menu document first before designing its
            Mega Layout.
          </Text>
          <Button
            component={Link}
            href="/admin/collections/menus"
            variant="light"
            color="gray"
            leftSection={<ArrowLeft size={16} />}
          >
            Back to Menus
          </Button>
        </Stack>
      </Paper>
    )
  } else if (!itemId) {
    errorContent = (
      <Paper
        p="xl"
        radius="md"
        withBorder
        style={{
          backgroundColor: 'var(--zyvavu-surface, #ffffff)',
          maxWidth: '600px',
          margin: '40px auto',
        }}
      >
        <Stack gap="md">
          <Title order={2} size="h3" c="orange">
            Menu Item Required
          </Title>
          <Text size="sm">
            No menu item ID was specified. In V4, Mega Menu layouts are configured per-item. Please
            open the Mega Menu Editor from a specific menu item.
          </Text>
          <Button
            component={Link}
            href={`/admin/collections/menus/${menuId}`}
            variant="light"
            color="gray"
            leftSection={<ArrowLeft size={16} />}
          >
            Back to Menu
          </Button>
        </Stack>
      </Paper>
    )
  }

  let menuDoc: any = null
  let itemLabel = ''
  let initialItemLayout: any = null

  if (!errorContent && menuId) {
    try {
      menuDoc = await payload.findByID({
        collection: 'menus',
        id: Number(menuId) || String(menuId),
        depth: 1,
        overrideAccess: false,
        user: user as any,
      })
      if (!menuDoc) {
        throw new Error('Not found')
      }

      const matchingItem = Array.isArray(menuDoc.items)
        ? menuDoc.items.find((i: any) => String(i.id) === String(itemId))
        : null

      itemLabel = matchingItem?.label || `Item ${itemId}`

      // Per-item layout resolution:
      // 1. Check menuDoc.megaLayouts[itemId]
      // 2. Fall back to legacy menuDoc.megaLayout if available
      // 3. Defaults to null (MegaMenuBuilder will generate default document)
      initialItemLayout =
        menuDoc.megaLayouts?.[itemId] ||
        (menuDoc.megaLayout && !menuDoc.megaLayouts?.[itemId] ? menuDoc.megaLayout : null)
    } catch {
      errorContent = (
        <Paper
          p="xl"
          radius="md"
          withBorder
          style={{
            backgroundColor: 'var(--zyvavu-surface, #ffffff)',
            maxWidth: '600px',
            margin: '40px auto',
          }}
        >
          <Stack gap="md">
            <Title order={2} size="h3" c="red">
              Menu Not Found
            </Title>
            <Text size="sm">
              Could not find a menu with ID "{menuId}". It may have been deleted or you do not have
              permission to view it.
            </Text>
            <Button
              component={Link}
              href="/admin/collections/menus"
              variant="light"
              color="gray"
              leftSection={<ArrowLeft size={16} />}
            >
              Back to Menus
            </Button>
          </Stack>
        </Paper>
      )
    }
  }

  return (
    <DefaultTemplate
      {...props}
      payload={payload}
      req={req}
      user={user}
      visibleEntities={visibleEntities}
    >
      <div
        style={{
          width: '100%',
          height: 'calc(100vh - 60px)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {errorContent || (
          <MegaMenuBuilder
            menuId={menuId!}
            itemId={itemId!}
            itemLabel={itemLabel}
            menuName={menuDoc?.name || 'Untitled Menu'}
            initialMegaLayout={initialItemLayout}
            existingMegaLayouts={menuDoc?.megaLayouts || {}}
            existingMobileMenu={menuDoc?.mobileMenu}
          />
        )}
      </div>
    </DefaultTemplate>
  )
}
