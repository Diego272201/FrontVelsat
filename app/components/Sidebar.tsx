'use client';
import React, { useState } from 'react';
import { GrFormPrevious } from 'react-icons/gr';
import { GrFormNext } from 'react-icons/gr';
import { TbView360 } from 'react-icons/tb';
import { FiSearch } from 'react-icons/fi';
import '@/app/styles/sidebar.css';
import Unidad from './Unidad';

export default function Sidebar() {
  const [showDropdown, setShowDropdown] = useState(false);

  const showMenu = () => {
    setShowDropdown(true);
  };

  const hideMenu = () => {
    setShowDropdown(false);
  };

  return (
    <div>
      <input type="radio" name="opcion" id="muestra" onClick={showMenu} />
      <input
        type="radio"
        name="opcion"
        id="oculta"
        onClick={hideMenu}
        defaultChecked={!showDropdown}
      />

      <div className="desplegable">
        <label
          className="previos"
          htmlFor="muestra"
          id="label-muestra"
          title="Despliega Menu"
        >
          <div className="nombreP">
            <GrFormNext size={25} />
          </div>
        </label>
        <label
          className="previos"
          htmlFor="oculta"
          id="label-oculta"
          title="Oculta Menu"
        >
          <div className="nombreP">
            {' '}
            <GrFormPrevious size={25} />
          </div>
        </label>

        <div className="menu">
          <div className="unidades">
            Total de unidades: 95{' '}
            <div className="imap">
              <a href="#">
                <TbView360 size={23} />
              </a>
            </div>
          </div>

          <div className="search">
            <div className="iconS">
              <FiSearch className="iconSearch" />
            </div>

            <input className="input" type="search" placeholder="Buscar unidad"/>
          </div>

          <div>
            <Unidad></Unidad>
          </div>
        </div>
      </div>
    </div>
  );
}
