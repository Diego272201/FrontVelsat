import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { GrFormPrevious } from 'react-icons/gr';
import { GrFormNext } from 'react-icons/gr';
import { TbView360 } from 'react-icons/tb';
import '@/app/styles/sidebar.css';
import Unidad from './Unidad';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { FcSearch } from 'react-icons/fc';
import { Spinner } from '@nextui-org/react';
import { useApi } from '@/context/ApiContext';
import SelectSidebar from './selectUI/SelectSidebar';

interface SidebarProps {
  centerMap: () => void;
  centerUnit: (coords: { latitud: number; longitud: number }) => void;
  onFilteredIdsChange?: (ids: string[] | null) => void;
}

interface UnidadData {
  deviceId: string;
  lastValidSpeed: number;
  lastValidLatitude: number;
  lastValidLongitude: number;
}

export default function Sidebar({ centerMap, centerUnit, onFilteredIdsChange }: SidebarProps) {
  const { data: session } = useSession();
  const [unidades, setUnidades] = useState<UnidadData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(true);
  const [lastCheckedId, setLastCheckedId] = useState<string | null>(null);
  const [idLoading, setIsLoading] = useState(true);
  const { baseUrl } = useApi();

  const [rutaSeleccionada, setRutaSeleccionada] = useState('');
  const [filteredDeviceIds, setFilteredDeviceIds] = useState<string[] | null>(null);

  // Estados para el polling de API
  const [connectionStatus, setConnectionStatus] = useState<'Connecting' | 'Connected' | 'Disconnected'>('Disconnected');
  const [isPollingActive, setIsPollingActive] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const username = useMemo(() => {
    return localStorage.getItem('currentUser') || session?.user?.username || '';
  }, [session]);

  // Función para obtener datos de la API
  const fetchDataFromAPI = useCallback(async () => {
    if (!username || !baseUrl) {
      return;
    }

    try {
      setConnectionStatus('Connecting');
      
      const response = await axios.get(
        `${baseUrl}/api/DeviceList/simplified/${username}`
      );

      if (response.data && Array.isArray(response.data)) {
        const unidadesFormateadas = response.data.map((item: any) => ({
          deviceId: item.DeviceId || item.deviceId || '',
          lastValidSpeed: item.LastValidSpeed || item.lastValidSpeed || 0,
          lastValidLatitude: item.LastValidLatitude || item.lastValidLatitude || 0,
          lastValidLongitude: item.LastValidLongitude || item.lastValidLongitude || 0,
        }));
        
        setUnidades(unidadesFormateadas);
        setIsLoading(false);
        setConnectionStatus('Connected');
        setIsPollingActive(true);
      }
    } catch (error) {
      console.error('Error al obtener datos de la API:', error);
      setConnectionStatus('Disconnected');
      setIsLoading(false);
      setIsPollingActive(false);
    }
  }, [username, baseUrl]);

  // Inicializar polling
  useEffect(() => {
    if (username && baseUrl) {
      // Llamada inicial
      fetchDataFromAPI();
      
      // Configurar polling cada 20 segundos
      pollingIntervalRef.current = setInterval(() => {
        fetchDataFromAPI();
      }, 20000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [username, baseUrl, fetchDataFromAPI]);

  useEffect(() => {
    const fetchFiltroSedapal = async () => {
      if (rutaSeleccionada && rutaSeleccionada !== 'Todas') {
        try {
          const response = await axios.get(
            `${baseUrl}/api/Reporting/filtersedapal?rutadefault=${encodeURIComponent(rutaSeleccionada)}`,
          );
          const ids = response.data;
          setFilteredDeviceIds(ids);
          onFilteredIdsChange?.(ids);
        } catch (error) {
          console.error('Error al obtener filtros de Sedapal:', error);
          setFilteredDeviceIds([]);
          onFilteredIdsChange?.([]);
        }
      } else {
        setFilteredDeviceIds(null);
        onFilteredIdsChange?.(null);
      }
    };

    if (username === 'sedapal') {
      fetchFiltroSedapal();
    }
  }, [rutaSeleccionada, baseUrl, username, onFilteredIdsChange]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []); 

  const showMenu = () => {
    setShowDropdown(true);
  };

  const hideMenu = () => {
    setShowDropdown(false);
  };

  const handleSelectUnit = useCallback(
    (coords: { latitud: number; longitud: number }) => {
      centerUnit(coords);
    },
    [centerUnit],
  );

  const handleCheckboxChange = useCallback((id: string) => {
    setLastCheckedId(id);
  }, []);

  const filteredUnidades = useMemo(() => {
    const baseFiltrado = unidades.filter((unidad) =>
      unidad.deviceId.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    if (filteredDeviceIds) {
      return baseFiltrado.filter((unidad) =>
        filteredDeviceIds.includes(unidad.deviceId.toLowerCase()),
      );
    }

    return baseFiltrado;
  }, [unidades, searchTerm, filteredDeviceIds]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="sidebarScroll">
      <input
        type="radio"
        name="opcion"
        id="muestra"
        onClick={showMenu}
        defaultChecked={showDropdown}
      />
      <input
        type="radio"
        name="opcion"
        id="oculta"
        onClick={hideMenu}
        defaultChecked={!showDropdown}
      />

      <div className="desplegable bg-white" style={{ width: '300px' }}>
        <label
          className="previos"
          htmlFor="muestra"
          id="label-muestra"
          title="Despliega Menu"
        >
          <div className="nombreP bg-[#113EB9]">
            <GrFormNext size={25} />
          </div>
        </label>

        <label
          className="previos"
          htmlFor="oculta"
          id="label-oculta"
          title="Oculta Menu"
        >
          <div className="nombreP bg-[#113EB9]">
            <GrFormPrevious size={25} />
          </div>
        </label>

        <div className="menu">
          <div className="unidades bg-[#113EB9]">
            <div className="flex justify-between items-center">
              <span>TOTAL DE UNIDADES: {filteredUnidades.length}</span>
         
            </div>
            <div className="imap">
              <a href="#" onClick={centerMap}>
                <TbView360 size={23} />
              </a>
            </div>
          </div>

          <div className="search">
            <div className="iconS">
              <FcSearch className="iconSearch" />
            </div>
            <input
              className="input"
              type="search"
              placeholder="Buscar Unidad"
              value={searchTerm}
              onChange={handleSearchChange}
              style={{ borderRadius: '0px' }}
            />
          </div>
          
          {username === 'sedapal' && (
            <div className="search">
              <SelectSidebar onRutaChange={setRutaSeleccionada} />
            </div>
          )}

          <div
            className={`unidadesScroll mt-2.5 overflow-y-scroll ${
              username === 'sedapal'
                ? 'max-h-[calc(100vh-33%)]'
                : 'max-h-[calc(100vh-29%)]'
            }`}
          >
            {idLoading ? (
              <div className="h-[500px] flex items-center justify-center w-full">
                <Spinner />
              </div>
            ) : (
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
                  username={username}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}