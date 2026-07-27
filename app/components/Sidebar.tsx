import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { GrFormPrevious } from 'react-icons/gr';
import { GrFormNext } from 'react-icons/gr';
import { TbView360 } from 'react-icons/tb';
import { Filter } from 'lucide-react';
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
  sharedDeviceList?: UnidadData[];
}

interface UnidadData {
  deviceId: string;
  lastValidSpeed: number;
  lastValidLatitude: number;
  lastValidLongitude: number;
}

export default function Sidebar({ centerMap, centerUnit, onFilteredIdsChange, sharedDeviceList }: SidebarProps) {
  const { data: session } = useSession();
  const [unidades, setUnidades] = useState<UnidadData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(true);
  const [lastCheckedId, setLastCheckedId] = useState<string | null>(null);
  const [idLoading, setIsLoading] = useState(true);
  const { baseUrl } = useApi();

  const [rutaSeleccionada, setRutaSeleccionada] = useState('');
  const [filteredDeviceIds, setFilteredDeviceIds] = useState<string[] | null>(null);
  const [filtroMovimiento, setFiltroMovimiento] = useState<'todos' | 'movimiento' | 'detenidas'>('todos');
  const [showFiltroDropdown, setShowFiltroDropdown] = useState(false);
  const filtroDropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (sharedDeviceList) {
      setUnidades(sharedDeviceList);
      setIsLoading(false);
      setConnectionStatus('Connected');
      setIsPollingActive(true);
      return;
    }

    if (username && baseUrl) {
      fetchDataFromAPI();

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
  }, [username, baseUrl, fetchDataFromAPI, sharedDeviceList]);

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

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtroDropdownRef.current && !filtroDropdownRef.current.contains(event.target as Node)) {
        setShowFiltroDropdown(false);
      }
    };

    if (showFiltroDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFiltroDropdown]); 

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
  // Función para ordenar deviceID alfabética y numéricamente
  const sortDeviceIds = (a: UnidadData, b: UnidadData) => {
    const deviceA = a.deviceId.toLowerCase();
    const deviceB = b.deviceId.toLowerCase();
    
    // Usar localeCompare con opciones numéricas para un ordenamiento natural
    return deviceA.localeCompare(deviceB, undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  };

  const baseFiltrado = unidades.filter((unidad) =>
    unidad.deviceId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  let resultado = baseFiltrado;
  
  // Aplicar filtro de ruta (Sedapal)
  if (filteredDeviceIds) {
    resultado = resultado.filter((unidad) =>
      filteredDeviceIds.includes(unidad.deviceId.toLowerCase()),
    );
  }


  // Aplicar filtro de movimiento/detenidas
  if (filtroMovimiento === 'movimiento') {
    resultado = resultado.filter((unidad) => unidad.lastValidSpeed >= 1);
    
  } else if (filtroMovimiento === 'detenidas') {
    resultado = resultado.filter((unidad) => unidad.lastValidSpeed === 0);
  }

  // Ordenar alfabética y numéricamente
  return resultado.sort(sortDeviceIds);
}, [unidades, searchTerm, filteredDeviceIds, filtroMovimiento]);

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
            <div className="relative" ref={filtroDropdownRef}>
              <button
                onClick={() => setShowFiltroDropdown(!showFiltroDropdown)}
            className={`ml-1 bg-[#ffaa00] py-[9px] px-2 hover:bg-orange-50 border border-[#5b75bb] transition-colors ${
            filtroMovimiento !== 'todos' ? 'text-[#113EB9]' : 'text-gray-600'
              }`}
                title="Filtrar por estado"
              >
                <Filter size={20} />
              </button>

              {showFiltroDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setFiltroMovimiento('todos');
                        setShowFiltroDropdown(false);
                      }}
                      className={`text-[12px] w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                        filtroMovimiento === 'todos' ? 'bg-blue-50 text-[#113EB9] font-medium' : 'text-gray-700'
                      }`}
                    >
                      Todas las unidades
                    </button>
                    <button
                      onClick={() => {
                        setFiltroMovimiento('movimiento');
                        setShowFiltroDropdown(false);
                      }}
                      className={`text-[12px] w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 ${
                        filtroMovimiento === 'movimiento' ? 'bg-blue-50 text-[#113EB9] font-medium' : 'text-gray-700'
                      }`}
                    >
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      En movimiento
                    </button>
                    <button
                      onClick={() => {
                        setFiltroMovimiento('detenidas');
                        setShowFiltroDropdown(false);
                      }}
                      className={`text-[12px] w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 ${
                        filtroMovimiento === 'detenidas' ? 'bg-blue-50 text-[#113EB9] font-medium' : 'text-gray-700'
                      }`}
                    >
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      Detenidas
                    </button>
                  </div>
                </div>
              )}
            </div>
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
              filteredUnidades.map((unidad) => (
                <Unidad
                  key={unidad.deviceId}
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