import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Props {
  toggleFullScreen?: () => void;
}

export default function ProfileDropdown({ toggleFullScreen }: Props) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // Cierra el dropdown si haces click fuera
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
    <div className="relative  text-left flex" ref={dropdownRef}>
      <button onClick={() => setOpen(!open)} className="focus:outline-none">
        <img
          src="/logoInicio.png" // reemplaza con la ruta de tu foto
          alt="Perfil"
          className="h-7 w-7 rounded-md  border border-transparent object-cover hover:border-[#e5e5e5] hover:bg-[#e5e5e5] bg-white "
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-9 w-44 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="py-2 text-sm text-gray-700">
            <button
              onClick={() => {
                setOpen(false); // Cierra el menú
                toggleFullScreen?.(); // Ejecuta la función si existe
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
            >
              Pantalla Completa
            </button>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
