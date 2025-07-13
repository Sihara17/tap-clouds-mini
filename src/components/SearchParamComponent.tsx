// components/SearchParamComponent.tsx
'use client'

import { useSearchParams } from 'next/navigation'

export function SearchParamComponent() {
  const searchParams = useSearchParams()
  const value = searchParams.get('key')

  return <div>Search: {value}</div>
}
