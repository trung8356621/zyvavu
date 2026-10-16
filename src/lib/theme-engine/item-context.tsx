'use client'

import React, { createContext, useContext } from 'react'
import type { LoopItemRecord } from './types'

export type { LoopItemRecord }

export const ItemContext = createContext<LoopItemRecord | null>(null)

export function useItemContext(): LoopItemRecord | null {
  return useContext(ItemContext)
}

export function ItemContextProvider({
  item,
  children,
}: {
  item: LoopItemRecord | null
  children: React.ReactNode
}) {
  return <ItemContext.Provider value={item}>{children}</ItemContext.Provider>
}
