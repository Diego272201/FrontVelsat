import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ImExit } from 'react-icons/im';
import { BiFullscreen } from 'react-icons/bi';
import { FaUserTie } from 'react-icons/fa';
import { FiSettings } from 'react-icons/fi';
import Image from 'next/image';
import SettingsModal from './settings/SettingsModal';
import type { SettingsSectionId } from './settings/types';
import NewsAnnouncer from './announcements/NewsAnnouncer';

// Opción "Configuración" oculta temporalmente para producción.
// Para volver a mostrarla, cambiar a true (el modal y su código siguen intactos).
const SHOW_SETTINGS_OPTION = true;

/**
 * Otras partes de la app piden abrir la Configuración con el evento
 * "trackvel:open-settings" ({ section }). El menú se monta dos veces en la barra
 * (móvil oculto + escritorio): solo la primera instancia lo atiende, para no abrir dos paneles.
 */
let openSettingsOwner: number | null = null;
let nextProfileId = 1;

interface Props {
  toggleFullScreen?: () => void;
}

export default function ProfileDropdown({ toggleFullScreen }: Props) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId>('cuenta');

  const openSettings = (section: SettingsSectionId) => {
    setSettingsSection(section);
    setSettingsOpen(true);
  };

  const profileIdRef = useRef(0);
  if (profileIdRef.current === 0) profileIdRef.current = nextProfileId++;
  useEffect(() => {
    const id = profileIdRef.current;
    if (openSettingsOwner === null) openSettingsOwner = id;
    const onOpen = (e: Event) => {
      if (openSettingsOwner !== id) return;
      const section = (e as CustomEvent<{ section?: SettingsSectionId }>).detail?.section ?? 'cuenta';
      setSettingsSection(section);
      setSettingsOpen(true);
    };
    window.addEventListener('trackvel:open-settings', onOpen);
    return () => {
      window.removeEventListener('trackvel:open-settings', onOpen);
      if (openSettingsOwner === id) openSettingsOwner = null;
    };
  }, []);
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
            {SHOW_SETTINGS_OPTION && (
            <button
              onClick={() => {
                setOpen(false);
                openSettings('cuenta');
              }}
              className="group flex w-full items-center gap-3 border-l-4 border-transparent px-4 py-3 text-left transition-all duration-200 hover:border-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-700"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 transition-colors duration-200 group-hover:bg-blue-100">
                <FiSettings
                  className="text-slate-600 transition-colors duration-200 group-hover:text-blue-600"
                  size={17}
                />
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-medium text-slate-700 group-hover:text-blue-700">
                  Configuración
                </p>
                <p className="text-xs text-slate-500 group-hover:text-blue-600">
                  Cuenta, unidades y alertas
                </p>
              </div>
              <svg
                className="h-4 w-4 text-slate-400 transition-colors duration-200 group-hover:text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            )}

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

      <SettingsModal
        isOpen={settingsOpen}
        initialSection={settingsSection}
        onClose={() => setSettingsOpen(false)}
      />

      {SHOW_SETTINGS_OPTION && (
        <NewsAnnouncer onOpenSettings={openSettings} settingsOpen={settingsOpen} />
      )}
    </div>
  );
}
