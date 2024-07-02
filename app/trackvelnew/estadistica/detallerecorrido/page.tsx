import RequestPageDetail from '@/app/request/mapDetails'
import React from 'react'
import '@/app/styles/trackvelnew.css';

export default function page() {
  if(typeof window !== "undefined"){
  return (
    <div className='trackvelnew'>
        <RequestPageDetail></RequestPageDetail>
    </div>
  )
}
}