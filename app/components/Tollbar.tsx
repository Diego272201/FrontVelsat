'use client';
import '@/app/styles/tollbar.css';
import { IoMdArrowDropleft } from 'react-icons/io';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppModalReportes from '../trackvelnew/estadistica/reportegeneral/ModalReportes';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import AppModalVelocidad from '../trackvelnew/estadistica/reportevelocidad/ModalVelocidad';
import { MdChevronRight, MdOutlineMiscellaneousServices } from 'react-icons/md';
import { GrServices } from 'react-icons/gr';
import { GrPlan } from 'react-icons/gr';
import { RiGpsFill } from 'react-icons/ri';
import { MdDisplaySettings } from 'react-icons/md';
import { TbReportSearch } from 'react-icons/tb';
import { SlMenu } from 'react-icons/sl';
import { useApi } from '@/context/ApiContext';
import Profile from './Profile';
import { useSearchParams } from 'next/navigation';
import { usePathname } from 'next/navigation';
import AppModalServicios from '../trackvelnew/estadistica/detallerecorridoservicios/ModalServicios';
import { Spinner } from '@nextui-org/react';

const Tollbar = () => {
  const [username, setUsername] = useState('');

  useEffect(() => {
    const storedUsername = localStorage.getItem('currentUser');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const { baseUrl } = useApi();

  const [activeLink, setActiveLink] = useState(null);

  const [isServicesMenuOpen, setIsServicesMenuOpen] = useState(false);
  const [isProgramacionMenuOpen, setIsProgramacionMenuOpen] = useState(false);
  const [isPlanificacionMenuOpen, setIsPlanificacionMenuOpen] = useState(false);
  const [isReportesMenuOpen, setIsReportesMenuOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpenStops, setIsModalOpenStops] = useState(false);
  const [isModalOpenDetails, setIsModalOpenDetails] = useState(false);

  const [isModalOpenSpeed, setIsModalOpenSpeed] = useState(false);
  const [isModalOpenKilometer, setIsModalOpenKilometers] = useState(false);

  const [isModalServicios, setIsModalServicios] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openServicios = () => {
    setIsModalServicios(true);
  };

  const closeModalServicios = () => {
    setIsModalServicios(false);
  };

  const openModalStops = () => {
    setIsModalOpenStops(true);
  };

  const closeModalStops = () => {
    setIsModalOpenStops(false);
  };

  const openModalDetails = () => {
    setIsModalOpenDetails(true);
  };

  const closeModalDetails = () => {
    setIsModalOpenDetails(false);
  };

  const closeModalSpeed = () => {
    setIsModalOpenSpeed(false);
  };

  const openModalSpeed = () => {
    setIsModalOpenSpeed(true);
  };

  const openModalKilometers = () => {
    setIsModalOpenKilometers(true);
  };

  const closeModalKilometers = () => {
    setIsModalOpenKilometers(false);
  };

  const handleLinkClick = (index: any) => {
    setActiveLink(index);

    if (index !== 0) {
      setIsServicesMenuOpen(false);
    }
  };

  const toggleProgramacionMenu = () => {
    setIsProgramacionMenuOpen(!isProgramacionMenuOpen);
  };

  const togglePlanificacionMenu = () => {
    setIsPlanificacionMenuOpen(!isPlanificacionMenuOpen);
  };

  const toggleReportesMenu = () => {
    setIsReportesMenuOpen(!isReportesMenuOpen);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const searchParams = useSearchParams();

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const deviceId = searchParams.get('deviceId');

  const pathname = usePathname();
  const isTrackvel = pathname === '/trackvelnew';

  const isSedapalDetalleRecorrido =
    baseUrl === 'https://sub.velsat.pe:8586' &&
    pathname.includes('detallerecorrido');

  const formatDateTime = (input: string | null) => {
    if (!input) return '';
    const date = new Date(input);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  return (
    <div className="tollbar menu__wrapper">
      <div
        className={
          isTrackvel
            ? baseUrl === 'https://sub.velsat.pe:8586'
              ? 'tollbar-bgsub'
              : 'tollbar-bg'
            : 'tollbar-bg-alt'
        }
      />

      <div className="menu__bar">
        <div className="mobile-only-button">
          <div className="exitToolbarM bg-[#edf2f4] bg-opacity-10">
            <div className="flex w-[50px] items-center justify-center p-0">
              <Profile toggleFullScreen={toggleFullScreen} />
            </div>
          </div>

          <button
            onClick={toggleSidebar}
            className="mt-[-5px] h-[36px] bg-[#FB7B0F] bg-opacity-90 px-2 py-1"
          >
            <SlMenu size={20} />
          </button>
        </div>

        <div className="mt-[-5px] flex items-center gap-1">
          <a
            href="/trackvelnew"
            title="Logo"
            className="mt-[-5px] px-1 sm:mt-1"
          >
            <div
              className={
                isTrackvel
                  ? 'imgTrack ml-[2px] mt-[-1px]'
                  : 'imgMain ml-[2px] mt-[-5px]'
              }
            >
              <Image
                src="/LogoWeb.png"
                alt="Logo"
                width={22}
                height={22}
                className="h-[35px] w-[22px]"
              />
            </div>
          </a>

          <div>
            <h3 className="text-[12px] text-white sm:text-[14px]">
              TRACKVEL SYSTEM : BIENVENIDO {username.toUpperCase()}
            </h3>
          </div>

          {isSedapalDetalleRecorrido && (
            <div className="} ml-2 mt-[-1px] flex items-center justify-center gap-2 text-white">
              <div className="mr-2 h-8 w-px bg-gray-300"></div>
              Fechas:{' '}
              <span style={{ fontWeight: 'normal' }}>
                {formatDateTime(startDate)} - {formatDateTime(endDate)}
              </span>{' '}
              Unidad:{' '}
              <span style={{ fontWeight: 'normal' }}>
                {deviceId?.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <ul className="navigation">
          {username === 'talmav' ? (
            <>
              <li
                onClick={openServicios}
                className="dropdown bg-[#edf2f4] bg-opacity-10 p-1.5 text-white hover:bg-[#fff] hover:text-black"
                style={{ marginTop: '-8px' }}
              >
                <div className="p-1 text-[12px]">Recorrido Servicios</div>
              </li>

              <div className="exitToolbar bg-[#edf2f4] bg-opacity-10">
                <div className="flex w-[50px] items-center justify-center p-0">
                  <Profile toggleFullScreen={toggleFullScreen} />
                </div>
              </div>
            </>
          ) : (
            <>
              {!baseUrl ? (
                <li className="mt-[-8px] text-white">
                  <Spinner size="sm" color="warning" />
                </li>
              ) : baseUrl === 'https://sub.velsat.pe:8586' ? (
                <>
                  <li
                    className="dropdown bg-[#edf2f4] bg-opacity-10 p-1.5 text-white hover:bg-[#fff] hover:text-black"
                    style={{ marginTop: '-8px' }}
                  >
                    <Link
                      href="#"
                      title="Reportes"
                      className={activeLink === 4 ? 'active' : ''}
                      onClick={() => handleLinkClick(4)}
                    >
                      <div style={{ fontSize: '12px' }}>Reportes</div>
                    </Link>
                    <ul
                      className={`dropdown-menue estad${
                        isServicesMenuOpen ? 'dropdown-menu--show' : ''
                      }`}
                    >
                      <li onClick={openModalSpeed}>
                        <a title="Reporte de Velocidad">Reporte de Velocidad</a>
                      </li>
                      <li onClick={openModalStops}>
                        <a title="Reporte de Paradas">Reporte de Paradas</a>
                      </li>
                      <li onClick={openModal}>
                        <a title="Reporte General">Reporte General</a>
                      </li>
                      <li onClick={openModalDetails}>
                        <a title="Detalle Recorrido">Detalle Recorrido</a>
                      </li>
                      <li onClick={openModalKilometers}>
                        <a title="Reporte de Kilometraje">
                          Reporte de Kilometraje
                        </a>
                      </li>
                    </ul>
                  </li>

                  <li
                    className="dropdown bg-[#edf2f4] bg-opacity-10 p-1.5 text-white hover:bg-[#fff] hover:text-black"
                    style={{ marginTop: '-8px' }}
                  >
                    <Link href="#" title="Recreación">
                      <div style={{ fontSize: '12px' }}>Recreación</div>
                    </Link>
                  </li>

                  <div className="exitToolbar bg-[#edf2f4] bg-opacity-10">
                    <div className="flex w-[50px] items-center justify-center p-0">
                      <Profile toggleFullScreen={toggleFullScreen} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <ul className="navigation">
                    <li
                      className="dropdown bg-[#edf2f4] bg-opacity-10 p-1.5 text-white hover:bg-[#fff] hover:text-black "
                      style={{ marginTop: '-8px' }}
                    >
                      <Link
                        href="#"
                        title=" Gestión de Servicios"
                        className={activeLink === 0 ? 'active' : ''}
                        onClick={() => handleLinkClick(0)}
                      >
                        <div style={{ fontSize: '12px' }}>
                          Gestión de Servicios
                        </div>
                      </Link>

                      <ul
                        className={`dropdown-menue ${
                          isServicesMenuOpen ? 'dropdown-menu--show' : ''
                        }`}
                      >
                        <div className="container"></div>
                        <li>
                          <a href="#" title="Conductores">
                            Conductores
                          </a>
                        </li>
                        <li>
                          <a href="#" title="Unidades">
                            Unidades
                          </a>
                        </li>

                        <li className="ProgramacionHover">
                          <a
                            href="#"
                            title="Programación"
                            onClick={toggleProgramacionMenu}
                          >
                            {' '}
                            <i className="dropdown-icon">
                              <IoMdArrowDropleft />
                            </i>
                            Programación{' '}
                          </a>

                          <ul
                            className={`dropdown-menue-left ${
                              isProgramacionMenuOpen
                                ? 'dropdown-menu--show'
                                : ''
                            }`}
                          >
                            <li>
                              <a href="#" title="Asignar Conductor/Unidad">
                                Asignar Conductor/Unidad
                              </a>
                            </li>
                            <li>
                              <a href="#" title="Carga de Archivo">
                                Carga de Archivo
                              </a>
                            </li>
                            <li>
                              <a href="#" title="Carga de Servicios">
                                Carga de Servicios
                              </a>
                            </li>
                          </ul>
                        </li>

                        <li>
                          <Link
                            href="/trackvelnew/gestionservicios"
                            title="Control de Servicios"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Control de Servicios
                          </Link>
                        </li>

                        <li>
                          <a href="#" title="Detalle de Servicios">
                            Detalle de Servicios
                          </a>
                        </li>
                        <li>
                          <a href="#" title="Control LATAM">
                            Control LATAM
                          </a>
                        </li>
                        <li>
                          <a href="#" title="Duración de Servicios">
                            Duración de Servicios
                          </a>
                        </li>
                      </ul>
                    </li>

                    <li
                      className="dropdown  bg-[#edf2f4] bg-opacity-10 p-1.5 text-white hover:bg-[#fff] hover:text-black "
                      style={{ marginTop: '-8px' }}
                    >
                      <Link
                        href="#"
                        title="Planificación"
                        className={activeLink === 1 ? 'active' : ''}
                        onClick={() => handleLinkClick(1)}
                      >
                        <div style={{ fontSize: '12px' }}>Planificación</div>
                      </Link>

                      <ul
                        className={`dropdown-menue planificacion${
                          isServicesMenuOpen ? 'dropdown-menu--show' : ''
                        }`}
                      >
                        <div className="containerplan"></div>
                        <li>
                          <Link
                            href="/trackvelnew/planificacion/administracionturnos"
                            title="Administración Turnos"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Administración Turnos
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/trackvelnew/planificacion/planificacionTep"
                            title="Planificación Servicios"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Planificación Servicios
                          </Link>
                        </li>
                        <li>
                          <a href="#" title="Re-Planificación Servicios">
                            Re-Planificación Servicios
                          </a>
                        </li>
                      </ul>
                    </li>

                    <li
                      className="dropdown  bg-[#edf2f4] bg-opacity-10 p-1.5 text-white hover:bg-[#fff] hover:text-black "
                      style={{ marginTop: '-8px' }}
                    >
                      <Link
                        href="/trackvelnew/gestionpasajeros"
                        title="Gestión de Pasajeros"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={activeLink === 2 ? 'active' : ''}
                        onClick={() => handleLinkClick(2)}
                      >
                        <div style={{ fontSize: '12px' }}>
                          Gestión de Pasajeros
                        </div>
                      </Link>
                    </li>
                    <li
                      className="dropdown  bg-[#edf2f4] bg-opacity-10 p-1.5 text-white hover:bg-[#fff] hover:text-black "
                      style={{ marginTop: '-8px' }}
                    >
                      <Link
                        href="#"
                        title="Operaciones"
                        className={activeLink === 3 ? 'active' : ''}
                        onClick={() => handleLinkClick(3)}
                      >
                        <div style={{ fontSize: '12px' }}>Operaciones</div>
                      </Link>
                    </li>
                    <li
                      className="dropdown  bg-[#edf2f4] bg-opacity-10 p-1.5 text-white hover:bg-[#fff] hover:text-black"
                      style={{ marginTop: '-8px' }}
                    >
                      <Link
                        href="#"
                        title="Reportes"
                        className={activeLink === 4 ? 'active' : ''}
                        onClick={() => handleLinkClick(4)}
                      >
                        <div style={{ fontSize: '12px' }}>Reportes</div>
                      </Link>

                      <ul
                        className={`dropdown-menue estad${
                          isServicesMenuOpen ? 'dropdown-menu--show' : ''
                        }`}
                      >
                        <li onClick={openModalSpeed}>
                          <a title="Reporte de Velocidad">
                            Reporte de Velocidad
                          </a>
                        </li>

                        <li onClick={openModalStops}>
                          <a title="Reporte de Paradas">Reporte de Paradas</a>
                        </li>

                        <li onClick={openModal}>
                          <a title="Reporte General">Reporte General</a>
                        </li>

                        <li onClick={openModalDetails}>
                          <a title="Detalle Recorrido">Detalle Recorrido</a>
                        </li>
                        <li onClick={openModalKilometers}>
                          <a title="Reporte de Kilometraje">
                            Reporte de Kilometraje
                          </a>
                        </li>
                        <li>
                          <a href="#" title="Paradas Bruscas">
                            Paradas Bruscas
                          </a>
                        </li>
                        <li>
                          <a href="#" title="Encendido Motor">
                            Encendido Motor
                          </a>
                        </li>
                        <li>
                          <a href="#" title="Desconexión Batería">
                            Desconexión Batería
                          </a>
                        </li>
                        <li>
                          <a href="#" title="Gráficas">
                            Gráficas
                          </a>
                        </li>
                        <li>
                          <a href="#" title="Reporte de GeoVelocidad">
                            Reporte de GeoVelocidad
                          </a>
                        </li>
                      </ul>
                    </li>

                    <div className="exitToolbar bg-[#edf2f4] bg-opacity-10">
                      <div className="flex w-[50px] items-center justify-center p-0">
                        <Profile toggleFullScreen={toggleFullScreen} />
                      </div>
                    </div>
                  </ul>
                </>
              )}
            </>
          )}
        </ul>
      </div>
      <AppModalReportes
        isOpen={isModalOpen}
        onClose={closeModal}
        titulo="REPORTE GENERAL"
        nameurl="reportegeneral"
        namedown="downloadExcelG"
        namedesc="general"
        showDownloadButton={true}
      />
      <AppModalReportes
        isOpen={isModalOpenStops}
        onClose={closeModalStops}
        titulo="REPORTE DE PARADAS"
        nameurl="reporteparadas"
        namedown="downloadExcelS"
        namedesc="paradas"
        showDownloadButton={true}
      />
      <AppModalReportes
        isOpen={isModalOpenDetails}
        onClose={closeModalDetails}
        titulo="DETALLE RECORRIDO"
        nameurl="detallerecorrido"
        namedown=""
        namedesc=""
        showDownloadButton={false}
      />

      <AppModalVelocidad
        isOpen={isModalOpenSpeed}
        onClose={closeModalSpeed}
        titulo="REPORTE VELOCIDAD"
        nameurl="reportevelocidad"
        namedown="downloadExcelV"
        namedesc="velocidad"
        showDownloadButton={true}
      />

      <AppModalReportes
        isOpen={isModalOpenKilometer}
        onClose={closeModalKilometers}
        titulo="REPORTE DE KILOMETRAJE"
        nameurl="reportekilometraje"
        namedown="downloadExcelK"
        namedesc="kilometraje"
        showDownloadButton={true}
        useSelectAll={true}
      />

      <AppModalServicios
        isOpen={isModalServicios}
        onClose={closeModalServicios}
        titulo="REPORTE DE RECORRIDO DE SERVICIOS"
        nameurl="detallerecorridoservicios"
        namedown="downloadExcelG"
        namedesc="general"
        showDownloadButton={true}
      />

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <button className="close-sidebar" onClick={toggleSidebar}>
          <MdChevronRight />
        </button>

        <div className="menu_sidebar">
          <div className="flex items-center gap-2 ">
            <span className="text-[#212529]" style={{ fontSize: '13px' }}>
              MENÚ
            </span>
          </div>
        </div>

        {username === 'talmav' ? (
          <div className="flex items-center gap-3 bg-gray-100  p-2 transition hover:bg-gray-300">
            <MdOutlineMiscellaneousServices className="text-xl text-blue-600" />
            <span
              onClick={openServicios}
              className="text-[13px] font-medium text-gray-800"
            >
              Recorrido Servicios
            </span>
          </div>
        ) : (
          <>
            {baseUrl === 'https://sub.velsat.pe:8586' ? (
              <div className="mb-4">
                <div
                  className="flex cursor-pointer items-center justify-between bg-gray-100 p-2 transition hover:bg-gray-200"
                  onClick={toggleReportesMenu}
                >
                  <div className="flex items-center gap-3">
                    <TbReportSearch className="text-xl text-blue-600" />
                    <span className="text-[13px] font-medium text-gray-800">
                      Reportes
                    </span>
                  </div>
                  <svg
                    className={`h-4 w-4 transform text-gray-500 transition-transform duration-300 ${
                      isReportesMenuOpen ? 'rotate-90' : ''
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

                {isReportesMenuOpen && (
                  <div className="ml-5 mt-2 space-y-1">
                    <button
                      onClick={() => {
                        openModalSpeed();
                        toggleSidebar();
                      }}
                      className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800"
                    >
                      Reporte de Velocidad
                    </button>

                    <button
                      onClick={() => {
                        openModalStops();
                        toggleSidebar();
                      }}
                      className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800"
                    >
                      Reporte de Paradas
                    </button>
                    <button
                      onClick={() => {
                        openModal();
                        toggleSidebar();
                      }}
                      className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800"
                    >
                      Reporte General
                    </button>
                    <button
                      onClick={() => {
                        openModalDetails();
                        toggleSidebar();
                      }}
                      className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800"
                    >
                      Detalle Recorrido
                    </button>
                    <button
                      onClick={() => {
                        openModalKilometers();
                        toggleSidebar();
                      }}
                      className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800"
                    >
                      Reporte de Kilometraje
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4 space-y-2">
                <div>
                  <div
                    className="flex cursor-pointer items-center justify-between bg-gray-100 p-3 transition hover:bg-gray-200"
                    onClick={() => setIsServicesMenuOpen(!isServicesMenuOpen)}
                  >
                    <div className="flex items-center gap-3">
                      <GrServices className="text-xl text-blue-600" />
                      <span className="text-[13px] font-medium text-gray-800">
                        Gestión de Servicios
                      </span>
                    </div>
                    <svg
                      className={`h-4 w-4 transform text-gray-500 transition-transform duration-300 ${isServicesMenuOpen ? 'rotate-90' : ''}`}
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

                  {isServicesMenuOpen && (
                    <div className="mb-4 ml-5 mt-2 space-y-1">
                      <button className="block w-full bg-white px-3 py-1.5 text-left  text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                        Conductores
                      </button>
                      <button className="block w-full bg-white px-3 py-1.5 text-left  text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                        Unidades
                      </button>

                      <div>
                        <div
                          className="mb-[-20px] flex cursor-pointer items-center justify-between bg-white px-3 py-1.5 text-sm text-gray-900 hover:bg-blue-100 hover:text-gray-800"
                          onClick={toggleProgramacionMenu}
                        >
                          <span className="text-[12px]">Programación</span>
                          <svg
                            className={`h-4 w-4 transform text-gray-500 transition-transform duration-300 ${isProgramacionMenuOpen ? 'rotate-90' : ''}`}
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
                        {isProgramacionMenuOpen && (
                          <div className="mb-[-20px] ml-4 mt-6 space-y-1">
                            <button className="block w-full bg-white px-3 py-1.5 text-left  text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                              Asignar Conductor/Unidad
                            </button>
                            <button className="block w-full bg-white px-3 py-1.5 text-left  text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                              Carga de Archivo
                            </button>
                            <button className="block w-full bg-white px-3 py-1.5 text-left  text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                              Carga de Servicios
                            </button>
                          </div>
                        )}
                      </div>

                      <Link
                        href="/trackvelnew/gestionservicios"
                        title="Control de Servicios"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <button className="block w-full bg-white px-3 py-1.5 text-left  text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                          Control de Servicios
                        </button>
                      </Link>
                      <button className="block w-full bg-white px-3 py-1.5 text-left  text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                        Detalle de Servicios
                      </button>
                      <button className="block w-full bg-white px-3 py-1.5 text-left  text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                        Control LATAM
                      </button>
                      <button className="block w-full bg-white px-3 py-1.5 text-left  text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                        Duración de Servicios
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div
                    className="mt-[-8px] flex cursor-pointer items-center justify-between bg-gray-100 p-3 transition hover:bg-gray-200"
                    onClick={togglePlanificacionMenu}
                  >
                    <div className="flex items-center gap-3 ">
                      <GrPlan className="text-xl text-blue-600" />
                      <span className="text-[13px] font-medium text-gray-800">
                        Planificación
                      </span>
                    </div>
                    <svg
                      className={`h-4 w-4 transform text-gray-500 transition-transform duration-300 ${isPlanificacionMenuOpen ? 'rotate-90' : ''}`}
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

                  {isPlanificacionMenuOpen && (
                    <div className="ml-5 mt-2 space-y-1">
                      <Link
                        href="/trackvelnew/planificacion/administracionturnos"
                        onClick={() => setIsSidebarOpen(false)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <button className="mb-[-20px] mt-[-24px] block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                          Administración Turnos
                        </button>
                      </Link>

                      <Link
                        href="/trackvelnew/planificacion/planificacionTep"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <button
                          className="mb-[-20px] block w-full  bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800"
                          onClick={() => setIsSidebarOpen(false)}
                        >
                          Planificación Servicios
                        </button>
                      </Link>
                      <Link href="#">
                        <button className="mb-3 block w-full  bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                          Re-Planificación Servicios
                        </button>
                      </Link>
                    </div>
                  )}
                </div>

                <Link
                  href="/trackvelnew/gestionpasajeros"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <div className="flex items-center gap-3 bg-gray-100 p-3 transition hover:bg-gray-200">
                    <RiGpsFill className="text-xl text-blue-600" />
                    <span className="text-[13px] font-medium text-gray-800">
                      Gestión de Pasajeros
                    </span>
                  </div>
                </Link>

                <div>
                  <div className="mt-[-8px] flex items-center gap-3 bg-gray-100 p-3 transition  hover:bg-gray-200">
                    <MdDisplaySettings className="text-xl text-blue-600" />
                    <span className="text-[13px] font-medium text-gray-800">
                      Operaciones
                    </span>
                  </div>
                </div>

                <div>
                  <div
                    className="mt-[-10px] flex cursor-pointer items-center justify-between bg-gray-100 p-3 transition hover:bg-gray-200"
                    onClick={toggleReportesMenu}
                  >
                    <div className="flex items-center gap-3">
                      <TbReportSearch className="text-xl text-blue-600" />
                      <span className="text-[13px] font-medium text-gray-800">
                        Reportes
                      </span>
                    </div>
                    <svg
                      className={`h-4 w-4 transform text-gray-500 transition-transform duration-300 ${isReportesMenuOpen ? 'rotate-90' : ''}`}
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

                  {isReportesMenuOpen && (
                    <div className="ml-5 mt-2 space-y-1">
                      <button
                        onClick={() => {
                          openModalSpeed();
                          toggleSidebar();
                        }}
                        className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800"
                      >
                        Reporte de Velocidad
                      </button>
                      <button
                        onClick={() => {
                          openModalStops();
                          toggleSidebar();
                        }}
                        className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800"
                      >
                        Reporte de Paradas
                      </button>
                      <button
                        onClick={() => {
                          openModal();
                          toggleSidebar();
                        }}
                        className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800"
                      >
                        Reporte General
                      </button>
                      <button
                        onClick={() => {
                          openModalDetails();
                          toggleSidebar();
                        }}
                        className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800"
                      >
                        Detalle Recorrido
                      </button>
                      <button
                        onClick={() => {
                          openModalKilometers();
                          toggleSidebar();
                        }}
                        className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800"
                      >
                        Reporte de Kilometraje
                      </button>
                      <button className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                        Paradas Bruscas
                      </button>
                      <button className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                        Encendido Motor
                      </button>
                      <button className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                        Desconexión Batería
                      </button>
                      <button className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                        Gráficas
                      </button>
                      <button className="block w-full bg-white px-3 py-1.5 text-left text-[12px] text-gray-900 transition hover:bg-blue-100 hover:text-gray-800">
                        Reporte de GeoVelocidad
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Tollbar;
