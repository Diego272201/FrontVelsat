import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { GrFormPrevious } from 'react-icons/gr';
import { GrFormNext } from 'react-icons/gr';
import { TbView360 } from 'react-icons/tb';
import { Search, X } from 'lucide-react';
import '@/app/styles/sidebar.css';
import Unidad from './Unidad';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { Spinner } from '@nextui-org/react';
import { useApi } from '@/context/ApiContext';
import SelectSidebar from './selectUI/SelectSidebar';

interface SidebarProps {
  centerMap: () => void;
  centerUnit: (
    coords: { latitud: number; longitud: number },
    deviceId?: string,
  ) => void;
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


  const showMenu = () => {
    setShowDropdown(true);
  };

  const hideMenu = () => {
    setShowDropdown(false);
  };

  const handleSelectUnit = useCallback(
    (coords: { latitud: number; longitud: number }, deviceId?: string) => {
      centerUnit(coords, deviceId);
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

  const metricas = useMemo(() => {
    let mov = 0;
    let det = 0;
    unidades.forEach((u) => {
      if (u.lastValidSpeed >= 1) mov++;
      else det++;
    });
    return {
      total: unidades.length,
      movimiento: mov,
      detenidas: det,
    };
  }, [unidades]);

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
            <div className="flex items-center gap-2">
              <span className="tracking-wide">TOTAL DE UNIDADES: {filteredUnidades.length} </span>
           
            </div>
            <div className="imap">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  centerMap();
                }}
                className="hover:text-blue-200 hover:bg-white/10 transition-colors p-1 flex items-center justify-center rounded focus:outline-none"
                title="Centrar mapa general"
              >
                <TbView360 size={22} />
              </button>
            </div>
          </div>

          <div className="search">
            <div className="iconS">
              <Search className="iconSearch" size={17} />
            </div>
            <input
              className="input"
              type="text"
              placeholder="Buscar Unidad"
              value={searchTerm}
              onChange={handleSearchChange}
              style={{ borderRadius: '4px' }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800 hover:text-black p-1 transition-colors z-10"
                title="Limpiar búsqueda"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filtros rápidos por estado */}
          <div className="flex items-center gap-1 px-1.5 pt-2 pb-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setFiltroMovimiento('todos')}
              className={`w-[76px] shrink-0 py-1.5 px-1 rounded text-center transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                filtroMovimiento === 'todos'
                  ? 'bg-[#113EB9] text-white font-bold shadow-xs'
                  : 'bg-gray-300 text-gray-800 hover:bg-gray-200'
              }`}
            >
              <span className="whitespace-nowrap">Todas</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums shrink-0 ${
                  filtroMovimiento === 'todos'
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {metricas.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFiltroMovimiento('movimiento')}
              className={`flex-1 py-1.5 px-1 rounded text-center transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                filtroMovimiento === 'movimiento'
                  ? 'bg-green-700 text-white font-bold shadow-xs'
                  : 'bg-gray-300 text-gray-800 hover:bg-green-50 hover:text-green-800'
              }`}
            >
              <span className="whitespace-nowrap">En marcha</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums shrink-0 ${
                  filtroMovimiento === 'movimiento'
                    ? 'bg-white/10 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {metricas.movimiento}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFiltroMovimiento('detenidas')}
              className={`flex-1 py-1.5 px-1 rounded text-center transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                filtroMovimiento === 'detenidas'
                  ? 'bg-red-600 text-white font-bold shadow-xs'
                  : 'bg-gray-300 text-gray-800 hover:bg-red-50 hover:text-red-800'
              }`}
            >
              <span className="whitespace-nowrap">Detenidas</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums shrink-0 ${
                  filtroMovimiento === 'detenidas'
                    ? 'bg-white/10 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {metricas.detenidas}
              </span>
            </button>
          </div>

          {username === 'sedapal' && (
            <div className="search">
              <SelectSidebar onRutaChange={setRutaSeleccionada} />
            </div>
          )}

          <div
            className="unidadesScroll mt-2 flex-1 min-h-0 overflow-y-auto pb-0 pr-0.5"
          >
            {idLoading ? (
              <div className="h-[400px] flex items-center justify-center w-full">
                <Spinner />
              </div>
            ) : filteredUnidades.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
                <Search size={28} className="text-gray-400 mb-2 opacity-50" />
                <p className="text-xs font-semibold text-gray-700">
                  Sin unidades encontradas
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Prueba con otro código o filtro
                </p>
              </div>
            ) : (
              <>
                {filteredUnidades.map((unidad) => (
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
                ))}
                <div className="h-2 shrink-0" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}