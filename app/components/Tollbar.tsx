import '@/app/styles/tollbar.css';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Spinner } from '@nextui-org/react';
import { useApi } from '@/context/ApiContext';

// Modales
import AppModalReportes from '../trackvelnew/estadistica/reportegeneral/ModalReportes';
import AppModalVelocidad from '../trackvelnew/estadistica/reportevelocidad/ModalVelocidad';
import AppModalServicios from '../trackvelnew/estadistica/detallerecorridoservicios/ModalServicios';
import AppModalReporteEventos from '../subtrackvelnew/estadistica/reporteeventos/ModalReporteEventos';
import { MdOutlineEventNote } from 'react-icons/md';

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
import AlertsDropdown from './AlertsDropdown';
import { SquareCheck } from 'lucide-react';
import AppModalDetalleServicios from '../trackvelnew/detalleservicios/ModalGeneralDetalle';
import AppModalDuracionServicios from '../trackvelnew/duracionservicios/ModalDuracionServicios';
import AppModalUnidadesCercanas from '../trackvelnew/unidadescercanas/ModalUnidadesCercanas';
import AppModalCargaLatam from './ModalCargaLatam';
import AppModalAlertaReporte from '../trackvelnew/estadistica/reportealertasvelocidad/ModalAlertaReporte';

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
  | 'unidadesCercanas'
  | 'autosParados'
  | 'cargaLatam'
  | 'alertasVelocidad'
  | 'reporteEventos';

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
  sedapalOnly?: boolean;
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
  unidadesCercanas: boolean;
  autosParados: boolean;
  cargaLatam: boolean;
  alertasVelocidad: boolean;
  reporteEventos: false;
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
      {
        id: 'alertas-velocidad',
        title: 'Alertas de Velocidad',
        icon: 'velocity',
        modalType: 'alertasVelocidad',
        allowedUsers: ['movilbus', 'mitsubishi'],
      },
      {
        id: 'reporte-eventos',
        title: 'Reporte de Eventos',
        icon: 'document',
        modalType: 'reporteEventos',
        sedapalOnly: true,
      },
      {
        id: 'graficos',
        title: 'Gráficos',
        icon: 'chart',
        href: '/trackvelnew/estadistica/graficos',
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
          { id: 'archivo', title: 'Carga Latam', modalType: 'cargaLatam' }, // ← Agregar modalType
        ],
      },

      {
        id: 'control',
        title: 'Servicios Menores',
        href: '/trackvelnew/gestionservicios',
        icon: 'document',
      },
      {
        id: 'servicios-turismo',
        title: 'Servicios Turismo',
        href: '/trackvelnew/serviciosturismo',
        icon: 'document',
        allowedUsers: ['movilbus'],
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
      {
        id: 'carga-latam',
        title: 'Carga Latam',
        modalType: 'cargaLatam',
        icon: 'document',
        allowedUsers: ['movilbus'],
      }
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
  RASTREO: {
    id: 'rastreo',
    title: 'Rastreo Móvil',
    icon: RiGpsFill,
    href: '/trackvelmobile/rastreomovilmb', // ← Ruta de tu página de rastreo
    target: '_blank', // ← Opcional: abre en nueva pestaña
  },

  RASTREO_MOVILBUS: {
    // ← NUEVO para movilbus
    id: 'rastreo-movilbus',
    title: 'Rastreo Móvil',
    icon: RiGpsFill,
    href: '/trackvelmobile',
    target: '_blank',
  },
  DOCUMENTOS: {
    id: 'documentos',
    title: 'Documentos',
    icon: SiGoogledocs,
    href: '/subtrackvelnew/documentos',
    target: '_blank',
  },
  GEOCERCAS: {
    id: 'geocercas',
    title: 'Geocercas',
    icon: RiGpsFill,
    href: '/trackvelnew/geocercas',
    target: '_blank',
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
    unidadesCercanas: false,
    autosParados: false,
    cargaLatam: false,
    alertasVelocidad: false,
    reporteEventos: false,
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

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

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
  const isPakatnamu = useMemo(() => username === 'pakatnamu', [username]);

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
  const VIEWERS = ['mitsubishi', 'b4t125', 'grupohy', 'INTERPROVINCIALMOVIL', 'movilbusmanto'];
  const isTalmav = useMemo(
    () => TALMAV_LIKE_USERS.includes(username),
    [username],
  );
  const isMovilbus = useMemo(() => username === 'movilbus', [username]);
  const isTransvios = useMemo(() => username === 'transvios', [username]);
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
  const navRef = useRef<HTMLElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const [clipPathStyle, setClipPathStyle] = useState<string | undefined>(undefined);

  const updateClipPath = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (window.innerWidth < 1180) {
      setClipPathStyle('polygon(0 0, 100% 0%, 100% 100%, 0% 100%)');
      return;
    }

    const navEl = navRef.current;
    const logoEl = logoRef.current;
    if (!navEl || !logoEl) return;

    const firstLi = navEl.querySelector('li');
    if (!firstLi) return;

    const navFirstRect = firstLi.getBoundingClientRect();
    const logoRect = logoEl.getBoundingClientRect();

    if (navFirstRect.width === 0 || logoRect.width === 0) return;

    const menuLeft = navFirstRect.left;
    const logoRight = logoRect.right;

    const bottomRightSlantX = Math.round(menuLeft - 12);
    const topRightSlantX = Math.round(menuLeft - 38);
    const topLeftSlantX = Math.round(logoRight + 35);
    const bottomLeftSlantX = Math.round(logoRight + 12);

    if (topRightSlantX <= topLeftSlantX + 20) {
      setClipPathStyle('polygon(0 0, 100% 0%, 100% 100%, 0% 100%)');
      return;
    }

    const newClipPath = `polygon(0 0, 100% 0, 100% 100%, ${bottomRightSlantX}px 100%, ${topRightSlantX}px 28%, ${topLeftSlantX}px 28%, ${bottomLeftSlantX}px 100%, 0 100%)`;
    setClipPathStyle(newClipPath);
    if (typeof window !== 'undefined') {
      const user = username || localStorage.getItem('currentUser') || 'default';
      try {
        localStorage.setItem(`tollbar_clippath_${user}`, newClipPath);
      } catch (e) {}
    }
  }, [baseUrl, username]);

  useEffect(() => {
    if (username && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`tollbar_clippath_${username}`);
      if (saved) {
        setClipPathStyle(saved);
      }
    }
  }, [username]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1180);
      updateClipPath();
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [updateClipPath]);

  useIsomorphicLayoutEffect(() => {
    updateClipPath();
    const timer1 = setTimeout(updateClipPath, 50);
    const timer2 = setTimeout(updateClipPath, 150);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [updateClipPath, username, baseUrl, isTalmav, isMovilbus, isPakatnamu, isSedapal, isView]);

  useEffect(() => {
    if (!navRef.current) return;
    const observer = new ResizeObserver(() => {
      updateClipPath();
    });
    observer.observe(navRef.current);
    if (logoRef.current) {
      observer.observe(logoRef.current);
    }
    return () => observer.disconnect();
  }, [updateClipPath]);

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
            className="flex h-[36px] items-center bg-black/10 px-1.5 text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-white hover:text-slate-900 hover:shadow-md group-hover:bg-[#ebf2fa] group-hover:text-slate-900"
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
          className="flex h-[36px] items-center bg-black/10 px-1.5 text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-white hover:text-slate-900 hover:shadow-md group-hover:bg-[#ebf2fa] group-hover:text-slate-900"
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
                if ((item as any).sedapalOnly) {
                  return isSedapal;
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
                if ((item as any).sedapalOnly) {
                  return isSedapal;
                }
                return true;
              })
              .map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.href) {
                      window.open(item.href, '_blank', 'noopener,noreferrer');
                    } else if (item.modalType) {
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
  if (isTransvios) {
    return (
      <div className="tollbar menu__wrapper">
        <div className="menu__bar bg-[#113eb9] md:bg-transparent">
          <div className="flex items-center">
            <div className="flex h-[36px] w-[46px] items-center justify-center bg-gradient-to-r from-orange-500 to-red-500 p-1">
              <Image src="/LogoWeb.png" alt="Logo" width={20} height={20} />
            </div>
            <div className="mt-[-1px]">
              <h3 className="text-center text-[12px] font-semibold text-white" suppressHydrationWarning>
                TRACKVEL SYSTEM :
                <span className="pl-1 text-[12px] text-white/80" suppressHydrationWarning>
                  {username ? username.toUpperCase() : ''}
                </span>
              </h3>
            </div>
          </div>
          <nav className="navigation">
            <ul className="mr-[-25px] flex h-[36px] items-center gap-1">
              <div className="ml-auto flex items-center">
                <AlertsDropdown />
                <div className="mx-1 h-5 w-[1px] bg-white/25" />
                <Profile toggleFullScreen={toggleFullScreen} />
              </div>
            </ul>
          </nav>
        </div>
      </div>
    );
  }

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
        style={clipPathStyle ? { clipPath: clipPathStyle } : undefined}
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

          <div className="exitToolbarM flex items-center gap-1">
            <AlertsDropdown />
            <div className="mx-0.5 h-4 w-[1px] bg-white/25" />
            <Profile toggleFullScreen={toggleFullScreen} />
          </div>
        </div>

        {/* Logo */}
        <div className="flex items-center" ref={logoRef}>
          <div
            title="Logo"
            className="flex items-center gap-3 transition-all duration-200"
          >
            <div className="flex h-[36px] w-[46px] items-center justify-center bg-gradient-to-r from-orange-500 to-red-500 p-1">
              <div className="logo-animation">
                <Image
                  src="/LogoWeb.png"
                  alt="Logo"
                  width={20}
                  height={20}
                />
              </div>
            </div>

            <div className="mt-[-1px]">
              <h3 className="text-center text-[12px] font-semibold text-white md:text-[12.5px]" suppressHydrationWarning>
                TRACKVEL SYSTEM :
                <span className="pl-1  text-[12px] text-white/80 md:text-[11.5px]" suppressHydrationWarning>
                  {username ? username.toUpperCase() : ''}
                </span>
              </h3>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="navigation" ref={navRef} suppressHydrationWarning>
          {!baseUrl && !username ? (
            <div className="flex h-[36px] items-center text-white px-2">
              <Spinner size="sm" color="warning" />
            </div>
          ) : isTalmav ? (
            <ul className="mr-[-25px] flex h-[36px] items-center gap-1">
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
                className="dropdown flex h-[36px] items-center bg-[#edf2f4] bg-opacity-10 px-1.5 text-white hover:bg-[#fff] hover:text-black"
              >
                <div className="px-1 text-[12px]">Recorrido Servicios</div>
              </li>

              {/* Agregar menú de Reportes */}
              {renderDropdownMenu(
                MENU_CONFIG.REPORTES,
                openMenus.reportes,
                () => toggleMenu('reportes'),
              )}

              <li className="group relative">
                <Link
                  href="/trackvelnew/geocercas"
                  title="Geocercas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-[36px] items-center bg-black/10 px-1.5 text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-[#ebf2fa] hover:text-slate-900 hover:shadow-md"
                >
                  <span>Geocercas</span>
                </Link>
              </li>


              <div className="exitToolbar bg-[#edf2f4] bg-opacity-10">
                <div className="flex items-center justify-center p-0">
                  <AlertsDropdown />
                  <div className="mx-1 h-5 w-[1px] bg-white/25" />
                  <Profile toggleFullScreen={toggleFullScreen} />
                </div>
              </div>
            </ul>
          ) : isMovilbus ? (
            <ul className="mr-[-25px] flex h-[36px] items-center gap-1">
              {renderDropdownMenu(
                {
                  ...MENU_CONFIG.SERVICIOS,
                  items: MENU_CONFIG.SERVICIOS.items?.filter((item) =>
                    [
                      'conductores',
                      'unidades',
                      'control',
                      'carga-latam',
                      'servicios-turismo',
                    ].includes(item.id),
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
                  className="flex h-[36px] items-center bg-black/10 px-1.5 text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-[#ebf2fa] hover:text-slate-900 hover:shadow-md"
                  onClick={() => handleLinkClick(2)}
                >
                  <span>Gestión Pasajeros</span>
                </Link>
              </li>

              <li className="group relative">
                <Link
                  href="/trackvelnew/geocercas"
                  title="Geocercas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-[36px] items-center bg-black/10 px-1.5 text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-[#ebf2fa] hover:text-slate-900 hover:shadow-md"
                >
                  <span>Geocercas</span>
                </Link>
              </li>

              {/* ← NUEVO: Rastreo Móvil para movilbus */}
              {renderDropdownMenu(
                MENU_CONFIG.RASTREO_MOVILBUS,
                false,
                () => {},
              )}

              {renderDropdownMenu(
                MENU_CONFIG.REPORTES,
                openMenus.reportes,
                () => toggleMenu('reportes'),
              )}


              <div className="ml-auto flex items-center">
                <AlertsDropdown />
                <div className="mx-1 h-5 w-[1px] bg-white/25" />
                <Profile toggleFullScreen={toggleFullScreen} />
              </div>
            </ul>
          ) : isPakatnamu ? (
            <ul className="mr-[-25px] flex h-[36px] items-center gap-1">
              {renderDropdownMenu(
                MENU_CONFIG.REPORTES,
                openMenus.reportes,
                () => toggleMenu('reportes'),
              )}
              {renderDropdownMenu(MENU_CONFIG.DOCUMENTOS, false, () => {})}
              <li className="group relative">
                <Link
                  href="/subtrackvelnew/geocercas"
                  title="Geocercas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center bg-black/10 px-1.5 py-[8px] text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-[#ebf2fa] hover:text-slate-900 hover:shadow-md"
                >
                  <span>Geocercas</span>
                </Link>
              </li>

              <div className="ml-auto flex items-center">
                <AlertsDropdown />
                <div className="mx-1 h-5 w-[1px] bg-white/25" />
                <Profile toggleFullScreen={toggleFullScreen} />
              </div>
            </ul>
          ) : isView ? (
            // MENÚ PARA VIEWERS
            <ul className="mr-[-25px] flex h-[36px] items-center gap-1">
              {/* Mostrar Rastreo Móvil solo para mitsubishi */}
              {username === 'mitsubishi' &&
                renderDropdownMenu(
                  MENU_CONFIG.RASTREO,
                  false, // No tiene dropdown
                  () => {},
                )}

              {renderDropdownMenu(
                MENU_CONFIG.REPORTES,
                openMenus.reportes,
                () => toggleMenu('reportes'),
              )}

              <li className="group relative">
                <Link
                  href="/trackvelnew/geocercas"
                  title="Geocercas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-[36px] items-center bg-black/10 px-1.5 text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-[#ebf2fa] hover:text-slate-900 hover:shadow-md"
                >
                  <span>Geocercas</span>
                </Link>
              </li>


              <div className="ml-auto flex items-center">
                <AlertsDropdown />
                <div className="mx-1 h-5 w-[1px] bg-white/25" />
                <Profile toggleFullScreen={toggleFullScreen} />
              </div>
            </ul>
          ) : (
            <ul className="mr-[-25px] flex h-[36px] items-center gap-1">
              {isSedapal ? (
                <>
                  {renderDropdownMenu(
                    MENU_CONFIG.REPORTES,
                    openMenus.reportes,
                    () => toggleMenu('reportes'),
                  )}
                  {renderDropdownMenu(MENU_CONFIG.DOCUMENTOS, false, () => {})}
                  <li className="group relative">
                    <Link
                      href="/trackvelnew/geocercas"
                      title="Geocercas"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-[36px] items-center bg-black/10 px-1.5 text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-[#ebf2fa] hover:text-slate-900 hover:shadow-md"
                    >
                      <span>Geocercas</span>
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
                      className="flex h-[36px] items-center bg-black/10 px-1.5 text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-[#ebf2fa] hover:text-slate-900 hover:shadow-md"
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

                  <li className="group relative">
                    <Link
                      href="/trackvelnew/geocercas"
                      title="Geocercas"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-[36px] items-center bg-black/10 px-1.5 text-[12.3px] font-medium text-white transition-all duration-200 hover:bg-[#ebf2fa] hover:text-slate-900 hover:shadow-md"
                    >
                      <span>Geocercas</span>
                    </Link>
                  </li>

                </>
              )}

              <div className="ml-auto flex items-center">
                <AlertsDropdown />
                <div className="mx-1 h-5 w-[1px] bg-white/25" />
                <Profile toggleFullScreen={toggleFullScreen} />
              </div>
            </ul>
          )}
        </nav>
      </div>

      {/* Modales - solo se montan cuando están abiertos */}
      {modals.general && (
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
      )}

      {modals.stops && (
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
      )}

      {modals.details && (
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
      )}

      {modals.velocity && (
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
      )}

      {modals.kilometers && (
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
      )}

      {modals.servicios && (
        <AppModalServicios
          isOpen={modals.servicios}
          onClose={() => closeModal('servicios')}
          titulo="REPORTE DE RECORRIDO DE SERVICIOS"
          nameurl="detallerecorridoservicios"
          namedown="downloadExcelG"
          namedesc="general"
          showDownloadButton={true}
        />
      )}

      {modals.detalleServicios && (
        <AppModalDetalleServicios
          isOpen={modals.detalleServicios}
          onClose={() => closeModal('detalleServicios')}
          titulo="DETALLE DE SERVICIOS"
          nameurl="detalleservicios"
          namedown="downloadExcelDS"
          namedesc="detalleservicios"
          showDownloadButton={true}
        />
      )}

      {modals.duracionservicios && (
        <AppModalDuracionServicios
          isOpen={modals.duracionservicios}
          onClose={() => closeModal('duracionservicios')}
          titulo="DURACIÓN DE SERVICIOS"
          nameurl="detalleservicios"
          namedown="downloadExcelDS"
          namedesc="detalleservicios"
          showDownloadButton={true}
        />
      )}

      {modals.unidadesCercanas && (
        <AppModalUnidadesCercanas
          isOpen={modals.unidadesCercanas}
          onClose={() => closeModal('unidadesCercanas')}
          titulo="UNIDADES CERCANAS"
          useSelectAll={true}
          icono={<RiGpsFill size={25} />}
        />
      )}

      {modals.cargaLatam && (
        <AppModalCargaLatam
          isOpen={modals.cargaLatam}
          onClose={() => closeModal('cargaLatam')}
          titulo="CARGA DATOS LATAM"
          useSelectAll={true}
          icono={<SiGoogledocs size={25} />}
        />
      )}

      {modals.alertasVelocidad && (
        <AppModalAlertaReporte
          isOpen={modals.alertasVelocidad}
          onClose={() => closeModal('alertasVelocidad')}
          titulo="REPORTE DE ALERTAS DE VELOCIDAD"
          icono={<IoSpeedometer size={25} />}
        />
      )}

      {modals.reporteEventos && (
        <AppModalReporteEventos
          isOpen={modals.reporteEventos}
          onClose={() => closeModal('reporteEventos')}
          titulo="REPORTE DE EVENTOS"
          showDownloadButton={true}
          icono={<MdOutlineEventNote size={25} />}
        />
      )}

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

            <Link
              href="/trackvelnew/geocercas"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => toggleMenu('sidebar')}
            >
              <div className="group flex cursor-pointer items-center gap-4 border border-gray-200/50 bg-white/80 p-2 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-orange-200/60 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:shadow-lg hover:shadow-orange-100/50">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                  <MdDisplaySettings className="text-lg text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800 transition-colors duration-300 group-hover:text-orange-700">
                    Geocercas
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
                  [
                    'conductores',
                    'unidades',
                    'control',
                    'carga-latam',
                    'servicios-turismo',
                  ].includes(item.id),
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

            <Link
              href="/trackvelnew/geocercas"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => toggleMenu('sidebar')}
            >
              <div className="group flex cursor-pointer items-center gap-4 border border-gray-200/50 bg-white/80 p-2 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-orange-200/60 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:shadow-lg hover:shadow-orange-100/50">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                  <MdDisplaySettings className="text-lg text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800 transition-colors duration-300 group-hover:text-orange-700">
                    Geocercas
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

            {/* ← NUEVO: Rastreo Móvil para movilbus */}
            {renderSidebarMenu(MENU_CONFIG.RASTREO_MOVILBUS, false, () => {})}

            {renderSidebarMenu(MENU_CONFIG.REPORTES, openMenus.reportes, () =>
              toggleMenu('reportes'),
            )}
          </div>
        ) : isPakatnamu ? (
          <div className="mb-0 space-y-0">
            {renderSidebarMenu(MENU_CONFIG.REPORTES, openMenus.reportes, () =>
              toggleMenu('reportes'),
            )}
            {renderSidebarMenu(MENU_CONFIG.DOCUMENTOS, false, () => {})}
            <Link
              href="/subtrackvelnew/geocercas"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => toggleMenu('sidebar')}
            >
              <div className="group flex cursor-pointer items-center gap-4 border border-gray-200/50 bg-white/80 p-2 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-orange-200/60 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:shadow-lg hover:shadow-orange-100/50">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                  <MdDisplaySettings className="text-lg text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800 transition-colors duration-300 group-hover:text-orange-700">
                    Geocercas
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
          </div>
        ) : isView ? (
          // SIDEBAR PARA VIEWERS
          <div className="mb-0 space-y-0">
            {/* Agregar Rastreo Móvil solo para mitsubishi */}
            {username === 'mitsubishi' &&
              renderSidebarMenu(MENU_CONFIG.RASTREO, false, () => {})}

            {renderSidebarMenu(MENU_CONFIG.REPORTES, openMenus.reportes, () =>
              toggleMenu('reportes'),
            )}
          </div>
        ) : (
          <div className="mb-0 space-y-0">
            {isSedapal ? (
              <>
                {renderSidebarMenu(
                  MENU_CONFIG.REPORTES,
                  openMenus.reportes,
                  () => toggleMenu('reportes'),
                )}
                {renderSidebarMenu(MENU_CONFIG.DOCUMENTOS, false, () => {})}
                <Link
                  href="/trackvelnew/geocercas"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => toggleMenu('sidebar')}
                >
                  <div className="group flex cursor-pointer items-center gap-4 border border-gray-200/50 bg-white/80 p-2 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-orange-200/60 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:shadow-lg hover:shadow-orange-100/50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                      <MdDisplaySettings className="text-lg text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-800 transition-colors duration-300 group-hover:text-orange-700">
                        Geocercas
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
              </>
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

                <Link
                  href="/trackvelnew/geocercas"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => toggleMenu('sidebar')}
                >
                  <div className="group flex cursor-pointer items-center gap-4 border border-gray-200/50 bg-white/80 p-2 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-orange-200/60 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 hover:shadow-lg hover:shadow-orange-100/50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                      <MdDisplaySettings className="text-lg text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-800 transition-colors duration-300 group-hover:text-orange-700">
                        Geocercas
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
