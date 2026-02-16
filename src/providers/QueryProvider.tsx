import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ReactNode } from 'react'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: 1,
            onError: (error) => {
                console.error('[React Query] Mutation error:', error)
            },
        },
    },
})

interface QueryProviderProps {
    children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* React Query DevTools - only available in development */}

        </QueryClientProvider>
    )
}

export { queryClient }

