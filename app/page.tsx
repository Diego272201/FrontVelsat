import AcmeLogo from '@/app/ui/acme-logo';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Login from './components/login/Login';
import './globals.css';
import ButtonAuth from './components/ButtonAuth';

export default function Page() {
  return (
    <div className='scrollbarLogin'>
      <Login></Login>
    </div>
  );
}


