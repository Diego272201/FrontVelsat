'use client';
import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDisclosure } from '@nextui-org/react';
import * as xlsx from 'xlsx';
import {
  tiposArchivos,
  tiposArchivosG,
  empresa,
  empresaG,
} from './tiposArchivo';
import { Toaster, toast } from 'sonner';
import '@/app/styles/planiTep.css';
import { FaFileExcel } from 'react-icons/fa';
import Servicios from './Servicios';
import axios from 'axios';
import { MdAdd, MdDelete } from 'react-icons/md';
import ModalObtenerServicios from './ModalObtenerServicios';
import ProgressBar from '@/app/components/ui/ProgressBar';

import { MdHomeRepairService } from 'react-icons/md';
import { FaUsers } from 'react-icons/fa';
import ModalReporteErrores from './reporteerrores/ModalErroresCarga';
import {
  formatFecha,
  formatFechaAMD,
} from '@/app/components/dates/convertToCustomFormat ';
import { API_BASE_URL125 } from '@/app/components/urlsApi/urlApi';
import Swal from 'sweetalert2';
import ModalNuevoGrupo from './ModalNuevoGrupo';
import { ListFilter, Upload, Search, Plus, Save, Send, Check, Calendar } from 'lucide-react';
import { useUsername } from '@/hooks/useUsername';

