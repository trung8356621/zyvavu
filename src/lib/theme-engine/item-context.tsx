import React, { createContext, useContext } from 'react'

export type LoopItemRecord = {
  id?: string | number
  title: string
  slug?: string
  url?: string
  excerpt?: string
  date?: string
  category?: string
  image?: {
    url?: string
    alt?: string
    width?: number
    height?: number
  }
  raw?: any
}

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
