'use client';
import '@/app/styles/tollbar.css';
import { TbLiveView } from 'react-icons/tb';

import React, { useState } from 'react';

const Tollbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [activeLink, setActiveLink] = useState(null);

  const handleLinkClick = (index:any) => {
    setActiveLink(index);
  };

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
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
          src={isMobileMenuOpen ? '/cerrar.png' : 'menu.png'}
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
          
          <li>
            <a href="#" title=" Gestión de Servicios" className={activeLink === 0 ? 'active' : ''}
           onClick={() => handleLinkClick(0)}>
              {' '}
              Gestión de Servicios{' '}
            </a>
          </li>
          <li>
            <a href="#" title="Planificación" className={activeLink === 1 ? 'active' : ''}
           onClick={() => handleLinkClick(1)}>
              {' '}
              Planificación{' '}
            </a>
          </li>
          <li>
            <a href="#" title="Puntos de Interés" className={activeLink === 2 ? 'active' : ''}
           onClick={() => handleLinkClick(2)}>
              {' '}
              Puntos de Interés{' '}
            </a>
          </li>
          <li>
            <a href="#" title="Operaciones" className={activeLink === 3 ? 'active' : ''}
           onClick={() => handleLinkClick(3)}>
              {' '}
              Operaciones{' '}
            </a>
          </li>
          <li>
            <a href="#" title="Contact Us" className={activeLink === 4 ? 'active' : ''}
           onClick={() => handleLinkClick(4)}>
              {' '}
              Estadísticas{' '}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Tollbar;
