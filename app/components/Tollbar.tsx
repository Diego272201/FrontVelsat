'use client';
import '@/app/styles/tollbar.css';
import { TbLiveView } from 'react-icons/tb';
import { IoMdArrowDropdown, IoMdArrowDropleft } from 'react-icons/io';

import React, { useState } from 'react';

const Tollbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState(null);
  const [isServicesMenuOpen, setIsServicesMenuOpen] = useState(false);
  const [isProgramacionMenuOpen, setIsProgramacionMenuOpen] = useState(false);

  const handleLinkClick = (index: any) => {
    setActiveLink(index);

    if (index !== 0) {
      setIsServicesMenuOpen(false);
    }
  };

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleServicesMenu = () => {
    setIsServicesMenuOpen(!isServicesMenuOpen);
  };

  const toggleProgramacionMenu = () => {
    setIsProgramacionMenuOpen(!isProgramacionMenuOpen);
  };

  return (
    <div className="tollbar menu__wrapper">
      <div className="tollbar-bg"></div>
      <div className="menu__bar">
        <a href="/trackvelnew" title="Logo" className="logo">
          <img src="/LogoWeb.png" alt="" />
          <h2>TRACKVEL SYSTEM -</h2>
          <h2 className="userInicio">Bienvenido Cgacela S.A.C</h2>
        </a>

        <img
          className="menu-icon"
          src={isMobileMenuOpen ? '/cerrar.png' : '/menu.png'}
          title="Burger Menu"
          alt="Burger Menu"
          onClick={toggleMenu}
        />
        <ul
          className={`navigation ${
            isMobileMenuOpen ? 'navigation--mobile' : ''
          }`}
        >
          <img
            className="menu-icon mobileicon"
            src={isMobileMenuOpen ? '/cerrar.png' : 'menu.png'}
            title="Burger Menu"
            alt="Burger Menu"
            onClick={toggleMenu}
          />

          <li className="dropdown">
            <a
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
            </a>

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
            <a
              href="#"
              title="Planificación"
              className={activeLink === 1 ? 'active' : ''}
              onClick={() => handleLinkClick(1)}
            >
              {' '}
              Planificación{' '}
              <i className="dropdown-iconn">
                <IoMdArrowDropdown />
              </i>
            </a>

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
            <a
              href="#"
              title="Puntos de Interés"
              className={activeLink === 2 ? 'active' : ''}
              onClick={() => handleLinkClick(2)}
            >
              {' '}
              Puntos de Interés{' '}
            </a>
          </li>
          <li className="dropdown">
            <a
              href="#"
              title="Operaciones"
              className={activeLink === 3 ? 'active' : ''}
              onClick={() => handleLinkClick(3)}
            >
              {' '}
              Operaciones{' '}
              <i className="dropdown-iconn">
                <IoMdArrowDropdown />
              </i>
            </a>

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
            </ul>
          </li>
          <li className="dropdown">
            <a
              href="#"
              title="Estadísticas"
              className={activeLink === 4 ? 'active' : ''}
              onClick={() => handleLinkClick(4)}
            >
              {' '}
              Estadísticas{' '}
              <i className="dropdown-iconn">
                <IoMdArrowDropdown />
              </i>
            </a>

            <ul
              className={`dropdown-menue estad${
                isServicesMenuOpen ? 'dropdown-menu--show' : ''
              }`}
            >
              <div className="containerEstad"></div>
              <li>
                <a href="#" title="Reporte de Velocidad">
                  Reporte de Velocidad
                </a>
              </li>
              <li>
                <a href="#" title="Reporte de Paradas">
                  Reporte de Paradas
                </a>
              </li>
              <li>
                <a href="#" title="Reporte General">
                  Reporte General
                </a>
              </li>
              <li>
                <a href="#" title="Detalle Recorrido">
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
        </ul>
      </div>
    </div>
  );
};

export default Tollbar;
