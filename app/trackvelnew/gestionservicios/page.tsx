'use client';
import { Button, useDisclosure } from '@nextui-org/react';
import React, { useEffect, useState } from 'react';
import {
  FaCar,
  FaClipboardList,
  FaSquare,
  FaTasks,
  FaUser,
  FaUsers,
  FaUserTie,
} from 'react-icons/fa';
import { IoSave, IoSendSharp } from 'react-icons/io5';
import {
  MdCleaningServices,
  MdDelete,
  MdDesignServices,
  MdHomeRepairService,
  MdNewLabel,
  MdOutlineTask,
} from 'react-icons/md';
import { toast, Toaster } from 'sonner';
import '@/app/styles/planiTep.css';
import { IoSearchSharp } from 'react-icons/io5';
import { FaClipboard } from 'react-icons/fa';
import TableServicios from './TableServicios';
import axios from 'axios';
import Swal from 'sweetalert2';
import ModalNuevoServicio from './ModalNuevoServicio';
import { AiOutlineFilter } from 'react-icons/ai';
import { HiCalendarDateRange } from 'react-icons/hi2';
import { CgChevronRightR } from 'react-icons/cg';

const empresas = [
  'ABNER MATOS',
  'AIR FRANCE',
  'AJINOMOTO',
  'AMERICAN',
  'AMERICAN TIERRA',
  'ASO',
  'AVIANCA',
  'AVIANCA ADM',
  'CHINALCO',
  'CORPORACION EL GOLF S.A',
  'DELTA',
  'ECONOMICO',
  'EJECUTIVO VIP 2',
  'EJECUTIVO VIP 1',
  'FERNANDO MATOS',
  'INDECOPI',
  'KLM',
  'LA HANSEATICA',
  'LATAM',
  'LATAM ADM',
  'LCP',
  'LIMA TOURS',
  'MAPFRE',
  'METROPOLITAN',
  'METSO',
  'METSO SSGG',
  'MICKEY TOURS',
  'MILPO',
  'MKCOLLEAGUE',
  'MOVIL AIR',
  'MOVIL-BUS-MANTTO',
  'MOVILBUS',
  'NEXA',
  'NEXA CJM',
  'OI LURIN',
  'OI PERU',
  'PLUSPETROL',
  'PLUSPETROL-PISCO',
  'PREMIER',
  'PRESIDENCIAL',
  'PROSEGUR',
  'PTB',
  'Quality Products',
  'REP',
  'SAT',
  'SERVICE QUOTATION',
  'SIEMENS',
  'SUDAMERICAN',
  'TALMA',
  'TRAVEL GROUP',
  'UNITED',
  'VIPAC',
  'VOLVER',
  'ZUSANE',
];

