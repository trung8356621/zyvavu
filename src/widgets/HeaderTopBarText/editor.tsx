'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { HeaderTopBarTextFrontend, type HeaderTopBarTextProps } from './frontend'

export const headerTopBarTextEditor: ComponentConfig<HeaderTopBarTextProps> = {
  label: 'Top Bar Text',
  fields: {
    text: {
      type: 'text',
      label: 'Announcement or Contact Text',
    },
  },
  defaultProps: {
    text: 'Hotline: 0900.000.000 | Email: contact@zyvavu.com',
  },
  render: (props) => <HeaderTopBarTextFrontend {...props} dataContext={undefined} />,
}
