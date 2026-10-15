'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { Badge, Box, Stack, Text } from '@mantine/core'
import { ShoppingBag } from 'lucide-react'

import { getProductTemplateOptions } from '../../templates/registry'
import type { SortOrderOption } from '../../adapters/types'

export type ProductCategoryListProps = {
  categoryId?: string
  heading?: string
  limit?: number
  sortBy?: SortOrderOption
  templateId?: string
}

function ProductCategoryListRenderer({
  heading,
}: ProductCategoryListProps) {
  return (
    <Box
      className="zyvavu-mega-product-category-list-pending"
      style={{
        padding: '16px',
        boxSizing: 'border-box',
        width: '100%',
        backgroundColor: '#fafbfc',
        border: '1px dashed #cbd5e1',
        borderRadius: '8px',
      }}
    >
      <Stack gap="xs" align="center" style={{ textAlign: 'center' }}>
        <ShoppingBag size={24} color="#94a3b8" />
        <Badge color="gray" variant="light" size="sm">
          Module Unavailable
        </Badge>
        <Text size="xs" fw={600} c="#334155">
          {heading || 'Product Category List'}
        </Text>
        <Text size="xs" c="#64748b" style={{ maxWidth: '380px' }}>
          The Products collection is pending future installation. This block contract and data-source
          adapter are prepared for Phase 2 integration when the E-commerce provider is deployed.
        </Text>
      </Stack>
    </Box>
  )
}

export const ProductCategoryListBlock: ComponentConfig<ProductCategoryListProps> = {
  label: 'Product Category List [Disabled — Products Module Pending]',
  permissions: {
    edit: false,
  },
  fields: {
    heading: {
      type: 'text',
      label: 'Section Heading (Disabled)',
    },
    categoryId: {
      type: 'text',
      label: 'Product Category ID (Disabled)',
    },
    limit: {
      type: 'select',
      label: 'Display Limit (Disabled)',
      options: [
        { label: '3 Products', value: 3 },
        { label: '4 Products', value: 4 },
        { label: '6 Products', value: 6 },
      ],
    },
    templateId: {
      type: 'select',
      label: 'Item Template (Disabled)',
      options: getProductTemplateOptions(),
    },
  },
  defaultProps: {
    heading: 'Featured Products',
    limit: 4,
    templateId: 'default-product-card',
  },
  render: (props) => <ProductCategoryListRenderer {...props} />,
}
