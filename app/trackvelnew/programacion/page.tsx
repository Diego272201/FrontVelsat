'use client';
import React, { useState, useEffect, useRef } from 'react';
import { toast, Toaster } from 'sonner';
import {
  Search,
  Calendar,
  MapPin,
  Plane,
  User,
  Plus,
  Eye,
  X,
  RotateCcw,
  Settings,
  LogOut,
  Filter,
  Loader2,
  ChevronDown,
} from 'lucide-react';

interface ApiService {
  codservicio: string;
  destino: string;
  nomDestino: string;
  empresa: string;
  area: string;
  nomgrupo: string;
  fecha: string;
  newfechaini: string;
  newfechafin: string;
  grupo: string;
  estado: string;
  numero: string;
  numeromovil: string;
  numpax: string;
  tipo: string;
  usuario: string;
  conductor: {
    codigo: string;
    nombre: string;
    apepate: string;
    login: string;
    telefono: string;
  };
  unidad: {
    codunidad: string;
  };
}

interface Service {
  id: string;
  numero: string;
  tierra: string;
  tipo: string;
  fechaAeropuerto: string;
  conductor: string;
  unidad: string;
  aerolinea: string;
  estado: string;
  numpax: string;
}

interface Pasajero {
  codigo: string;
  nombre: string | null;
  codlan: string;
  apepate: string;
  login: string | null;
  clave: string | null;
  sexo: string | null;
  telefono: string | null;
  empresa: string | null;
  lugar: {
    codlugar: number;
    codcli: string | null;
    direccion: string;
    distrito: string;
    wy: string;
    wx: string;
    estado: string | null;
    codcliente: string | null;
    referencia: string | null;
    zona: string;
  };
  servicioactual: any;
}

interface Conductor {
  codigo: string;
  nombre: string;
  codlan: string | null;
  apepate: string;
  login: string | null;
  clave: string | null;
  sexo: string | null;
  telefono: string | null;
  empresa: string | null;
  lugar: string | null;
  servicioactual: string | null;
}

interface Unidad {
  id: number;
  codunidad: string;
  tipo: string;
  listaDespachos: string | null;
  conductor: string | null;
  habilitado: string;
  rutaDefault: string | null;
}

