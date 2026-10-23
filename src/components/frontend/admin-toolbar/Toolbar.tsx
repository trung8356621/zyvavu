'use client'

import { useState } from 'react'
import { Avatar, Button, MantineProvider, Menu, Text } from '@mantine/core'
import { ChevronDown, LayoutDashboard, LogOut, Menu as MenuIcon, Paintbrush, Pencil, Plus, UserRound } from 'lucide-react'
import { adminMantineTheme } from '@/theme/mantineTheme'
import theme from '@/theme/theme.json'
import { ADMIN_OVERLAY_LAYERS } from '@/theme/layers'
import type { ToolbarData, ToolbarLink } from '@/lib/frontend-toolbar/model'
import { logoutToolbarSession } from '@/lib/frontend-toolbar/client'

import '@mantine/core/styles/UnstyledButton.css'
import '@mantine/core/styles/Button.css'
import '@mantine/core/styles/Loader.css'
import '@mantine/core/styles/Avatar.css'
import '@mantine/core/styles/Popover.css'
import '@mantine/core/styles/Menu.css'
import '@mantine/core/styles/Text.css'
import styles from './toolbar.module.css'

const rootId = 'zyvavu-frontend-admin-toolbar'
const getRootElement = () => document.getElementById(rootId) || undefined
const menuProps = { withinPortal: false, zIndex: ADMIN_OVERLAY_LAYERS.FRONTEND_TOOLBAR + 1, position: 'bottom-start' as const }

export default function Toolbar({ data, onLogout }: { data: ToolbarData; onLogout: () => void }) {
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState('')
  const logout = async () => {
    setLoggingOut(true)
    setError('')
    try {
      await logoutToolbarSession(data.logout)
      onLogout()
      window.location.reload()
    } catch {
      setError('Could not log out. Please try again.')
      setLoggingOut(false)
    }
  }
  const menuLink = (link: ToolbarLink) => (
    <Menu.Item key={link.href} component="a" href={link.href}>{link.label}</Menu.Item>
  )

  return (
    <div id={rootId} className={styles.root} data-frontend-admin-toolbar style={{ color: theme.admin.surface }}>
      <MantineProvider
        theme={adminMantineTheme} forceColorScheme="dark" getRootElement={getRootElement}
        cssVariablesSelector={`#${rootId}`} deduplicateCssVariables={false} withGlobalClasses={false}
      >
        <nav aria-label="Frontend administration" className={styles.bar}
          style={{ background: theme.admin.sidebar, zIndex: ADMIN_OVERLAY_LAYERS.FRONTEND_TOOLBAR }}>
          <Button component="a" href={data.dashboard} size="sm" variant="subtle" color="gray"
            className={styles.action} leftSection={<LayoutDashboard size={16} aria-hidden />}>
            Zyvavu
          </Button>
          <div className={styles.desktop}>
            {data.edit && <Button component="a" href={data.edit.href} size="sm" variant="subtle" color="gray"
              className={styles.action} leftSection={<Pencil size={16} aria-hidden />}>{data.edit.label}</Button>}
            {data.design && <Button component="a" href={data.design.href} size="sm" variant="subtle" color="gray"
              className={styles.action} leftSection={<Paintbrush size={16} aria-hidden />}>{data.design.label}</Button>}
            {data.create.length > 0 && <Menu {...menuProps}>
              <Menu.Target><Button size="sm" variant="subtle" color="gray" className={styles.action}
                leftSection={<Plus size={16} aria-hidden />} rightSection={<ChevronDown size={12} aria-hidden />}>New</Button></Menu.Target>
              <Menu.Dropdown>{data.create.map(menuLink)}</Menu.Dropdown>
            </Menu>}
          </div>
          <div className={styles.mobile}>
            <Menu {...menuProps}>
              <Menu.Target><Button size="sm" variant="subtle" color="gray" className={styles.action}
                aria-label="Editing actions" leftSection={<MenuIcon size={16} aria-hidden />}>Edit</Button></Menu.Target>
              <Menu.Dropdown>
                {data.edit && menuLink(data.edit)}
                {data.design && menuLink(data.design)}
                {data.create.length > 0 && <Menu.Label>New</Menu.Label>}
                {data.create.map((link) => menuLink({ ...link, label: `New ${link.label}` }))}
              </Menu.Dropdown>
            </Menu>
          </div>
          <div className={styles.account}>
            <Menu {...menuProps} position="bottom-end" width={240}>
              <Menu.Target><Button size="sm" variant="subtle" color="gray" className={styles.action}
                aria-label={`Account: ${data.displayName}`} leftSection={<Avatar size="sm" radius="xl" color="gray">{data.displayName.split(' ').map((word) => word[0]).join('')}</Avatar>}
                rightSection={<ChevronDown size={12} aria-hidden />}>
                <span className={styles.userName}>{data.displayName}</span>
              </Button></Menu.Target>
              <Menu.Dropdown>
                <Menu.Item component="a" href={data.profile} leftSection={<UserRound size={16} aria-hidden />}>Profile</Menu.Item>
                <Menu.Item component="a" href={data.dashboard} leftSection={<LayoutDashboard size={16} aria-hidden />}>Dashboard</Menu.Item>
                <Menu.Divider />
                <Menu.Item onClick={logout} disabled={loggingOut} closeMenuOnClick={false}
                  leftSection={<LogOut size={16} aria-hidden />}>{loggingOut ? 'Logging out…' : 'Log out'}</Menu.Item>
                {error && <Text size="sm" p="sm" role="alert">{error}</Text>}
              </Menu.Dropdown>
            </Menu>
          </div>
        </nav>
      </MantineProvider>
    </div>
  )
}
