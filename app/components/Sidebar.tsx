import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GrFormPrevious } from 'react-icons/gr';
import { GrFormNext } from 'react-icons/gr';
import { TbView360 } from 'react-icons/tb';
import '@/app/styles/sidebar.css';
import Unidad from './Unidad';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { FcSearch } from "react-icons/fc";
import { Spinner } from '@nextui-org/react';
import { useApi } from '@/context/ApiContext';

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
  const [showDropdown, setShowDropdown] = useState(true);
  const [lastCheckedId, setLastCheckedId] = useState<string | null>(null);
  const [idLoading, setIsLoading] = useState(true);
  const { baseUrl} = useApi();
  
  const fetchData = useCallback(async (username: string) => {

    try {
   
      const response = await axios.get(`${baseUrl}/api/DeviceList/simplified/${username}`);

      console.log("La url es: " + `${baseUrl}`)

      setUnidades(response.data);
      setIsLoading(true);
    } catch (error) {
      console.error('Error al obtener datos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetchData(session.user.username);
    }
  }, [status, session, fetchData]);

  const showMenu = () => {
    setShowDropdown(true);
  };

  const hideMenu = () => {
    setShowDropdown(false);
  };

  const handleSelectUnit = useCallback((coords: { latitud: number, longitud: number }) => {
    centerUnit(coords);
  }, [centerUnit]);


  const handleCheckboxChange = useCallback((id: string) => {
    setLastCheckedId(id);
  }, []);

  const filteredUnidades = useMemo(() => 
    unidades.filter((unidad) =>
      unidad.deviceId.toLowerCase().includes(searchTerm.toLowerCase())
    ), [unidades, searchTerm]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };

  return (
    <div className="sidebarScroll">
      <input type="radio" name="opcion" id="muestra" onClick={showMenu} defaultChecked={showDropdown} />
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
              onChange={handleSearchChange}
              style={{ borderRadius: '0px'}}
              />
          </div>

          <div className="unidadesScroll">

            {idLoading ? (
              <div className="centerSpinner">
              <Spinner /> 

              </div>
            
            ) :( 

            filteredUnidades.map((unidad, index) => (
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
            ))
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
