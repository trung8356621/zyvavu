import React from 'react'

import type { SchemaGraph } from './types'
import { serializeJsonLd } from './utils'

export function SeoJsonLd({ graph }: { graph: SchemaGraph | null | undefined }) {
  if (!graph || !Array.isArray(graph['@graph']) || graph['@graph'].length === 0) {
    return null
  }

  return (
    <script
      id="zyvavu-seo-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(graph) }}
    />
  )
}
