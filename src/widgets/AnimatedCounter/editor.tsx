'use client'

import React from 'react'
import type { ComponentConfig } from '@puckeditor/core'
import { AnimatedCounterView } from './AnimatedCounterView'
import type { AnimatedCounterProps } from './frontend'

export const animatedCounterEditor: ComponentConfig<AnimatedCounterProps> = {
  label: 'Animated Counter',
  fields: {
    targetValue: { type: 'number', label: 'Target value' },
    durationMs: { type: 'number', label: 'Duration (ms)', min: 200, max: 10000 },
    prefix: { type: 'text', label: 'Prefix' },
    suffix: { type: 'text', label: 'Suffix' },
    decimals: { type: 'number', label: 'Decimals', min: 0, max: 4 },
    useGrouping: {
      type: 'radio',
      label: 'Thousands separator',
      options: [
        { label: 'On', value: true },
        { label: 'Off', value: false },
      ],
    },
    triggerOnce: {
      type: 'radio',
      label: 'Trigger once',
      options: [
        { label: 'On', value: true },
        { label: 'Off', value: false },
      ],
    },
    label: { type: 'text', label: 'Caption / label' },
  },
  defaultProps: {
    targetValue: 1280,
    durationMs: 1600,
    prefix: '',
    suffix: '+',
    decimals: 0,
    useGrouping: true,
    triggerOnce: true,
    label: '',
  },
  render: (props) => <AnimatedCounterView {...props} previewAnimate />,
}
