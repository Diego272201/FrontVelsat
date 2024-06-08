import React, { useEffect, useState } from 'react';
import { GrFormPrevious } from 'react-icons/gr';
import { GrFormNext } from 'react-icons/gr';
import { TbView360 } from 'react-icons/tb';
import { FiSearch } from 'react-icons/fi';
import '@/app/styles/sidebar.css';
import Unidad from './Unidad';
import axios from 'axios';
import { getSimplifiedDeviceListUrl } from './urlsApi/urlApi';
import { useSession } from 'next-auth/react';
import { FcSearch } from "react-icons/fc";

interface SidebarProps {
  centerMap: () => void;
  centerUnit: (coords: { latitud: number, longitud: number }) => void;
}

interface UnidadData {
  deviceId: string;
  lastValidSpeed: number;
  lastValidLatitude: number;
  lastValidLongitude: number;
}

export default function Sidebar({ centerMap, centerUnit }: SidebarProps) {

  const {data: session, status} = useSession();
  
  const [unidades, setUnidades] = useState<UnidadData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [lastCheckedId, setLastCheckedId] = useState<string | null>(null);

  
  useEffect(() => {
    if(status === 'authenticated' && session){
      const username = session.user.username;

    const fetchData = async () => {
      try {
        const response = await axios.get(getSimplifiedDeviceListUrl(username.toString()));
        const data = response.data;

        setUnidades(data);
      } catch (error) {
        console.error('Error al obtener datos:', error);
      }
    };
  
    fetchData();
  }
  }, [status, session]);

  const showMenu = () => {
    setShowDropdown(true);
  };

  const hideMenu = () => {
    setShowDropdown(false);
  };

  const handleSelectUnit = (coords: { latitud: number, longitud: number }) => {
    centerUnit(coords);
  };

  const handleCheckboxChange = (id: string) => {
    setLastCheckedId(id);
  };

  const filteredUnidades = unidades.length > 0 ? unidades.filter((unidad) =>
    unidad.deviceId.toLowerCase().includes(searchTerm.toLowerCase()),
  ) : [];
  
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
              <FcSearch  className="iconSearch" />
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
                lastCheckedId={lastCheckedId}
                onCheckboxChange={handleCheckboxChange}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}