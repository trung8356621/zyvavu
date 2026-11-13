import React from 'react'
import type { ThemeDataContext } from '@/lib/theme-engine/types'
import type { UniversalStyle } from '@/lib/style-engine/types'
import { AnimatedCounterView } from './AnimatedCounterView'

export type AnimatedCounterProps = {
  id?: string
  targetValue?: number
  durationMs?: number
  prefix?: string
  suffix?: string
  decimals?: number
  useGrouping?: boolean
  triggerOnce?: boolean
  label?: string
  style?: UniversalStyle
  dataContext?: ThemeDataContext
}

/**
 * SSR: render the final formatted value to avoid hydration mismatch.
 * Client view upgrades to count-up when it mounts.
 */
export function AnimatedCounterFrontend(props: AnimatedCounterProps) {
  return <AnimatedCounterView {...props} />
}
