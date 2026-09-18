'use client';
import { useDisclosure } from '@nextui-org/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { FileSpreadsheet, ListFilter, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { FaUserTie } from 'react-icons/fa';
import {
  MdCleaningServices,
  MdDelete,
} from 'react-icons/md';
import { toast, Toaster } from 'sonner';
import '@/app/styles/planiTep.css';
import { IoSearchSharp } from 'react-icons/io5';
import TableServicios from './TableServicios';
import axios from 'axios';
import Swal from 'sweetalert2';
import ModalNuevoServicio from './ModalNuevoServicio';
import { RiCheckboxMultipleFill } from 'react-icons/ri';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import InputUnidad from '@/app/components/inputs/InputUnidad';
import InputConductor from '@/app/components/inputs/InputConductor';
import { useUsername } from '@/hooks/useUsername';
import ModalLatam from './ModalLatam';
import ModalAdministrarHorarios from '../../components/modal/ModalAdministrarHorarios';
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

  // Tabs de filtros y búsqueda
  const [activeFilterTab, setActiveFilterTab] = useState('consulta');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string | null>(null);

  const conteosEstado = useMemo(() => {
    const counts = { FA: 0, AS: 0, PR: 0, NI: 0, NA: 0 };
    dataServicios.forEach((item) => {
      if (item.estado && item.estado in counts) {
        counts[item.estado as keyof typeof counts]++;
      }
    });
    return counts;
  }, [dataServicios]);

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
        aerolinea: empresaSelecRes || empresaSeleccionada || 'AMERICAN TIERRA',
        usuario: username || '',
        tipo: tipoReporte === 'RECOJO' ? 'I' : 'S',
      });

      const url = `${baseUrl}?${params.toString()}`;

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
    setSearchTerm('');
    setSelectedEstado(null);

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

  const filterTabs = [
    { id: 'consulta', label: 'Consulta del día' },
    { id: 'latam', label: 'Carga LATAM' },
    { id: 'diferencias', label: 'Diferencias de tiempo' },
    { id: 'conductor', label: 'Por conductor' },
    { id: 'mensual', label: 'Resumen mensual' },
    { id: 'observaciones', label: 'Observaciones' },
  ];

  return (
    <div className="containerTep">
      <Toaster richColors />
      <div>
        {/* Header principal estilo gestionunidades */}
        <div className="sticky top-0 z-50 bg-[#113EB9]">
          <div className="flex h-12 items-stretch justify-between">
            {/* Lado izquierdo: Logo naranja, separador, subtítulo/título, Nuevo servicio, Asignar servicio */}
            <div className="flex items-center gap-3">
              <div className="flex h-full items-center bg-gradient-to-r from-orange-500 to-red-500 px-4">
                <Image
                  src="/LogoWeb.png"
                  alt="Velsat"
                  width={44}
                  height={44}
                  className="h-9 w-9 object-contain"
                />
              </div>

              <div className="h-7 w-[2px] rounded-full bg-white/40 self-center" />

              <div className="flex flex-col justify-center">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-200 leading-none mb-0.5">
                  OPERACIONES / PROGRAMACIÓN
                </span>
                <h1 className="text-[14px] font-bold leading-none tracking-[0.01em] text-white flex items-center gap-1.5 uppercase">
                  <span>SERVICIOS MENORES</span>
                </h1>
              </div>

              <button
                type="button"
                onClick={onOpen}
                className="ml-2 flex items-center gap-1.5 rounded-md bg-white px-3.5 py-1.5 text-[12px] font-bold text-[#113EB9] transition-colors hover:bg-blue-50"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span>Nuevo servicio</span>
              </button>

              <ModalNuevoServicio
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                onServicioAgregado={() =>
                  setRefreshFlagServicio((prev) => !prev)
                }
              />

              <button
                type="button"
                onClick={() => setIsVisibleAsignar((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-md border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                  isVisibleAsignar
                    ? 'border-white/50 bg-white/20 text-white font-semibold'
                    : 'border-white/30 text-white hover:bg-white/10'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Asignar servicio</span>
              </button>
            </div>

            {/* Lado derecho: Badges SERVICIOS, CONDUCTORES y botón Filtros */}
            <div className="flex items-center gap-2 pr-4">
              <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-[11px]">
                <span className="font-semibold tracking-wider text-blue-100">SERVICIOS</span>
                <span className="font-bold text-white">{conteoServicios}</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-[11px]">
                <span className="font-semibold tracking-wider text-blue-100">CONDUCTORES</span>
                <span className="font-bold text-white">{conteoConductores}</span>
              </div>

              <button
                type="button"
                onClick={toggleContent}
                className="flex items-center gap-2 rounded-md border border-white/40 px-2.5 py-1 text-[12px] font-semibold text-white transition-colors hover:bg-white/10"
              >
                <ListFilter className="h-3.5 w-3.5 text-white" />
                <span>Filtros</span>
                <span
                  className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                    isVisible ? 'bg-white' : 'bg-white/35'
                  }`}
                >
                  <span
                    className={`h-3 w-3 rounded-full transition-all duration-200 ease-in-out ${
                      isVisible
                        ? 'translate-x-3 bg-[#113EB9]'
                        : 'translate-x-0 bg-white'
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>

        {isVisible && (
          <div id="contenido-filtros" className="border-b border-gray-200 bg-white flex flex-col w-full">
            {/* TABS SUPERIORES */}
            <div className="flex items-center gap-1 border-b border-gray-200 bg-[#f8fafc] px-3 pt-2">
              {filterTabs.map((tab) => {
                const isActive = activeFilterTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilterTab(tab.id)}
                    className={`px-3 py-1.5 text-[12px] transition-colors rounded-t-md font-semibold ${
                      isActive
                        ? 'border-b-2 border-[#113EB9] text-[#113EB9] bg-white'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* CONTENIDO DEL TAB ACTIVO */}
            <div className="flex flex-wrap items-center gap-2 bg-white px-3 py-2">
              {activeFilterTab === 'consulta' && (
                <div className="flex flex-wrap items-center gap-2.5 w-full">
                  {/* Bloque 1: Consulta del día para la tabla */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-600">
                      Fecha de servicios:
                    </span>
                    <input
                      type="date"
                      className="h-8 w-[130px] rounded-md border border-gray-300 bg-white px-2 text-[11px] text-gray-700 focus:border-[#113EB9] focus:outline-none"
                      value={selectedDate || ''}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />

                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#113EB9] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700"
                      onClick={() => {
                        setSearchDate(selectedDate);
                        setRefreshSearch((prev) => prev + 1);
                      }}
                    >
                      <IoSearchSharp className="h-3.5 w-3.5" />
                      Buscar
                    </button>

                    <button
                      type="button"
                      className="inline-flex h-8 items-center rounded-md border border-gray-300 bg-white px-3 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      onClick={() => {
                        setSelectedDate(null);
                        setSearchDate(null);
                        setRefreshSearch((prev) => prev + 1);
                      }}
                    >
                      Hoy
                    </button>
                  </div>

                  {/* Separador vertical */}
                  <div className="h-6 w-[1px] bg-gray-300 mx-1 hidden sm:block" />

                  {/* Bloque 2: Exportar Resumen Excel por Empresa */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-600">
                      Empresa:
                    </span>
                    <select
                      id="empresas"
                      className="h-8 w-[170px] rounded-md border border-gray-300 bg-white px-2 text-[11px] text-gray-700 focus:border-[#113EB9] focus:outline-none"
                      value={empresaSelecRes}
                      onChange={(e) => setEmpresaSelecRes(e.target.value)}
                    >
                      <option value="">Seleccione empresa</option>
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
                      type="button"
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                      onClick={handleDescarga}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                      Descargar Excel
                    </button>
                  </div>
                </div>
              )}

              {activeFilterTab === 'latam' && (
                <div className="flex flex-wrap items-center gap-2.5 w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-600">
                      Fecha de servicios:
                    </span>
                    <input
                      type="date"
                      className="h-8 w-[130px] rounded-md border border-gray-300 bg-white px-2 text-[11px] text-gray-700 focus:border-[#113EB9] focus:outline-none"
                      value={fechaLatam}
                      onChange={(e) => setFechaLatam(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="inline-flex h-8 items-center rounded-md bg-[#113EB9] px-3.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700"
                    onClick={() => {
                      if (!fechaLatam) {
                        toast.error('Seleccione una fecha');
                        return;
                      }
                      setIsModalLatamOpen(true);
                    }}
                  >
                    Subir Excel LATAM
                  </button>

                  <div className="h-5 w-[1px] bg-gray-300 mx-1 hidden sm:block" />

                  <span className="text-[11px] text-gray-500">
                    Carga el archivo Excel para autocompletar los servicios de la fecha seleccionada.
                  </span>
                </div>
              )}

              {activeFilterTab === 'diferencias' && (
                <div className="flex flex-wrap items-center gap-2.5 w-full">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-gray-600">
                      Desde:
                    </span>
                    <input
                      type="datetime-local"
                      className="h-8 w-[165px] rounded-md border border-gray-300 bg-white px-2 text-[11px] text-gray-700 focus:border-[#113EB9] focus:outline-none"
                      value={fechaInicial || ''}
                      onChange={(e) => setFechaInicial(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-gray-600">
                      Hasta:
                    </span>
                    <input
                      type="datetime-local"
                      className="h-8 w-[165px] rounded-md border border-gray-300 bg-white px-2 text-[11px] text-gray-700 focus:border-[#113EB9] focus:outline-none"
                      value={fechaFinal || ''}
                      onChange={(e) => setFechaFinal(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-gray-600">
                      Tipo:
                    </span>
                    <select
                      id="tipoReporte"
                      className="h-8 w-[110px] rounded-md border border-gray-300 bg-white px-2 text-[11px] text-gray-700 focus:border-[#113EB9] focus:outline-none"
                      value={tipoReporte}
                      onChange={(e) => setTipoReporte(e.target.value)}
                    >
                      <option value="">Seleccione</option>
                      <option value="RECOJO">Recojo</option>
                      <option value="REPARTO">Reparto</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                    onClick={handleGenerarReporte}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                    Descargar Excel
                  </button>
                </div>
              )}

              {activeFilterTab === 'conductor' && (
                <div className="flex flex-wrap items-center gap-2.5 w-full">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-gray-600">
                      Conductor:
                    </span>
                    <div className="relative w-[240px]" ref={conductorDropdownRef}>
                      <input
                        type="text"
                        placeholder={reporteTodos ? 'Todos los conductores' : 'Buscar conductor...'}
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
                            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 opacity-75'
                            : 'border-gray-300 bg-white focus:border-[#113EB9]'
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
                          <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white">
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
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-gray-600">
                      {usarRangoConductor ? 'Desde:' : 'Fecha de servicios:'}
                    </span>
                    <input
                      type="date"
                      value={fechaConductorIni}
                      onChange={(e) => setFechaConductorIni(e.target.value)}
                      className="h-8 w-[125px] rounded-md border border-gray-300 bg-white px-2 text-[11px] focus:border-[#113EB9] focus:outline-none"
                    />
                  </div>

                  {usarRangoConductor && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-gray-600">Hasta:</span>
                      <input
                        type="date"
                        value={fechaConductorFin}
                        onChange={(e) => setFechaConductorFin(e.target.value)}
                        className="h-8 w-[125px] rounded-md border border-gray-300 bg-white px-2 text-[11px] focus:border-[#113EB9] focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
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
                        <div className="peer relative h-4 w-7 rounded-full bg-gray-300 after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#113EB9] peer-checked:after:translate-x-3"></div>
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
                        <div className="peer relative h-4 w-7 rounded-full bg-gray-300 after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#113EB9] peer-checked:after:translate-x-3"></div>
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
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
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                    {descargandoConductor ? 'Descargando...' : 'Descargar Excel'}
                  </button>

                  <div className="h-6 w-[1px] bg-gray-300 mx-1 hidden sm:block" />

                  <button
                    type="button"
                    onClick={() => setIsModalHorariosOpen(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FaUserTie className="h-3.5 w-3.5 text-gray-500" />
                    Administrar Horarios
                  </button>
                </div>
              )}

              {activeFilterTab === 'mensual' && (
                <div className="flex flex-wrap items-center gap-2 w-full">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-gray-600">Mes:</span>
                    <input
                      type="month"
                      value={mesMensual}
                      onChange={(e) => setMesMensual(e.target.value)}
                      className="h-8 w-[130px] rounded-md border border-gray-300 bg-white px-2 text-[11px] focus:border-[#113EB9] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-gray-600">
                      Conductor:
                    </span>
                    <div className="relative w-[240px]" ref={conductorDropdownMensualRef}>
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
                      className="h-8 w-full rounded-md border border-gray-300 bg-white px-2 pr-7 text-[11px] focus:border-[#113EB9] focus:outline-none"
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
                        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white">
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
                </div>

                  {conductorSeleccionadoMensual && (
                    <button
                      type="button"
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
                    type="button"
                    onClick={handleGenerarResumenMensual}
                    disabled={descargandoMensual}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                    {descargandoMensual ? 'Descargando...' : 'Descargar Excel'}
                  </button>
                </div>
              )}

              {activeFilterTab === 'observaciones' && (
                <div className="flex flex-wrap items-center gap-2.5 w-full">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-gray-600">Desde:</span>
                    <input
                      type="date"
                      value={fechaInicioObservaciones}
                      onChange={(e) => setFechaInicioObservaciones(e.target.value)}
                      className="h-8 w-[125px] rounded-md border border-gray-300 bg-white px-2 text-[11px] focus:border-[#113EB9] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-gray-600">Hasta:</span>
                    <input
                      type="date"
                      value={fechaFinObservaciones}
                      onChange={(e) => setFechaFinObservaciones(e.target.value)}
                      className="h-8 w-[125px] rounded-md border border-gray-300 bg-white px-2 text-[11px] focus:border-[#113EB9] focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerarReporteObservaciones}
                    disabled={descargandoObservaciones}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-[11px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
                    {descargandoObservaciones ? 'Descargando...' : 'Descargar Excel'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FILA 3: BÚSQUEDA Y STATUS PILLS + GEOCERCA ATO (SIEMPRE VISIBLE) */}
        <div className="border-b border-gray-200 bg-[#f8fafc] px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Lado Izquierdo: Controles de Búsqueda */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  BÚSQUEDA
                </span>

                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[11px] text-gray-700 focus:border-[#113EB9] focus:outline-none"
                >
                  <option value="">Área</option>
                  <option value="TEP">TEP</option>
                  <option value="TURISMO">TURISMO</option>
                </select>

                <select
                  value={empresaSeleccionada}
                  onChange={(e) => setEmpresaSeleccionada(e.target.value)}
                  className="h-8 max-w-[130px] truncate rounded-md border border-gray-300 bg-white px-2 text-[11px] text-gray-700 focus:border-[#113EB9] focus:outline-none"
                >
                  <option value="">Cliente</option>
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
                  value={tipoServicio}
                  onChange={(e) => setTipoServicio(e.target.value)}
                  className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[11px] text-gray-700 focus:border-[#113EB9] focus:outline-none"
                >
                  <option value="">Tipo servicio</option>
                  <option value="RECOJO">Recojo</option>
                  <option value="REPARTO">Reparto</option>
                  <option value="TRF IN">TRF IN</option>
                  <option value="TRF OUT">TRF OUT</option>
                  <option value="CITY TOUR">CITY TOUR</option>
                  <option value="VIAJE">VIAJE</option>
                  <option value="FULLDAY">FULLDAY</option>
                </select>

                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar conductor, unidad o Nº ser"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 w-[230px] rounded-md border border-gray-300 bg-white pl-8 pr-2 text-[11px] text-gray-700 placeholder:text-gray-400 focus:border-[#113EB9] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <MdCleaningServices className="h-3.5 w-3.5 text-gray-500" />
                  Limpiar
                </button>
              </div>

              {/* Lado Derecho: Status Pills + Geocerca ATO */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* FA */}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedEstado((prev) => (prev === 'FA' ? null : 'FA'))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    selectedEstado === 'FA'
                      ? 'border-emerald-600 bg-emerald-100 text-emerald-900 ring-1 ring-emerald-600'
                      : 'border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100/60'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>FA · Finalizado a tiempo</span>
                  <span className="ml-0.5 rounded-full bg-emerald-200/70 px-1.5 py-0.2 text-[10px] font-bold text-emerald-900">
                    {conteosEstado.FA}
                  </span>
                </button>

                {/* AS */}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedEstado((prev) => (prev === 'AS' ? null : 'AS'))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    selectedEstado === 'AS'
                      ? 'border-blue-600 bg-blue-100 text-blue-900 ring-1 ring-blue-600'
                      : 'border-blue-200 bg-blue-50/80 text-blue-800 hover:bg-blue-100/60'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span>AS · Asignado</span>
                  <span className="ml-0.5 rounded-full bg-blue-200/70 px-1.5 py-0.2 text-[10px] font-bold text-blue-900">
                    {conteosEstado.AS}
                  </span>
                </button>

                {/* PR */}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedEstado((prev) => (prev === 'PR' ? null : 'PR'))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    selectedEstado === 'PR'
                      ? 'border-cyan-600 bg-cyan-100 text-cyan-900 ring-1 ring-cyan-600'
                      : 'border-cyan-200 bg-cyan-50/80 text-cyan-800 hover:bg-cyan-100/60'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  <span>PR · Programado</span>
                  <span className="ml-0.5 rounded-full bg-cyan-200/70 px-1.5 py-0.2 text-[10px] font-bold text-cyan-900">
                    {conteosEstado.PR}
                  </span>
                </button>

                {/* NI */}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedEstado((prev) => (prev === 'NI' ? null : 'NI'))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    selectedEstado === 'NI'
                      ? 'border-gray-500 bg-gray-200 text-gray-900 ring-1 ring-gray-500'
                      : 'border-gray-200 bg-gray-50/80 text-gray-700 hover:bg-gray-100/70'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  <span>NI · No iniciado</span>
                  <span className="ml-0.5 rounded-full bg-gray-200 px-1.5 py-0.2 text-[10px] font-bold text-gray-800">
                    {conteosEstado.NI}
                  </span>
                </button>

                {/* NA */}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedEstado((prev) => (prev === 'NA' ? null : 'NA'))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    selectedEstado === 'NA'
                      ? 'border-rose-600 bg-rose-100 text-rose-900 ring-1 ring-rose-600'
                      : 'border-rose-200 bg-rose-50/80 text-rose-800 hover:bg-rose-100/60'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>NA · No asignado</span>
                  <span className="ml-0.5 rounded-full bg-rose-200/70 px-1.5 py-0.2 text-[10px] font-bold text-rose-900">
                    {conteosEstado.NA}
                  </span>
                </button>

                {/* Geocerca ATO */}
                <BtnCompletarHoraAto data={dataServicios} />
              </div>
            </div>
          </div>

        {isVisibleAsignar && (
          <div id="contenido-asignar" className="border-b border-gray-200 bg-[#f8fafc] p-2.5 flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex flex-wrap items-center gap-2 bg-[#f0f5ff] border border-blue-200/60 rounded-lg px-2.5 py-1">
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
                className="inline-flex h-8 items-center gap-1 rounded-md bg-brandPrimary px-3 text-[11px] font-medium text-white transition-all hover:bg-brandPrimary-hover"
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
          searchTerm={searchTerm}
          selectedEstado={selectedEstado}
        ></TableServicios>
      </div>
    </div>
  );
}