export default function Page() {
  const [isVisible, setIsVisible] = useState(false);
  const [isVisibleAsignar, setIsVisibleAsignar] = useState(false);

  const [selectedArea, setSelectedArea] = useState('');
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [tipoServicio, setTipoServicio] = React.useState('');

  const [pasajero, setPasajero] = useState('');
  const [sugerencias, setSugerencias] = useState<
    { apepate: string; codlan: string }[]
  >([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [seleccionado, setSeleccionado] = useState(false);

  
  const [pasajeroCodlan, setPasajeroCodlan] = useState<string | null>(null);

  const [numeroServicio, setNumeroServicio] = useState('');

  const [unidad, setUnidad] = useState('');
  const [unidades, setUnidades] = useState<{ id: number; codunidad: string }[]>(
    [],
  );
  const [showDropdownUnidad, setShowDropdownUnidad] = useState(false);

  const [unidadSeleccionada, setUnidadSeleccionada] = useState<string | null>(
    null,
  );

  const [unidadA, setUnidadA] = useState('');
  const [unidadesA, setUnidadesA] = useState<
    { id: number; codunidad: string }[]
  >([]);
  const [showDropdownUnidadA, setShowDropdownUnidadA] = useState(false);

  const [unidadSeleccionadaA, setUnidadSeleccionadaA] = useState<string | null>(
    null,
  );

  const [conductor, setConductor] = useState<string>('');
  const [conductores, setConductores] = useState<
    { codigo: number; apepate: string }[]
  >([]);
  const [filteredOptions, setFilteredOptions] = useState<
    { codigo: number; apepate: string }[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [conductorSeleccionado, setConductorSeleccionado] = useState<
    string | null
  >(null);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [searchDate, setSearchDate] = useState<string | null>(null);

  const [refreshFlag, setRefreshFlag] = useState(false);

  useEffect(() => {
    const fetchPasajeros = async () => {
      if (pasajero.length < 1) {
        setSugerencias([]);
        return;
      }

      try {
        const response = await axios.get(
          `http://66.240.210.125:8586/api/Preplan/GetPasajeros?palabra=${pasajero}`,
        );

        const resultados = response.data.map((item: any) => ({
          apepate: item.apepate,
          codlan: item.codigo,
        }));

        setSugerencias(resultados);
      } catch (error) {
        console.error('Error al obtener pasajeros:', error);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchPasajeros();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [pasajero, seleccionado]);

  useEffect(() => {
    const fetchConductores = async () => {
      try {
        const response = await axios.get(
          'http://66.240.210.125:8586/api/Preplan/conductores?usuario=movilbus',
        );
        setConductores(response.data);
      } catch (error) {
        console.error('Error al obtener conductores:', error);
      }
    };

    fetchConductores();
  }, []);

  useEffect(() => {
    const fetchUnidades = async () => {
      try {
        const response = await axios.get(
          'http://66.240.210.125:8586/api/Preplan/unidades',
        );
        setUnidades(response.data);
        setUnidadesA(response.data);
      } catch (error) {
        console.error('Error al obtener unidades:', error);
      }
    };

    fetchUnidades();
  }, []);

  const handleConductorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConductor(value);

    if (value.length > 0) {
      const filtered = conductores.filter((c) =>
        c.apepate.toLowerCase().includes(value.toLowerCase()),
      );
      setFilteredOptions(filtered);
      setShowDropdown(true);
    } else {
      setFilteredOptions([]);
      setShowDropdown(false);
    }
  };

  const handleSelectConductor = (codigo: number, apepate: string) => {
    setConductor(apepate);
    setConductorSeleccionado(codigo.toString());
    setShowDropdown(false);
  };

  const filteredUnidades =
    unidad.length > 0
      ? unidades.filter((u) =>
          (u.codunidad ?? '').toLowerCase().includes(unidad.toLowerCase()),
        )
      : [];

  const handleUnidadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUnidad(value);
    setShowDropdownUnidad(true);

    if (!value.trim()) {
      setUnidadSeleccionada(null);
    }
  };

  const handleSelectUnidad = (codunidad: string) => {
    setUnidad(codunidad);
    setUnidadSeleccionada(codunidad);
    setShowDropdownUnidad(false);
  };

  const handleUnidadAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUnidadA(e.target.value);
    setShowDropdownUnidadA(true);
  };

  const handleSelectUnidadA = (codunidad: string) => {
    setUnidadA(codunidad);
    setUnidadSeleccionadaA(codunidad);
    setShowDropdownUnidadA(false);
  };

  const filteredUnidadesA =
    unidadA.length > 0
      ? unidadesA.filter((u) =>
          (u.codunidad ?? '').toLowerCase().includes(unidadA.toLowerCase()),
        )
      : [];

  const seleccionarPasajero = (nombre: string, codlan: string) => {
    setPasajero(nombre);
    setPasajeroCodlan(codlan);
    setSugerencias([]);
    setMostrarSugerencias(false);
    setSeleccionado(true);
  };

  useEffect(() => {
    if (sugerencias.length > 0 && pasajero) {
      setMostrarSugerencias(false);
    }
  }, [pasajero]);

  const toggleContent = () => {
    setIsVisible((prev) => !prev);
  };

  const handleClearFilters = () => {
    setSelectedArea('');
    setEmpresaSeleccionada('');
    setTipoServicio('');
    setPasajero('');
    setNumeroServicio('');
    setUnidad('');
    setUnidadSeleccionada(null);
    setPasajeroCodlan(null);
  };

  const asignarServicios = async () => {
    if (
      !conductorSeleccionado ||
      !unidadSeleccionadaA ||
      selectedServices.length === 0
    ) {
      toast.error(
        'Debe seleccionar al menos un servicio, un conductor y una unidad.',
      );

      return;
    }

    const payload = selectedServices.map((codservicio) => ({
      codservicio,
      conductor: {
        codigo: conductorSeleccionado,
      },
      unidad: {
        codunidad: unidadSeleccionadaA,
      },
    }));

    try {
      const response = await axios.post(
        'http://66.240.210.125:8586/api/Preplan/AsignarServicio',
        payload,
      );
      toast.success('Asignación realizada con éxito.');
    } catch (error) {
      toast.error('Error al enviar la asignación.');
    }
  };

  const eliminarServicio = async () => {
    if (selectedServices.length === 0) {
      toast.error('Debe seleccionar al menos un servicio.');
      return;
    }

    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará los servicios seleccionados permanentemente.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    });

    if (!result.isConfirmed) return;

    const payload = selectedServices.map((codservicio) => ({ codservicio }));

    try {
      await axios.delete(
        'http://66.240.210.125:8586/api/Preplan/eliminacionmultiple',
        {
          data: payload,
        },
      );

      toast.success('Eliminado con éxito.');
      setRefreshFlag((prev) => !prev);
    } catch (error) {
      toast.error('Error al eliminar el servicio.');
      console.error('Error en la eliminación:', error);
    }
  };

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    console.log('Nuevo valor de conductorSeleccionado:', conductorSeleccionado);
  }, [conductorSeleccionado]);

  useEffect(() => {
    console.log('Nuevo valor de UnidadSeleccionado:', unidadSeleccionadaA);
  }, [unidadSeleccionadaA]);

  useEffect(() => {
    console.log('Nuevo valor de UnidadSeleccionado:', unidadSeleccionada);
  }, [unidadSeleccionada]);

  useEffect(() => {
    console.log('Nuevo valor de ccodigosServicios:', selectedServices);
  }, [selectedServices]);

  return (
    <div className="containerTep">
      <Toaster richColors />
      <div>
        <div className="cabecera sticky top-0 z-50 bg-white shadow-md">
          <div className="progressAndTitle">
            <div className="relative">
              <span className="border-b-2 border-white px-4 py-2 pb-0.5 font-semibold uppercase leading-none text-white">
                CONTROL DE SERVICIOS
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onOpen}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#F7931E] px-4 py-1.5 text-[12.5px] font-medium text-[#2d2d2e] transition-all duration-200 ease-in hover:bg-orange-300"
              >
                <MdNewLabel size={20} color='#343a40'/>
                Nuevo Servicio
              </button>

              <ModalNuevoServicio isOpen={isOpen} onOpenChange={onOpenChange} />

              <button className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#F7931E] px-4 py-1.5 text-[12.5px] font-medium text-[#2d2d2e] transition-all duration-200 ease-in hover:bg-orange-300">
                Nuevo Servicio Turismo
              </button>
              <button
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#F7931E] px-4 py-1.5 text-[12.5px] font-medium text-[#2d2d2e] transition-all duration-200 ease-in hover:bg-orange-300"
                onClick={() => setIsVisibleAsignar((prev) => !prev)}
              >
                <MdDesignServices size={20} color='#343a40' />
                Asignar Servicio
              </button>
            </div>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              className="checkbox"
              onChange={toggleContent}
              checked={isVisible}
            />
            <div className="slider"></div>
          </label>
        </div>

        {isVisible && (
          <div id="contenido" >
            <div className="fristFileT">
              <div className="cargaArchivos">
                <div className="relative flex items-center pb-2">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <HiCalendarDateRange className="h-5 w-5 text-gray-600" />
                    Fecha a Consultar
                  </span>
                </div>

                <div className="cabeceraArchivos">
                  <div>
                    <input
                      type="date"
                      className="rounded-md border bg-gray-100 p-1 focus:outline-none"
                      value={selectedDate || ''}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <button
                      className="flex items-center gap-2 rounded-md bg-blue-500 px-4 py-1.5 font-medium text-white transition hover:bg-blue-600"
                      onClick={() => setSearchDate(selectedDate)}
                    >
                      Buscar
                      <IoSearchSharp className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <button
                      className="rounded-md bg-blue-500 px-4 py-1.5 font-medium text-white transition hover:bg-blue-600"
                      onClick={() => {
                        setSelectedDate(null);
                        setSearchDate(null);
                      }}
                    >
                      Actual
                    </button>
                  </div>

                  <div className="selectTipoA">
                    <select
                      id="countries"
                      className="block w-full rounded-lg border bg-gray-200 p-1.5 text-sm text-gray-800 focus:outline-none dark:border-stone-200 "
                    >
                      <option value="">Seleccione Empresa</option>
                      <option value="Empresa 1">Empresa 1</option>
                      <option value="Empresa 2">Empresa 2</option>
                      <option value="Empresa 3">Empresa 3</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="container-btn-file">
                      <FaClipboard size={20} />
                      Resumen
                    </button>

                    <button className="container-btn-file">
                      <FaClipboard size={20} />
                      Resumen 2
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="fristFileT">
              <div className="filtrosPlanificacion">
                <div className="relative flex items-center pb-2">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <AiOutlineFilter className="h-5 w-5 text-gray-600" />
                    Filtros de Búsqueda
                  </span>
                </div>

                <div className="cabeceraArchivos">
                  <div className="inputFiltros">
                    <select
                      id="countries"
                      className="block w-full rounded-lg border bg-gray-200 p-1.5 text-sm text-gray-800 focus:outline-none dark:border-stone-200"
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                    >
                      <option value="" disabled>
                        Seleccione Área
                      </option>
                      <option value="TEP">TEP</option>
                      <option value="TURISMO">TURISMO</option>
                    </select>
                  </div>

                  <div className="max-w-lg">
                    <select
                      id="countries"
                      className="block w-full rounded-lg border bg-gray-200 p-1.5 text-sm text-gray-800 focus:outline-none dark:border-stone-200 "
                      value={empresaSeleccionada}
                      onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                    >
                      <option value="" disabled>
                        Seleccione Cliente
                      </option>
                      {empresas.map((empresa, index) => (
                        <option key={index} value={empresa}>
                          {empresa}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="max-w-lg">
                    <select
                      id="tipo-servicio"
                      className="block w-full rounded-lg border bg-gray-200 p-1.5 text-sm text-gray-800 focus:outline-none dark:border-stone-200 "
                      value={tipoServicio}
                      onChange={(e) => setTipoServicio(e.target.value)}
                    >
                      <option value="" disabled>
                        Seleccione Tipo Servicio
                      </option>
                      <option value="I">Recojo</option>
                      <option value="S">Reparto</option>
                      <option value="TRF IN">TRF IN</option>
                      <option value="TRF OUT">TRF OUT</option>
                      <option value="CITY TOUR">CITY TOUR</option>
                      <option value="VIAJE">VIAJE</option>
                      <option value="FULLDAY">FULLDAY</option>
                    </select>
                  </div>

                  <div className="relative" style={{ width: '350px' }}>
                    <input
                      id="inputPasajero"
                      type="text"
                      className="peer block w-full rounded-lg border border-transparent bg-gray-200 px-16 py-1.5 ps-11 text-sm  focus:outline-none disabled:pointer-events-none disabled:opacity-50 dark:border-stone-200 dark:placeholder:text-gray-700"
                      placeholder="Pasajero"
                      value={pasajero}
                      onChange={(e) => {
                        if (seleccionado) {
                          setSeleccionado(false);
                          return;
                        }
                        setPasajero(e.target.value);
                        setMostrarSugerencias(true);
                      }}
                      onFocus={() => {
                        if (sugerencias.length > 0 && !seleccionado)
                          setMostrarSugerencias(true);
                      }}
                      onBlur={() =>
                        setTimeout(() => setMostrarSugerencias(false), 100)
                      }
                    />
                    <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4">
                      <FaUser color="#343a40" />
                    </div>

                    {mostrarSugerencias && sugerencias.length > 0 && (
                      <ul className="fixed z-[9999] mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg ">
                        {sugerencias.map((item, index) => (
                          <li
                            key={index}
                            className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                            onMouseDown={(e) => {
                              e.preventDefault(); 
                              seleccionarPasajero(item.apepate, item.codlan);

                              setMostrarSugerencias(false); 
                              setSugerencias([]); // Limpia las sugerencias

                              setTimeout(() => {
                                const input =
                                  document.getElementById('inputPasajero');
                                input?.blur(); // Forzar que el input pierda el foco
                              }, 100); // Le damos 100ms para que termine la selección
                            }}
                          >
                            {item.apepate}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div style={{ width: '170px' }}>
                    <input
                      value={numeroServicio}
                      onChange={(e) => setNumeroServicio(e.target.value)}
                      type="number"
                      id="tentacles"
                      name="tentacles"
                      placeholder="Número de Servicio"
                      min="0"
                      max="100"
                      className="w-full rounded-lg border border-gray-300 bg-gray-200 p-1.5 text-center shadow-sm dark:placeholder:text-gray-700"
                    />
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      className="peer block w-full rounded-lg border border-transparent bg-gray-200 px-16 py-1.5 ps-11 text-sm  focus:outline-none disabled:pointer-events-none disabled:opacity-50 dark:border-stone-200 dark:placeholder:text-gray-700"
                      placeholder="Unidad"
                      value={unidad}
                      onChange={handleUnidadChange}
                      onFocus={() => setShowDropdownUnidad(true)}
                      onBlur={() =>
                        setTimeout(() => setShowDropdownUnidad(false), 200)
                      }
                    />
                    <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 peer-disabled:pointer-events-none peer-disabled:opacity-50">
                      <FaCar color="#343a40" />
                    </div>

                    {showDropdownUnidad && filteredUnidades.length > 0 && (
                      <ul className="fixed z-[9999] mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                        {filteredUnidades.map((unidad) => (
                          <li
                            key={unidad.id}
                            className="cursor-pointer px-4 py-2 hover:bg-gray-200"
                            onClick={() => handleSelectUnidad(unidad.codunidad)}
                          >
                            {unidad.codunidad}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mr-2">
                    <div className="group relative">
                      <button
                        className="flex cursor-pointer items-center rounded-md bg-red-600 fill-red-400 p-1.5 duration-100 hover:bg-red-700 active:border active:border-red-400"
                        onClick={handleClearFilters}
                      >
                        <MdCleaningServices color="#fff" />
                      </button>

                      <div className="absolute left-1/2 top-[-35px] -translate-x-1/2 scale-0 transform rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-all duration-150 group-hover:scale-100 group-hover:opacity-100">
                        Limpiar
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isVisibleAsignar && (
          <div
            className="flex justify-between gap-2"
            style={{
              background: '#fff',
              paddingBottom: '5px',
              paddingLeft: '10px',
              paddingTop: '5px',
              borderRadius: '10px',
              marginTop: '10px',
            }}
          >
            <div className="flex gap-2">
              <div className="relative">
                <input
                  type="text"
                  className="peer block w-96 rounded-lg border-transparent bg-gray-200 px-16 py-1.5 ps-11 text-sm placeholder-zinc-500 disabled:pointer-events-none disabled:opacity-50"
                  placeholder="Conductor"
                  value={conductor}
                  onChange={handleConductorChange}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                />

                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 peer-disabled:pointer-events-none peer-disabled:opacity-50">
                  <FaUserTie color="#343a40" />
                </div>

                {showDropdown && filteredOptions.length > 0 && (
                  <ul className="fixed z-[9999] mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                    {filteredOptions.map((c) => (
                      <li
                        key={c.codigo}
                        className="cursor-pointer px-4 py-2 hover:bg-gray-200"
                        onClick={() =>
                          handleSelectConductor(c.codigo, c.apepate)
                        }
                      >
                        {c.apepate}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  className="peer block w-full rounded-lg border-transparent bg-gray-200 px-4 py-1.5 ps-11 text-sm placeholder-zinc-500 disabled:pointer-events-none disabled:opacity-50"
                  placeholder="Unidad"
                  value={unidadA}
                  onChange={handleUnidadAChange}
                  onFocus={() => setShowDropdownUnidadA(true)}
                  onBlur={() =>
                    setTimeout(() => setShowDropdownUnidadA(false), 200)
                  }
                />
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 peer-disabled:pointer-events-none peer-disabled:opacity-50">
                  <FaCar color="#343a40" />
                </div>

                {showDropdownUnidadA && filteredUnidadesA.length > 0 && (
                  <ul className="fixed z-[9999] mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                    {filteredUnidadesA.map((unidad) => (
                      <li
                        key={unidad.id}
                        className="cursor-pointer px-4 py-2 hover:bg-gray-200"
                        onClick={() => handleSelectUnidadA(unidad.codunidad)}
                      >
                        {unidad.codunidad}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex gap-2 pr-2">
              <button
                className="flex items-center gap-2 rounded-md bg-blue-500 px-4 py-1.5 text-white transition hover:bg-blue-600"
                onClick={asignarServicios}
              >
                Asignar <MdOutlineTask className="h-4 w-4" />
              </button>

              <button
                className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-1.5  text-white transition hover:bg-red-500"
                onClick={eliminarServicio}
              >
                Eliminar <MdDelete className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grupoServicios  relative z-10 overflow-visible">
        <TableServicios
          isVisible={isVisible}
          isVisibleAsignar={isVisibleAsignar}
          selectedArea={selectedArea}
          selectedEmpresa={empresaSeleccionada}
          selecteServicio={tipoServicio}
          selecteNumServicio={numeroServicio}
          selectedUnidad={unidadSeleccionada}
          selectedPasajeroCodlan={pasajeroCodlan}
          onSelectionChange={setSelectedServices}
          selectedDate={searchDate}
          refreshFlag={refreshFlag}
        ></TableServicios>
      </div>
    </div>
  );
}
