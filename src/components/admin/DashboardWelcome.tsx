'use client'

import { Badge, Card, SimpleGrid, Text, Title } from '@mantine/core'
import Link from 'next/link'
import React from 'react'

const quickActions = [
  { href: '/admin/collections/posts/create', label: 'Write a post', detail: 'Create and publish an article' },
  { href: '/admin/collections/pages/create', label: 'Create a page', detail: 'Build a new site page' },
  { href: '/admin/collections/media', label: 'Open media', detail: 'Browse images, video, and files' },
  { href: '/admin/globals/settings', label: 'Site settings', detail: 'Manage identity and reading options' },
]

export function DashboardWelcome() {
  return (
    <section aria-labelledby="zyvavu-dashboard-title" className="zyvavu-dashboard">
      <div className="zyvavu-dashboard__intro">
        <Badge color="brand" size="sm" variant="light">
          Zyvavu workspace
        </Badge>
        <Title id="zyvavu-dashboard-title" mt="xs" order={1}>
          Create, publish, and keep your site organized.
        </Title>
        <Text c="dimmed" mt="xs" size="sm">
          Start with a common task or continue to a content area below.
        </Text>
      </div>

      <SimpleGrid className="zyvavu-dashboard__grid" cols={{ base: 1, sm: 2 }} spacing="sm">
        {quickActions.map((action) => (
          <Card
            className="zyvavu-dashboard__card"
            component={Link}
            href={action.href}
            key={action.href}
            padding="md"
            prefetch={false}
            withBorder
          >
            <Text fw={650} size="sm">
              {action.label}
            </Text>
            <Text c="dimmed" mt={4} size="xs">
              {action.detail}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </section>
  )
}
