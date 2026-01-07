import '@/app/styles/tollbar.css';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, usePathname } from 'next/navigation';
import { Spinner } from '@nextui-org/react';
import { useApi } from '@/context/ApiContext';

// Modales
import AppModalReportes from '../trackvelnew/estadistica/reportegeneral/ModalReportes';
import AppModalVelocidad from '../trackvelnew/estadistica/reportevelocidad/ModalVelocidad';
import AppModalServicios from '../trackvelnew/estadistica/detallerecorridoservicios/ModalServicios';

// Iconos
import {
  MdChevronRight,
  MdOutlineMiscellaneousServices,
  MdDisplaySettings,
} from 'react-icons/md';
import { GrServices, GrPlan } from 'react-icons/gr';
import { RiGpsFill } from 'react-icons/ri';
import { TbReportSearch } from 'react-icons/tb';
import { SlMenu } from 'react-icons/sl';
import { BsFillSignStopFill } from 'react-icons/bs';
import { SiGoogledocs } from 'react-icons/si';
import { IoSpeedometer } from 'react-icons/io5';
import { FaRoad } from 'react-icons/fa';

import Profile from './Profile';
import { SquareCheck } from 'lucide-react';
import AppModalDetalleServicios from '../trackvelnew/detalleservicios/ModalGeneralDetalle';
import AppModalDuracionServicios from '../trackvelnew/duracionservicios/ModalDuracionServicios';
import AppModalUnidadesCercanas from '../trackvelnew/unidadescercanas/ModalUnidadesCercanas';
import AppModalCargaDatos from '../trackvelnew/programacion/cargalatam/ModalCargaLatam';

// Tipos TypeScript
type IconType =
  | 'velocity'
  | 'stop'
  | 'document'
  | 'location'
  | 'chart'
  | 'chevron'
  | 'external'
  | 'user'
  | 'truck'
  | 'calendar';
type ModalType =
  | 'general'
  | 'stops'
  | 'details'
  | 'velocity'
  | 'kilometers'
  | 'servicios'
  | 'detalleServicios'
  | 'duracionservicios'
  | 'unidadesCercanas' // ← Nuevo
  | 'autosParados' // ← Nuevo
  | 'cargaLatam';

type MenuType =
  | 'services'
  | 'programacion'
  | 'planificacion'
  | 'reportes'
  | 'operaciones' // ← Nuevo
  | 'sidebar';

interface SubMenuItem {
  id: string;
  title: string;
  modalType?: ModalType;
  href?: string;
}

interface MenuItem {
  id: string;
  title: string;
  icon: IconType;
  modalType?: ModalType;
  href?: string;
  submenu?: SubMenuItem[];
  allowedUsers?: string[];
}

interface MenuConfig {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items?: MenuItem[];
  href?: string;
  target?: string;
}

interface MenuState {
  services: boolean;
  programacion: boolean;
  planificacion: boolean;
  reportes: boolean;
  operaciones: boolean;
  sidebar: boolean;
}

interface ModalState {
  general: boolean;
  stops: boolean;
  details: boolean;
  velocity: boolean;
  kilometers: boolean;
  servicios: boolean;
  detalleServicios: boolean;
  duracionservicios: boolean;
  unidadesCercanas: boolean; // ← Nuevo
  autosParados: boolean; // ← Nuevo
  cargaLatam: boolean;
}

interface IconSVGProps {
  type: IconType;
  className?: string;
}

interface MenuItemProps {
  item: MenuItem;
  onClick?: () => void;
  className?: string;
}

