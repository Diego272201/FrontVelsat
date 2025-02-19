'use client';
import { useSession } from 'next-auth/react';
import React from 'react'

export default function Page() {
    const { data: session } = useSession();
    
    return (
    <div>
        <h1>{session?.user.username.toUpperCase()}</h1>
    </div>
    )
}
