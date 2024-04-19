import SideNav from '../ui/dashboard/sidenav'

import React from 'react'

export default function Layout({children}: {children: React.ReactNode}) {
    return (
    <div className='flex'>
        <div className='flex-grow p-6 md:overflow-y-auto md:p-12'>{children}</div>
    </div>
    )
}
