'use client';
import { useDisclosure } from '@nextui-org/react';
import React, { useEffect, useState } from 'react';
import { FaUser } from 'react-icons/fa';
import {
  MdCleaningServices,
  MdDelete,
  MdDesignServices,
  MdNewLabel,
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
import { RiCheckboxMultipleFill } from 'react-icons/ri';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import InputUnidad from '@/app/components/inputs/InputUnidad';
import InputConductor from '@/app/components/inputs/InputConductor';
import { useUsername } from '@/hooks/useUsername';

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

const empresasG = ['ATSA', 'AVIANCA', 'DHL', 'LATAM', 'TALMA', 'TERPEL'];

export default function Page() {
  const { username, isReady } = useUsername();

  const [isVisible, setIsVisible] = useState(true);
  const [isVisibleAsignar, setIsVisibleAsignar] = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [empresaSelecRes, setEmpresaSelecRes] = useState('');
  const [tipoServicio, setTipoServicio] = React.useState('');
  const [pasajero, setPasajero] = useState('');
  const [sugerencias, setSugerencias] = useState<
    { apepate: string; codlan: string }[]
  >([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [seleccionado, setSeleccionado] = useState(false);
  const [pasajeroCodlan, setPasajeroCodlan] = useState<string | null>(null);
  const [numeroServicio, setNumeroServicio] = useState('');
  const [unidadSeleccionada, setUnidadSeleccionada] = useState('');
  const [unidadSeleccionadaAsignar, setUnidadSeleccionadaAsignar] =
    useState('');
  const [apepateConductor, setApepateConductor] = useState('');
  const [codConductor, setCodConductor] = useState<number | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchDate, setSearchDate] = useState<string | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [refreshFlagServicio, setRefreshFlagServicio] = useState(false);
  const [refreshSearch, setRefreshSearch] = useState(0);

  useEffect(() => {
    const fetchPasajeros = async () => {
      if (!isReady || pasajero.length < 1) {
        setSugerencias([]);
        return;
      }

      try {
        const response = await axios.get(
          `${API_BASE_URL125}/api/Preplan/GetPasajeros?palabra=${pasajero}&codusuario=${username}`,
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
  }, [pasajero, seleccionado, username, isReady]);

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
    setUnidadSeleccionada('');
    setPasajeroCodlan(null);

    toast('Filtros reseteados', {
      style: {
        background: '#dbeafe',
        color: '#1C5ED8',
        border: 'none',
        boxShadow: 'none',
      },
      icon: <MdCleaningServices size={20} color="#1C5ED8" />,
    });
  };

  const asignarServicios = async () => {
    if (
      !codConductor ||
      !unidadSeleccionadaAsignar ||
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
        codigo: codConductor.toString(),
      },
      unidad: {
        codunidad: unidadSeleccionadaAsignar,
      },
    }));

    try {
      const response = await axios.post(
        `${API_BASE_URL125}/api/Preplan/AsignarServicio`,
        payload,
      );
      toast.success('Asignación realizada con éxito.');

      setUnidadSeleccionadaAsignar('');
      setApepateConductor('');
      setCodConductor(null);
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
      await axios.delete(`${API_BASE_URL125}/api/Preplan/eliminacionmultiple`, {
        data: payload,
      });

      toast.success('Eliminado con éxito.');
      setRefreshFlag((prev) => !prev);
    } catch (error) {
      toast.error('Error al eliminar el servicio.');
      console.error('Error en la eliminación:', error);
    }
  };

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const formatearFecha = (fecha: string | null, hora: string) => {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-');
    return `${year}-${month}-${day} ${hora}`;
  };

  const handleDescarga = () => {
    if (!selectedDate || !empresaSelecRes) {
      toast.error('Falta seleccionar fecha y/o empresa');
      return;
    }
    const feciniRaw = formatearFecha(selectedDate, '00:00');
    const fecfinRaw = formatearFecha(selectedDate, '23:59');
    const fecini = encodeURIComponent(feciniRaw);
    const fecfin = encodeURIComponent(fecfinRaw);
    const aerolinea = empresaSelecRes;

    const url = `${API_BASE_URL125}/api/Preplan/ServiciosExcel?fecini=${fecini}&fecfin=${fecfin}&aerolinea=${aerolinea}&usuario=${username}`;

    const toastId = toast.loading('Generando resumen...');

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      toast.dismiss(toastId);
      toast.success('Resumen descargado');
    }, 5000);
  };

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
        <div className="cabecera sticky top-0 z-50 py-1">
          <div className="progressAndTitle">
            <div className="contenedorcabecera">
              <span className="titulocabecera text-[13px]">
                CONTROL DE SERVICIOS
              </span>
            </div>
            <div className="h-[30px] w-px bg-white"></div>

            <div className="flex gap-2">
              <button
                onClick={onOpen}
                className="flex cursor-pointer items-center gap-2 rounded bg-[#f3ae24] px-4 py-1 text-[12px] font-medium text-[#2d2d2e] transition-all duration-200 ease-in hover:bg-orange-400"
              >
                <MdNewLabel size={20} color="#343a40" />
                Nuevo Servicio
              </button>

              <ModalNuevoServicio
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                onServicioAgregado={() =>
                  setRefreshFlagServicio((prev) => !prev)
                }
              />

              <button
                className="flex cursor-pointer items-center gap-2 rounded bg-[#f3ae24] px-4 py-1 text-[12px] font-medium text-[#2d2d2e] transition-all duration-200 ease-in hover:bg-orange-200"
                onClick={() => setIsVisibleAsignar((prev) => !prev)}
              >
                <MdDesignServices size={20} color="#343a40" />
                Asignar Servicio
              </button>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center px-2">
            <input
              type="checkbox"
              className="peer sr-only"
              onChange={toggleContent}
              checked={isVisible}
            />
            <div
              className="peer relative h-6 bg-gray-200 ring-0 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-md after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-orange-500 peer-checked:after:translate-x-[32px] peer-checked:after:border-white rtl:peer-checked:after:-translate-x-[32px] dark:border-gray-600 dark:bg-gray-400 dark:peer-checked:bg-orange-500"
              style={{ width: '58px', borderRadius: '6px' }}
            ></div>
          </label>
        </div>

        {isVisible && (
          <div id="contenido" className="mx-2">
            <div className="fristFileT">
              <div className="cargaArchivos">
                <div className="relative flex items-center pb-1">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <HiCalendarDateRange className="h-5 w-5 text-gray-600" />
                    Fecha a Consultar
                  </span>
                </div>

                <div className="cabeceraArchivos">
                  <div>
                    <input
                      type="date"
                      className="w-full border border-gray-300 bg-gray-200 px-1 py-1.5 text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0"
                      value={selectedDate || ''}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <button
                      className="flex items-center gap-2  bg-blue-500 px-4 py-[7px] font-medium text-white transition hover:bg-blue-600"
                      onClick={() => {
                        setSearchDate(selectedDate);
                        setRefreshSearch((prev) => prev + 1); // ← Forzar refresh
                      }}
                    >
                      Buscar
                      <IoSearchSharp className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <button
                      className="bg-blue-500 px-4 py-[7px] font-medium text-white transition hover:bg-blue-600"
                      onClick={() => {
                        setSelectedDate(null);
                        setSearchDate(null);
                        setRefreshSearch((prev) => prev + 1);
                      }}
                    >
                      Actual
                    </button>
                  </div>

                  <div className="w-[250px]">
                    <select
                      id="empresas"
                      className="w-full border border-gray-300 bg-gray-200 p-[8px] text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0"
                      value={empresaSelecRes}
                      onChange={(e) => setEmpresaSelecRes(e.target.value)}
                    >
                      <option value="">Seleccione Empresa</option>
                      {(username && username.toLowerCase() !== 'movilbus'
                        ? empresasG
                        : empresas
                      ).map((empresa, index) => (
                        <option key={index} value={empresa}>
                          {empresa}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="container-btn-file text-[12px]"
                      onClick={handleDescarga}
                    >
                      <FaClipboard size={20} />
                      Resumen
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="fristFileT">
              <div className="filtrosPlanificacion">
                <div className="relative flex items-center pb-0.5">
                  <span className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                    <AiOutlineFilter className="h-5 w-5 text-gray-600" />
                    Filtros de Búsqueda
                  </span>
                </div>

                <div className="cabeceraArchivos">
                  <div className="inputFiltros">
                    <select
                      id="countries"
                      className="w-full border border-gray-300 bg-gray-200 p-[7px] text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0"
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
                      className="w-full border border-gray-300 bg-gray-200 p-[7px] text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0"
                      value={empresaSeleccionada}
                      onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                    >
                      <option value="" disabled>
                        Seleccione Cliente
                      </option>
                      {(username && username.toLowerCase() !== 'movilbus'
                        ? empresasG
                        : empresas
                      ).map((empresa, index) => (
                        <option key={index} value={empresa}>
                          {empresa}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-[240px] max-w-lg">
                    <select
                      id="tipo-servicio"
                      className="w-full border border-gray-300 bg-gray-200 p-[7px] text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0"
                      value={tipoServicio}
                      onChange={(e) => setTipoServicio(e.target.value)}
                    >
                      <option value="" disabled>
                        Seleccione Tipo Servicio
                      </option>
                      <option value="RECOJO">Recojo</option>
                      <option value="REPARTO">Reparto</option>
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
                      className="w-full border border-gray-300 bg-gray-200 p-[7px] ps-11 text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0 dark:placeholder:text-gray-700"
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
                              setSugerencias([]);

                              setTimeout(() => {
                                const input =
                                  document.getElementById('inputPasajero');
                                input?.blur();
                              }, 100);
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
                      className="w-full border border-gray-300 bg-gray-200 p-[7px] text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0 dark:placeholder:text-gray-700"
                    />
                  </div>

                  {username && (
                    <InputUnidad
                      value={unidadSeleccionada}
                      onChange={(value) => setUnidadSeleccionada(value)}
                      onSelect={(codunidad) => {
                        setUnidadSeleccionada(codunidad);
                      }}
                      padding="p-[7px]"
                      bgColor="gray-200"
                      usuario={username}
                    />
                  )}
                  <div className="bg-red-100 ">
                    <button
                      className="flex items-center gap-2 bg-[#d62828] p-[7px] text-white hover:bg-red-500"
                      onClick={handleClearFilters}
                    >
                      Limpiar
                      <MdCleaningServices color="#fff" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isVisibleAsignar && (
          <div>
            <div
              className="mt-2 flex justify-between gap-2 border-t bg-gray-50 "
              style={{ marginLeft: '5px', marginRight: '5px' }}
            >
              <div className="flex gap-2">
                <div className="w-96">
                  <InputConductor
                    value={apepateConductor}
                    onChange={setApepateConductor}
                    onSelect={(codigo, apepate) => {
                      setCodConductor(codigo);
                      setApepateConductor(apepate);
                    }}
                    bgColor="gray-200"
                  />
                </div>

                {username && (
                  <InputUnidad
                    value={unidadSeleccionadaAsignar}
                    onChange={(value) => setUnidadSeleccionadaAsignar(value)}
                    onSelect={(codunidad) => {
                      setUnidadSeleccionadaAsignar(codunidad);
                    }}
                    bgColor="gray-200"
                    usuario={username}
                  />
                )}
              </div>

              <div className="flex gap-2 pr-1">
                <button
                  className="flex items-center gap-2 rounded-md bg-blue-500 px-4 py-1.5 text-sm text-white transition hover:bg-blue-600"
                  onClick={asignarServicios}
                >
                  Asignar <RiCheckboxMultipleFill className="h-4 w-4" />
                </button>

                <button
                  className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-1.5  text-sm text-white transition hover:bg-red-500"
                  onClick={eliminarServicio}
                >
                  Eliminar <MdDelete className="h-4 w-4" />
                </button>
                <div>{unidadSeleccionada}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grupoServicios relative z-10 overflow-visible">
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
          refreshFlagServicio={refreshFlagServicio}
          refreshSearch={refreshSearch}
        ></TableServicios>
      </div>
    </div>
  );
}
