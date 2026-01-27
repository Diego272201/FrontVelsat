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
import { HiCalendarDateRange, HiClock } from 'react-icons/hi2';
import { RiCheckboxMultipleFill } from 'react-icons/ri';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import InputUnidad from '@/app/components/inputs/InputUnidad';
import InputConductor from '@/app/components/inputs/InputConductor';
import { useUsername } from '@/hooks/useUsername';
import { HiDocumentReport } from 'react-icons/hi';
import ModalGenerarReporte from './ModalGenerarReporte';

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
  'REP SI',
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
  const [fechaInicial, setFechaInicial] = useState('');
  const [fechaFinal, setFechaFinal] = useState('');
  const [tipoReporte, setTipoReporte] = useState('');

  const [isModalDiferenciasOpen, setIsModalDiferenciasOpen] = useState(false);

  const formatearFechaParaAPI = (fechaDatetimeLocal: string) => {
    if (!fechaDatetimeLocal) return '';

    const [fecha, hora] = fechaDatetimeLocal.split('T');
    return `${fecha} ${hora}`;
  };

  const handleGenerarReporte = async () => {
    // Validaciones específicas con mensajes personalizados
    if (!fechaInicial) {
      toast.error('Por favor seleccione la fecha inicial');
      return;
    }

    if (!fechaFinal) {
      toast.error('Por favor seleccione la fecha final');
      return;
    }

    if (!tipoReporte) {
      toast.error('Por favor seleccione el tipo de reporte (Recojo o Reparto)');
      return;
    }

    if (!empresaSelecRes) {
      toast.error('Por favor seleccione un cliente/empresa');
      return;
    }

    // Validar que fecha inicial no sea mayor que fecha final
    if (new Date(fechaInicial) > new Date(fechaFinal)) {
      toast.error('La fecha inicial no puede ser mayor que la fecha final');
      return;
    }

    // Mostrar toast de loading
    const toastId = toast.loading('Generando reporte de diferencias...');

    try {
      const fechaInicialAPI = formatearFechaParaAPI(fechaInicial);
      const fechaFinalAPI = formatearFechaParaAPI(fechaFinal);

      // Construir la URL con los parámetros
      const baseUrl = 'https://do.velsat.pe:2083/api/Preplan/ExcelDiferencias';
      const params = new URLSearchParams({
        fecini: fechaInicialAPI,
        fecfin: fechaFinalAPI,
        aerolinea: empresaSelecRes,
        usuario: username || '',
        tipo: tipoReporte === 'RECOJO' ? 'I' : 'S',
      });

      const url = `${baseUrl}?${params.toString()}`;

      console.log('Llamando a API:', url);

      // Realizar la petición
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Error en la API: ${response.status} ${response.statusText}`,
        );
      }

      // Obtener el blob del archivo Excel
      const blob = await response.blob();

      // Crear un enlace temporal para descargar el archivo
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Generar nombre del archivo
      const fechaHoy = new Date().toISOString().split('T')[0];
      const tipoArchivo = tipoReporte === 'RECOJO' ? 'Recojo' : 'Reparto';
      link.download = `Diferencias_${tipoArchivo}_${fechaHoy}.xlsx`;

      // Ejecutar la descarga
      document.body.appendChild(link);
      link.click();

      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      console.log('Archivo descargado exitosamente');

      // Dismissar el toast de loading y mostrar éxito
      toast.dismiss(toastId);
      toast.success('Reporte generado y descargado exitosamente');

      // Limpiar los campos después de la descarga exitosa
      setFechaInicial('');
      setFechaFinal('');
      setTipoReporte('');
      setEmpresaSelecRes('');
    } catch (error) {
      console.error('Error al generar el reporte:', error);

      // Dismissar el toast de loading y mostrar error
      toast.dismiss(toastId);
      toast.error('Error al generar el reporte. Por favor intente nuevamente.');
    }
  };

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
          <div id="contenido" className="mx-2 space-y-3">
            {/* Fecha a Consultar + Reporte Diferencias de Tiempo - Separados */}
            <div className="flex gap-3">
              {/* Fecha a Consultar */}

              <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-1.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <HiCalendarDateRange className="h-4 w-4 text-blue-600" />
                    Fecha a Consultar
                  </span>
                </div>

                <div className="p-3">
                  <div className="flex-space flex items-end gap-2">
                    <input
                      type="date"
                      className="w-[140px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[11px] transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      value={selectedDate || ''}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />

                    <button
                      className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
                      onClick={() => {
                        setSearchDate(selectedDate);
                        setRefreshSearch((prev) => prev + 1);
                      }}
                    >
                      <IoSearchSharp className="h-3 w-3" />
                      Buscar
                    </button>

                    <button
                      className="rounded-md bg-gray-600 px-3 py-2 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-gray-700 active:scale-95"
                      onClick={() => {
                        setSelectedDate(null);
                        setSearchDate(null);
                        setRefreshSearch((prev) => prev + 1);
                      }}
                    >
                      Actual
                    </button>

                    <select
                      id="empresas"
                      className="w-[180px] rounded-md border border-gray-300 bg-white px-2 py-2 text-[11px] transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
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

                    <button
                      className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-green-700 active:scale-95"
                      onClick={handleDescarga}
                    >
                      <FaClipboard className="h-3 w-3" />
                      Resumen
                    </button>
                  </div>
                </div>
              </div>

              {/* Reporte Diferencias de Tiempo */}
              <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-indigo-100 px-4 py-1.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <HiClock className="h-4 w-4 text-indigo-600" />
                    Reporte Diferencias de Tiempo
                  </span>
                </div>

                <div className="p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <input
                      type="datetime-local"
                      className="w-[155px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[11px] transition-colors hover:border-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                      placeholder="Fecha Inicial"
                      value={fechaInicial || ''}
                      onChange={(e) => setFechaInicial(e.target.value)}
                    />

                    <input
                      type="datetime-local"
                      className="w-[155px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[11px] transition-colors hover:border-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                      placeholder="Fecha Final"
                      value={fechaFinal || ''}
                      onChange={(e) => setFechaFinal(e.target.value)}
                    />

                    <select
                      id="tipoReporte"
                      className="w-[120px] rounded-md border border-gray-300 bg-white px-2 py-2 text-[11px] transition-colors hover:border-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                      value={tipoReporte}
                      onChange={(e) => setTipoReporte(e.target.value)}
                    >
                      <option value="">Tipo</option>
                      <option value="RECOJO">Recojo</option>
                      <option value="REPARTO">Reparto</option>
                    </select>

                    <button
                      className="flex items-center gap-1.5 rounded-md bg-orange-600 px-3 py-2 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-orange-700 active:scale-95"
                      onClick={handleGenerarReporte}
                    >
                      <HiDocumentReport className="h-3 w-3" />
                      Generar
                    </button>

                    <button
                      className="flex items-center gap-1.5 rounded-md bg-green-700 px-3 py-2 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-green-800 active:scale-95"
                      onClick={() => setIsModalDiferenciasOpen(true)}
                    >
                      <HiDocumentReport className="h-3 w-3" />
                      Servicios por conductor
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros de Búsqueda */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-1.5">
                <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <AiOutlineFilter className="h-4 w-4 text-blue-600" />
                  Filtros de Búsqueda
                </span>
              </div>

              <div className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    id="countries"
                    className="w-[120px] rounded-md border border-gray-300 bg-white px-2 py-2 text-[11px] transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                  >
                    <option value="" disabled>
                      Área
                    </option>
                    <option value="TEP">TEP</option>
                    <option value="TURISMO">TURISMO</option>
                  </select>

                  <select
                    id="countries"
                    className="w-[160px] rounded-md border border-gray-300 bg-white px-2 py-2 text-[11px] transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                    value={empresaSeleccionada}
                    onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                  >
                    <option value="" disabled>
                      Cliente
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

                  <select
                    id="tipo-servicio"
                    className="w-[160px] rounded-md border border-gray-300 bg-white px-2 py-2 text-[11px] transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                    value={tipoServicio}
                    onChange={(e) => setTipoServicio(e.target.value)}
                  >
                    <option value="" disabled>
                      Tipo Servicio
                    </option>
                    <option value="RECOJO">Recojo</option>
                    <option value="REPARTO">Reparto</option>
                    <option value="TRF IN">TRF IN</option>
                    <option value="TRF OUT">TRF OUT</option>
                    <option value="CITY TOUR">CITY TOUR</option>
                    <option value="VIAJE">VIAJE</option>
                    <option value="FULLDAY">FULLDAY</option>
                  </select>

                  <div className="relative w-[220px]">
                    <input
                      id="inputPasajero"
                      type="text"
                      className="w-full rounded-md border border-gray-300 bg-white py-2 pl-8 pr-2 text-[11px] transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      placeholder="Buscar pasajero..."
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
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                      <FaUser className="h-3 w-3 text-gray-400" />
                    </div>

                    {mostrarSugerencias && sugerencias.length > 0 && (
                      <ul className="absolute z-[9999] mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                        {sugerencias.map((item, index) => (
                          <li
                            key={index}
                            className="cursor-pointer px-3 py-2 text-[11px] text-gray-700 transition-colors hover:bg-blue-50"
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

                  <input
                    value={numeroServicio}
                    onChange={(e) => setNumeroServicio(e.target.value)}
                    type="number"
                    id="tentacles"
                    name="tentacles"
                    placeholder="N° Servicio"
                    min="0"
                    max="100"
                    className="w-[120px] rounded-md border border-gray-300 bg-white px-2 py-2 text-[11px] transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />

                  {username && (
                    <InputUnidad
                      value={unidadSeleccionada}
                      onChange={(value) => setUnidadSeleccionada(value)}
                      onSelect={(codunidad) => {
                        setUnidadSeleccionada(codunidad);
                      }}
                      padding="p-1.5"
                      bgColor="white"
                      usuario={username}
                    />
                  )}

                  <button
                    className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-red-700 active:scale-95"
                    onClick={handleClearFilters}
                  >
                    <MdCleaningServices className="h-3 w-3" />
                    Limpiar
                  </button>
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
                    bgColor="white"
                  />
                </div>

                {username && (
                  <InputUnidad
                    value={unidadSeleccionadaAsignar}
                    onChange={(value) => setUnidadSeleccionadaAsignar(value)}
                    onSelect={(codunidad) => {
                      setUnidadSeleccionadaAsignar(codunidad);
                    }}
                    bgColor="white"
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

      <ModalGenerarReporte
        isOpen={isModalDiferenciasOpen}
        onClose={() => setIsModalDiferenciasOpen(false)}
      />

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
