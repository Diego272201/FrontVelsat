import type { Viewport } from 'next';
import Login from './components/login/Login';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#172554',
};

export default function Page() {
  return (
    <div className='scrollbarLogin bg-[#172554]'>
      <Login></Login>
    </div>
  );
}