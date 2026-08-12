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
  const [fechaInicioObservaciones, setFechaInicioObservaciones] = useState('');
  const [fechaFinObservaciones, setFechaFinObservaciones] = useState('');
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
    const controller = new AbortController();

    const fetchPasajeros = async () => {
      if (!isReady || pasajero.length < 1) {
        setSugerencias([]);
        return;
      }

      try {
        const response = await axios.get(
          `${API_BASE_URL125}/api/Preplan/GetPasajeros?palabra=${encodeURIComponent(pasajero)}&codusuario=${username}`,
          { signal: controller.signal },
        );

        const resultados = response.data.map((item: any) => ({
          apepate: item.apepate,
          codlan: item.codigo,
        }));

        setSugerencias(resultados);
      } catch (error) {
        if (!axios.isCancel(error)) {
          setSugerencias([]);
        }
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchPasajeros();
    }, 300);

    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
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
    setSelectedServices([]);

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
      setSelectedServices([]);
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
      setSelectedServices([]);
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

  const handleDescarga = async () => {
    if (!selectedDate || !empresaSelecRes) {
      toast.error('Falta seleccionar fecha y/o empresa');
      return;
    }
    const feciniRaw = formatearFecha(selectedDate, '00:00');
    const fecfinRaw = formatearFecha(selectedDate, '23:59');
    const fecini = encodeURIComponent(feciniRaw);
    const fecfin = encodeURIComponent(fecfinRaw);
    const aerolinea = empresaSelecRes;

    const url = `${API_BASE_URL125}/api/Preplan/ServiciosExcel?fecini=${fecini}&fecfin=${fecfin}&aerolinea=${aerolinea}&usuario=${username || ''}`;

    const toastId = toast.loading('Generando resumen...');

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Resumen_${aerolinea}_${selectedDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.dismiss(toastId);
      toast.success('Resumen descargado exitosamente');
    } catch {
      toast.dismiss(toastId);
      toast.error('No hay datos para la fecha y empresa seleccionadas.');
    }
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
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Reporte_${conductorSeleccionado.apellidos}_${formatF(fechaConductorIni)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
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
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = usarRangoConductor
        ? `Reporte_Todos_${formatF(fechaConductorIni)}_al_${formatF(fechaConductorFin)}.xlsx`
        : `Reporte_Todos_${formatF(fechaConductorIni)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

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
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Resumen_Mensual_${mesMensual}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
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
    if (!fechaInicioObservaciones || !fechaFinObservaciones) {
      toast.error('Seleccione el rango de fechas a consultar');
      return;
    }
    if (new Date(fechaInicioObservaciones) > new Date(fechaFinObservaciones)) {
      toast.error('La fecha inicial no puede ser mayor a la fecha final');
      return;
    }

    setDescargandoObservaciones(true);
    const toastId = toast.loading('Generando reporte de observaciones...');
    try {
      const params = new URLSearchParams({
        fechaInicio: fechaInicioObservaciones,
        fechaFin: fechaFinObservaciones,
        usuario: username,
      });
      const res = await fetch(
        `https://do.velsat.pe:2083/api/Preplan/observaciones?${params.toString()}`,
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Observaciones_${fechaInicioObservaciones}_a_${fechaFinObservaciones}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
      toast.dismiss(toastId);
      toast.success('Reporte descargado');
      setFechaInicioObservaciones('');
      setFechaFinObservaciones('');
    } catch {
      toast.dismiss(toastId);
      toast.error('No hay observaciones para el rango de fechas seleccionado.');
    } finally {
      setDescargandoObservaciones(false);
    }
  };

  return (
    <div className="containerTep">
      <Toaster richColors />
      <div>
        <div className="sticky top-0 z-50 border-b border-gray-200 bg-[#efeff0] px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
                <div className="h-5 w-1 bg-brandPrimary"></div>
                <h1 className="text-[13px] font-bold uppercase tracking-wide text-gray-800">
                  Control de Servicios
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onOpen}
                  className="flex items-center gap-1.5 rounded-md bg-brandSecondary px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-brandSecondary-hover"
                >
                  <MdNewLabel size={14} color="#ffffff" />
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
                  className="flex items-center gap-1.5 rounded-md bg-brandPrimary px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-brandPrimary-hover"
                  onClick={() => setIsVisibleAsignar((prev) => !prev)}
                >
                  <MdDesignServices size={14} color="#ffffff" />
                  Asignar Servicio
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                Filtros
              </span>
              <label className="inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  onChange={toggleContent}
                  checked={isVisible}
                />
                <div className="peer relative h-5 w-9 rounded-full bg-gray-300 ring-0 after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#113EB9] peer-checked:after:translate-x-4 peer-checked:after:border-white"></div>
              </label>
            </div>
          </div>
        </div>

        {isVisible && (
          <div id="contenido-filtros" className="border-b border-gray-200 bg-[#f8fafc] p-2.5 flex flex-col gap-2 w-full">
            {/* FILAS 1 A 3 (50% / 50%) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 w-full">
              {/* FILA 1 - COLUMNA 1 (50%): FECHA A CONSULTAR */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#f0f5ff] border border-blue-200/60 rounded-md px-2.5 py-1 shadow-2xs w-full">
                <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider whitespace-nowrap">
                  FECHA
                </span>
                <input
                  type="date"
                  className="h-8 w-[120px] rounded-md border border-gray-200 bg-white px-2 text-[11px] focus:border-[#113EB9] focus:outline-none"
                  value={selectedDate || ''}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />

                <button
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-brandPrimary px-2.5 text-[11px] font-medium text-white shadow-xs transition-all hover:bg-brandPrimary-hover"
                  onClick={() => {
                    setSearchDate(selectedDate);
                    setRefreshSearch((prev) => prev + 1);
                  }}
                >
                  <IoSearchSharp className="h-3.5 w-3.5" />
                  Buscar
                </button>

                <button
                  className="inline-flex h-8 items-center rounded-md bg-red-600 px-2.5 text-[11px] font-medium text-white shadow-xs transition-all hover:bg-red-700"
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
                  className="h-8 w-[130px] rounded-md border border-gray-200 bg-white px-2 text-[11px] focus:border-[#113EB9] focus:outline-none"
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
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-brandSecondary px-2.5 text-[11px] font-medium text-white shadow-xs transition-all hover:bg-brandSecondary-hover ml-auto"
                  onClick={handleDescarga}
                >
                  <FaClipboard className="h-3.5 w-3.5" />
                  Resumen
                </button>
              </div>

              {/* FILA 1 - COLUMNA 2 (50%): CARGA LATAM */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#f0f5ff] border border-blue-200/60 rounded-md px-2.5 py-1 shadow-2xs w-full">
                <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider whitespace-nowrap">
                  CARGA LATAM
                </span>
                <input
                  type="date"
                  className="h-8 w-[115px] rounded-md border border-gray-200 bg-white px-2 text-[11px] focus:border-[#113EB9] focus:outline-none"
                  value={fechaLatam}
                  onChange={(e) => setFechaLatam(e.target.value)}
                />
                <button
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-brandSecondary px-2.5 text-[11px] font-medium text-white shadow-xs transition-all hover:bg-brandSecondary-hover ml-auto"
                  onClick={() => {
                    if (!fechaLatam) {
                      toast.error('Seleccione una fecha');
                      return;
                    }
                    setIsModalLatamOpen(true);
                  }}
                >
                  <HiDocumentReport className="h-3.5 w-3.5" />
                  Completar
                </button>
              </div>

              {/* FILA 2 - COLUMNA 1 (50%): REPORTE DIFERENCIAS DE TIEMPO */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#f0f5ff] border border-blue-200/60 rounded-md px-2.5 py-1 shadow-2xs w-full">
                <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider whitespace-nowrap">
                  DIFERENCIAS TIEMPO
                </span>
                <input
                  type="datetime-local"
                  className="h-8 w-[135px] rounded-md border border-gray-200 bg-white px-1.5 text-[11px] focus:border-[#113EB9] focus:outline-none"
                  placeholder="Fecha Inicial"
                  value={fechaInicial || ''}
                  onChange={(e) => setFechaInicial(e.target.value)}
                />

                <input
                  type="datetime-local"
                  className="h-8 w-[135px] rounded-md border border-gray-200 bg-white px-1.5 text-[11px] focus:border-[#113EB9] focus:outline-none"
                  placeholder="Fecha Final"
                  value={fechaFinal || ''}
                  onChange={(e) => setFechaFinal(e.target.value)}
                />

                <select
                  id="tipoReporte"
                  className="h-8 w-[80px] rounded-md border border-gray-200 bg-white px-1 text-[11px] focus:border-[#113EB9] focus:outline-none"
                  value={tipoReporte}
                  onChange={(e) => setTipoReporte(e.target.value)}
                >
                  <option value="">Tipo</option>
                  <option value="RECOJO">Recojo</option>
                  <option value="REPARTO">Reparto</option>
                </select>

                <button
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-brandSecondary px-2.5 text-[11px] font-medium text-white shadow-xs transition-all hover:bg-brandSecondary-hover ml-auto"
                  onClick={handleGenerarReporte}
                >
                  <HiDocumentReport className="h-3.5 w-3.5" />
                  Generar
                </button>
              </div>

              {/* FILA 2 - COLUMNA 2 (50%): SERVICIOS POR CONDUCTOR */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#f0f5ff] border border-blue-200/60 rounded-md px-2.5 py-1 shadow-2xs w-full">
                <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider whitespace-nowrap">
                  POR CONDUCTOR
                </span>

                <div className="relative w-[145px]" ref={conductorDropdownRef}>
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
                    className={`h-8 w-full rounded-md border px-2 pr-7 text-[11px] focus:outline-none ${
                      reporteTodos
                        ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 opacity-50'
                        : 'border-gray-200 bg-white focus:border-[#113EB9]'
                    }`}
                    autoComplete="off"
                  />
                  <IoSearchSharp className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
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
                              className="cursor-pointer px-3 py-1.5 text-[11px] hover:bg-blue-50"
                              onMouseDown={() => {
                                setConductorSeleccionado(c);
                                setConductorSearch(c.apellidos);
                                setShowConductorDropdown(false);
                              }}
                            >
                              <span className="font-medium">{c.apellidos}</span>
                              <span className="ml-2 text-gray-400">
                                DNI: {c.dni}
                              </span>
                            </li>
                          ))}
                      </ul>
                    )}
                </div>

                <input
                  type="date"
                  value={fechaConductorIni}
                  onChange={(e) => setFechaConductorIni(e.target.value)}
                  className="h-8 w-[115px] rounded-md border border-gray-200 bg-white px-2 text-[11px] focus:border-[#113EB9] focus:outline-none"
                />

                {usarRangoConductor && (
                  <input
                    type="date"
                    value={fechaConductorFin}
                    onChange={(e) => setFechaConductorFin(e.target.value)}
                    className="h-8 w-[115px] rounded-md border border-gray-200 bg-white px-2 text-[11px] focus:border-[#113EB9] focus:outline-none"
                  />
                )}

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-600 font-medium">Rango</span>
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
                    <div className="peer relative h-4 w-7 rounded-full bg-gray-400 after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#113EB9] peer-checked:after:translate-x-3"></div>
                  </label>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-600 font-medium">Todos</span>
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
                    <div className="peer relative h-4 w-7 rounded-full bg-gray-400 after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#113EB9] peer-checked:after:translate-x-3"></div>
                  </label>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
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
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-brandSecondary px-2.5 text-[11px] font-medium text-white shadow-xs transition-all hover:bg-brandSecondary-hover disabled:opacity-50"
                  >
                    <HiDocumentReport className="h-3.5 w-3.5" />
                    {descargandoConductor ? 'Generando...' : 'Generar'}
                  </button>

                  <button
                    onClick={() => setIsModalHorariosOpen(true)}
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-brandPrimary px-2.5 text-[11px] font-medium text-white shadow-xs transition-all hover:bg-brandPrimary-hover"
                  >
                    <FaUserTie className="h-3.5 w-3.5" />
                    Administrar Horarios
                  </button>
                </div>
              </div>

              {/* FILA 3 - COLUMNA 1 (50%): RESUMEN MENSUAL POR CONDUCTOR */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#f0f5ff] border border-blue-200/60 rounded-md px-2.5 py-1 shadow-2xs w-full">
                <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider whitespace-nowrap">
                  RESUMEN MENSUAL
                </span>
                <input
                  type="month"
                  value={mesMensual}
                  onChange={(e) => setMesMensual(e.target.value)}
                  className="h-8 w-[115px] rounded-md border border-gray-200 bg-white px-2 text-[11px] focus:border-[#113EB9] focus:outline-none"
                />

                <div className="relative w-[140px]" ref={conductorDropdownMensualRef}>
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
                    className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 pr-7 text-[11px] focus:border-[#113EB9] focus:outline-none"
                    autoComplete="off"
                  />
                  <IoSearchSharp className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
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
                              className="cursor-pointer px-3 py-1.5 text-[11px] hover:bg-blue-50"
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

                {conductorSeleccionadoMensual && (
                  <button
                    onClick={() => {
                      setConductorSeleccionadoMensual(null);
                      setConductorSearchMensual('');
                    }}
                    className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-[#113EB9] hover:bg-blue-200"
                  >
                    {conductorSeleccionadoMensual.apellidos} ✕
                  </button>
                )}

                <button
                  onClick={handleGenerarResumenMensual}
                  disabled={descargandoMensual}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-brandSecondary px-2.5 text-[11px] font-medium text-white shadow-xs transition-all hover:bg-brandSecondary-hover disabled:opacity-50 ml-auto"
                >
                  <HiDocumentReport className="h-3.5 w-3.5" />
                  Generar
                </button>
              </div>

              {/* FILA 3 - COLUMNA 2 (50%): REPORTE DE OBSERVACIONES */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#f0f5ff] border border-blue-200/60 rounded-md px-2.5 py-1 shadow-2xs w-full">
                <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider whitespace-nowrap">
                  OBSERVACIONES
                </span>
                <input
                  type="date"
                  value={fechaInicioObservaciones}
                  onChange={(e) => setFechaInicioObservaciones(e.target.value)}
                  className="h-8 w-[115px] rounded-md border border-gray-200 bg-white px-2 text-[11px] focus:border-[#113EB9] focus:outline-none"
                />

                <span className="text-[11px] text-gray-600 font-medium">a</span>

                <input
                  type="date"
                  value={fechaFinObservaciones}
                  onChange={(e) => setFechaFinObservaciones(e.target.value)}
                  className="h-8 w-[115px] rounded-md border border-gray-200 bg-white px-2 text-[11px] focus:border-[#113EB9] focus:outline-none"
                />

                <button
                  onClick={handleGenerarReporteObservaciones}
                  disabled={descargandoObservaciones}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-brandSecondary px-2.5 text-[11px] font-medium text-white shadow-xs transition-all hover:bg-brandSecondary-hover disabled:opacity-50 ml-auto"
                >
                  <HiDocumentReport className="h-3.5 w-3.5" />
                  Generar
                </button>
              </div>
            </div>

            {/* FILA 4 (ESPECIAL: 60% / 40%) */}
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-2 w-full">
              {/* FILA 4 - COLUMNA 1 (60%): FILTROS DE BÚSQUEDA */}
              <div className="xl:col-span-6 flex flex-wrap items-center gap-1.5 bg-[#f0f5ff] border border-blue-200/60 rounded-md px-2.5 py-1 shadow-2xs w-full">
                <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider whitespace-nowrap">
                  BÚSQUEDA
                </span>

                <select
                  id="countries"
                  className="h-8 w-[100px] rounded-md border border-gray-200 bg-white px-2 text-[11px] transition-colors hover:border-gray-400 focus:border-[#113EB9] focus:outline-none"
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
                  className="h-8 w-[130px] rounded-md border border-gray-200 bg-white px-2 text-[11px] transition-colors hover:border-gray-400 focus:border-[#113EB9] focus:outline-none"
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
                  className="h-8 w-[120px] rounded-md border border-gray-200 bg-white px-2 text-[11px] transition-colors hover:border-gray-400 focus:border-[#113EB9] focus:outline-none"
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

                <div className="relative w-[160px]">
                  <input
                    id="inputPasajero"
                    type="text"
                    className="h-8 w-full rounded-md border border-gray-200 bg-white pl-7 pr-2 text-[11px] focus:border-[#113EB9] focus:outline-none"
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
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                    <FaUser className="h-3.5 w-3.5 text-gray-400" />
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
                  placeholder="N° Servicio"
                  className="h-8 w-[85px] rounded-md border border-gray-200 bg-white px-2 text-[11px] transition-colors hover:border-gray-400 focus:border-[#113EB9] focus:outline-none"
                />

                {username && (
                  <div className="w-[125px]">
                    <InputUnidad
                      value={unidadSeleccionada}
                      onChange={(value) => setUnidadSeleccionada(value)}
                      onSelect={(codunidad) => {
                        setUnidadSeleccionada(codunidad);
                      }}
                      bgColor="white"
                      usuario={username}
                    />
                  </div>
                )}

                <button
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-red-600 px-2.5 text-[11px] font-medium text-white shadow-xs transition-all hover:bg-red-700 ml-auto"
                  onClick={handleClearFilters}
                >
                  <MdCleaningServices className="h-3.5 w-3.5" />
                  Limpiar
                </button>
              </div>

              {/* FILA 4 - COLUMNA 2 (40%): METRICAS KPI Y BOTÓN GEOCERCA */}
              <div className="xl:col-span-4 flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg px-1.5 py-1 shadow-2xs w-full">
                {/* Métricas SERVICIOS y CONDUCTORES */}
                <div className="flex items-center gap-1.5">
                  {/* KPI SERVICIOS */}
                  <div className="flex h-8 items-center gap-1.5 px-1">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00a86b] text-white">
                      <HiTableCells className="h-3 w-3" />
                    </div>
                    <span className="text-[10px] font-bold tracking-wider text-[#008756] uppercase">
                      SERVICIOS:
                    </span>
                    <span className="text-[13px] font-black text-[#005c3b]">
                      {conteoServicios}
                    </span>
                  </div>

                  {/* KPI CONDUCTORES */}
                  <div className="flex h-8 items-center gap-1.5 px-1">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brandPrimary text-white">
                      <FaUserTie className="h-2.5 w-2.5" />
                    </div>
                    <span className="text-[10px] font-bold tracking-wider text-brandPrimary uppercase">
                      CONDUCTORES:
                    </span>
                    <span className="text-[13px] font-black text-brandPrimary">
                      {conteoConductores}
                    </span>
                  </div>
                </div>

                {/* Botón Geocerca ATO al final */}
                <div className="ml-auto flex items-center">
                  <BtnCompletarHoraAto data={dataServicios} />
                </div>
              </div>
            </div>
          </div>
        )}

        {isVisibleAsignar && (
          <div id="contenido-asignar" className="border-b border-gray-200 bg-[#f8fafc] p-2.5 flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex flex-wrap items-center gap-2 bg-[#f0f5ff] border border-blue-200/60 rounded-lg px-2.5 py-1 shadow-2xs">
              <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider whitespace-nowrap">
                ASIGNAR
              </span>

              <div className="w-[400px]">
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
                <div className="w-[130px]">
                  <InputUnidad
                    value={unidadSeleccionadaAsignar}
                    onChange={(value) => setUnidadSeleccionadaAsignar(value)}
                    onSelect={(codunidad) => {
                      setUnidadSeleccionadaAsignar(codunidad);
                    }}
                    bgColor="white"
                    usuario={username}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-8 items-center gap-1 rounded-md bg-brandPrimary px-3 text-[11px] font-medium text-white shadow-xs transition-all hover:bg-brandPrimary-hover"
                onClick={asignarServicios}
              >
                <RiCheckboxMultipleFill className="h-3.5 w-3.5" />
                Asignar
              </button>

              <button
                className="inline-flex h-8 items-center gap-1 rounded-md bg-red-600 px-3 text-[11px] font-medium text-white shadow-xs transition-all hover:bg-red-700"
                onClick={eliminarServicio}
              >
                <MdDelete className="h-3.5 w-3.5" />
                Eliminar
              </button>
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