const FiltroHoras = ({
  filtroHora,
  setFiltroHora,
}: {
  filtroHora: string;
  setFiltroHora: (value: string) => void;
}) => (
  <input
    type="text"
    value={filtroHora}
    onChange={(e) => setFiltroHora(e.target.value)}
    className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:border-[#113EB9] focus:outline-none w-20 transition-colors"
    placeholder="Ej: 08:30"
  />
);

export default function TepContent() {
  const { username, isReady } = useUsername();

  const [tabActivo, setTabActivo] = useState<'carga' | 'filtrar' | 'obtener'>('obtener');
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<string>('');
  const [empresaConfirmada, setEmpresaConfirmada] = useState<string | null>(
    null,
  );
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [dato, setDato] = useState<string>('');
  const [modoVista, setModoVista] = useState('Eliminados');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [erroresCarga, setErroresCarga] = useState<any[]>([]);
  const ejecutarGrupoCeroRef = useRef<() => void>();

  const [modalNuevoGrupoOpen, setModalNuevoGrupoOpen] = useState(false);

  const handleRefrescarDatos = () => {
    setActualizacion((prev) => prev + 1);
  };

  const intervaloRef = useRef<NodeJS.Timeout | null>(null);

  // `guardar` vive en un ref, no en estado: cambia con cada modificación de los
  // grupos y como estado provocaba un re-render de todo TepContent por cada
  // reordenamiento, además de reiniciar el intervalo de autoguardado.
  const guardarRef = useRef<(auto?: boolean) => void>(() => {});
  const guardar = useCallback((auto: boolean = false) => {
    guardarRef.current(auto);
  }, []);
  const registrarGuardar = useCallback((fn: () => (auto?: boolean) => void) => {
    guardarRef.current = fn();
  }, []);

  const alternarEstado = () => {
    setModoVista(modoVista === 'Eliminados' ? 'Total' : 'Eliminados');
  };

  const [contadorGrupos, setContadorGrupos] = useState(0);

  const [datosServicios, setDatosServicios] = useState({
    totalGrupos: 0,
    totalPasajeros: 0,
  });

  const [cabeceras, setCabeceras] = useState<
    { empresa: string; fecha: string }[]
  >([]);
  const [filtro, setFiltro] = useState<{
    empresa: string;
    fecha: string;
  } | null>(null);

  const [filtroHora, setFiltroHora] = useState<string>('');

  const [nombrePasajero, setNombrePasajero] = useState('');
  const [totalFechas, setTotalFechas] = useState(0);
  const [fechasLlenas, setFechasLlenas] = useState(0);
  const [actualizacion, setActualizacion] = useState(0);

  // Memoizados: se pasan a Servicios y una identidad nueva en cada render del
  // padre se propaga hacia abajo sin motivo.
  const actualizarCabeceras = useCallback(
    (nuevasCabeceras: { empresa: string; fecha: string }[]) => {
      setCabeceras(nuevasCabeceras);
    },
    [],
  );

  const actualizarFechas = useCallback(
    ({
      totalFechas,
      fechasLlenas,
    }: {
      totalFechas: number;
      fechasLlenas: number;
    }) => {
      setTotalFechas(totalFechas);
      setFechasLlenas(fechasLlenas);
    },
    [],
  );

  const porcentajeLlenado =
    totalFechas > 0 ? (fechasLlenas / totalFechas) * 100 : 0;

  const handleFiltrar = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const seleccion = e.target.value;
    if (seleccion === 'all') {
      setFiltro(null);
    } else {
      const [empresa, fecha] = seleccion.split(' | ');
      setFiltro({ empresa, fecha });
    }
  };

  const actualizarDatosServicios = useCallback(
    (datos: { totalGrupos: number; totalPasajeros: number }) => {
      setDatosServicios(datos);
    },
    [],
  );

  const manejarRespuestaModal = (respuesta: string) => {
    setEmpresaConfirmada(empresaSeleccionada); // ← MOVER AQUÍ
    setDato(respuesta);
    setActualizacion((prev) => prev + 1);
    onOpenChange();
  };

  useEffect(() => {
    if (empresaConfirmada && dato) {
    }
  }, [empresaConfirmada, dato]);

  const handleEmpresaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEmpresaSeleccionada(e.target.value);
  };

  const [excelData, setExcelData] = useState<
    {
      CodigoOracle: string;
      Nombre: string;
      Subarea: string;
      Area: string;
      Rol: string;
      Empresa: string;
    }[]
  >([]);

  const [file, setFile] = useState<File | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // Fecha de publicación: independiente de la fecha de "Carga de archivo".
  const [fechaPublicar, setFechaPublicar] = useState<Date | null>(null);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');

  const [archivosRecientes, setArchivosRecientes] = useState<
    { nombre: string; fecha: string }[]
  >([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setFileName(event.target.files[0].name);
    }
  };

  const handleClearFile = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFile(null);
    setFileName(null);
    const input = document.getElementById('uploadExcel') as HTMLInputElement | null;
    if (input) input.value = '';
  };

  const getColumnFromDay = (day: number): string => {
    const startLetter = 10;
    const columnIndex = startLetter + (day - 1);

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    if (columnIndex < 26) {
      return letters[columnIndex];
    }

    const firstLetter = letters[Math.floor((columnIndex - 26) / 26)];
    const secondLetter = letters[(columnIndex - 26) % 26];
    return firstLetter + secondLetter;
  };

  useEffect(() => {
    const data = localStorage.getItem('archivosExcelCargados');
    if (data) {
      setArchivosRecientes(JSON.parse(data));
    }
  }, []);

  const handleReadExcel = () => {
    if (!file) {
      toast.error('Por favor selecciona un archivo Excel.');
      return;
    }

    if (!selectedDate) {
      toast.error('Por favor selecciona una fecha.');
      return;
    }

    if (!selectedEmpresa) {
      toast.error('Por favor selecciona una empresa.');
      return;
    }

    const fecact = formatFecha(selectedDate);

    const day = selectedDate.getDate();
    const rolColumn = getColumnFromDay(day);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const data = e.target?.result;

      if (data) {
        const toastId = toast.loading('Cargando datos desde Hoja1 ...');

        const workbook = xlsx.read(data, { type: 'binary' });

        const sheetName = workbook.SheetNames.find(
          (name) => name.toLowerCase() === 'hoja1',
        );
        if (!sheetName) {
          toast.error('No se encontró una hoja llamada "Hoja1" en el archivo.');
          return;
        }
        const sheet = workbook.Sheets[sheetName];

        const filteredData = [];

        const range = xlsx.utils.decode_range(sheet['!ref']!);
        const lastRow = range.e.r + 1;

        for (let rowIndex = 4; rowIndex <= lastRow; rowIndex++) {
          const codigoOracle = sheet[`C${rowIndex}`]?.v || '';
          const nombreCompleto = sheet[`D${rowIndex}`]?.v || '';
          const subArea = sheet[`I${rowIndex}`]?.v || '';
          const area = sheet[`J${rowIndex}`]?.v || '';
          const rol = sheet[`${rolColumn}${rowIndex}`]?.v || '';
          const empresa = selectedEmpresa;

          if (codigoOracle || nombreCompleto) {
            filteredData.push({
              CodigoOracle: String(codigoOracle),
              Nombre: nombreCompleto,
              Subarea: subArea,
              Area: area,
              Rol: rol,
              Empresa: empresa,
            });
          }
        }

        const fecact = formatFechaAMD(selectedDate);

        setExcelData(filteredData);

        try {
          const response = await axios.post(
            `${API_BASE_URL125}/api/preplan/insert?fecact=${fecact}&tipo=${encodeURIComponent(selectedEmpresa)}&usuario=${username}`,
            filteredData,
          );

          if (response.status === 200) {
            const nombreArchivo = file.name;
            const ahora = new Date().toISOString();

            const username = localStorage.getItem('currentUser');
            if (username) {
              const key = `archivosExcelCargados_${username}`;
              const registrosPrevios = JSON.parse(
                localStorage.getItem(key) || '[]',
              );
              registrosPrevios.push({ nombre: nombreArchivo, fecha: ahora });
              localStorage.setItem(key, JSON.stringify(registrosPrevios));
              setArchivosRecientes(registrosPrevios);
            }

            toast.success('Datos enviados correctamente a la API.', {
              id: toastId,
            });

            // Limpiar selector de archivo una vez completada la carga con éxito
            handleClearFile();

            if (guardar) {
              setTimeout(() => {
                guardar(false);
                toast.success(
                  'Guardado automático ejecutado después de la carga exitosa',
                );
              }, 1000);
            }

            if (response.data.errores?.length > 0) {
              setErroresCarga(response.data.errores);
              setIsModalOpen(true);
            }
          } else {
            toast.error('Error al enviar los datos a la API.');
          }
        } catch (error) {
          toast.error('Error al enviar los datos a la API.');
        }
      }
    };

    reader.readAsBinaryString(file);
  };

  useEffect(() => {
    const username = localStorage.getItem('currentUser');
    if (!username) return;

    const key = `archivosExcelCargados_${username}`;

    const registros = JSON.parse(localStorage.getItem(key) || '[]');
    const ahora = new Date();

    const filtrados = registros.filter((registro: any) => {
      const fechaRegistro = new Date(registro.fecha);
      const diferenciaHoras =
        (ahora.getTime() - fechaRegistro.getTime()) / (1000 * 60 * 60);
      return diferenciaHoras <= 24;
    });

    setArchivosRecientes(filtrados);
  }, []);

  const handlePublicar = async () => {
    if (!isReady) return;

    if (guardar) {
      await new Promise<void>((resolve) => {
        guardar(false);
        setTimeout(resolve, 700);
      });
    }

    if (!fechaPublicar || !empresaSeleccionada) {
      toast.error('Debe seleccionar una fecha y una empresa.');
      return;
    }

    if (contadorGrupos > 0) {
      const advertenciaResult = await Swal.fire({
        icon: 'warning',
        title: 'Fechas incompletas detectadas',
        text: `Se detectó ${contadorGrupos} ${contadorGrupos === 1 ? 'grupo' : 'grupos'} sin fecha programada. Solo se publicarán las fechas que estén completas. ¿Deseas continuar?`,
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        willOpen: () => {
          const titleElement = document.querySelector(
            '.swal2-title',
          ) as HTMLElement;
          const textElement = document.querySelector(
            '.swal2-html-container',
          ) as HTMLElement;

          if (titleElement) titleElement.style.fontSize = '16px';
          if (textElement) textElement.style.fontSize = '14px';
        },
      });

      if (!advertenciaResult.isConfirmed) {
        toast.info('Publicación cancelada');
        return;
      }
    }

    const result = await Swal.fire({
      title: `¿Estás seguro de publicar los servicios de la empresa ${empresaSeleccionada}?`,
      text: 'Una vez publicado, no podrás deshacer esta acción.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, publicar',
      cancelButtonText: 'Cancelar',
      willOpen: () => {
        const titleElement = document.querySelector(
          '.swal2-title',
        ) as HTMLElement;
        const textElement = document.querySelector(
          '.swal2-html-container',
        ) as HTMLElement;

        if (titleElement) {
          titleElement.style.fontSize = '16px';
        }

        if (textElement) {
          textElement.style.fontSize = '14px';
        }
      },
    });

    if (result.isConfirmed) {
      const fecact = formatFechaAMD(fechaPublicar);
      const toastId = toast.loading('Cargando...');

      try {
        const response = await axios.post(
          `${API_BASE_URL125}/api/preplan/servicios?fecha=${fecact}&empresa=${empresaSeleccionada}&usuario=${username}`,
        );

        if (response.data.data.length === 0) {
          toast.error(
            'Error al enviar los datos, asegurate de seleccionar una fecha y empresa válida.',
            { id: toastId },
          );
        } else {
          toast.success('Datos enviados correctamente.', { id: toastId });
          setActualizacion((prev) => prev + 1);
        }

        setActualizacion((prev) => prev + 1);
      } catch (error) {
        toast.error('Error al enviar los datos.', { id: toastId });
      }
    } else {
      toast.info('Publicación cancelada');
    }
  };

  const handleDeleteCarga = async () => {
    if (!isReady) return;

    if (!selectedDate) {
      toast.error('Por favor selecciona una fecha.');
      return;
    }

    if (!selectedEmpresa) {
      toast.error('Por favor selecciona una empresa.');
      return;
    }

    const fecact = formatFechaAMD(selectedDate);
    const url = `${API_BASE_URL125}/api/preplan/delete/?empresa=${encodeURIComponent(selectedEmpresa)}&fecha=${fecact}&usuario=${username}`;

    const toastId = toast.loading('Eliminando carga...');

    try {
      const response = await axios({
        method: 'PUT',
        url: url,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {},
      });

      if (response.status === 200) {
        toast.success('Carga eliminada correctamente.', { id: toastId });
        setActualizacion((prev) => prev + 1);
      } else {
        toast.error('Error al eliminar la carga.', { id: toastId });
      }
    } catch (error) {
      toast.error('Error al eliminar la carga.', { id: toastId });
    }
  };

  const toggleContent = () => {
    setIsVisible((prev) => !prev);
  };

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // `guardar` ahora es estable, así que el intervalo se crea una sola vez.
  // Antes se recreaba con cada cambio de los grupos, de modo que editando con
  // frecuencia el autoguardado de 3 minutos podía no dispararse nunca.
  useEffect(() => {
    intervaloRef.current = setInterval(
      () => {
        guardar(true);
        toast.success(
          `Guardado automático a las ${new Date().toLocaleTimeString()}`,
        );
      },
      3 * 60 * 1000,
    );

    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [guardar]);

  return (
    <div className="containerTep bg-slate-50 flex flex-col h-screen w-full overflow-hidden">
      <Toaster richColors />

      {/* Header corporativo superior azul con logo naranja */}
      <header className="sticky top-0 z-50 bg-[#113EB9] flex-shrink-0">
        <div className="flex h-12 items-stretch justify-between">
          {/* Lado izquierdo: Logo naranja, separador y subtítulo/título */}
          <div className="flex items-center gap-3">
            <div className="flex h-full items-center bg-gradient-to-r from-orange-500 to-red-500 px-4">
              <Image
                src="/LogoWeb.png"
                alt="Velsat"
                width={44}
                height={44}
                className="h-9 w-9 object-contain"
                priority
              />
            </div>

            <div className="h-7 w-[2px] rounded-full bg-white/40 self-center" />

            <div className="flex flex-col justify-center">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-200 leading-none mb-0.5">
                OPERACIONES / PROGRAMACIÓN
              </span>
              <h1 className="text-[14px] font-bold leading-none tracking-[0.01em] text-white">
                Planificación de servicios
              </h1>
            </div>
          </div>

          {/* Lado derecho: Badges SERVICIOS, PASAJEROS, ASIGNADO, botón + Nuevo grupo y switch Filtros */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] text-white">
              <span className="text-blue-100 font-semibold tracking-wide">SERVICIOS</span>
              <span className="font-bold text-white">{datosServicios.totalGrupos}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] text-white">
              <span className="text-blue-100 font-semibold tracking-wide">PASAJEROS</span>
              <span className="font-bold text-white">{datosServicios.totalPasajeros}</span>
            </div>

            {/* Indicador ASIGNADO con barra de progreso */}
            <div className="flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-[11px] text-white">
              <span className="text-blue-100 font-semibold tracking-wide">ASIGNADO</span>
              <div className="w-24 sm:w-28 h-2 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(Math.max(porcentajeLlenado, 0), 100)}%` }}
                />
              </div>
              <span className="font-bold text-white leading-none">
                {porcentajeLlenado.toFixed(0)}%
              </span>
            </div>

            {/* Botón + Nuevo grupo */}
            <button
              type="button"
              onClick={() => setModalNuevoGrupoOpen(true)}
              disabled={!empresaConfirmada || !dato}
              title={
                !empresaConfirmada || !dato
                  ? 'Primero debe obtener datos de una empresa'
                  : 'Agregar nuevo grupo'
              }
              className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-[12px] font-bold text-[#113EB9] transition-colors hover:bg-blue-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Nuevo grupo</span>
            </button>

            {/* Switch Filtros como en serviciosturismo */}
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
      </header>

      {/* Tabs y Controles contextuales */}
      {isVisible && (
        <div className="bg-white border-b border-slate-200 flex-shrink-0">
          {/* Fila de Tabs - Obtener datos primero */}
          <div className="flex items-center gap-6 px-4 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setTabActivo('obtener')}
              className={`text-xs py-2.5 font-semibold transition-colors border-b-2 ${
                tabActivo === 'obtener'
                  ? 'border-[#113EB9] text-[#113EB9]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Obtener datos
            </button>
            <button
              type="button"
              onClick={() => setTabActivo('carga')}
              className={`text-xs py-2.5 font-semibold transition-colors border-b-2 ${
                tabActivo === 'carga'
                  ? 'border-[#113EB9] text-[#113EB9]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Carga de archivo
            </button>
            <button
              type="button"
              onClick={() => setTabActivo('filtrar')}
              className={`text-xs py-2.5 font-semibold transition-colors border-b-2 ${
                tabActivo === 'filtrar'
                  ? 'border-[#113EB9] text-[#113EB9]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Filtrar datos
            </button>
          </div>

          {/* Contenido contextual de cada pestaña */}
          {tabActivo === 'obtener' && (
            <div className="flex flex-wrap items-center gap-2.5 px-4 py-2">
              <select
                className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:border-[#113EB9] focus:outline-none cursor-pointer transition-colors min-w-[150px]"
                value={empresaSeleccionada}
                onChange={handleEmpresaChange}
              >
                <option value="" disabled>
                  Seleccione Empresa
                </option>
                {(username === 'movilbus' ? empresa : empresaG).map(
                  (nombre, index) => (
                    <option key={index} value={nombre}>
                      {nombre}
                    </option>
                  ),
                )}
              </select>

              <button
                type="button"
                className="h-8 px-3.5 rounded-md bg-[#113EB9] hover:bg-blue-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                onClick={() => onOpen()}
              >
                <span>Obtener</span>
              </button>

              <span className="text-xs text-slate-400">
                Trae los servicios publicados por la aerolínea seleccionada.
              </span>

              <div className="h-5 w-[1px] bg-slate-200 mx-1 flex-shrink-0" />

<button
  type="button"
  className="h-8 px-3.5 rounded-md bg-[#DCFCE7] border border-[#166534] text-[#166534] font-semibold text-xs transition-colors hover:bg-[#bbf7d0] flex items-center gap-1.5"
  onClick={() => guardar(false)}
>
  <Save className="h-3.5 w-3.5 text-[#166534]" />
  <span>Guardar</span>
</button>

              <input
                type="date"
                title="Fecha de publicación"
                value={
                  fechaPublicar
                    ? `${fechaPublicar.getFullYear()}-${String(fechaPublicar.getMonth() + 1).padStart(2, '0')}-${String(fechaPublicar.getDate()).padStart(2, '0')}`
                    : ''
                }
                onChange={(e) => {
                  if (!e.target.value) {
                    setFechaPublicar(null);
                    return;
                  }
                  const [year, month, day] = e.target.value.split('-');
                  setFechaPublicar(
                    new Date(Number(year), Number(month) - 1, Number(day)),
                  );
                }}
                className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:border-[#113EB9] focus:outline-none transition-colors"
              />

              <button
                type="button"
                className="h-8 px-3.5 rounded-md bg-[#113EB9] hover:bg-blue-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                onClick={handlePublicar}
              >
                <Send className="h-3.5 w-3.5" />
                <span>Publicar</span>
              </button>

              <ModalObtenerServicios
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                onRespuesta={manejarRespuestaModal}
              />
            </div>
          )}

          {tabActivo === 'carga' && (
            <div className="flex flex-wrap items-center gap-2.5 px-4 py-2">
              {/* Selector de archivo integrado con vista clara */}
              <div
                className={`flex h-8 items-center rounded-md border transition-colors overflow-hidden max-w-[340px] flex-shrink-0 ${
                  file
                    ? 'border-emerald-400 bg-emerald-50/60'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
              >
                <div
                  className="flex items-center px-2.5 min-w-0 flex-1 gap-2"
                  title={fileName || 'Ningún archivo seleccionado'}
                >
                  <FaFileExcel
                    className={`h-4 w-4 shrink-0 ${file ? 'text-emerald-600' : 'text-slate-400'}`}
                  />
                  <span
                    className={`truncate text-xs ${
                      file
                        ? 'font-semibold text-emerald-900'
                        : 'italic text-slate-400 font-normal'
                    }`}
                  >
                    {fileName || 'Ningún archivo seleccionado'}
                  </span>
                </div>

                {file && (
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="h-full px-2 text-slate-400 hover:text-red-600 hover:bg-emerald-100/60 transition-colors text-xs font-bold"
                    title="Quitar archivo seleccionado"
                  >
                    ✕
                  </button>
                )}

                <label
                  htmlFor="uploadExcel"
                  className={`h-full flex items-center justify-center px-3 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                    file
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      : 'bg-[#113EB9] hover:bg-blue-800 text-white'
                  }`}
                  title={file ? 'Cambiar archivo' : 'Seleccionar archivo Excel'}
                >
                  {file ? 'Cambiar' : 'Examinar'}
                </label>
                <input
                  type="file"
                  id="uploadExcel"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Indicador de que el archivo fue seleccionado y está listo */}
              {file && (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800 flex-shrink-0">
                  <Check className="h-3 w-3" />
                  <span>Listo para cargar</span>
                </span>
              )}

              <input
                type="date"
                value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const [year, month, day] = e.target.value.split('-');
                  const selectedDateObj = new Date(
                    Number(year),
                    Number(month) - 1,
                    Number(day),
                  );
                  setSelectedDate(selectedDateObj);
                }}
                className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:border-[#113EB9] focus:outline-none transition-colors"
              />

              <select
                className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:border-[#113EB9] focus:outline-none cursor-pointer transition-colors"
                value={selectedEmpresa}
                onChange={(event) => setSelectedEmpresa(event.target.value)}
              >
                <option value="" disabled>
                  Seleccione empresa
                </option>
                {(username === 'movilbus' ? tiposArchivos : tiposArchivosG).map(
                  (tipo, index) => (
                    <option key={index} value={tipo}>
                      {tipo}
                    </option>
                  ),
                )}
              </select>

              <button
                type="button"
                onClick={handleReadExcel}
                className="h-8 px-3.5 rounded-md bg-[#113EB9] hover:bg-blue-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 flex-shrink-0"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Cargar archivo</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteCarga}
                className="h-8 px-3 rounded-md border border-red-300 bg-red-50/60 hover:bg-red-50 text-red-600 font-semibold text-xs transition-colors flex items-center gap-1 flex-shrink-0"
              >
                <span>Eliminar carga</span>
              </button>

              <ModalReporteErrores
                errores={erroresCarga}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
              />
            </div>
          )}

          {tabActivo === 'filtrar' && (
            <div className="flex flex-wrap items-center gap-2.5 px-4 py-2">
              <select
                onChange={handleFiltrar}
                className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 focus:border-[#113EB9] focus:outline-none cursor-pointer transition-colors"
              >
                <option value="all">Todas las empresas</option>
                {cabeceras.map((cabecera, index) => (
                  <option
                    key={index}
                    value={`${cabecera.empresa} | ${cabecera.fecha}`}
                  >
                    {cabecera.empresa} - {cabecera.fecha}
                  </option>
                ))}
              </select>

              <div className="relative w-56">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#113EB9] focus:outline-none transition-colors"
                  placeholder="Nombre del pasajero"
                  value={nombrePasajero}
                  onChange={(e) => setNombrePasajero(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-slate-600">Hora:</span>
                <FiltroHoras filtroHora={filtroHora} setFiltroHora={setFiltroHora} />
                {filtroHora && (
                  <button
                    type="button"
                    onClick={() => setFiltroHora('')}
                    className="h-6 w-6 rounded flex items-center justify-center bg-slate-200 text-slate-600 hover:bg-slate-300 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={alternarEstado}
                className={`h-8 px-3 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 border ${
                  modoVista === 'Eliminados'
                    ? 'border-red-300 bg-red-50/60 hover:bg-red-50 text-red-600'
                    : 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-700'
                }`}
              >
                <span>{modoVista}</span>
              </button>

              <button
                type="button"
                className="h-8 px-3 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
                onClick={() => {
                  if (ejecutarGrupoCeroRef.current) {
                    ejecutarGrupoCeroRef.current();
                  }
                }}
              >
                <span>Limpiar Eliminados</span>
              </button>

              <button
                type="button"
                className="h-8 px-3.5 rounded-md bg-[#113EB9] hover:bg-blue-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setModalNuevoGrupoOpen(true)}
                disabled={!empresaConfirmada || !dato}
                title={
                  !empresaConfirmada || !dato
                    ? 'Primero debe obtener datos de una empresa'
                    : 'Agregar nuevo grupo'
                }
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nuevo Grupo</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Barra de Lista de archivos cargados */}
      <div className="border-b border-slate-200 bg-slate-100/90 px-4 py-1 text-xs flex-shrink-0">
        <div className="flex max-w-full items-center gap-2 overflow-x-auto">
          <span className="whitespace-nowrap font-semibold text-slate-800">
            Lista de archivos cargados :
          </span>
          {archivosRecientes.length === 0 ? (
            <span className="whitespace-nowrap italic text-slate-500">
              No hay archivos recientes
            </span>
          ) : (
            <span className="whitespace-nowrap text-slate-700">
              {archivosRecientes.map((archivo, i) => (
                <span key={i} className="mr-2 last:mr-0">
                  <span className="font-semibold text-slate-900">{i + 1}.</span>{' '}
                  <span className="font-medium text-slate-800">{archivo.nombre}</span>{' '}
                  <time dateTime={archivo.fecha} className="text-slate-500">
                    –{' '}
                    {new Date(archivo.fecha).toLocaleString(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </time>
                  {i !== archivosRecientes.length - 1 && (
                    <span className="ml-2 text-slate-300">,</span>
                  )}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      <div
        className="grupoServicios relative overflow-y-auto"
        style={{ height: `calc(100vh - ${isVisible ? 154 : 76}px)` }}
      >
        {!empresaConfirmada || !dato ? (
          <div className="absolute inset-0 ml-2 mr-2 flex items-center justify-center bg-gray-100 p-4">
            <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50/80 shadow-xs">
                <Calendar className="h-8 w-8 text-blue-600 stroke-[1.8]" />
              </div>

              <h2 className="mb-2 text-base font-bold text-slate-800 tracking-tight">
                Sin datos para mostrar
              </h2>

              <p className="mb-6 max-w-lg text-center text-xs text-slate-500 leading-relaxed font-normal">
                Selecciona una empresa y una fecha válida en la pestaña{' '}
                <strong className="font-semibold text-slate-700">Obtener datos</strong>, o carga un
                archivo de programación desde{' '}
                <strong className="font-semibold text-slate-700">Carga de archivo</strong>.
              </p>

              <div className="flex items-center gap-5 text-[11px] font-medium text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                  0 servicios
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                  0 pasajeros
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                  0 grupos asignados
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="ml-2 mr-2">
            <Servicios
              key={`${empresaConfirmada}-${dato}-${actualizacion}`}
              empresa={empresaConfirmada}
              dato={dato}
              onGuardar={registrarGuardar}
              onActualizarDatos={actualizarDatosServicios}
              onActualizarCabeceras={actualizarCabeceras}
              onActualizarFechas={actualizarFechas}
              filtro={filtro}
              filtroHora={filtroHora}
              nombrePasajero={nombrePasajero}
              modoVista={modoVista}
              onLimpiarRefReady={(fn) => (ejecutarGrupoCeroRef.current = fn)}
              setContadorGrupos={setContadorGrupos}
              fechaSeleccionada={fechaPublicar}
            />

            <ModalNuevoGrupo
              isOpen={modalNuevoGrupoOpen}
              onClose={() => setModalNuevoGrupoOpen(false)}
              onRefrescarDatos={handleRefrescarDatos}
              empresaActual={empresaConfirmada || ''}
              totalGruposActuales={datosServicios.totalGrupos}
            />
          </div>
        )}
      </div>
    </div>
  );
}
