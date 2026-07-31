'use client';
import React, { useState, useEffect, useRef } from 'react';
import { toast, Toaster } from 'sonner';
import {
  Search,
  X,
  RotateCcw,
  Loader2
} from 'lucide-react';
import ModalAddService from './ModalAddService';
import ModalPasajero from './ModalPasajero';
import Swal from 'sweetalert2';
import { useUsername } from '@/hooks/useUsername';

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
  const { username, isReady } = useUsername();
  // Estados para la API
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para el autocomplete de pasajeros
  const [pasajeroInput, setPasajeroInput] = useState('');
  const [selectedPasajero, setSelectedPasajero] = useState<{
    codlan: string;
    apepate: string;
  } | null>(null);
  const [pasajeroSuggestions, setPasajeroSuggestions] = useState<Pasajero[]>(
    [],
  );
  const [showPasajeroSuggestions, setShowPasajeroSuggestions] = useState(false);
  const [loadingPasajeros, setLoadingPasajeros] = useState(false);
  const pasajeroAutocompleteRef = useRef<HTMLDivElement>(null);
  const pasajeroInputRef = useRef<HTMLInputElement>(null);

  // Estados para el autocomplete de conductores
  const [conductorInput, setConductorInput] = useState('');
  const [selectedConductor, setSelectedConductor] = useState<{
    codigo: string;
    apepate: string;
  } | null>(null);
  const [conductorSuggestions, setConductorSuggestions] = useState<Conductor[]>(
    [],
  );
  const [showConductorSuggestions, setShowConductorSuggestions] =
    useState(false);
  const [loadingConductores, setLoadingConductores] = useState(false);
  const conductorAutocompleteRef = useRef<HTMLDivElement>(null);
  const conductorInputRef = useRef<HTMLInputElement>(null);

  // Estados para el autocomplete de unidades
  const [unidadInput, setUnidadInput] = useState('');
  const [selectedUnidad, setSelectedUnidad] = useState<{
    codunidad: string;
  } | null>(null);
  const [unidadSuggestions, setUnidadSuggestions] = useState<Unidad[]>([]);
  const [showUnidadSuggestions, setShowUnidadSuggestions] = useState(false);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const unidadAutocompleteRef = useRef<HTMLDivElement>(null);
  const unidadInputRef = useRef<HTMLInputElement>(null);

  const [loadingAsignacion, setLoadingAsignacion] = useState(false);

  const [isFirstTimeFromDate, setIsFirstTimeFromDate] = useState(true);
  const [isFirstTimeToDate, setIsFirstTimeToDate] = useState(true);

  // Función para transformar datos de la API
  const transformApiData = (apiData: ApiService[]): Service[] => {
    return apiData.map((item) => {
      return {
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
        // CONDUCTOR: Validación corregida para manejar nombres en campo apepate
        conductor: (() => {
          if (!item.conductor) return 'Sin asignar';

          const nombre = item.conductor.nombre || '';
          const apepate = item.conductor.apepate || '';

          // Limpiar espacios extras
          const nombreLimpio = nombre.trim();
          const apepateLimpio = apepate.trim();

          // Si ambos tienen contenido
          if (nombreLimpio && apepateLimpio) {
            return `${nombreLimpio} ${apepateLimpio}`;
          }

          // Si solo apepate tiene contenido (caso común en tu sistema)
          if (apepateLimpio) {
            return apepateLimpio;
          }

          // Si solo nombre tiene contenido
          if (nombreLimpio) {
            return nombreLimpio;
          }

          // Si tiene código pero no nombre ni apellido
          if (item.conductor.codigo) {
            return `Conductor ${item.conductor.codigo}`;
          }

          return 'Sin asignar';
        })(),
        unidad: item.unidad?.codunidad || 'Sin asignar',
        aerolinea: item.empresa,
        estado: item.estado,
        numpax: item.numpax,
      };
    });
  };

  // Función para buscar pasajeros
  const searchPasajeros = async (palabra: string) => {
    if (!isReady || !username) {
      toast.error('Usuario no disponible');
      return;
    }

    if (palabra.length < 3) {
      setPasajeroSuggestions([]);
      setShowPasajeroSuggestions(false);
      return;
    }

    setLoadingPasajeros(true);
    try {
      const url = `https://do.velsat.pe:2083/api/Preplan/GetPasajeros?palabra=${encodeURIComponent(palabra)}&codusuario=${username}`;      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data: Pasajero[] = await response.json();
      setPasajeroSuggestions(data);
      setShowPasajeroSuggestions(true);
    } catch (err) {
      setPasajeroSuggestions([]);
      setShowPasajeroSuggestions(false);
    } finally {
      setLoadingPasajeros(false);
    }
  };

  // Función para buscar conductores
  const searchConductores = async (palabra: string) => {
    if (!isReady || !username) {
      toast.error('Usuario no disponible');
      return;
    }

    if (palabra.length < 2) {
      setConductorSuggestions([]);
      setShowConductorSuggestions(false);
      return;
    }

    setLoadingConductores(true);
    try {
      const url = `https://do.velsat.pe:2083/api/Preplan/conductores?usuario=${username}`;      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data: Conductor[] = await response.json();
      // Filtrar conductores por la palabra de búsqueda
      const filteredData = data.filter(
        (conductor) =>
          conductor.apepate.toLowerCase().includes(palabra.toLowerCase()) ||
          conductor.codigo.includes(palabra),
      );

      setConductorSuggestions(filteredData);
      setShowConductorSuggestions(true);
    } catch (err) {
      setConductorSuggestions([]);
      setShowConductorSuggestions(false);
    } finally {
      setLoadingConductores(false);
    }
  };

  // Función para buscar unidades
  const searchUnidades = async (palabra: string) => {
    if (!isReady || !username) {
      toast.error('Usuario no disponible');
      return;
    }

    if (palabra.length < 2) {
      setUnidadSuggestions([]);
      setShowUnidadSuggestions(false);
      return;
    }

    setLoadingUnidades(true);
    try {
      const url = `https://do.velsat.pe:2083/api/Preplan/carros/${username}`;      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data: Unidad[] = await response.json();
      // Filtrar unidades por la palabra de búsqueda y solo las habilitadas
      const filteredData = data.filter(
        (unidad) =>
          unidad.habilitado === '1' &&
          unidad.codunidad.toLowerCase().includes(palabra.toLowerCase()),
      );

      setUnidadSuggestions(filteredData);
      setShowUnidadSuggestions(true);
    } catch (err) {
      setUnidadSuggestions([]);
      setShowUnidadSuggestions(false);
    } finally {
      setLoadingUnidades(false);
    }
  };

  const fetchServices = async () => {
    if (!isReady || !username) {
      toast.error('Usuario no disponible');
      return;
    }

    if (!dateFrom || !dateTo) {
      toast.error('Por favor selecciona las fechas de inicio y fin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data: ApiService[] = [];

      if (selectedPasajero && selectedPasajero.codlan) {
        const fechaFormatted = dateFrom.split('T')[0];
        const url = `https://do.velsat.pe:2083/api/Preplan/GetServicioPasajero?usuario=${username}&fec=${fechaFormatted}&codcliente=${selectedPasajero.codlan}`;

        const response = await fetch(url);

        if (response.status === 404) {
          toast.info('No hay servicios para las fechas ingresadas');
          setServices([]);
          return;
        }

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        data = await response.json();
        toast.success(
          `Se cargaron ${data.length} servicios del pasajero ${selectedPasajero.apepate}`,
        );
      } else {
        const fechainiFormatted = dateFrom.replace('T', ' ');
        const fechafinFormatted = dateTo.replace('T', ' ');
        const url = `https://do.velsat.pe:2083/api/Gacela/Getservicios?fechaini=${fechainiFormatted}&fechafin=${fechafinFormatted}&usu=${username}`;

        const response = await fetch(url);

        if (response.status === 404) {
          toast.info('No hay servicios para las fechas ingresadas');
          setServices([]);
          return;
        }

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        data = await response.json();
        toast.success(`Se cargaron ${data.length} servicios correctamente`);
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

  const refreshServices = () => {
    if (dateFrom && dateTo) {
      fetchServices();
    }
  };

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

  useEffect(() => {
    if (selectedPasajero && dateFrom) {
      fetchServices();
    }
  }, [selectedPasajero]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pasajeroAutocompleteRef.current &&
        !pasajeroAutocompleteRef.current.contains(event.target as Node)
      ) {
        setShowPasajeroSuggestions(false);
      }
      if (
        conductorAutocompleteRef.current &&
        !conductorAutocompleteRef.current.contains(event.target as Node)
      ) {
        setShowConductorSuggestions(false);
      }
      if (
        unidadAutocompleteRef.current &&
        !unidadAutocompleteRef.current.contains(event.target as Node)
      ) {
        setShowUnidadSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getUniqueOptions = (field: keyof Service) => {
    const uniqueSet = new Set(services.map((service) => service[field]));
    const uniqueValues = Array.from(uniqueSet);
    return uniqueValues.filter((value) => value && value !== '').sort();
  };

  const handleSelectService = (id: string) => {
    setSelectedServices((prev) => {
      const newSelected = prev.includes(id)
        ? prev.filter((serviceId) => serviceId !== id)
        : [...prev, id];

      return newSelected;
    });
  };

  const handleSelectAll = () => {
    setSelectedServices(filteredServices.map((service) => service.id));
  };

  const handlePasajeroInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setPasajeroInput(value);

    if (selectedPasajero && value !== selectedPasajero.apepate) {
      setSelectedPasajero(null);
    }
  };

  const asignarServicios = async () => {
    if (!isReady || !username) {
      toast.error('Usuario no disponible');
      return;
    }

    if (
      !selectedConductor ||
      !selectedUnidad ||
      selectedServices.length === 0
    ) {
      toast.error(
        'Debe seleccionar al menos un servicio, un conductor y una unidad.',
      );
      return;
    }

    setLoadingAsignacion(true);

    const payload = selectedServices.map((codservicio) => ({
      codservicio,
      conductor: {
        codigo: selectedConductor.codigo,
      },
      unidad: {
        codunidad: selectedUnidad.codunidad,
      },
    }));

    try {
      const response = await fetch(
        'https://do.velsat.pe:2083/api/Preplan/AsignarServicio',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      setServices((prevServices) =>
        prevServices.map((service) => {
          if (selectedServices.includes(service.id)) {
            return {
              ...service,
              conductor: selectedConductor.apepate,
              unidad: selectedUnidad.codunidad,
            };
          }
          return service;
        }),
      );

      toast.success('Asignación realizada con éxito.');
      setSelectedServices([]);
      clearConductorSelection();
      clearUnidadSelection();
    } catch (error) {
      toast.error('Error al enviar la asignación.');
    } finally {
      setLoadingAsignacion(false);
    }
  };

  const reiniciarServicio = async (codservicio: string, numero: string) => {
    const toastId = toast.loading(`Reiniciando servicio ${numero}...`);

    try {
      const response = await fetch(
        `https://do.velsat.pe:2083/api/Gacela/ReiniciarServicio/${codservicio}`,
        {
          method: 'PUT',
        },
      );

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      toast.success(`Servicio ${numero} reiniciado exitosamente`, {
        id: toastId,
      });
    } catch (error) {
      toast.error('Error al reiniciar el servicio', { id: toastId });
    }
  };

  const cancelarServicio = async (codservicio: string, numero: string) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas cancelar el servicio ${numero}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No, mantener',
    });

    if (result.isConfirmed) {
      const toastId = toast.loading(`Cancelando servicio ${numero}...`);

      try {
        const response = await fetch(
          `https://do.velsat.pe:2083/api/Preplan/cancelar/${codservicio}`,
          {
            method: 'DELETE',
          },
        );

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        // Actualizar la lista de servicios localmente
        setServices((prevServices) =>
          prevServices.filter((service) => service.id !== codservicio),
        );

        toast.success(`Servicio ${numero} cancelado exitosamente`, {
          id: toastId,
        });

        Swal.fire(
          'Cancelado!',
          `El servicio ${numero} ha sido cancelado.`,
          'success',
        );
      } catch (error) {
        toast.error('Error al cancelar el servicio', { id: toastId });

        Swal.fire('Error!', 'No se pudo cancelar el servicio.', 'error');
      }
    }
  };

  const handleSelectPasajero = (pasajero: Pasajero) => {
    setSelectedPasajero({
      codlan: pasajero.codigo,
      apepate: pasajero.apepate,
    });
    setPasajeroInput(pasajero.apepate);
    setShowPasajeroSuggestions(false);
  };

  const clearPasajeroSelection = () => {
    setSelectedPasajero(null);
    setPasajeroInput('');
    setPasajeroSuggestions([]);
    setShowPasajeroSuggestions(false);
  };

  // Handlers para conductores
  const handleConductorInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setConductorInput(value);

    if (selectedConductor && value !== selectedConductor.apepate) {
      setSelectedConductor(null);
    }
  };

  const handleSelectConductor = (conductor: Conductor) => {
    setSelectedConductor({
      codigo: conductor.codigo,
      apepate: conductor.apepate,
    });
    setConductorInput(conductor.apepate);
    setShowConductorSuggestions(false);
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
      codunidad: unidad.codunidad,
    });
    setUnidadInput(unidad.codunidad);
    setShowUnidadSuggestions(false);
  };

  const clearUnidadSelection = () => {
    setSelectedUnidad(null);
    setUnidadInput('');
    setUnidadSuggestions([]);
    setShowUnidadSuggestions(false);
  };

  // Filtros (sin incluir los autocomplete de conductor y unidad)
  const filteredServices = services
    .filter((service) => {
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
    })
    .sort((a, b) => {
      const numA = parseInt(a.numero) || 0;
      const numB = parseInt(b.numero) || 0;
      return numA - numB;
    });

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && isFirstTimeFromDate) {
      const selectedDate = value.split('T')[0];
      setDateFrom(selectedDate + 'T00:00');
      setIsFirstTimeFromDate(false);
    } else {
      setDateFrom(value);
    }
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && isFirstTimeToDate) {
      const selectedDate = value.split('T')[0];
      setDateTo(selectedDate + 'T23:59');
      setIsFirstTimeToDate(false);
    } else {
      setDateTo(value);
    }
  };
  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster richColors />

      <div className="border-b border-gray-200 bg-[#efeff0] px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
            <div className="h-5 w-1 bg-[#113EB9]"></div>
            <h1 className="text-[13px] font-bold uppercase tracking-wide text-gray-800">
              Administración de Servicios
            </h1>
            <span className="bg-[#113EB9] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {filteredServices.length}
            </span>
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar servicio por número, conductor o unidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-[12px] placeholder-gray-400 transition-colors focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto space-y-0">
        {/* Búsqueda de Servicios */}
        <div className="border-b border-gray-200 bg-white px-3 py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">Búsqueda</span>
            <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-6">
              <input
                type="datetime-local"
                value={dateFrom}
                onChange={handleDateFromChange}
                className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] focus:border-[#113EB9] focus:outline-none"
              />
              <input
                type="datetime-local"
                value={dateTo}
                onChange={handleDateToChange}
                className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] focus:border-[#113EB9] focus:outline-none"
              />
              <select
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] focus:border-[#113EB9] focus:outline-none"
              >
                <option value="">Grupo: Todos</option>
                {getUniqueOptions('tierra').map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] focus:border-[#113EB9] focus:outline-none"
              >
                <option value="">Tipo: Todos</option>
                {getUniqueOptions('tipo').map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <button
                onClick={fetchServices}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1 rounded-md bg-brandPrimary px-3 py-1 text-[11px] font-medium text-white hover:bg-brandPrimary-hover disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                {loading ? 'Cargando...' : selectedPasajero ? 'Por Pasajero' : 'Buscar'}
              </button>
              <ModalAddService onServiceAdded={refreshServices} />
            </div>
          </div>
        </div>

        {/* Asignación + Filtros en una sola fila */}
        <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">Asignar</span>
            <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-6">
              {/* Unidad */}
              <div className="relative" ref={unidadAutocompleteRef}>
                <div className="relative">
                  <input
                    ref={unidadInputRef}
                    type="text"
                    value={unidadInput}
                    onChange={handleUnidadInputChange}
                    onFocus={() => { if (unidadSuggestions.length > 0) setShowUnidadSuggestions(true); }}
                    className={`w-full rounded-md border px-2 py-1 pr-7 text-[11px] focus:border-[#113EB9] focus:outline-none ${selectedUnidad ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}
                    placeholder="Unidad..."
                  />
                  {loadingUnidades && <Loader2 className="absolute right-7 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-blue-500" />}
                  {unidadInput && (
                    <button onClick={clearUnidadSelection} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {showUnidadSuggestions && unidadSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                    {unidadSuggestions.map((unidad) => (
                      <div key={unidad.codunidad} onClick={() => handleSelectUnidad(unidad)} className="cursor-pointer border-b border-gray-100 px-2 py-1.5 text-[11px] hover:bg-blue-50">
                        <div className="font-medium text-gray-900">{unidad.codunidad}</div>
                        <div className="text-[10px] text-gray-500">Tipo: {unidad.tipo} • {unidad.habilitado === '1' ? 'Hab.' : 'No hab.'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Conductor */}
              <div className="relative" ref={conductorAutocompleteRef}>
                <div className="relative">
                  <input
                    ref={conductorInputRef}
                    type="text"
                    value={conductorInput}
                    onChange={handleConductorInputChange}
                    onFocus={() => { if (conductorSuggestions.length > 0) setShowConductorSuggestions(true); }}
                    className={`w-full rounded-md border px-2 py-1 pr-7 text-[11px] focus:border-[#113EB9] focus:outline-none ${selectedConductor ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}
                    placeholder="Conductor..."
                  />
                  {loadingConductores && <Loader2 className="absolute right-7 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-blue-500" />}
                  {conductorInput && (
                    <button onClick={clearConductorSelection} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {showConductorSuggestions && conductorSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                    {conductorSuggestions.map((conductor) => (
                      <div key={conductor.codigo} onClick={() => handleSelectConductor(conductor)} className="cursor-pointer border-b border-gray-100 px-2 py-1.5 text-[11px] hover:bg-blue-50">
                        <div className="font-medium text-gray-900">{conductor.apepate}</div>
                        <div className="text-[10px] text-gray-500">Cód: {conductor.codigo}{conductor.telefono ? ` • ${conductor.telefono}` : ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={asignarServicios}
                disabled={!selectedConductor || !selectedUnidad || selectedServices.length === 0 || loadingAsignacion}
                className="inline-flex items-center justify-center gap-1 rounded-md bg-[#fb7b0f] px-3 py-1 text-[11px] font-medium text-white hover:bg-orange-500 disabled:opacity-50"
              >
                {loadingAsignacion ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {loadingAsignacion ? 'Asignando...' : 'Asignar'}
              </button>

              {/* Pasajero */}
              <div className="relative" ref={pasajeroAutocompleteRef}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={pasajeroInputRef}
                    type="text"
                    value={pasajeroInput}
                    onChange={handlePasajeroInputChange}
                    onFocus={() => { if (pasajeroSuggestions.length > 0) setShowPasajeroSuggestions(true); }}
                    className={`w-full rounded-md border px-2 py-1 pl-6 pr-7 text-[11px] focus:border-[#113EB9] focus:outline-none ${selectedPasajero ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}
                    placeholder="Pasajero..."
                  />
                  {loadingPasajeros && <Loader2 className="absolute right-7 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-blue-500" />}
                  {pasajeroInput && (
                    <button onClick={clearPasajeroSelection} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {showPasajeroSuggestions && pasajeroSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                    {pasajeroSuggestions.map((pasajero) => (
                      <div key={pasajero.codlan} onClick={() => handleSelectPasajero(pasajero)} className="cursor-pointer border-b border-gray-100 px-2 py-1.5 text-[11px] hover:bg-blue-50">
                        <div className="font-medium text-gray-900">{pasajero.apepate}</div>
                        <div className="text-[10px] text-gray-500">{pasajero.codlan} • {pasajero.lugar.distrito}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <select
                value={aerolinea}
                onChange={(e) => setAerolinea(e.target.value)}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] focus:border-[#113EB9] focus:outline-none"
              >
                <option value="">Aerolínea: Todas</option>
                {getUniqueOptions('aerolinea').map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

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
                className="inline-flex items-center justify-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
              >
                <RotateCcw className="h-3 w-3" />
                Limpiar
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
        <div className="mx-2 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[12px] font-semibold text-slate-800">
                <Search className="h-4 w-4 text-[#113EB9]" />
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
          <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-[#113eb9] p-2 text-xs font-semibold text-slate-700">
            <div className="col-span-1 flex items-center justify-center text-gray-50">
              Sel.
            </div>
            <div className="col-span-1 text-gray-50">Número</div>
            <div className="col-span-1 text-gray-50">Grupo</div>
            <div className="col-span-1 text-gray-50">Tipo</div>
            <div className="col-span-2 text-gray-50">Fecha Aeropuerto</div>
            <div className="col-span-2 text-gray-50">Conductor</div>
            <div className="col-span-1 text-gray-50">Unidad</div>
            <div className="col-span-1 text-gray-50">Aerolínea</div>
            <div className="col-span-2 text-gray-50">Acciones</div>
          </div>

          {/* Table Body */}
          <div className="h-[calc(100vh-230px)] min-h-[200px] divide-y divide-slate-100 overflow-y-auto">
            {!loading && filteredServices.map((service) => (
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
                <div className="col-span-1 flex items-center font-mono text-xs text-slate-700">
                  {service.unidad}
                </div>
                <div className="col-span-1 flex items-center">
                  <span className="text-xs text-gray-700">
                    {service.aerolinea}
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  <button
                    onClick={() =>
                      reiniciarServicio(service.id, service.numero)
                    }
                    className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[11px] text-white transition-colors hover:bg-red-700"
                    title="Reiniciar"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reiniciar
                  </button>

                  <ModalPasajero
                    servicioData={{
                      codservicio: service.id,
                      numero: service.numero,
                      grupo: service.tierra,
                      tipo: service.tipo,
                      fechaAeropuerto: service.fechaAeropuerto,
                      aerolinea: service.aerolinea,
                    }}
                  />
                  <button
                    onClick={() => cancelarServicio(service.id, service.numero)}
                    className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[11px] text-white transition-colors hover:bg-red-700"
                    title="Cancelar"
                  >
                    <X className="h-3 w-3" />
                    Cancelar
                  </button>
                </div>
              </div>
            ))}

            {/* Loading State */}
            {loading && (
              <div className="flex h-[calc(100vh-280px)] items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[#113EB9]" />
                  <p className="text-[12px] text-gray-500">Cargando servicios...</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredServices.length === 0 && (
              <div className="flex h-[calc(100vh-280px)] items-center justify-center">
                <div className="text-center">
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
              </div>
            )}
          </div>
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

      </div>
    </div>
  );
};

export default ServicesSearchSystem;
