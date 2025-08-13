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
import * as signalR from '@microsoft/signalr';

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

  // Estados para SignalR
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'Connecting' | 'Connected' | 'Disconnected'>('Disconnected');
  const [isSignalRActive, setIsSignalRActive] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const username = useMemo(() => {
    return localStorage.getItem('currentUser') || session?.user?.username || '';
  }, [session]);

  // Función para crear conexión SignalR
  const createSignalRConnection = useCallback(async () => {
    try {
      console.log('🔗 Creando conexión SignalR...');
      if (!session?.user?.username || !baseUrl) return;

      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${baseUrl}/dataHubSimplified`, {
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000]) // Reconexión automática
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Event handlers
      newConnection.onclose((error) => {
        console.log('🔌 Conexión SignalR cerrada:', error);
        setConnectionStatus('Disconnected');
        setIsSignalRActive(false);
      });

      newConnection.onreconnecting((error) => {
        console.log('🔄 Reconectando SignalR...', error);
        setConnectionStatus('Connecting');
      });

      newConnection.onreconnected((connectionId) => {
        console.log('✅ SignalR reconectado:', connectionId);
        setConnectionStatus('Connected');
        
        // Reiniciar datos después de reconexión
        if (username) {
          setTimeout(() => {
            newConnection.invoke('IniciarDatosSimplificados', username);
          }, 1000);
        }
      });

      // Escuchar datos simplificados
      newConnection.on('ActualizarDatosSimplificados', (datos) => {        
        if (Array.isArray(datos)) {
          const unidadesFormateadas = datos.map((item: any) => ({
            deviceId: item.DeviceId || item.deviceId || '',
            lastValidSpeed: item.LastValidSpeed || item.lastValidSpeed || 0,
            lastValidLatitude: item.LastValidLatitude || item.lastValidLatitude || 0,
            lastValidLongitude: item.LastValidLongitude || item.lastValidLongitude || 0,
          }));
          
          setUnidades(unidadesFormateadas);
          setIsLoading(false);
        }
      });

      // Eventos del hub
      newConnection.on('DatosSimplificadosIniciados', (mensaje) => {
        console.log('✅ Hub respuesta:', mensaje);
        setIsSignalRActive(true);
      });

      newConnection.on('DatosSimplificadosDetenidos', (mensaje) => {
        console.log('🛑 Hub detenido:', mensaje);
        setIsSignalRActive(false);
      });

      newConnection.on('Error', (error) => {
        console.error('❌ Error del Hub:', error);
        setIsLoading(false);
      });

      setConnection(newConnection);
      return newConnection;

    } catch (error) {
      console.error('❌ Error creando conexión SignalR:', error);
      setConnectionStatus('Disconnected');
      setIsLoading(false);
      return null;
    }
  }, []);

  // Efecto principal: Inicializar SignalR UNA SOLA VEZ
  useEffect(() => {
    if (username && baseUrl) {
      console.log('🎯 Inicializando conexión para usuario:', username);
      
      const initializeConnection = async () => {
        const newConnection = await createSignalRConnection();
        if (newConnection) {
          try {
            setConnectionStatus('Connecting');
            console.log('🚀 Conectando a SignalR...');
            
            await newConnection.start();
            setConnectionStatus('Connected');
            console.log('✅ Conectado a SignalR Hub Simplificado');
            
            // Iniciar datos después de conectar
            setTimeout(() => {
              newConnection.invoke('IniciarDatosSimplificados', username);
            }, 1000);
            
          } catch (error) {
            console.error('❌ Error conectando a SignalR:', error);
            setConnectionStatus('Disconnected');
            setIsLoading(false);
          }
        }
      };

      initializeConnection();
    }

    return () => {
      // Limpiar timeout de reconexión
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [username, baseUrl]); // Solo estas dependencias


  // Efecto: Filtros Sedapal (sin cambios)
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

  // Cleanup al desmontar componente
  useEffect(() => {
    return () => {
      if (connection && username && isSignalRActive) {
        connection.invoke('DetenerDatosSimplificados', username).catch(console.error);
      }
      if (connection) {
        connection.stop().catch(console.error);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []); // Array vacío - solo al desmontar

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

  // Indicador visual del estado de conexión
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'Connected': return 'text-green-500';
      case 'Connecting': return 'text-yellow-500';
      case 'Disconnected': return 'text-red-500';
      default: return 'text-gray-500';
    }
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
                <div className="ml-3">
                  {connectionStatus === 'Connecting' ? 'Conectando...' : 'Cargando datos...'}
                </div>
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