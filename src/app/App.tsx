import type { JSX } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { queryClient } from './query'
import { router } from './router'

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