const ServicesSearchSystem: React.FC = () => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [grupo, setGrupo] = useState('');
  const [tipo, setTipo] = useState('');
  const [aerolinea, setAerolinea] = useState('');
  const [estado, setEstado] = useState('');

  // Estados para la API
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para el autocomplete de pasajeros
  const [pasajeroInput, setPasajeroInput] = useState('');
  const [selectedPasajero, setSelectedPasajero] = useState<{codlan: string; apepate: string} | null>(null);
  const [pasajeroSuggestions, setPasajeroSuggestions] = useState<Pasajero[]>([]);
  const [showPasajeroSuggestions, setShowPasajeroSuggestions] = useState(false);
  const [loadingPasajeros, setLoadingPasajeros] = useState(false);
  const pasajeroAutocompleteRef = useRef<HTMLDivElement>(null);
  const pasajeroInputRef = useRef<HTMLInputElement>(null);

  // Estados para el autocomplete de conductores
  const [conductorInput, setConductorInput] = useState('');
  const [selectedConductor, setSelectedConductor] = useState<{codigo: string; apepate: string} | null>(null);
  const [conductorSuggestions, setConductorSuggestions] = useState<Conductor[]>([]);
  const [showConductorSuggestions, setShowConductorSuggestions] = useState(false);
  const [loadingConductores, setLoadingConductores] = useState(false);
  const conductorAutocompleteRef = useRef<HTMLDivElement>(null);
  const conductorInputRef = useRef<HTMLInputElement>(null);

  // Estados para el autocomplete de unidades
  const [unidadInput, setUnidadInput] = useState('');
  const [selectedUnidad, setSelectedUnidad] = useState<{codunidad: string} | null>(null);
  const [unidadSuggestions, setUnidadSuggestions] = useState<Unidad[]>([]);
  const [showUnidadSuggestions, setShowUnidadSuggestions] = useState(false);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const unidadAutocompleteRef = useRef<HTMLDivElement>(null);
  const unidadInputRef = useRef<HTMLInputElement>(null);

  // Función para transformar datos de la API
  const transformApiData = (apiData: ApiService[]): Service[] => {
    return apiData.map((item) => ({
      id: item.codservicio,
      numero: item.numeromovil,
      tierra:
        item.grupo === 'T'
          ? 'Tierra'
          : item.grupo === 'A'
            ? 'Aire'
            : item.grupo,
      tipo:
        item.tipo === 'S'
          ? 'Salida'
          : item.tipo === 'I'
            ? 'Entrada'
            : item.tipo,
      fechaAeropuerto: item.fecha,
      conductor: `${item.conductor.nombre} ${item.conductor.apepate}`.trim(),
      unidad: item.unidad?.codunidad || '',
      aerolinea: item.empresa,
      estado: item.estado,
      numpax: item.numpax,
    }));
  };

  // Función para buscar pasajeros
  const searchPasajeros = async (palabra: string) => {
    if (palabra.length < 3) {
      setPasajeroSuggestions([]);
      setShowPasajeroSuggestions(false);
      return;
    }

    setLoadingPasajeros(true);
    try {
      const url = `https://velsat.pe:2096/api/Preplan/GetPasajeros?palabra=${encodeURIComponent(palabra)}&codusuario=cgacela`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data: Pasajero[] = await response.json();
      setPasajeroSuggestions(data);
      setShowPasajeroSuggestions(true);
    } catch (err) {
      console.error('Error al buscar pasajeros:', err);
      setPasajeroSuggestions([]);
      setShowPasajeroSuggestions(false);
    } finally {
      setLoadingPasajeros(false);
    }
  };

  // Función para buscar conductores
  const searchConductores = async (palabra: string) => {
    if (palabra.length < 2) {
      setConductorSuggestions([]);
      setShowConductorSuggestions(false);
      return;
    }

    setLoadingConductores(true);
    try {
      const url = `https://velsat.pe:2096/api/Preplan/conductores?usuario=cgacela`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data: Conductor[] = await response.json();
      // Filtrar conductores por la palabra de búsqueda
      const filteredData = data.filter(conductor => 
        conductor.apepate.toLowerCase().includes(palabra.toLowerCase()) ||
        conductor.codigo.includes(palabra)
      );
      
      setConductorSuggestions(filteredData);
      setShowConductorSuggestions(true);
    } catch (err) {
      console.error('Error al buscar conductores:', err);
      setConductorSuggestions([]);
      setShowConductorSuggestions(false);
    } finally {
      setLoadingConductores(false);
    }
  };

  // Función para buscar unidades
  const searchUnidades = async (palabra: string) => {
    if (palabra.length < 2) {
      setUnidadSuggestions([]);
      setShowUnidadSuggestions(false);
      return;
    }

    setLoadingUnidades(true);
    try {
      const url = `https://velsat.pe:2096/api/Preplan/carros/cgacela`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data: Unidad[] = await response.json();
      // Filtrar unidades por la palabra de búsqueda y solo las habilitadas
      const filteredData = data.filter(unidad => 
        unidad.habilitado === '1' &&
        unidad.codunidad.toLowerCase().includes(palabra.toLowerCase())
      );
      
      setUnidadSuggestions(filteredData);
      setShowUnidadSuggestions(true);
    } catch (err) {
      console.error('Error al buscar unidades:', err);
      setUnidadSuggestions([]);
      setShowUnidadSuggestions(false);
    } finally {
      setLoadingUnidades(false);
    }
  };

  // Función para obtener datos de la API
  const fetchServices = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Por favor selecciona las fechas de inicio y fin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data: ApiService[] = [];
      
      // Si hay un pasajero seleccionado, usar la API específica del pasajero
      if (selectedPasajero && selectedPasajero.codlan) {
        const fechaFormatted = dateFrom.split('T')[0]; // Solo fecha YYYY-MM-DD
        const url = `https://velsat.pe:2096/api/Preplan/GetServicioPasajero?usuario=cgacela&fec=${fechaFormatted}&codcliente=${selectedPasajero.codlan}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        data = await response.json();
        toast.success(
          `Se cargaron ${data.length} servicios del pasajero ${selectedPasajero.apepate}`,
        );
      } else {
        // Usar la API general de servicios
        const fechainiFormatted = dateFrom.replace('T', ' ');
        const fechafinFormatted = dateTo.replace('T', ' ');
        const url = `https://velsat.pe:2096/api/Gacela/Getservicios?fechaini=${fechainiFormatted}&fechafin=${fechafinFormatted}&usu=cgacela`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        data = await response.json();
        toast.success(
          `Se cargaron ${data.length} servicios correctamente`,
        );
      }

      const transformedData = transformApiData(data);
      setServices(transformedData);
      
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al cargar los servicios';
      setError(errorMessage);
      toast.error(errorMessage);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce para las búsquedas
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (pasajeroInput && !selectedPasajero) {
        searchPasajeros(pasajeroInput);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [pasajeroInput, selectedPasajero]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (conductorInput && !selectedConductor) {
        searchConductores(conductorInput);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [conductorInput, selectedConductor]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (unidadInput && !selectedUnidad) {
        searchUnidades(unidadInput);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [unidadInput, selectedUnidad]);

  // Buscar automáticamente cuando se selecciona un pasajero
  useEffect(() => {
    if (selectedPasajero && dateFrom) {
      fetchServices();
    }
  }, [selectedPasajero]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pasajeroAutocompleteRef.current && !pasajeroAutocompleteRef.current.contains(event.target as Node)) {
        setShowPasajeroSuggestions(false);
      }
      if (conductorAutocompleteRef.current && !conductorAutocompleteRef.current.contains(event.target as Node)) {
        setShowConductorSuggestions(false);
      }
      if (unidadAutocompleteRef.current && !unidadAutocompleteRef.current.contains(event.target as Node)) {
        setShowUnidadSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Obtener opciones únicas para los filtros
  const getUniqueOptions = (field: keyof Service) => {
    const uniqueSet = new Set(services.map((service) => service[field]));
    const uniqueValues = Array.from(uniqueSet);
    return uniqueValues.filter((value) => value && value !== '').sort();
  };

  const handleSelectService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id)
        ? prev.filter((serviceId) => serviceId !== id)
        : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    setSelectedServices(filteredServices.map((service) => service.id));
  };

  // Handlers para pasajeros
  const handlePasajeroInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPasajeroInput(value);
    
    if (selectedPasajero && value !== selectedPasajero.apepate) {
      setSelectedPasajero(null);
    }
  };

  const handleSelectPasajero = (pasajero: Pasajero) => {
    setSelectedPasajero({
      codlan: pasajero.codigo,
      apepate: pasajero.apepate
    });
    setPasajeroInput(pasajero.apepate);
    setShowPasajeroSuggestions(false);
    console.log('Pasajero seleccionado - Codlan:', pasajero.codlan, 'Nombre:', pasajero.apepate);
  };

  const clearPasajeroSelection = () => {
    setSelectedPasajero(null);
    setPasajeroInput('');
    setPasajeroSuggestions([]);
    setShowPasajeroSuggestions(false);
  };

  // Handlers para conductores
  const handleConductorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConductorInput(value);
    
    if (selectedConductor && value !== selectedConductor.apepate) {
      setSelectedConductor(null);
    }
  };

  const handleSelectConductor = (conductor: Conductor) => {
    setSelectedConductor({
      codigo: conductor.codigo,
      apepate: conductor.apepate
    });
    setConductorInput(conductor.apepate);
    setShowConductorSuggestions(false);
    console.log('Conductor seleccionado - Código:', conductor.codigo, 'Nombre:', conductor.apepate);
  };

  const clearConductorSelection = () => {
    setSelectedConductor(null);
    setConductorInput('');
    setConductorSuggestions([]);
    setShowConductorSuggestions(false);
  };

  // Handlers para unidades
  const handleUnidadInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUnidadInput(value);
    
    if (selectedUnidad && value !== selectedUnidad.codunidad) {
      setSelectedUnidad(null);
    }
  };

  const handleSelectUnidad = (unidad: Unidad) => {
    setSelectedUnidad({
      codunidad: unidad.codunidad
    });
    setUnidadInput(unidad.codunidad);
    setShowUnidadSuggestions(false);
    console.log('Unidad seleccionada - Código:', unidad.codunidad);
  };

  const clearUnidadSelection = () => {
    setSelectedUnidad(null);
    setUnidadInput('');
    setUnidadSuggestions([]);
    setShowUnidadSuggestions(false);
  };

  // Filtros (sin incluir los autocomplete de conductor y unidad)
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      searchTerm === '' ||
      service.conductor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.unidad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.numero.includes(searchTerm);

    const matchesGrupo = grupo === '' || service.tierra === grupo;
    const matchesTipo = tipo === '' || service.tipo === tipo;
    const matchesAerolinea =
      aerolinea === '' || service.aerolinea === aerolinea;
    const matchesEstado = estado === '' || service.estado === estado;

    return (
      matchesSearch &&
      matchesGrupo &&
      matchesTipo &&
      matchesAerolinea &&
      matchesEstado
    );
  });

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const selectedDate = value.split('T')[0];
      setDateFrom(selectedDate + 'T00:00');
    } else {
      setDateFrom('');
    }
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const selectedDate = value.split('T')[0];
      setDateTo(selectedDate + 'T23:59');
    } else {
      setDateTo('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Toaster richColors />

      <div className="bg-blue-800 p-2 text-center text-[13px] font-bold text-white shadow-md">
        ADMINISTRACIÓN DE SERVICIOS
      </div>

      <div className="mx-auto space-y-3">
        {/* Header */}
        <div className="border-slate-200 px-3 py-2">
          <h1 className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-slate-800">
            <Search className="h-4 w-4 text-blue-600" />
            Búsqueda de Servicios
          </h1>

          {/* Search Filters */}
          <div className="mb-0 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-700">
                  Desde:
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={dateFrom}
                    onChange={handleDateFromChange}
                    className="w-full rounded-lg border border-slate-300 py-1 pl-2 pr-2 text-sm transition-colors focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-700">
                  Hasta:
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={dateTo}
                    onChange={handleDateToChange}
                    className="w-full rounded-lg border border-slate-300 py-1 pl-2 pr-2 text-sm transition-colors focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Grupo:
              </label>
              <select
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm transition-colors focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todos</option>
                {getUniqueOptions('tierra').map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Tipo:
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm transition-colors focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todos</option>
                {getUniqueOptions('tipo').map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={fetchServices}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-[12px] text-xs font-medium leading-none text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Search className="h-3 w-3" />
                )}
                {loading 
                  ? 'Cargando...' 
                  : selectedPasajero 
                  ? 'Buscar por Pasajero' 
                  : 'Buscar Servicios'
                }
              </button>

              <button className="flex flex-1 items-center justify-center gap-1 rounded-md bg-green-600 px-3 py-[12px] text-xs font-medium leading-none text-white transition-colors hover:bg-green-700">
                <Plus className="h-3 w-3" />
                Nuevo Servicio
              </button>
            </div>
          </div>
        </div>

        {/* Driver Assignment */}
        <div className="bg-gray-100 px-3 py-2">
          <h2 className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-slate-800">
            <User className="h-4 w-4 text-blue-600" />
            Asignación Conductor/Unidad
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* Autocomplete Unidad */}
            <div className="relative" ref={unidadAutocompleteRef}>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Unidad:
              </label>
              <div className="relative">
                <input
                  ref={unidadInputRef}
                  type="text"
                  value={unidadInput}
                  onChange={handleUnidadInputChange}
                  onFocus={() => {
                    if (unidadSuggestions.length > 0) {
                      setShowUnidadSuggestions(true);
                    }
                  }}
                  className={`w-full rounded-lg border py-[5px] pl-2 pr-8 text-sm transition-colors focus:border-blue-500 focus:outline-none ${
                    selectedUnidad ? 'border-green-300 bg-green-50' : 'border-slate-300'
                  }`}
                  placeholder="Buscar unidad..."
                />
                {loadingUnidades && (
                  <Loader2 className="absolute right-8 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-blue-500" />
                )}
                {unidadInput && (
                  <button
                    onClick={clearUnidadSelection}
                    className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown Unidad */}
              {showUnidadSuggestions && unidadSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {unidadSuggestions.map((unidad) => (
                    <div
                      key={unidad.codunidad}
                      onClick={() => handleSelectUnidad(unidad)}
                      className="cursor-pointer border-b border-slate-100 p-3 hover:bg-slate-50 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-slate-900">
                        {unidad.codunidad}
                      </div>
                      <div className="text-xs text-slate-500">
                        Tipo: {unidad.tipo} • Habilitado: {unidad.habilitado === '1' ? 'Sí' : 'No'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Autocomplete Conductor */}
            <div className="relative" ref={conductorAutocompleteRef}>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Conductor:
              </label>
              <div className="relative">
                <input
                  ref={conductorInputRef}
                  type="text"
                  value={conductorInput}
                  onChange={handleConductorInputChange}
                  onFocus={() => {
                    if (conductorSuggestions.length > 0) {
                      setShowConductorSuggestions(true);
                    }
                  }}
                  className={`w-full rounded-lg border py-[5px] pl-2 pr-8 text-sm transition-colors focus:border-blue-500 focus:outline-none ${
                    selectedConductor ? 'border-green-300 bg-green-50' : 'border-slate-300'
                  }`}
                  placeholder="Buscar conductor..."
                />
                {loadingConductores && (
                  <Loader2 className="absolute right-8 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-blue-500" />
                )}
                {conductorInput && (
                  <button
                    onClick={clearConductorSelection}
                    className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown Conductor */}
              {showConductorSuggestions && conductorSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {conductorSuggestions.map((conductor) => (
                    <div
                      key={conductor.codigo}
                      onClick={() => handleSelectConductor(conductor)}
                      className="cursor-pointer border-b border-slate-100 p-3 hover:bg-slate-50 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-slate-900">
                        {conductor.apepate}
                      </div>
                      <div className="text-xs text-slate-500">
                        Código: {conductor.codigo}
                      </div>
                      {conductor.telefono && (
                        <div className="text-xs text-slate-400">
                          Tel: {conductor.telefono}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-end">
              <button className="w-full rounded-lg bg-blue-600 px-4 py-[6px] text-sm font-medium text-white transition-colors hover:bg-blue-700">
                Asignar
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white px-3 py-2">
          <h2 className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-slate-800">
            <Filter className="h-4 w-4 text-blue-600" />
            Filtros
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="relative" ref={pasajeroAutocompleteRef}>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Búsqueda Pasajero:
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 transform text-slate-400" />
                <input
                  ref={pasajeroInputRef}
                  type="text"
                  value={pasajeroInput}
                  onChange={handlePasajeroInputChange}
                  onFocus={() => {
                    if (pasajeroSuggestions.length > 0) {
                      setShowPasajeroSuggestions(true);
                    }
                  }}
                  className={`w-full rounded-lg border py-[5px] pl-7 pr-8 text-sm transition-colors focus:border-blue-500 focus:outline-none ${
                    selectedPasajero ? 'border-green-300 bg-green-50' : 'border-slate-300'
                  }`}
                  placeholder="Buscar Pasajero..."
                />
                {loadingPasajeros && (
                  <Loader2 className="absolute right-8 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-blue-500" />
                )}
                {pasajeroInput && (
                  <button
                    onClick={clearPasajeroSelection}
                    className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showPasajeroSuggestions && pasajeroSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {pasajeroSuggestions.map((pasajero) => (
                    <div
                      key={pasajero.codlan}
                      onClick={() => handleSelectPasajero(pasajero)}
                      className="cursor-pointer border-b border-slate-100 p-3 hover:bg-slate-50 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-slate-900">
                        {pasajero.apepate}
                      </div>
                      <div className="text-xs text-slate-500">
                        Código: {pasajero.codlan} • {pasajero.lugar.distrito}
                      </div>
                      <div className="text-xs text-slate-400">
                        {pasajero.lugar.direccion}
                      </div>
                    </div>
                  ))}
                </div>
              )}
         
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Aerolíneas:
              </label>
              <select
                value={aerolinea}
                onChange={(e) => setAerolinea(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-[5px] text-sm transition-colors focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todas</option>
                {getUniqueOptions('aerolinea').map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Estado:
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-[5px] text-sm transition-colors focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todos</option>
                {getUniqueOptions('estado').map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setGrupo('');
                  setTipo('');
                  setAerolinea('');
                  clearUnidadSelection();
                  clearConductorSelection();
                  clearPasajeroSelection();
                  setEstado('');
                  toast.success('Filtros limpiados');
                }}
                className="w-full rounded-lg bg-slate-600 px-4 py-[6px] text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border-l-4 border-l-red-500 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Services List */}
        <div className="overflow-hidden border border-slate-200 bg-white shadow-md mx-2">
          <div className="border-b border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[12px] font-semibold text-slate-800">
                <MapPin className="h-4 w-4 text-blue-600" />
                Lista de Servicios ({filteredServices.length})
                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                )}
                {selectedPasajero && (
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                    Filtrado por: {selectedPasajero.apepate}
                  </span>
                )}
              </h2>
           
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700">
            <div className="col-span-1 flex items-center justify-center">
              Sel.
            </div>
            <div className="col-span-1">Número</div>
            <div className="col-span-1">Grupo</div>
            <div className="col-span-1">Tipo</div>
            <div className="col-span-2">Fecha Aeropuerto</div>
            <div className="col-span-2">Conductor</div>
            <div className="col-span-1">Unidad</div>
            <div className="col-span-1">Aerolínea</div>
            <div className="col-span-2">Acciones</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-100 h-[calc(100vh-450px)] overflow-y-auto">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className={`grid grid-cols-12 gap-2 p-2 transition-colors hover:bg-slate-50 ${
                  selectedServices.includes(service.id)
                    ? 'border-l-4 border-l-blue-500 bg-blue-50'
                    : ''
                }`}
              >
                <div className="col-span-1 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service.id)}
                    onChange={() => handleSelectService(service.id)}
                    className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-1 flex items-center text-sm font-medium text-slate-900">
                  {service.numero}
                </div>
                <div className="col-span-1 flex items-center">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                      service.tierra === 'Tierra'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {service.tierra}
                  </span>
                </div>
                <div className="col-span-1 flex items-center">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                      service.tipo === 'Salida'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {service.tipo}
                  </span>
                </div>
                <div className="col-span-2 flex items-center font-mono text-xs text-slate-700">
                  {service.fechaAeropuerto}
                </div>
                <div className="col-span-2 flex items-center text-xs text-slate-900">
                  {service.conductor}
                </div>
                <div className="col-span-1 flex items-center">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
                    {service.unidad}
                  </span>
                </div>
                <div className="col-span-1 flex items-center">
                  <span className="flex items-center gap-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-800">
                    <Plane className="h-2 w-2" />
                    {service.aerolinea}
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  <button
                    className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[11px] text-white transition-colors hover:bg-red-700"
                    title="Reiniciar"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reiniciar
                  </button>
                  <button
                    className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[11px] text-white transition-colors hover:bg-emerald-700"
                    title="Ver Pasajeros"
                  >
                    <Eye className="h-3 w-3" />
                    Pasajero
                  </button>
                  <button
                    className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[11px] text-white transition-colors hover:bg-red-700"
                    title="Cancelar"
                  >
                    <X className="h-3 w-3" />
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {!loading && filteredServices.length === 0 && (
            <div className="p-8 text-center">
              <Search className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <h3 className="mb-1 text-base font-medium text-slate-500">
                No se encontraron servicios
              </h3>
              <p className="text-sm text-slate-400">
                {services.length === 0
                  ? 'Haz clic en "Buscar Servicios" para cargar los datos'
                  : 'Ajusta los filtros de búsqueda para ver más resultados.'}
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-600" />
              <h3 className="mb-1 text-base font-medium text-slate-600">
                Cargando servicios...
              </h3>
              <p className="text-sm text-slate-400">
                Obteniendo datos de la API
              </p>
            </div>
          )}
        </div>

        {/* Selected Services Summary */}
        {selectedServices.length > 0 && (
          <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-50 p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-blue-900">
                  {selectedServices.length} servicio
                  {selectedServices.length !== 1 ? 's' : ''} seleccionado
                  {selectedServices.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setSelectedServices([])}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Limpiar selección
              </button>
            </div>
          </div>
        )}

        {/* Debug info - Remover en producción */}
        {(selectedPasajero || selectedConductor || selectedUnidad) && (
          <div className="mx-2 rounded-lg bg-gray-100 p-2 text-xs text-gray-600">
            <strong>Debug:</strong>
            {selectedPasajero && (
              <span className="ml-2">
                Pasajero: {selectedPasajero.apepate} (Codlan: {selectedPasajero.codlan})
              </span>
            )}
            {selectedConductor && (
              <span className="ml-2">
                Conductor: {selectedConductor.apepate} (Código: {selectedConductor.codigo})
              </span>
            )}
            {selectedUnidad && (
              <span className="ml-2">
                Unidad: {selectedUnidad.codunidad}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesSearchSystem;