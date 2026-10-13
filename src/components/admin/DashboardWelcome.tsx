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
    <section className="zyvavu-dashboard" aria-labelledby="zyvavu-dashboard-title">
      <div className="zyvavu-dashboard__intro">
        <span className="zyvavu-dashboard__eyebrow">Zyvavu workspace</span>
        <h1 id="zyvavu-dashboard-title">Create, publish, and keep your site organized.</h1>
        <p>Start with a common task or continue to a content area below.</p>
      </div>

      <nav className="zyvavu-dashboard__actions" aria-label="Quick actions">
        {quickActions.map((action) => (
          <Link className="zyvavu-dashboard__action" href={action.href} key={action.href} prefetch={false}>
            <span>{action.label}</span>
            <small>{action.detail}</small>
          </Link>
        ))}
      </nav>
    </section>
  )
}
