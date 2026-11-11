'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { useItemContext } from '@/lib/theme-engine/item-context'
import { ItemDateFrontend, type ItemDateProps } from './frontend'

function ItemDateEditorPreview(props: ItemDateProps) {
  const contextItem = useItemContext()
  const dataContext =
    props.dataContext ||
    (contextItem ? { type: 'home' as const, item: contextItem } : undefined)
  return <ItemDateFrontend {...props} dataContext={dataContext} />
}

export const itemDateEditor: ComponentConfig<ItemDateProps> = {
  label: 'Item Date',
  fields: {
    prefix: { type: 'text', label: 'Prefix (optional)' },
  },
  defaultProps: {
    prefix: '',
  },
  render: (props: any) => <ItemDateEditorPreview {...(props as any)} />,
}
