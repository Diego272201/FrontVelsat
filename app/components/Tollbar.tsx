'use client';
import '@/app/styles/tollbar.css';
import { IoMdArrowDropdown, IoMdArrowDropleft } from 'react-icons/io';
import React, { useState } from 'react';
import Link from 'next/link';
import AppModalPrueba from '../trackvelnew/estadistica/reportegeneral/ModalPrueba';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import AppModalVelocidad from '../trackvelnew/estadistica/reportevelocidad/ModalVelocidad';
import { TbReportSearch } from "react-icons/tb";
import { RiGpsFill } from "react-icons/ri";

const Tollbar = () => {
  const { data: session } = useSession();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState(null);

  const [isServicesMenuOpen, setIsServicesMenuOpen] = useState(false);
  const [isProgramacionMenuOpen, setIsProgramacionMenuOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpenStops, setIsModalOpenStops] = useState(false);
  const [isModalOpenDetails, setIsModalOpenDetails] = useState(false);

  const [isModalOpenSpeed, setIsModalOpenSpeed] = useState(false);

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
  }

  
  const openModalSpeed = () => {
    setIsModalOpenSpeed(true);
  };

  const handleLinkClick = (index: any) => {
    setActiveLink(index);

    if (index !== 0) {
      setIsServicesMenuOpen(false);
    }
  };

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };



  const toggleProgramacionMenu = () => {
    setIsProgramacionMenuOpen(!isProgramacionMenuOpen);
  };

  const handleReportesClick = () => {
    const menuIcon = document.querySelector('.menu-icon') as HTMLButtonElement;
    if (menuIcon) {
      menuIcon.click();
    }
  };

  return (
    <div className="tollbar menu__wrapper verTu">
      <div className="tollbar-bg"></div>
      <div className="menu__bar">
        <a href="/trackvelnew" title="Logo" className="logo">
          <Image src="/LogoWeb.png" alt="" width={'1000'} height={'1000'}/>
          <div className="dataUser">
            <h3 className="userInicio">
              TRACKVEL SYSTEM : BIENVENIDO{' '}
              {session?.user.username.toUpperCase()}
            </h3>
          </div>
        </a>

        <Image
          className="menu-icon"
          src={isMobileMenuOpen ? '/cerrar.png' : '/menu.png'}
          title="Burger Menu"
          alt="Burger Menu"
          onClick={toggleMenu}
          width={'1000'} height={'1000'}
        />
        <ul
          className={`navigation ${
            isMobileMenuOpen ? 'navigation--mobile' : ''
          }`}
        >
          <Image
            className="menu-icon mobileicon"
            src={isMobileMenuOpen ? '/cerrar.png' : '/menu.png'}
            title="Burger Menu"
            alt="Burger Menu"
            onClick={toggleMenu}
            width={'1000'} height={'1000'}
          />

          <li className="dropdown">
            <Link
              href="#"
              title=" Gestión de Servicios"
              className={activeLink === 0 ? 'active' : ''}
              onClick={() => handleLinkClick(0)}
            >
              {' '}
              Gestión de Servicios{' '}
              <i className="dropdown-iconn">
                <IoMdArrowDropdown />
              </i>
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

          <li className="dropdown">
            <Link
              href="#"
              title="Planificación"
              className={activeLink === 1 ? 'active' : ''}
              onClick={() => handleLinkClick(1)}
            >
              Planificación
              <i className="dropdown-iconn">
                <IoMdArrowDropdown />
              </i>
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

          <li className="dropdown">
            <Link
              href="#"
              title="Puntos de Interés"
              className={activeLink === 2 ? 'active' : ''}
              onClick={() => handleLinkClick(2)}
            >
              <div className="optMenu">
              Puntos de Interés
              <RiGpsFill />
              </div>
            </Link>
          </li>
          <li className="dropdown">
            <Link
              href="#"
              title="Operaciones"
              className={activeLink === 3 ? 'active' : ''}
              onClick={() => handleLinkClick(3)}
            >
              Operaciones{' '}
              {/* <i className="dropdown-iconn">
                <IoMdArrowDropdown />
              </i> */}
            </Link>
            {/* 
            <ul
              className={`dropdown-menue ope${
                isServicesMenuOpen ? 'dropdown-menu--show' : ''
              }`}
            >
              <div className="containerope"></div>
              <li>
                <a href="#" title="Unidades Cercanas">
                  Unidades Cercanas
                </a>
              </li>
            </ul> */}
          </li>
          <li className="dropdown">
            <Link
              href="#"
              title="Estadísticas"
              className={activeLink === 4 ? 'active' : ''}
              onClick={() => handleLinkClick(4)}
            >
              <div className="optMenu">
              Reportes
              <TbReportSearch />
              </div>
          

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
                <a href="#" title="Reporte de Velocidad">
                  Reporte de Velocidad
                </a>
              </li>

              <li onClick={openModalStops}>
                <a
                  title="Reporte de Paradas"
                >
                  Reporte de Paradas
                </a>
              </li>

              <li onClick={openModal}>
                <a
                  title="Reporte General"
                >
                  Reporte General
                </a>
              </li>

              <li onClick={openModalDetails}>
                <a
                  title="Detalle Recorrido"
                >
                  Detalle Recorrido
                </a>
              </li>
              <li>
                <a href="#" title="Reporte de Kilometraje">
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

          <li className="dropdown">
         
              <button
                className="exitToolbar"
                color="primary"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <Image src="/exit.png" alt="" width={25} height={'1000'}/>
                Salir
              </button>
   
          </li>
        </ul>
      </div>
      <AppModalPrueba
        isOpen={isModalOpen}
        onClose={closeModal}
        titulo="REPORTE GENERAL"
        nameurl="reportegeneral"
        namedown="downloadExcelG"
        namedesc="general"
        showDownloadButton={true}
      />
      <AppModalPrueba
        isOpen={isModalOpenStops}
        onClose={closeModalStops}
        titulo="REPORTE DE PARADAS"
        nameurl="reporteparadas"
        namedown="downloadExcelS"
        namedesc="paradas"
        showDownloadButton={true}
      />
      <AppModalPrueba
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
      namedown=""
      namedesc=""
      showDownloadButton={true}
      />


    </div>
  );
};

export default Tollbar;