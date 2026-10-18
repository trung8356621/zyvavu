import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  agentRules: false,
  // Keep aliases ahead of slash normalization so /sitemap/ takes one hop.
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      ...[
        '/sitemap',
        '/sitemap_index.xml',
        '/sitemap-index.xml',
        '/sitemapindex.xml',
        '/wp-sitemap.xml',
        '/site-map.xml',
      ].flatMap((source) => [source, `${source}/`].map((path) => ({
        source: path,
        destination: '/sitemap.xml',
        permanent: true,
      }))),
      { source: '/sitemap.xml/', destination: '/sitemap.xml', permanent: true },
      // Preserve Next.js's default normalization for all remaining routes.
      { source: '/:path+/', destination: '/:path+', permanent: true },
    ]
  },
  allowedDevOrigins: ['zyvavu.test', '127.0.0.1:3107', 'localhost:3107', '127.0.0.1', 'localhost'],
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    webpackConfig.watchOptions = {
      ...webpackConfig.watchOptions,
      ignored: [
        /[\\/]node_modules[\\/]/,
        /[\\/]\.git[\\/]/,
        /[\\/]\.next[\\/]/,
      ],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
