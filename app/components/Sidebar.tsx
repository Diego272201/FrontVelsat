'use client';
import React, { useEffect, useState } from 'react';
import { GrFormPrevious } from 'react-icons/gr';
import { GrFormNext } from 'react-icons/gr';
import { TbView360 } from 'react-icons/tb';
import { FiSearch } from 'react-icons/fi';
import '@/app/styles/sidebar.css';
import Unidad from './Unidad';
import axios from 'axios';

import { urlAPISimplifid } from './urlsApi/urlApi';

interface SidebarProps {
  centerMap: () => void;
  centerUnit: (coords: { latitud: number, longitud: number }) => void;

}

export default function Sidebar({centerMap, centerUnit}:SidebarProps) {
  
  interface UnidadData {
    deviceId: string;
    lastValidSpeed: number;
    lastValidLatitude: number;
    lastValidLongitude: number;
  }

  const [unidades, setUnidades] = useState<UnidadData[]>([]);
  const [selectedUnitCoords, setSelectedUnitCoords] = useState<{ latitud: number, longitud: number } | null>(null);


  //CÓDIGO PARA OCULTAR EL SIDEBAR EN LA VISTA DE LOS REPORTES
  useEffect(() => {
    if (
      window.location.pathname === '/trackvelnew/estadistica/reportegeneral' ||
      window.location.pathname === '/trackvelnew/estadistica/reporteparadas' ||
      window.location.pathname === '/trackvelnew/seguirUnidad'

    ) {
      const labelMuestra = document.getElementById('label-muestra');
      if (labelMuestra) {
        labelMuestra.style.display = 'none';
      }
    }
    //

    const fetchData = async () => {
      try {
        const response = await axios.get(urlAPISimplifid);
        const data = response.data;

        setUnidades(data);
      } catch (error) {
        console.error('Error al obtener datos:', error);
      }
    };

    fetchData();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');

  const [showDropdown, setShowDropdown] = useState(false);

  const showMenu = () => {
    setShowDropdown(true);
  };

  const hideMenu = () => {
    setShowDropdown(false);
  };

  const filteredUnidades = unidades.filter((unidad) =>
    unidad.deviceId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSelectUnit = (coords: { latitud: number, longitud: number }) => {
    setSelectedUnitCoords(coords);
    centerUnit(coords); 
  };
  
  return (
    <div className="sidebarScroll">
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
            Total de unidades: {unidades.length}
            <div className="imap">
              <a href="#" onClick={centerMap}>
                <TbView360 size={23} />
              </a>
            </div>
          </div>

          <div className="search">
            <div className="iconS">
              <FiSearch className="iconSearch" />
            </div>
            <input
              className="input"
              type="search"
              placeholder="Buscar unidad"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="unidadesScroll">
            {filteredUnidades.map((unidad, index) => (
              <Unidad
                key={index}
                codigoUnidad={unidad.deviceId.toUpperCase()}
                velocidad={unidad.lastValidSpeed}
                latitud={unidad.lastValidLatitude}
                longitud={unidad.lastValidLongitude}
                onSelectUnit={handleSelectUnit}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
