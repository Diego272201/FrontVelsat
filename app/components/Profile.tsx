import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ImExit } from 'react-icons/im';
import { MdOutlineFullscreen } from 'react-icons/md';
import { BiFullscreen } from 'react-icons/bi';
import { FaUserTie } from 'react-icons/fa';

interface Props {
  toggleFullScreen?: () => void;
}

export default function ProfileDropdown({ toggleFullScreen }: Props) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <div className="relative text-left flex" ref={dropdownRef}>
      <button onClick={() => setOpen(!open)} className="focus:outline-none">
      <div className="relative w-6 h-6  flex justify-center items-center rounded">
  <FaUserTie className="absolute text-[#f8f9fa] hover:text-[#ced4da]" size={20} />
</div>


      </button>

      {open && (
        <div className="absolute z-50 mt-[30px] w-44 bg-[#1C5ED8] shadow-lg ml-[-140px]">
          <div className="text-[12px] text-gray-700">
            <button
              onClick={() => {
                setOpen(false);
                toggleFullScreen?.();
              }}
              className="w-full px-4 py-2 text-left hover:bg-[#FB7B0F] text-[#fff] flex items-center gap-1"
            >
              <BiFullscreen  size={20}/>
              Pantalla Completa
            </button>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left hover:bg-[#FB7B0F] text-[#fff] flex items-center gap-1"
            >
              <ImExit size={20}/>

              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
