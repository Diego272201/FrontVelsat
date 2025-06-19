import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ImExit } from 'react-icons/im';
import { BiFullscreen } from 'react-icons/bi';
import { FaUserTie } from 'react-icons/fa';
import Image from 'next/image';

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
    <div className="relative flex text-left" ref={dropdownRef}>
      {/* BOTÓN PRINCIPAL MEJORADO */}
      <button
        onClick={() => setOpen(!open)}
        className="mt-[-1px] bg-blue-700 p-[5px] px-2"
      >
        <div className="relative flex h-6 w-6 items-center justify-center">
                       <Image src="/user.png" alt="Logo" width={25} height={25} />
         

          {/* Indicador de estado activo */}
          <div
            className={`absolute -right-0 -top-0 h-1.5 w-1.5 rounded-full transition-all duration-200 ${
              open
                ? 'bg-orange-500 shadow-lg shadow-orange-500/50'
                : 'bg-green-500 shadow-lg shadow-green-500/50'
            }`}
          >
            <div
              className={`h-full w-full animate-ping rounded-full ${
                open ? 'bg-orange-400' : 'bg-green-400'
              }`}
            ></div>
          </div>
        </div>
      </button>

      {/* DROPDOWN MEJORADO */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 transform overflow-hidden border  bg-white/95 shadow-2xl backdrop-blur-sm transition-all duration-300 ease-out">
          {/* Header del dropdown */}
          <div className="border-b border-slate-200/50 bg-gradient-to-r from-blue-100 to-blue-200 px-4 py-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700">
                <FaUserTie className="text-white" size={14} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Mi Cuenta
                </p>
                <p className="text-xs text-slate-500">Configuración</p>
              </div>
            </div>
          </div>

          {/* Opciones del menú */}
          <div className="py-2">
            <button
              onClick={() => {
                setOpen(false);
                toggleFullScreen?.();
              }}
              className="group flex w-full items-center gap-3 border-l-4 border-transparent px-4 py-3 text-left transition-all duration-200 hover:border-orange-500 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:text-orange-700"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 transition-colors duration-200 group-hover:bg-orange-100">
                <BiFullscreen
                  className="text-slate-600 transition-colors duration-200 group-hover:text-orange-600"
                  size={18}
                />
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-medium text-slate-700 group-hover:text-orange-700">
                  Pantalla Completa
                </p>
                <p className="text-xs text-slate-500 group-hover:text-orange-600">
                  Maximizar ventana
                </p>
              </div>
              <svg
                className="h-4 w-4 text-slate-400 transition-colors duration-200 group-hover:text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Separador */}
            <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

            <button
              onClick={handleLogout}
              className="group flex w-full items-center gap-3 border-l-4 border-transparent px-4 py-3 text-left transition-all duration-200 hover:border-red-500 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 hover:text-red-700"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 transition-colors duration-200 group-hover:bg-red-100">
                <ImExit
                  className="text-slate-600 transition-colors duration-200 group-hover:text-red-600"
                  size={16}
                />
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-medium text-slate-700 group-hover:text-red-700">
                  Cerrar Sesión
                </p>
                <p className="text-xs text-slate-500 group-hover:text-red-600">
                  Salir del sistema
                </p>
              </div>
              <svg
                className="h-4 w-4 text-slate-400 transition-colors duration-200 group-hover:text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>

          {/* Footer opcional */}
          <div className="border-t  bg-orange-400 px-4 py-2">
            <p className="text-center text-xs text-slate-50">V 1.0.0</p>
          </div>
        </div>
      )}
    </div>
  );
}
