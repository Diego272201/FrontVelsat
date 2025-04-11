import React from 'react';
import dynamic from 'next/dynamic';

const RequestPage = dynamic(() => import('../request/page'), { ssr: false });
import '@/app/styles/trackvelnew.css';

export default function page() {
    return (
    <div className='trackvelnew'>
        <RequestPage></RequestPage>
    </div>
    )
}
