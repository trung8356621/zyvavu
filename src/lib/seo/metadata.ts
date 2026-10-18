import type { Metadata } from 'next'
import type { Payload } from 'payload'

import { resolveSeoPageContext } from './context'
import type { SeoPageContext, SeoSiteInfo } from './types'
import { buildAbsoluteUrl } from './utils'

/**
 * Builds root layout default metadata (metadataBase, icons, manifest, feed discovery)
 * without conflicting with per-route canonical/OpenGraph/robots metadata.
 */
export function buildRootLayoutMetadata(site: SeoSiteInfo): Metadata {
  const feedUrl = buildAbsoluteUrl(site.siteUrl, '/feed/')
  return {
    metadataBase: new URL(site.siteUrl),
    title: site.siteName,
    description: site.tagline || site.siteName,
    manifest: site.pwaEnabled ? '/manifest.webmanifest' : undefined,
    icons: {
      icon: site.faviconUrl || '/icon.png',
    },
    alternates: {
      types: {
        'application/rss+xml': [
          {
            url: feedUrl,
            title: `${site.siteName} RSS Feed`,
          },
        ],
      },
    },
  }
}

/**
 * Converts a resolved SeoPageContext into Next.js server-side Metadata.
 * Unavailable contexts omit canonical metadata and use noindex/nofollow.
 * Public noindex documents retain their canonical URL and descriptive metadata.
 */
export function buildNextMetadata(context: SeoPageContext): Metadata {
  const feedUrl = buildAbsoluteUrl(context.site.siteUrl, '/feed/')

  if (context.status !== 'ok' || !context.canonicalUrl) {
    return {
      title: `Not Found — ${context.site.siteName}`,
      description: undefined,
      robots: {
        index: false,
        follow: false,
      },
      alternates: {
        types: {
          'application/rss+xml': [
            {
              url: feedUrl,
              title: `${context.site.siteName} RSS Feed`,
            },
          ],
        },
      },
      openGraph: undefined,
      twitter: undefined,
    }
  }

  const ogImage = context.primaryImage || context.site.logo
  const ogImages = ogImage
    ? [
        {
          url: ogImage.url,
          width: ogImage.width,
          height: ogImage.height,
          alt: ogImage.caption || context.documentTitle,
        },
      ]
    : undefined

  const isArticle = context.resourceType === 'post'

  return {
    title: context.title,
    description: context.description,
    robots: {
      index: context.isIndexable,
      follow: context.isIndexable,
    },
    alternates: {
      canonical: context.canonicalUrl,
      types: {
        'application/rss+xml': [
          {
            url: feedUrl,
            title: `${context.site.siteName} RSS Feed`,
          },
        ],
      },
    },
    openGraph: isArticle
      ? {
          type: 'article',
          title: context.title,
          description: context.description,
          url: context.canonicalUrl,
          siteName: context.site.siteName,
          locale: context.site.language,
          publishedTime: context.publishedAt,
          modifiedTime: context.modifiedAt,
          section: context.post?.categories?.[0]?.title,
          tags:
            context.post?.tags && context.post.tags.length > 0
              ? context.post.tags.map((t) => t.title)
              : undefined,
          images: ogImages,
        }
      : {
          type: 'website',
          title: context.title,
          description: context.description,
          url: context.canonicalUrl,
          siteName: context.site.siteName,
          locale: context.site.language,
          images: ogImages,
        },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: context.title,
      description: context.description,
      images: ogImage ? [ogImage.url] : undefined,
    },
  }
}

/**
 * Resolves SEO Page Context and generates Next.js Metadata for a public route path.
 */
export async function generateRouteMetadata(
  payload: Payload,
  rawPath: string,
): Promise<Metadata> {
  const context = await resolveSeoPageContext(payload, rawPath)
  return buildNextMetadata(context)
}
