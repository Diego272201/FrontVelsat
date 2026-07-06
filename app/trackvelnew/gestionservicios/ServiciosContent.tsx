'use client';
import { useDisclosure } from '@nextui-org/react';
import React, { useEffect, useRef, useState } from 'react';
import { FaUser, FaUserTie } from 'react-icons/fa';
import {
  MdCleaningServices,
  MdComment,
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
import { HiCalendarDateRange, HiClock, HiTruck, HiTableCells } from 'react-icons/hi2';
import { RiCheckboxMultipleFill } from 'react-icons/ri';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import InputUnidad from '@/app/components/inputs/InputUnidad';
import InputConductor from '@/app/components/inputs/InputConductor';
import { useUsername } from '@/hooks/useUsername';
import { HiDocumentReport } from 'react-icons/hi';
import { createPortal } from 'react-dom';
import ModalLatam from './ModalLatam';
import ModalAdministrarHorarios from '../../components/modal/ModalAdministrarHorarios';
import { useMemo } from 'react';
import BtnCompletarHoraAto from '@/app/components/BtnCompletarHoraAto';

const empresas = [
  'AMERICAN',
  'AMERICAN TIERRA',
  'DELTA',
  'KLM',
  'LATAM',
  'LATAM ADM',
  'REP SI',
  'REP',
];

const empresasG = [
  'ATSA',
  'AVIANCA',
  'DHL',
  'LATAM',
  'TALMA',
  'TERPEL',
  'LAGARDERE',
];

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
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [fechaLatam, setFechaLatam] = useState('');
  const [isModalLatamOpen, setIsModalLatamOpen] = useState(false);
  const formatearFechaParaAPI = (fechaDatetimeLocal: string) => {
    if (!fechaDatetimeLocal) return '';
    const [fecha, hora] = fechaDatetimeLocal.split('T');
    return `${fecha} ${hora}`;
  };
  const [conductorSearch, setConductorSearch] = useState('');
  const [conductorSeleccionado, setConductorSeleccionado] = useState<any>(null);
  const [conductores, setConductores] = useState<any[]>([]);
  const [showConductorDropdown, setShowConductorDropdown] = useState(false);
  const [fechaConductorIni, setFechaConductorIni] = useState('');
  const [fechaConductorFin, setFechaConductorFin] = useState('');
  const [usarRangoConductor, setUsarRangoConductor] = useState(false);
  const [descargandoConductor, setDescargandoConductor] = useState(false);
  const conductorDropdownRef = useRef<HTMLDivElement>(null);
  const [reporteTodos, setReporteTodos] = useState(false);
  const [conteoServicios, setConteoServicios] = useState(0);
  const [conteoConductores, setConteoConductores] = useState(0);
  const [isModalHorariosOpen, setIsModalHorariosOpen] = useState(false);
  const [dataServicios, setDataServicios] = useState<any[]>([]);

  // Resumen mensual
  const [mesMensual, setMesMensual] = useState('');
  const [conductorSearchMensual, setConductorSearchMensual] = useState('');
  const [conductorSeleccionadoMensual, setConductorSeleccionadoMensual] = useState<any>(null);
  const [showConductorDropdownMensual, setShowConductorDropdownMensual] = useState(false);
  const [descargandoMensual, setDescargandoMensual] = useState(false);
  const conductorDropdownMensualRef = useRef<HTMLDivElement>(null);

  // Reporte de observaciones
  const [fechaObservaciones, setFechaObservaciones] = useState('');
  const [descargandoObservaciones, setDescargandoObservaciones] = useState(false);

  const conductoresModal = useMemo(
    () =>
      conductores.map((c) => ({ codigo: c.codigo, apellidos: c.apellidos })),
    [conductores],
  );

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
    const fetchConductores = async () => {
      if (!isReady || !username) return;
      try {
        const res = await fetch(
          `https://do.velsat.pe:2083/api/Preplan/conductores/${username}`,
        );
        const data = await res.json();
        setConductores(data.filter((c: any) => c.habilitado === '1'));
      } catch (e) {
        console.error(e);
      }
    };
    fetchConductores();
  }, [username, isReady]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        conductorDropdownRef.current &&
        !conductorDropdownRef.current.contains(e.target as Node)
      )
        setShowConductorDropdown(false);
      if (
        conductorDropdownMensualRef.current &&
        !conductorDropdownMensualRef.current.contains(e.target as Node)
      )
        setShowConductorDropdownMensual(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleGenerarReporteConductor = async (codigos?: number[]) => {
    if (!isReady || !username) {
      toast.error('Esperando datos de sesión, intente nuevamente');
      return;
    }
    if (!conductorSeleccionado || !fechaConductorIni) {
      toast.error('Seleccione conductor y fecha');
      return;
    }
    if (usarRangoConductor && !fechaConductorFin) {
      toast.error('Ingrese la fecha fin');
      return;
    }

    const formatF = (f: string) => {
      const [y, m, d] = f.split('-');
      return `${d}/${m}/${y}`;
    };

    setDescargandoConductor(true);
    const toastId = toast.loading('Generando reporte...');
    try {
      const base = 'https://do.velsat.pe:2083/api/Preplan';
      const cod = conductorSeleccionado.codigo;

      const url = usarRangoConductor
        ? `${base}/ServiciosConductorRangos?codConductor=${cod}&fechaini=${encodeURIComponent(formatF(fechaConductorIni))}&fechafin=${encodeURIComponent(formatF(fechaConductorFin))}&usuario=${username || ''}`
        : `${base}/ExcelServiciosConductor?codConductor=${cod}&fecha=${encodeURIComponent(formatF(fechaConductorIni))}&usuario=${username || ''}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Reporte_${conductorSeleccionado.apellidos}_${formatF(fechaConductorIni)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss(toastId);
      toast.success('Reporte descargado');
    } catch {
      toast.dismiss(toastId);
      toast.error('No hay reporte para los datos seleccionados.');
    } finally {
      setDescargandoConductor(false);
    }
  };

  const handleGenerarReporteTodos = async (codigos?: number[]) => {
    if (!isReady || !username) {
      toast.error('Esperando datos de sesión, intente nuevamente');
      return;
    }

    if (!fechaConductorIni) {
      toast.error('Seleccione la fecha de inicio');
      return;
    }

    if (usarRangoConductor && !fechaConductorFin) {
      toast.error('Ingrese la fecha fin');
      return;
    }

    const formatF = (f: string) => {
      const [y, m, d] = f.split('-');
      return `${d}/${m}/${y}`;
    };

    setDescargandoConductor(true);
    const toastId = toast.loading('Generando reporte...');
    try {
      const base = 'https://do.velsat.pe:2083/api/Preplan';

      // Construir parámetros de conductores si vienen del modal
      const codigosParam =
        codigos && codigos.length > 0
          ? '&' + codigos.map((c) => `codtaxis=${c}`).join('&')
          : '';

      const url = usarRangoConductor
        ? `${base}/ExcelServiciosTodosConductores?fechaini=${encodeURIComponent(formatF(fechaConductorIni))}&fechafin=${encodeURIComponent(formatF(fechaConductorFin))}&usuario=${username}${codigosParam}`
        : `${base}/ExcelServiciosTodosConductoresDia?fechaini=${encodeURIComponent(formatF(fechaConductorIni))}&usuario=${username}${codigosParam}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = usarRangoConductor
        ? `Reporte_Todos_${formatF(fechaConductorIni)}_al_${formatF(fechaConductorFin)}.xlsx`
        : `Reporte_Todos_${formatF(fechaConductorIni)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss(toastId);
      toast.success('Reporte descargado');
    } catch {
      toast.dismiss(toastId);
      toast.error('No hay reporte para los datos seleccionados.');
    } finally {
      setDescargandoConductor(false);
    }
  };

  const handleGenerarResumenMensual = async () => {
    if (!mesMensual) {
      toast.error('Seleccione el mes');
      return;
    }
    const [anio, mes] = mesMensual.split('-');
    const params = new URLSearchParams({ usuario: username || '', anio, mes });
    if (conductorSeleccionadoMensual) {
      params.append('codConductor', conductorSeleccionadoMensual.codigo);
    }

    setDescargandoMensual(true);
    const toastId = toast.loading('Generando resumen mensual...');
    try {
      const res = await fetch(
        `https://do.velsat.pe:2083/api/Preplan/ExcelResumenServiciosMes?${params.toString()}`,
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Resumen_Mensual_${mesMensual}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss(toastId);
      toast.success('Resumen descargado');
    } catch {
      toast.dismiss(toastId);
      toast.error('No hay datos para los parámetros seleccionados.');
    } finally {
      setDescargandoMensual(false);
    }
  };

  const handleGenerarReporteObservaciones = async () => {
    if (!isReady || !username) {
      toast.error('Esperando datos de sesión, intente nuevamente');
      return;
    }
    if (!fechaObservaciones) {
      toast.error('Seleccione la fecha a consultar');
      return;
    }

    setDescargandoObservaciones(true);
    const toastId = toast.loading('Generando reporte de observaciones...');
    try {
      const params = new URLSearchParams({
        fecha: fechaObservaciones,
        usuario: username,
      });
      const res = await fetch(
        `https://do.velsat.pe:2083/api/Preplan/observaciones?${params.toString()}`,
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Observaciones_${fechaObservaciones}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
      toast.dismiss(toastId);
      toast.success('Reporte descargado');
      setFechaObservaciones('');
    } catch {
      toast.dismiss(toastId);
      toast.error('No hay observaciones para la fecha seleccionada.');
    } finally {
      setDescargandoObservaciones(false);
    }
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
                  </div>
                </div>
              </div>
            </div>

            {/* Reporte Latam + Servicios por conductor - lado a lado */}
            <div className="flex gap-3">
              {/* Reporte Latam */}
              <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-1.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <FaClipboard className="h-4 w-4 text-blue-600" />
                    Completar servicios Latam
                  </span>
                </div>
                <div className="p-3">
                  <div className="flex items-end gap-2">
                    <input
                      type="date"
                      className="w-[140px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[11px] transition-colors hover:border-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/20"
                      value={fechaLatam}
                      onChange={(e) => setFechaLatam(e.target.value)}
                    />
                    <button
                      className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-green-800 active:scale-95"
                      onClick={() => {
                        if (!fechaLatam) {
                          toast.error('Seleccione una fecha');
                          return;
                        }
                        setIsModalLatamOpen(true);
                      }}
                    >
                      <HiDocumentReport className="h-3 w-3" />
                      Completar
                    </button>
                  </div>
                </div>
              </div>

              {/* Servicios por conductor */}
              <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-indigo-100 px-4 py-1.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <HiTruck className="h-4 w-4 text-indigo-600" />
                    Servicios por conductor
                  </span>
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    {/* Selector conductor - deshabilitado si reporteTodos */}
                    <div
                      className="relative w-[200px]"
                      ref={conductorDropdownRef}
                    >
                      <input
                        type="text"
                        placeholder="Buscar conductor..."
                        value={conductorSearch}
                        onChange={(e) => {
                          if (reporteTodos) return;
                          setConductorSearch(e.target.value);
                          setShowConductorDropdown(true);
                          if (!e.target.value) setConductorSeleccionado(null);
                        }}
                        onFocus={() => {
                          if (!reporteTodos) setShowConductorDropdown(true);
                        }}
                        disabled={reporteTodos}
                        className={`w-full rounded-md border px-2 py-2 pr-7 text-[11px] focus:outline-none ${
                          reporteTodos
                            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 opacity-50'
                            : 'border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
                        }`}
                        autoComplete="off"
                      />
                      <IoSearchSharp className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                      {showConductorDropdown &&
                        conductorSearch &&
                        !reporteTodos &&
                        conductores.filter((c) =>
                          c.apellidos
                            .toLowerCase()
                            .includes(conductorSearch.toLowerCase()),
                        ).length > 0 && (
                          <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                            {conductores
                              .filter((c) =>
                                c.apellidos
                                  .toLowerCase()
                                  .includes(conductorSearch.toLowerCase()),
                              )
                              .map((c) => (
                                <li
                                  key={c.codigo}
                                  className="cursor-pointer px-3 py-2 text-[11px] hover:bg-indigo-50"
                                  onMouseDown={() => {
                                    setConductorSeleccionado(c);
                                    setConductorSearch(c.apellidos);
                                    setShowConductorDropdown(false);
                                  }}
                                >
                                  <span className="font-medium">
                                    {c.apellidos}
                                  </span>
                                  <span className="ml-2 text-gray-400">
                                    DNI: {c.dni}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        )}
                    </div>

                    {/* Fecha inicio */}
                    <input
                      type="date"
                      value={fechaConductorIni}
                      onChange={(e) => setFechaConductorIni(e.target.value)}
                      className="w-[140px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[11px] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                    />

                    {/* Fecha fin - deshabilitada si no hay rango*/}
                    <input
                      type="date"
                      value={fechaConductorFin}
                      onChange={(e) => setFechaConductorFin(e.target.value)}
                      disabled={!usarRangoConductor}
                      className={`w-[140px] rounded-md border px-2 py-1.5 text-[11px] focus:outline-none ${
                        usarRangoConductor
                          ? 'border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
                          : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 opacity-50'
                      }`}
                    />

                    {/* Switch Rango*/}
                    <div className="flex items-center gap-1.5 pb-1">
                      <span className="text-[10px] text-gray-500">Rango</span>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={usarRangoConductor}
                          onChange={(e) => {
                            setUsarRangoConductor(e.target.checked);
                            if (!e.target.checked) setFechaConductorFin('');
                          }}
                          className="peer sr-only"
                        />
                        <div className="peer relative h-5 w-9 rounded-full bg-rose-400 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-4"></div>
                      </label>
                    </div>

                    {/* Switch Todos */}
                    <div className="flex items-center gap-1.5 pb-1">
                      <span className="text-[10px] text-gray-500">Todos</span>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={reporteTodos}
                          onChange={(e) => {
                            setReporteTodos(e.target.checked);
                            if (e.target.checked) {
                              setConductorSeleccionado(null);
                              setConductorSearch('');
                            } else {
                              setUsarRangoConductor(false);
                              setFechaConductorFin('');
                            }
                          }}
                          className="peer sr-only"
                        />
                        <div className="peer relative h-5 w-9 rounded-full bg-rose-400 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-4"></div>
                      </label>
                    </div>

                    {/* Botón Generar Reporte */}
                    <button
                      onClick={() => {
                        if (!reporteTodos && !conductorSeleccionado) {
                          toast.error('Seleccione un conductor');
                          return;
                        }
                        if (!fechaConductorIni) {
                          toast.error('Seleccione la fecha de inicio');
                          return;
                        }
                        if (usarRangoConductor && !fechaConductorFin) {
                          toast.error('Ingrese la fecha fin');
                          return;
                        }
                        if (reporteTodos) {
                          handleGenerarReporteTodos();
                        } else {
                          handleGenerarReporteConductor();
                        }
                      }}
                      disabled={descargandoConductor}
                      className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                    >
                      <HiDocumentReport className="h-3 w-3" />
                      {descargandoConductor ? 'Generando...' : 'Generar'}
                    </button>

                    {/* Botón Administrar Horarios */}
                    <button
                      onClick={() => setIsModalHorariosOpen(true)}
                      className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95"
                    >
                      <FaUserTie className="h-3 w-3" />
                      Administrar Horarios
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen Mensual por Conductor + Reporte de Observaciones - lado a lado */}
            <div className="flex gap-3">
              {/* Resumen mensual por conductor */}
              <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gradient-to-r from-teal-50 to-teal-100 px-4 py-1.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <HiTableCells className="h-4 w-4 text-teal-600" />
                    Resumen Mensual por Conductor
                  </span>
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    {/* Selector de mes */}
                    <input
                      type="month"
                      value={mesMensual}
                      onChange={(e) => setMesMensual(e.target.value)}
                      className="w-[145px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[11px] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                    />

                    {/* Selector conductor (opcional) */}
                    <div
                      className="relative w-[200px]"
                      ref={conductorDropdownMensualRef}
                    >
                      <input
                        type="text"
                        placeholder="Conductor (opcional)..."
                        value={conductorSearchMensual}
                        onChange={(e) => {
                          setConductorSearchMensual(e.target.value);
                          setShowConductorDropdownMensual(true);
                          if (!e.target.value) setConductorSeleccionadoMensual(null);
                        }}
                        onFocus={() => setShowConductorDropdownMensual(true)}
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 pr-7 text-[11px] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
                        autoComplete="off"
                      />
                      <IoSearchSharp className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                      {showConductorDropdownMensual &&
                        conductorSearchMensual &&
                        conductores.filter((c) =>
                          c.apellidos
                            .toLowerCase()
                            .includes(conductorSearchMensual.toLowerCase()),
                        ).length > 0 && (
                          <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                            {conductores
                              .filter((c) =>
                                c.apellidos
                                  .toLowerCase()
                                  .includes(conductorSearchMensual.toLowerCase()),
                              )
                              .map((c) => (
                                <li
                                  key={c.codigo}
                                  className="cursor-pointer px-3 py-2 text-[11px] hover:bg-teal-50"
                                  onMouseDown={() => {
                                    setConductorSeleccionadoMensual(c);
                                    setConductorSearchMensual(c.apellidos);
                                    setShowConductorDropdownMensual(false);
                                  }}
                                >
                                  <span className="font-medium">{c.apellidos}</span>
                                </li>
                              ))}
                          </ul>
                        )}
                    </div>

                    {/* Chip del conductor seleccionado */}
                    {conductorSeleccionadoMensual && (
                      <button
                        onClick={() => {
                          setConductorSeleccionadoMensual(null);
                          setConductorSearchMensual('');
                        }}
                        className="flex items-center gap-1 rounded-full bg-teal-100 px-2 py-1 text-[10px] font-medium text-teal-700 hover:bg-teal-200"
                      >
                        {conductorSeleccionadoMensual.apellidos} ✕
                      </button>
                    )}

                    {/* Botón Generar */}
                    <button
                      onClick={handleGenerarResumenMensual}
                      disabled={descargandoMensual}
                      className="flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-2 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95 disabled:opacity-50"
                    >
                      <HiDocumentReport className="h-3 w-3" />
                      {descargandoMensual ? 'Generando...' : 'Generar'}
                    </button>
                  </div>

                  {/* Hint */}
                  <p className="mt-2 text-[10px] text-gray-400">
                    Sin conductor seleccionado se genera para todos.
                  </p>
                </div>
              </div>

              {/* Reporte de observaciones */}
              <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gradient-to-r from-amber-50 to-amber-100 px-4 py-1.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <MdComment className="h-4 w-4 text-amber-600" />
                    Reporte de Observaciones
                  </span>
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <input
                      type="date"
                      value={fechaObservaciones}
                      onChange={(e) => setFechaObservaciones(e.target.value)}
                      className="w-[145px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-[11px] focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                    />

                    <button
                      onClick={handleGenerarReporteObservaciones}
                      disabled={descargandoObservaciones}
                      className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-2 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-amber-700 active:scale-95 disabled:opacity-50"
                    >
                      <HiDocumentReport className="h-3 w-3" />
                      {descargandoObservaciones ? 'Generando...' : 'Generar'}
                    </button>
                  </div>

                  {/* Hint */}
                  <p className="mt-2 text-[10px] text-gray-400">
                    Se descarga un Excel con las observaciones registradas ese día.
                  </p>
                </div>
              </div>
            </div>

            {/* Filtros de Búsqueda + Resumen - lado a lado */}
            <div className="flex gap-2">
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
                        className="... w-full rounded-md border border-gray-300 bg-white py-2 pl-8 pr-2 text-[11px]"
                        placeholder="Buscar pasajero..."
                        value={pasajero}
                        onChange={(e) => {
                          if (seleccionado) {
                            setSeleccionado(false);
                            return;
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          setDropdownPos({
                            top: rect.bottom + window.scrollY,
                            left: rect.left + window.scrollX,
                            width: rect.width,
                          });
                          setPasajero(e.target.value);
                          setMostrarSugerencias(true);
                        }}
                        onFocus={(e) => {
                          if (sugerencias.length > 0 && !seleccionado) {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setDropdownPos({
                              top: rect.bottom + window.scrollY,
                              left: rect.left + window.scrollX,
                              width: rect.width,
                            });
                            setMostrarSugerencias(true);
                          }
                        }}
                        onBlur={() =>
                          setTimeout(() => setMostrarSugerencias(false), 100)
                        }
                      />
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                        <FaUser className="h-3 w-3 text-gray-400" />
                      </div>

                      {mostrarSugerencias &&
                        sugerencias.length > 0 &&
                        createPortal(
                          <ul
                            style={{
                              position: 'absolute',
                              top: dropdownPos.top,
                              left: dropdownPos.left,
                              width: dropdownPos.width,
                              zIndex: 99999,
                            }}
                            className="max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
                          >
                            {sugerencias.map((item, index) => (
                              <li
                                key={index}
                                className="cursor-pointer px-3 py-2 text-[11px] text-gray-700 transition-colors hover:bg-blue-50"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  seleccionarPasajero(
                                    item.apepate,
                                    item.codlan,
                                  );
                                  setMostrarSugerencias(false);
                                  setSugerencias([]);
                                  setTimeout(() => {
                                    document
                                      .getElementById('inputPasajero')
                                      ?.blur();
                                  }, 100);
                                }}
                              >
                                {item.apepate}
                              </li>
                            ))}
                          </ul>,
                          document.body,
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

              {/* Conteo de servicios */}
              <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100 px-4 py-1.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <HiDocumentReport className="h-4 w-4 text-green-600" />
                    Resumen
                  </span>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center rounded-md border border-green-200 bg-green-50 px-4 py-2">
                      <span className="text-[10px] text-gray-500">
                        SERVICIOS
                      </span>
                      <span className="text-[18px] font-bold text-green-700">
                        {conteoServicios}
                      </span>
                    </div>
                    <div className="flex flex-col items-center rounded-md border border-blue-200 bg-blue-50 px-4 py-2">
                      <span className="text-[10px] text-gray-500">
                        CONDUCTORES
                      </span>
                      <span className="text-[18px] font-bold text-blue-700">
                        {conteoConductores}
                      </span>
                    </div>
                    <BtnCompletarHoraAto data={dataServicios} />
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

      <ModalLatam
        isOpen={isModalLatamOpen}
        onClose={() => setIsModalLatamOpen(false)}
        fecha={fechaLatam}
        codusuario={username || ''}
      />

      <ModalAdministrarHorarios
        isOpen={isModalHorariosOpen}
        onClose={() => setIsModalHorariosOpen(false)}
        conductores={conductoresModal}
        username={username || ''}
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
          onConteoChange={(s, c) => {
            setConteoServicios(s);
            setConteoConductores(c);
          }}
          onDataChange={setDataServicios}
        ></TableServicios>
      </div>
    </div>
  );
}
