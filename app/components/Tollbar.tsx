'use client';
import '@/app/styles/tollbar.css';
import { IoMdArrowDropdown, IoMdArrowDropleft } from 'react-icons/io';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppModalReportes from '../trackvelnew/estadistica/reportegeneral/ModalReportes';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import AppModalVelocidad from '../trackvelnew/estadistica/reportevelocidad/ModalVelocidad';
import { RiFullscreenLine } from 'react-icons/ri';
import { IoMdExit } from 'react-icons/io';
import { MdChevronRight } from 'react-icons/md';
import { GrServices } from 'react-icons/gr';
import { GrPlan } from 'react-icons/gr';
import { RiGpsFill } from 'react-icons/ri';
import { MdDisplaySettings } from 'react-icons/md';
import { TbReportSearch } from 'react-icons/tb';
import { SlMenu } from 'react-icons/sl';
import { useApi } from '@/context/ApiContext';
import { GiHamburgerMenu } from 'react-icons/gi';
import Profile from './Profile';

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

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
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

  return (
    <div className="tollbar menu__wrapper">
      <div className="tollbar-bg"></div>
      <div className="menu__bar">
        <div className="mobile-only-button">
          <button onClick={() => signOut({ callbackUrl: '/' })}>
            <IoMdExit size={25} />
          </button>
          <button>
            <RiFullscreenLine onClick={toggleFullScreen} size={20} />
          </button>
          <button onClick={toggleSidebar}>
            <SlMenu size={20} />
          </button>
        </div>

        <a href="/trackvelnew" title="Logo" className="logo">
          <div className="logitoTollbar">
            <Image src="/LogoWeb.png" alt="" width={'1000'} height={'1000'} />
          </div>
          <div className="dataUser">
            <h3 className="userInicio">
              TRACKVEL SYSTEM : BIENVENIDO {username.toUpperCase()}
            </h3>
          </div>
        </a>

        {baseUrl === 'https://sub.velsat.pe:8586' ? (
          <ul className="navigation">
            <li className="dropdown">
              <Link
                href="#"
                title="Estadísticas"
                className={activeLink === 4 ? 'active' : ''}
                onClick={() => handleLinkClick(4)}
              >
                <div className="optMenu">Reportes</div>
                <i className="dropdown-iconn">
                  <IoMdArrowDropdown />
                </i>
              </Link>

              <ul
                className={`dropdown-menue estad${
                  isServicesMenuOpen ? 'dropdown-menu--show' : ''
                }`}
              >
                <div className="containerEstad"></div>
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
                  <a title="Reporte de Kilometraje">Reporte de Kilometraje</a>
                </li>
              </ul>
            </li>

            <li className="dropdown">
              <Link href="#" title="Estadísticas">
                <div className="optMenu">Recreación</div>
                <i className="dropdown-iconn">
                  <IoMdArrowDropdown />
                </i>
              </Link>
            </li>

            <li className="dropdown">
              <div className="exitToolbar">
                <button>
                  <RiFullscreenLine onClick={toggleFullScreen} size={'20px'} />
                </button>
                <div className="group relative flex items-center">
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="p-2"
                  >
                    <IoMdExit size={22} />
                  </button>
                  <div className="absolute left-1/2 top-full z-10 mt-0.5 -translate-x-1/2 whitespace-nowrap rounded bg-red-700 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    Salir
                  </div>
                </div>
              </div>
            </li>
          </ul>
        ) : (
          <ul className="navigation">
            <li
              className="dropdown bg-[#edf2f4] p-1.5 hover:bg-[#fff]"
              style={{ marginTop: '-8px' }}
            >
              <Link
                href="#"
                title=" Gestión de Servicios"
                className={activeLink === 0 ? 'active' : ''}
                onClick={() => handleLinkClick(0)}
              >
                <div style={{ color: '#212529', fontSize: '12px' }}>
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
                      isProgramacionMenuOpen ? 'dropdown-menu--show' : ''
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
                  <a href="#" title="Control de Servicios">
                    Control de Servicios
                  </a>
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
              className="dropdown bg-[#edf2f4] p-1.5 hover:bg-[#fff] "
              style={{ marginTop: '-8px' }}
            >
              <Link
                href="#"
                title="Planificación"
                className={activeLink === 1 ? 'active' : ''}
                onClick={() => handleLinkClick(1)}
              >
                <div style={{ color: '#212529', fontSize: '12px' }}>
                  Planificación
                </div>
              </Link>

              <ul
                className={`dropdown-menue planificacion${
                  isServicesMenuOpen ? 'dropdown-menu--show' : ''
                }`}
              >
                <div className="containerplan"></div>
                <li>
                  <a href="#" title="Administración Turnos">
                    Administración Turnos
                  </a>
                </li>
                <li>
                  <a href="#" title="Planificación Servicios">
                    Planificación Servicios
                  </a>
                </li>
                <li>
                  <a href="#" title="Re-Planificación Servicios">
                    Re-Planificación Servicios
                  </a>
                </li>
              </ul>
            </li>

            <li
              className="dropdown bg-[#edf2f4] p-1.5 hover:bg-[#fff]"
              style={{ marginTop: '-8px' }}
            >
              <Link
                href="#"
                title="Puntos de Interés"
                className={activeLink === 2 ? 'active' : ''}
                onClick={() => handleLinkClick(2)}
              >
                <div style={{ color: '#212529', fontSize: '12px' }}>
                  Puntos de Interés
                </div>
              </Link>
            </li>
            <li
              className="dropdown bg-[#edf2f4] p-1.5 hover:bg-[#fff]"
              style={{ marginTop: '-8px' }}
            >
              <Link
                href="#"
                title="Operaciones"
                className={activeLink === 3 ? 'active' : ''}
                onClick={() => handleLinkClick(3)}
              >
                <div style={{ color: '#212529', fontSize: '12px' }}>
                  Operaciones
                </div>
              </Link>
            </li>
            <li
              className="dropdown bg-[#edf2f4] p-1.5 hover:bg-[#fcbf49]"
              style={{ marginTop: '-8px' }}
            >
              <Link
                href="#"
                title="Estadísticas"
                className={activeLink === 4 ? 'active' : ''}
                onClick={() => handleLinkClick(4)}
              >
                <div style={{ color: '#212529', fontSize: '12px' }}>
                  Reportes
                </div>

              </Link>

              <ul
                className={`dropdown-menue estad${
                  isServicesMenuOpen ? 'dropdown-menu--show' : ''
                }`}
              >
                <div className="containerEstad"></div>
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
                  <a title="Reporte de Kilometraje">Reporte de Kilometraje</a>
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

           
              <div className="exitToolbar">
                
             
                  <div className="flex w-[50px] items-center justify-center p-0">
                    <Profile toggleFullScreen={toggleFullScreen} />
                  </div>
               
              </div>
          
          </ul>
        )}
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

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <button className="close-sidebar" onClick={toggleSidebar}>
          <MdChevronRight />
        </button>

        <div className="menu_sidebar">
          <div className="flex items-center gap-2">
            <GiHamburgerMenu className="text-xl text-[#343a40]" />
            <span className="text-[#343a40]" style={{ fontSize: '14px' }}>
              MENÚ
            </span>
          </div>
        </div>

        {baseUrl === 'https://sub.velsat.pe:8586' ? (
          <div className="mb-4">
            <div
              className="flex cursor-pointer items-center justify-between  bg-gray-100 p-1 transition hover:bg-gray-200"
              onClick={toggleReportesMenu}
            >
              <div className="flex items-center gap-3">
                <TbReportSearch className="text-xl text-blue-600" />
                <span className="font-medium text-gray-800">Reportes</span>
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
                  onClick={openModalSpeed}
                  className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-white transition hover:bg-blue-100 hover:text-gray-800"
                >
                  Reporte de Velocidad
                </button>

                <button
                  onClick={openModalStops}
                  className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-white transition hover:bg-blue-100 hover:text-gray-800"
                >
                  Reporte de Paradas
                </button>
                <button
                  onClick={openModal}
                  className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-white transition hover:bg-blue-100 hover:text-gray-800"
                >
                  Reporte General
                </button>
                <button
                  onClick={openModalDetails}
                  className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-white transition hover:bg-blue-100 hover:text-gray-800"
                >
                  Detalle Recorrido
                </button>
                <button
                  onClick={openModalKilometers}
                  className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-white transition hover:bg-blue-100 hover:text-gray-800"
                >
                  Reporte de Kilometraje
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="sidebar-section">
              <div
                className="menu-item menu-item-first"
                onClick={() => setIsServicesMenuOpen(!isServicesMenuOpen)}
              >
                <a href="#">
                  <div className="icon_options">
                    <GrServices />
                  </div>
                  Gestión de Servicios
                </a>
                <i
                  className={`dropdown-icon ${isServicesMenuOpen ? 'rotate' : ''}`}
                ></i>
              </div>

              {isServicesMenuOpen && (
                <div className="submenu">
                  <a href="#" title="Conductores">
                    Conductores
                  </a>
                  <a href="#" title="Unidades">
                    Unidades
                  </a>

                  <a
                    href="#"
                    title="Programación"
                    onClick={toggleProgramacionMenu}
                  >
                    Programación
                    <i
                      className={`dropdown-icon ${isProgramacionMenuOpen ? 'rotate' : ''}`}
                    ></i>
                  </a>
                  {isProgramacionMenuOpen && (
                    <div className="submenu-nested">
                      <a href="#" title="Asignar Conductor/Unidad">
                        Asignar Conductor/Unidad
                      </a>
                      <a href="#" title="Carga de Archivo">
                        Carga de Archivo
                      </a>
                      <a href="#" title="Carga de Servicios">
                        Carga de Servicios
                      </a>
                    </div>
                  )}

                  <a href="#" title="Control de Servicios">
                    Control de Servicios
                  </a>
                  <a href="#" title="Detalle de Servicios">
                    Detalle de Servicios
                  </a>
                  <a href="#" title="Control de Servicios">
                    Control LATAM
                  </a>
                  <a href="#" title="Detalle de Servicios">
                    Duración de Servicios
                  </a>
                </div>
              )}
            </div>

            <div className="sidebar-section">
              <div className="menu-item" onClick={togglePlanificacionMenu}>
                <a href="#">
                  <div className="icon_options">
                    <GrPlan />
                  </div>
                  Planificación
                </a>
                <i
                  className={`dropdown-icon ${isPlanificacionMenuOpen ? 'rotate' : ''}`}
                ></i>
              </div>
              {isPlanificacionMenuOpen && (
                <div className="submenu">
                  <a href="#" title="Conductores">
                    Administración de Turnos
                  </a>
                  <a href="#" title="Unidades">
                    Planificación Servicios
                  </a>
                  <a href="#" title="Unidades">
                    Re-Planificación Servicios
                  </a>
                </div>
              )}
            </div>

            <div className="sidebar-section">
              <div className="menu-item">
                <a href="#">
                  {' '}
                  <div className="icon_options">
                    <RiGpsFill />
                  </div>
                  Punto de Interés
                </a>
              </div>
            </div>

            <div className="sidebar-section">
              <div className="menu-item">
                <a href="#">
                  <div className="icon_options">
                    <MdDisplaySettings />
                  </div>
                  Operaciones
                </a>
              </div>
            </div>

            <div className="sidebar-section">
              <div className="menu-item" onClick={toggleReportesMenu}>
                <a href="#">
                  <div className="icon_options">
                    <TbReportSearch />
                  </div>
                  Reportes
                </a>
                <i
                  className={`dropdown-icon ${isReportesMenuOpen ? 'rotate' : ''}`}
                ></i>
              </div>
              {isReportesMenuOpen && (
                <div className="submenu">
                  <a onClick={openModalSpeed} title="Reporte Velocidad">
                    Reporte de Velocidad
                  </a>
                  <a onClick={openModalStops} title="Reporte Paradas">
                    Reporte de Paradas
                  </a>
                  <a onClick={openModal} title="Reporte General">
                    Reporte General
                  </a>
                  <a onClick={openModalDetails} title="Detalle Recorrido">
                    Detalle Recorrido
                  </a>
                  <a onClick={openModalKilometers} title="Reporte Kilometraje">
                    Reporte de Kilometraje
                  </a>
                  <a href="#" title="Paradas Bruscas">
                    Paradas Bruscas
                  </a>
                  <a href="#" title="Encendido Motor">
                    Encendido Motor
                  </a>
                  <a href="#" title="Desconexion Bateria">
                    Desconexión Batería
                  </a>
                  <a href="#" title="Graficas">
                    Gráficas
                  </a>
                  <a href="#" title="Reporte GeoVelocidad">
                    Reporte de GeoVelocidad
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tollbar;