const MENU_CONFIG: Record<string, MenuConfig> = {
  REPORTES: {
    id: 'reportes',
    title: 'Reportes',
    icon: TbReportSearch,
    items: [
      {
        id: 'velocidad',
        title: 'Reporte de Velocidad',
        icon: 'velocity',
        modalType: 'velocity',
      },
      {
        id: 'paradas',
        title: 'Reporte de Paradas',
        icon: 'stop',
        modalType: 'stops',
      },
      {
        id: 'general',
        title: 'Reporte General',
        icon: 'document',
        modalType: 'general',
      },
      {
        id: 'detalle',
        title: 'Detalle Recorrido',
        icon: 'location',
        modalType: 'details',
      },
      {
        id: 'kilometraje',
        title: 'Reporte de Kilometraje',
        icon: 'chart',
        modalType: 'kilometers',
      },
    ],
  },
  SERVICIOS: {
    id: 'servicios',
    title: 'Gestión de Servicios',
    icon: GrServices,
    items: [
      {
        id: 'conductores',
        title: 'Conductores',
        href: '/trackvelnew/gestionconductores',
        icon: 'user',
      },
      {
        id: 'unidades',
        title: 'Unidades',
        href: '/trackvelnew/gestionunidades',
        icon: 'truck',
      },

      {
        id: 'programacion',
        title: 'Programación',
        icon: 'calendar',
        submenu: [
          {
            id: 'asignar',
            title: 'Asignar Conductor/Unidad',
            href: '/trackvelnew/programacion', // ← Agregar esta línea
          },
          { id: 'archivo', title: 'Carga LATAM', modalType: 'cargaLatam' }, // ← Agregar modalType
        ],
      },

      {
        id: 'control',
        title: 'Control de Servicios',
        href: '/trackvelnew/gestionservicios',
        icon: 'document',
      },
      {
        id: 'detalle-servicios',
        title: 'Detalle de Servicios',
        icon: 'document',
        modalType: 'detalleServicios',
      },
      {
        id: 'duracion',
        title: 'Duración de Servicios',
        icon: 'chart',
        modalType: 'duracionservicios', // Agrega esta línea
      },
    ],
  },
  PLANIFICACION: {
    id: 'planificacion',
    title: 'Planificación',
    icon: GrPlan,
    items: [
      {
        id: 'admin-turnos',
        title: 'Administración Turnos',
        href: '/trackvelnew/planificacion/administracionturnos',
        icon: 'chart',
      },
      {
        id: 'plan-servicios',
        title: 'Planificación Servicios',
        href: '/trackvelnew/planificacion/planificacionTep',
        icon: 'document',
      },
      {
        id: 'plan-talma',
        title: 'Planificación Talma',
        href: '/trackvelnew/planificacion/planificacionTalma',
        icon: 'document',
        allowedUsers: ['cgacela'],
      },
    ],
  },

  OPERACIONES: {
    id: 'operaciones',
    title: 'Operaciones',
    icon: MdDisplaySettings,
    items: [
      {
        id: 'unidades-cercanas',
        title: 'Unidades Cercanas',
        icon: 'location',
        modalType: 'unidadesCercanas', // Necesitarás crear este modal
      },
    ],
  },
};

const useMenuState = () => {
  const [openMenus, setOpenMenus] = useState<MenuState>({
    services: false,
    programacion: false,
    planificacion: false,
    reportes: false,
    operaciones: false,
    sidebar: false,
  });

  const toggleMenu = useCallback((menuName: MenuType) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  }, []);

  const closeAllMenus = useCallback(() => {
    setOpenMenus({
      services: false,
      programacion: false,
      planificacion: false,
      reportes: false,
      operaciones: false, // ← Nuevo

      sidebar: false,
    });
  }, []);

  return { openMenus, toggleMenu, closeAllMenus };
};

const useModalState = () => {
  const [modals, setModals] = useState<ModalState>({
    general: false,
    stops: false,
    details: false,
    velocity: false,
    kilometers: false,
    servicios: false,
    detalleServicios: false,
    duracionservicios: false,
    unidadesCercanas: false, // ← Nuevo
    autosParados: false, // ← Nuevo
    cargaLatam: false, // ← Agregar esta línea
  });

  const openModal = useCallback((modalType: ModalType) => {
    setModals((prev) => ({ ...prev, [modalType]: true }));
  }, []);

  const closeModal = useCallback((modalType: ModalType) => {
    setModals((prev) => ({ ...prev, [modalType]: false }));
  }, []);

  return { modals, openModal, closeModal };
};

const IconSVG: React.FC<IconSVGProps> = ({ type, className = 'h-5 w-5' }) => {
  const icons: Record<IconType, React.ReactNode> = {
    velocity: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    ),
    stop: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
      />
    ),
    document: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
    location: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </>
    ),
    chart: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    ),
    chevron: (
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    ),
    external: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    ),
    user: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    ),
    truck: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2 18h3a3 3 0 0 0 6 0h2a3 3 0 0 0 6 0h3v-6l-3-4h-4V6a2 2 0 0 0-2-2H4v14z"
        />
        <circle cx="8" cy="18" r="2" />
        <circle cx="16" cy="18" r="2" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 8h4v4h-4V8z"
        />
      </>
    ),
    calendar: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
  };

  return (
    <svg
      className={className}
      fill={type === 'chevron' ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {icons[type]}
    </svg>
  );
};

