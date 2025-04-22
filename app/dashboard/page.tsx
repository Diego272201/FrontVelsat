'use client';

import Profile from '../components/Profile';

export default function page() {
  return (
    <div className='flex bg-red-300'>
      Dasboard
      <div className='ml-20 bg-red-800'>
        <Profile></Profile>
      </div>
    </div>
  );
}
