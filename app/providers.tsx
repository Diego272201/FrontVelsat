// app/providers.tsx //Puede servir para enrutar rutas
'use client'

import {NextUIProvider} from '@nextui-org/react'

export function Providers({children}: { children: React.ReactNode }) {
    return (
    <NextUIProvider>
        {children}
    </NextUIProvider>
    )
}