// Componente para elementos de menú
const MenuItemComponent: React.FC<MenuItemProps> = ({
  item,
  onClick,
  className = '',
}) => {
  const content = (
    <div
      className={`flex items-center border-l-4 border-transparent px-5 py-3 text-[12px] font-medium text-slate-700 transition-all duration-200 hover:border-orange-500 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:text-orange-700 ${className}`}
    >
      <IconSVG
        type={item.icon}
        className="mr-3 h-5 w-5 text-slate-400 transition-colors group-hover/item:text-orange-500"
      />
      {item.title}
      {item.href && (
        <IconSVG
          type="external"
          className="ml-auto h-4 w-4 text-slate-400 transition-colors group-hover/item:text-orange-500"
        />
      )}
    </div>
  );

  if (item.href) {
    return (
      <li className="group/item">
        <Link
          href={item.href}
          title={item.title}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className="group/item" onClick={onClick}>
      <a title={item.title} className="block cursor-pointer">
        {content}
      </a>
    </li>
  );
};

const Tollbar: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [activeLink, setActiveLink] = useState<number | null>(null);

  const { baseUrl } = useApi();
  const pathname = usePathname();

  const { openMenus, toggleMenu, closeAllMenus } = useMenuState();
  const { modals, openModal, closeModal } = useModalState();

  const isTrackvel = useMemo(() => pathname === '/trackvelnew', [pathname]);
  const isSedapal = useMemo(
    () => baseUrl === 'https://sub.velsat.pe:2096',
    [baseUrl],
  );

  const TALMAV_LIKE_USERS = [
    'talmav',
    'agfajardo',
    'aplinares',
    'fjbarboza',
    'rccoaguila',
    'rmlozano',
    'talma',
    'aloremisse',
  ];
  const VIEWERS = ['aremyscontrol1', 'aremyscontrol2', 'mitsubishi'];
  const isTalmav = useMemo(
    () => TALMAV_LIKE_USERS.includes(username),
    [username],
  );
  const isMovilbus = useMemo(() => username === 'movilbus', [username]);
  const isAremys = useMemo(() => username === 'aremys', [username]);
  const isView = useMemo(() => VIEWERS.includes(username), [username]);

  useEffect(() => {
    const storedUsername = localStorage.getItem('currentUser');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  // Event handlers
  const handleLinkClick = useCallback(
    (index: number) => {
      setActiveLink(index);
      if (index !== 0) {
        closeAllMenus();
      }
    },
    [closeAllMenus],
  );

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }, []);

  const handleModalAction = useCallback(
    (modalType: ModalType) => {
      openModal(modalType);
      if (openMenus.sidebar) {
        toggleMenu('sidebar');
      }
    },
    [openModal, openMenus.sidebar, toggleMenu],
  );

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1180);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Render helpers
  const renderDropdownMenu = (
    config: MenuConfig,
    isOpen: boolean,
    onToggle: () => void,
  ) => {
    if (config.href) {
      return (
        <li className="group relative">
          <Link
            href={config.href}
            title={config.title}
            target={config.target || '_blank'}
            rel="noopener noreferrer"
            className="flex items-center bg-black/10 px-1.5 py-[7.8px] text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-white hover:text-slate-900 hover:shadow-md group-hover:bg-[#ebf2fa] group-hover:text-slate-900"
          >
            <span>{config.title}</span>
            <IconSVG
              type="external"
              className="ml-1 h-4 w-4 text-white/80 transition-colors group-hover:text-slate-900"
            />
          </Link>
        </li>
      );
    }

    return (
      <li className="group relative">
        <Link
          href="#"
          title={config.title}
          className="flex items-center bg-black/10 px-1.5 py-[7.8px] text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-white hover:text-slate-900 hover:shadow-md group-hover:bg-[#ebf2fa] group-hover:text-slate-900"
          onClick={(e) => {
            e.preventDefault();
            onToggle();
          }}
        >
          <span>{config.title}</span>
          <IconSVG
            type="chevron"
            className="ml-0 mt-0.5 h-4 w-4 transition-transform group-hover:rotate-180"
          />
        </Link>

        <ul className="invisible absolute right-0 top-full z-50 mt-1 w-64 translate-y-3 transform overflow-hidden border border-slate-200/50 bg-white/95 opacity-0 shadow-2xl backdrop-blur-sm transition-all duration-300 ease-out group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
          <div className="py-0">
            {config.items
              ?.filter((item) => {
                if (item.allowedUsers) {
                  return item.allowedUsers.includes(username);
                }
                return true;
              })
              .map((item, index) => (
              <React.Fragment key={item.id}>
                {item.submenu ? (
                  <li className="group/sub">
                    <a
                      href="#"
                      title={item.title}
                      className={`flex cursor-pointer items-center justify-between border-l-4 px-5 py-3 text-[12px] font-medium transition-all duration-200 ${
                        openMenus.programacion
                          ? 'border-orange-500 bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700'
                          : 'border-transparent text-slate-700 hover:border-orange-500 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:text-orange-700'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleMenu('programacion');
                      }}
                    >
                      <div className="flex items-center">
                        <IconSVG
                          type={item.icon}
                          className={`mr-3 h-5 w-5 transition-colors ${
                            openMenus.programacion
                              ? 'text-orange-500'
                              : 'text-slate-400'
                          }`}
                        />
                        <span>{item.title}</span>
                      </div>
                      <IconSVG
                        type="chevron"
                        className={`h-4 w-4 transition-all duration-200 ${
                          openMenus.programacion
                            ? 'rotate-180 text-orange-500'
                            : 'text-slate-400'
                        }`}
                      />
                    </a>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-out ${
                        openMenus.programacion
                          ? 'max-h-96 opacity-100'
                          : 'max-h-0 opacity-0'
                      }`}
                    >
                      <ul className="from-orange-25 ml-0 border-l-4 border-orange-200 bg-gradient-to-r to-orange-50">
                        {item.submenu.map((subItem) => (
                          <li key={subItem.id} className="group/subitem">
                            {subItem.href ? (
                              <Link
                                href={subItem.href}
                                title={subItem.title}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:to-orange-150 ml-[-2px] flex items-center border-l-2 border-transparent px-8 py-3 text-[12px] font-medium text-slate-600 transition-all duration-200 hover:bg-gradient-to-r hover:from-orange-100 hover:text-orange-700"
                              >
                                <IconSVG
                                  type="document"
                                  className="mr-3 h-4 w-4 text-slate-400 transition-colors group-hover/subitem:text-orange-500"
                                />
                                {subItem.title}
                              </Link>
                            ) : (
                              <a
                                href="#"
                                title={subItem.title}
                                className="hover:to-orange-150 ml-[-2px] flex items-center border-l-2 border-transparent px-8 py-3 text-[12px] font-medium text-slate-600 transition-all duration-200 hover:bg-gradient-to-r hover:from-orange-100 hover:text-orange-700"
                                onClick={() =>
                                  subItem.modalType &&
                                  handleModalAction(subItem.modalType)
                                }
                              >
                                <IconSVG
                                  type="document"
                                  className="mr-3 h-4 w-4 text-slate-400 transition-colors group-hover/subitem:text-orange-500"
                                />
                                {subItem.title}
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ) : (
                  <MenuItemComponent
                    item={item}
                    onClick={() =>
                      item.modalType && handleModalAction(item.modalType)
                    }
                  />
                )}
                {config.id === 'reportes' && (index === 1 || index === 3) && (
                  <li key={`separator-${index}`} className="mx-3 my-2">
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                  </li>
                )}
              </React.Fragment>
            ))}
          </div>
        </ul>
      </li>
    );
  };

  const renderSidebarMenu = (
    config: MenuConfig,
    isOpen: boolean,
    onToggle: () => void,
  ) => {
    if (config.href) {
      return (
        <Link
          href={config.href}
          target={config.target || '_blank'}
          rel="noopener noreferrer"
          onClick={() => toggleMenu('sidebar')}
        >
          <div className="group flex cursor-pointer items-center gap-4 border border-gray-200/50 bg-white/80 p-2 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-orange-200/60 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:shadow-lg hover:shadow-orange-100/50">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
              <config.icon className="text-lg text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-800 transition-colors duration-300 group-hover:text-orange-700">
                {config.title}
              </span>
              <span className="text-xs text-gray-500 transition-colors duration-300 group-hover:text-orange-500">
                Abrir en nueva pestaña
              </span>
            </div>
            <div className="ml-auto translate-x-2 transform opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
              <svg
                className="h-4 w-4 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </div>
          </div>
        </Link>
      );
    }

    return (
      <div className="">
        <div
          className="group flex cursor-pointer items-center justify-between border border-gray-200/50 bg-white/80 p-2 backdrop-blur-sm transition-all duration-300 hover:border-blue-200/60 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-lg hover:shadow-blue-100/50"
          onClick={onToggle}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
              <config.icon className="text-lg text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-800 transition-colors duration-300 group-hover:text-blue-700">
                {config.title}
              </span>
              <span className="text-xs text-gray-500 transition-colors duration-300 group-hover:text-blue-500">
                {isOpen ? 'Contraer menú' : 'Expandir menú'}
              </span>
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100/80 transition-all duration-300 group-hover:bg-blue-100">
            <svg
              className={`h-3 w-3 transform text-gray-500 transition-all duration-300 group-hover:text-blue-600 ${
                isOpen ? 'rotate-90' : ''
              }`}
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
          </div>
        </div>

        {isOpen && config.items && (
          <div className="animate-in slide-in-from-top-2 mb-4 ml-2 mt-4 space-y-1 duration-300">
            {config.items
              .filter((item) => {
                if (item.allowedUsers) {
                  return item.allowedUsers.includes(username);
                }
                return true;
              })
              .map((item, index) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.modalType) {
                    handleModalAction(item.modalType);
                  }
                }}
                className={`group/item animate-in slide-in-from-left-2 flex w-full items-center gap-3 border border-gray-200/30  bg-white/60 px-2 py-0.5 text-left backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] hover:border-blue-200/40 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/50 hover:shadow-md hover:shadow-blue-100/30 `}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <SquareCheck color="#003049" />{' '}
                <span className="text-[12px] font-medium text-gray-700 transition-colors duration-300 group-hover/item:text-blue-700">
                  {item.title}
                </span>
                <div className="ml-auto translate-x-1 transform opacity-0 transition-all duration-300 group-hover/item:translate-x-0 group-hover/item:opacity-100">
                  <svg
                    className="h-3 w-3 text-blue-500"
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
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="tollbar menu__wrapper">
      {/* Background */}
      <div
        className={
          isTrackvel
            ? isSedapal
              ? 'tollbar-bgsub'
              : 'tollbar-bg'
            : 'tollbar-bgsub'
        }
      />

      {/* Main Menu Bar */}
      <div className="menu__bar bg-[#113eb9] md:bg-transparent">
        {/* Mobile Menu Button */}
        <div className="mobile-only-button ">
          <button
            onClick={() => toggleMenu('sidebar')}
            className="mt-[-5px] h-[36px] bg-[#FB7B0F] bg-opacity-90 px-2 py-1"
          >
            <SlMenu size={20} />
          </button>

          <div className="exitToolbarM">
            <Profile toggleFullScreen={toggleFullScreen} />
          </div>
        </div>

        {/* Logo */}
        <div className="flex items-center">
          <div
            title="Logo"
            className="flex items-center gap-3 transition-all duration-200"
          >
            <div className="ml-[-1px] mt-[-1px] flex w-[50px] items-center justify-center bg-gradient-to-r from-orange-500 to-red-500 p-[2.5px] max-[1180px]:p-[0px]">
              {' '}
              <div className="logo-animation">
                <Image
                  src="/LogoWeb.png"
                  alt="Logo"
                  width={isMobile ? 20 : 20}
                  height={isMobile ? 20 : 20}
                />
              </div>
            </div>

            <div className="mt-[-1px]">
              <h3 className="text-center text-[12px] font-semibold text-white md:text-[12.5px]">
                TRACKVEL SYSTEM :
                <span className="pl-1  text-[12px] text-white/80 md:text-[11.5px]">
                  {username.toUpperCase()}
                </span>
              </h3>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ul className="navigation">
          {!baseUrl ? (
            <li className="mt-[-8px] text-white">
              <Spinner size="sm" color="warning" />
            </li>
          ) : isTalmav ? (
            <>
              {/* Agregar menú de Gestión de Servicios con opciones limitadas */}
              {renderDropdownMenu(
                {
                  ...MENU_CONFIG.SERVICIOS,
                  items: MENU_CONFIG.SERVICIOS.items?.filter((item) =>
                    ['unidades'].includes(item.id),
                  ),
                },
                openMenus.services,
                () => toggleMenu('services'),
              )}

              {/* Agregar menú de Operaciones */}
              {renderDropdownMenu(
                MENU_CONFIG.OPERACIONES,
                openMenus.operaciones,
                () => toggleMenu('operaciones'),
              )}

              <li
                onClick={() => openModal('servicios')}
                className="dropdown bg-[#edf2f4] bg-opacity-10 p-1.5 text-white hover:bg-[#fff] hover:text-black"
                style={{ marginTop: '-8px' }}
              >
                <div className="p-1 text-[12px]">Recorrido Servicios</div>
              </li>

              {/* Agregar menú de Reportes */}
              {renderDropdownMenu(
                MENU_CONFIG.REPORTES,
                openMenus.reportes,
                () => toggleMenu('reportes'),
              )}

              <div className="exitToolbar bg-[#edf2f4] bg-opacity-10">
                <div className="flex w-[50px] items-center justify-center p-0">
                  <Profile toggleFullScreen={toggleFullScreen} />
                </div>
              </div>
            </>
          ) : isMovilbus ? (
            <ul className="mr-[-25px] mt-[-5px] flex h-[35px] items-center gap-1">
              {renderDropdownMenu(
                {
                  ...MENU_CONFIG.SERVICIOS,
                  items: MENU_CONFIG.SERVICIOS.items?.filter((item) =>
                    ['conductores', 'unidades', 'control', 'latam'].includes(
                      item.id,
                    ),
                  ),
                },
                openMenus.services,
                () => toggleMenu('services'),
              )}
              {renderDropdownMenu(
                {
                  ...MENU_CONFIG.PLANIFICACION,
                  items: MENU_CONFIG.PLANIFICACION.items?.filter(
                    (item) => item.id !== 'replan-servicios',
                  ),
                },
                openMenus.planificacion,
                () => toggleMenu('planificacion'),
              )}

              <li className="group relative">
                <Link
                  href="/trackvelnew/gestionpasajeros"
                  title="Gestión de Pasajeros"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center bg-black/10 px-1.5 py-2 text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-[#ebf2fa] hover:text-slate-900 hover:shadow-md"
                  onClick={() => handleLinkClick(2)}
                >
                  <span>Gestión Pasajeros</span>
                </Link>
              </li>

              {renderDropdownMenu(
                MENU_CONFIG.REPORTES,
                openMenus.reportes,
                () => toggleMenu('reportes'),
              )}

              <div className="ml-auto">
                <Profile toggleFullScreen={toggleFullScreen} />
              </div>
            </ul>
          ) : isAremys ? (
            // ← NUEVO: MENÚ PARA AREMYS
            <ul className="mr-[-25px] mt-[-5px] flex h-[35px] items-center gap-1">
              {renderDropdownMenu(
                {
                  ...MENU_CONFIG.SERVICIOS,
                  items: MENU_CONFIG.SERVICIOS.items
                    ?.filter((item) => {
                      // Excluir "Control de Servicios"
                      if (item.id === 'control') return false;

                      // Si es "Programación", filtrar sus submenús
                      if (item.id === 'programacion') {
                        return {
                          ...item,
                          submenu: item.submenu?.filter(
                            (subItem) => subItem.id === 'asignar',
                          ),
                        };
                      }

                      return true;
                    })
                    .map((item) => {
                      // Aplicar el filtro de submenu a Programación
                      if (item.id === 'programacion' && item.submenu) {
                        return {
                          ...item,
                          submenu: item.submenu.filter(
                            (subItem) => subItem.id === 'asignar',
                          ),
                        };
                      }
                      return item;
                    }),
                },
                openMenus.services,
                () => toggleMenu('services'),
              )}

              <li className="group relative">
                <Link
                  href="/trackvelnew/gestionpasajeros"
                  title="Gestión de Pasajeros"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center bg-black/10 px-1.5 py-2 text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-[#ebf2fa] hover:text-slate-900 hover:shadow-md"
                  onClick={() => handleLinkClick(2)}
                >
                  <span>Gestión Pasajeros</span>
                </Link>
              </li>

              {renderDropdownMenu(
                MENU_CONFIG.OPERACIONES,
                openMenus.operaciones,
                () => toggleMenu('operaciones'),
              )}

              {renderDropdownMenu(
                MENU_CONFIG.REPORTES,
                openMenus.reportes,
                () => toggleMenu('reportes'),
              )}

              <div className="ml-auto">
                <Profile toggleFullScreen={toggleFullScreen} />
              </div>
            </ul>
          ) : isView ? (
            // ← NUEVO: MENÚ PARA AREMYS
            <ul className="mr-[-25px] mt-[-5px] flex h-[35px] items-center gap-1">
              {renderDropdownMenu(
                MENU_CONFIG.REPORTES,
                openMenus.reportes,
                () => toggleMenu('reportes'),
              )}

              <div className="ml-auto">
                <Profile toggleFullScreen={toggleFullScreen} />
              </div>
            </ul>
          ) : (
            <ul className="mr-[-25px] mt-[-5px] flex h-[35px] items-center gap-1">
              {isSedapal ? (
                <>
                  {renderDropdownMenu(
                    MENU_CONFIG.REPORTES,
                    openMenus.reportes,
                    () => toggleMenu('reportes'),
                  )}
                  <li className="group relative">
                    <Link
                      href=""
                      title=""
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-black/10 px-1.5 py-[8px] text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-[#ebf2fa] hover:text-slate-900 hover:shadow-md"
                    >
                      <span>Recreación</span>
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  {renderDropdownMenu(
                    MENU_CONFIG.SERVICIOS,
                    openMenus.services,
                    () => toggleMenu('services'),
                  )}
                  {renderDropdownMenu(
                    MENU_CONFIG.PLANIFICACION,
                    openMenus.planificacion,
                    () => toggleMenu('planificacion'),
                  )}

                  <li className="group relative">
                    <Link
                      href="/trackvelnew/gestionpasajeros"
                      title="Gestión de Pasajeros"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-black/10 px-1.5 py-2 text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-[#ebf2fa] hover:text-slate-900 hover:shadow-md"
                      onClick={() => handleLinkClick(2)}
                    >
                      <span>Gestión Pasajeros</span>
                    </Link>
                  </li>

                  {renderDropdownMenu(
                    MENU_CONFIG.OPERACIONES,
                    openMenus.operaciones,
                    () => toggleMenu('operaciones'),
                  )}

                  {renderDropdownMenu(
                    MENU_CONFIG.REPORTES,
                    openMenus.reportes,
                    () => toggleMenu('reportes'),
                  )}
                </>
              )}

              <div className="ml-auto">
                <Profile toggleFullScreen={toggleFullScreen} />
              </div>
            </ul>
          )}
        </ul>
      </div>

      {/* Modales */}
      <AppModalReportes
        isOpen={modals.general}
        onClose={() => closeModal('general')}
        titulo="REPORTE GENERAL"
        nameurl="reportegeneral"
        namedown="downloadExcelG"
        namedesc="general"
        showDownloadButton={true}
        icono={<SiGoogledocs size={25} />}
      />

      <AppModalReportes
        isOpen={modals.stops}
        onClose={() => closeModal('stops')}
        titulo="REPORTE DE PARADAS"
        nameurl="reporteparadas"
        namedown="downloadExcelS"
        namedesc="paradas"
        showDownloadButton={true}
        icono={<BsFillSignStopFill size={25} />}
      />

      <AppModalReportes
        isOpen={modals.details}
        onClose={() => closeModal('details')}
        titulo="DETALLE RECORRIDO"
        nameurl="detallerecorrido"
        namedown=""
        namedesc=""
        showDownloadButton={false}
        icono={<FaRoad size={25} />}
      />

      <AppModalVelocidad
        isOpen={modals.velocity}
        onClose={() => closeModal('velocity')}
        titulo="REPORTE VELOCIDAD"
        nameurl="reportevelocidad"
        namedown="downloadExcelV"
        namedesc="velocidad"
        showDownloadButton={true}
        icono={<IoSpeedometer size={25} />}
      />

      <AppModalReportes
        isOpen={modals.kilometers}
        onClose={() => closeModal('kilometers')}
        titulo="REPORTE DE KILOMETRAJE"
        nameurl="reportekilometraje"
        namedown="downloadExcelK"
        namedesc="kilometraje"
        showDownloadButton={true}
        useSelectAll={true}
      />

      <AppModalServicios
        isOpen={modals.servicios}
        onClose={() => closeModal('servicios')}
        titulo="REPORTE DE RECORRIDO DE SERVICIOS"
        nameurl="detallerecorridoservicios"
        namedown="downloadExcelG"
        namedesc="general"
        showDownloadButton={true}
      />

      <AppModalDetalleServicios
        isOpen={modals.detalleServicios}
        onClose={() => closeModal('detalleServicios')}
        titulo="DETALLE DE SERVICIOS"
        nameurl="detalleservicios"
        namedown="downloadExcelDS"
        namedesc="detalleservicios"
        showDownloadButton={true}
      />

      <AppModalDuracionServicios
        isOpen={modals.duracionservicios}
        onClose={() => closeModal('duracionservicios')}
        titulo="DURACIÓN DE SERVICIOS"
        nameurl="detalleservicios"
        namedown="downloadExcelDS"
        namedesc="detalleservicios"
        showDownloadButton={true}
      />

      <AppModalUnidadesCercanas
        isOpen={modals.unidadesCercanas}
        onClose={() => closeModal('unidadesCercanas')}
        titulo="UNIDADES CERCANAS"
        useSelectAll={true}
        icono={<RiGpsFill size={25} />}
      />

      <AppModalCargaDatos
        isOpen={modals.cargaLatam}
        onClose={() => closeModal('cargaLatam')}
        titulo="CARGA DATOS LATAM"
        useSelectAll={true}
        icono={<SiGoogledocs size={25} />}
      />

      {/* Sidebar */}
      <div className={`sidebar ${openMenus.sidebar ? 'open' : ''}`}>
        <button className="close-sidebar" onClick={() => toggleMenu('sidebar')}>
          <MdChevronRight />
        </button>

        <div className="menu_sidebar">
          <div className="flex items-center gap-2">
            <span
              className="font-bold text-[#154666]"
              style={{ fontSize: '14px' }}
            >
              MENÚ
            </span>
          </div>
        </div>

        {isTalmav ? (
          <div className="mb-0 space-y-0">
            {/* Agregar menú de Gestión de Servicios en sidebar con opciones limitadas */}
            {renderSidebarMenu(
              {
                ...MENU_CONFIG.SERVICIOS,
                items: MENU_CONFIG.SERVICIOS.items?.filter((item) =>
                  ['unidades'].includes(item.id),
                ),
              },
              openMenus.services,
              () => toggleMenu('services'),
            )}

            {/* Agregar menú de Operaciones en sidebar */}
            {renderSidebarMenu(
              MENU_CONFIG.OPERACIONES,
              openMenus.operaciones,
              () => toggleMenu('operaciones'),
            )}

            <div
              className="group flex cursor-pointer items-center gap-4 border border-gray-200/50 bg-white/80  p-2 backdrop-blur-sm transition-all duration-300 hover:border-blue-200/60 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50  hover:shadow-lg"
              onClick={() => openModal('servicios')}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                <MdOutlineMiscellaneousServices className="text-lg text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800 transition-colors duration-300 group-hover:text-blue-700">
                  Recorrido Servicios
                </span>
                <span className="text-xs text-gray-500 transition-colors duration-300 group-hover:text-blue-500">
                  Explora nuestros servicios
                </span>
              </div>
              <div className="ml-auto translate-x-2 transform opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                <svg
                  className="h-4 w-4 text-blue-500"
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
              </div>
            </div>

            {/* Agregar menú de Reportes en sidebar */}
            {renderSidebarMenu(MENU_CONFIG.REPORTES, openMenus.reportes, () =>
              toggleMenu('reportes'),
            )}
          </div>
        ) : isMovilbus ? (
          <div className="mb-0 space-y-0">
            {renderSidebarMenu(
              {
                ...MENU_CONFIG.SERVICIOS,
                items: MENU_CONFIG.SERVICIOS.items?.filter((item) =>
                  ['conductores', 'unidades', 'control', 'latam'].includes(
                    item.id,
                  ),
                ),
              },
              openMenus.services,
              () => toggleMenu('services'),
            )}
            {renderSidebarMenu(
              {
                ...MENU_CONFIG.PLANIFICACION,
                items: MENU_CONFIG.PLANIFICACION.items?.filter(
                  (item) => item.id !== 'replan-servicios',
                ),
              },
              openMenus.planificacion,
              () => toggleMenu('planificacion'),
            )}

            <Link
              href="/trackvelnew/gestionpasajeros"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => toggleMenu('sidebar')}
            >
              <div className="group flex cursor-pointer items-center gap-4 border border-gray-200/50 bg-white/80 px-2 py-0.5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-green-200/60 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:shadow-lg hover:shadow-green-100/50">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                  <RiGpsFill className="text-lg text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800 transition-colors duration-300 group-hover:text-green-700">
                    Gestión de Pasajeros
                  </span>
                  <span className="text-xs text-gray-500 transition-colors duration-300 group-hover:text-green-500">
                    Administra pasajeros
                  </span>
                </div>
                <div className="ml-auto translate-x-2 transform opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                  <svg
                    className="h-4 w-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </div>
              </div>
            </Link>

            {renderSidebarMenu(MENU_CONFIG.REPORTES, openMenus.reportes, () =>
              toggleMenu('reportes'),
            )}
          </div>
        ) : isAremys ? (
          // SIDEBAR PARA AREMYS
          <div className="mb-0 space-y-0">
            {renderSidebarMenu(
              {
                ...MENU_CONFIG.SERVICIOS,
                items: MENU_CONFIG.SERVICIOS.items
                  ?.filter((item) => {
                    // Excluir "Control de Servicios"
                    if (item.id === 'control') return false;
                    return true;
                  })
                  .map((item) => {
                    // Aplicar el filtro de submenu a Programación
                    if (item.id === 'programacion' && item.submenu) {
                      return {
                        ...item,
                        submenu: item.submenu.filter(
                          (subItem) => subItem.id === 'asignar',
                        ),
                      };
                    }
                    return item;
                  }),
              },
              openMenus.services,
              () => toggleMenu('services'),
            )}

            <Link
              href="/trackvelnew/gestionpasajeros"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => toggleMenu('sidebar')}
            >
              <div className="group flex cursor-pointer items-center gap-4 border border-gray-200/50 bg-white/80 px-2 py-0.5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-green-200/60 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:shadow-lg hover:shadow-green-100/50">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                  <RiGpsFill className="text-lg text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800 transition-colors duration-300 group-hover:text-green-700">
                    Gestión de Pasajeros
                  </span>
                  <span className="text-xs text-gray-500 transition-colors duration-300 group-hover:text-green-500">
                    Administra pasajeros
                  </span>
                </div>
                <div className="ml-auto translate-x-2 transform opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                  <svg
                    className="h-4 w-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </div>
              </div>
            </Link>

            {renderSidebarMenu(
              MENU_CONFIG.OPERACIONES,
              openMenus.operaciones,
              () => toggleMenu('operaciones'),
            )}

            {renderSidebarMenu(MENU_CONFIG.REPORTES, openMenus.reportes, () =>
              toggleMenu('reportes'),
            )}
          </div>
        ) : isView ? (
          // SIDEBAR PARA AREMYS
          <div className="mb-0 space-y-0">
            {renderSidebarMenu(MENU_CONFIG.REPORTES, openMenus.reportes, () =>
              toggleMenu('reportes'),
            )}
          </div>
        ) : (
          <div className="mb-0 space-y-0">
            {isSedapal ? (
              renderSidebarMenu(MENU_CONFIG.REPORTES, openMenus.reportes, () =>
                toggleMenu('reportes'),
              )
            ) : (
              <>
                {renderSidebarMenu(
                  MENU_CONFIG.SERVICIOS,
                  openMenus.services,
                  () => toggleMenu('services'),
                )}
                {renderSidebarMenu(
                  MENU_CONFIG.PLANIFICACION,
                  openMenus.planificacion,
                  () => toggleMenu('planificacion'),
                )}

                <Link
                  href="/trackvelnew/gestionpasajeros"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => toggleMenu('sidebar')}
                >
                  <div className="group flex cursor-pointer items-center gap-4 border border-gray-200/50 bg-white/80 px-2 py-0.5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-green-200/60 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:shadow-lg hover:shadow-green-100/50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                      <RiGpsFill className="text-lg text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-800 transition-colors duration-300 group-hover:text-green-700">
                        Gestión de Pasajeros
                      </span>
                      <span className="text-xs text-gray-500 transition-colors duration-300 group-hover:text-green-500">
                        Administra pasajeros
                      </span>
                    </div>
                    <div className="ml-auto translate-x-2 transform opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                      <svg
                        className="h-4 w-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>

                <div className="group flex cursor-pointer items-center gap-4 border border-gray-200/50 bg-white/80 p-2 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-purple-200/60 hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 hover:shadow-lg hover:shadow-purple-100/50">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                    <MdDisplaySettings className="text-lg text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-800 transition-colors duration-300 group-hover:text-purple-700">
                      Operaciones
                    </span>
                    <span className="text-xs text-gray-500 transition-colors duration-300 group-hover:text-purple-500">
                      Panel de control
                    </span>
                  </div>
                  <div className="ml-auto translate-x-2 transform opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                    <svg
                      className="h-4 w-4 text-purple-500"
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
                  </div>
                </div>

                {renderSidebarMenu(
                  MENU_CONFIG.REPORTES,
                  openMenus.reportes,
                  () => toggleMenu('reportes'),
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tollbar;
