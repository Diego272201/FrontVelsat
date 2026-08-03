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
import { IoSave } from 'react-icons/io5';
import { IoSendSharp } from 'react-icons/io5';
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
import { ArchiveRestore, Database, Funnel } from 'lucide-react';
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
    className="rounded border border-gray-300 bg-white p-[6px] text-[11px] focus:border-gray-400 focus:outline-none focus:ring-0"
    style={{ width: '100px' }}
    placeholder="Ej: 08:30"
  />
);

export default function TepContent() {
  const { username, isReady } = useUsername();

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
    console.log('Refrescando datos después de crear grupo...');
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
    // setDato('');
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

        console.log(filteredData);
        const fecact = formatFechaAMD(selectedDate);

        console.log(fecact);
        console.log(selectedEmpresa);

        setExcelData(filteredData);

        try {
          const response = await axios.post(
            `${API_BASE_URL125}/api/preplan/insert?fecact=${fecact}&tipo=${encodeURIComponent(selectedEmpresa)}&usuario=${username}`,
            filteredData,
          );
          console.log(response.data);
          console.log(fecact);

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
          console.error('Error al enviar los datos a la API:', error);
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

    if (!selectedDate || !empresaSeleccionada) {
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
      const fecact = formatFechaAMD(selectedDate);
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
          console.log('Respuesta de la API:', response.data);
          setActualizacion((prev) => prev + 1);
        }

        setActualizacion((prev) => prev + 1);
      } catch (error) {
        toast.error('Error al enviar los datos.', { id: toastId });
        console.error('Error en la solicitud:', error);
      }
    } else {
      toast.info('Publicación cancelada');
    }
  };

  useEffect(() => {
    console.log('Errores actualizados en el estado:', erroresCarga);
  }, [erroresCarga]);

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

  function formatFechaDMY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return (
    <div className="containerTep bg-blue-50">
      <Toaster richColors />
      <div>
        <div className="sticky top-0 z-50 border-b border-gray-200 bg-[#efeff0] px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
                <div className="h-5 w-1 bg-brandPrimary"></div>
                <h1 className="text-[13px] font-bold uppercase tracking-wide text-gray-800">
                  Planificación de Servicios
                </h1>
              </div>
              <div className="w-48">
                <ProgressBar value={porcentajeLlenado} />
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
          <div
            id="contenido"
            className="border-b border-gray-200 bg-white px-3 py-2 text-[12px] space-y-2 shadow-xs"
          >
            {/* FILA 1: CARGA DE ARCHIVOS + OBTENER DATOS AL FINAL */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-800 uppercase flex items-center gap-1.5 whitespace-nowrap">
                 Carga Archivo
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {/* Selector de archivo Excel */}
                <div className="flex h-8 items-center rounded-md border border-gray-200 bg-gray-50 text-[11px] overflow-hidden">
                  <div className="flex items-center px-2.5">
                    <FaFileExcel size={16} color="#307750" className="mr-2 shrink-0" />
                    <span className="whitespace-nowrap font-medium text-gray-700">
                      {fileName || 'Ningún archivo seleccionado'}
                    </span>
                  </div>
                  <label
                    htmlFor="uploadExcel"
                    className="ml-auto flex h-full items-center justify-center cursor-pointer rounded-r bg-brandPrimary px-3 text-[11px] font-medium text-white hover:bg-brandPrimary-hover transition-colors whitespace-nowrap"
                  >
                    Subir
                  </label>
                  <input
                    type="file"
                    id="uploadExcel"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Fecha */}
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
                  className="h-8 rounded-md border border-gray-200 bg-gray-50 px-2 text-[11px] focus:border-brandPrimary focus:outline-none"
                />

                {/* Tipo de archivo */}
                <select
                  className="h-8 rounded-md border border-gray-200 bg-gray-50 px-2 text-[11px] focus:border-brandPrimary focus:outline-none"
                  value={selectedEmpresa}
                  onChange={(event) => setSelectedEmpresa(event.target.value)}
                >
                  <option value="" disabled>
                    Seleccione Archivo
                  </option>
                  {(username === 'movilbus' ? tiposArchivos : tiposArchivosG).map(
                    (tipo, index) => (
                      <option key={index} value={tipo}>
                        {tipo}
                      </option>
                    ),
                  )}
                </select>

                {/* Cargar Archivo Button (Verde) */}
                <button
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brandSecondary px-3 text-[11px] font-medium text-white hover:bg-brandSecondary-hover transition-colors shadow-xs"
                  onClick={handleReadExcel}
                >
                  <FaFileExcel size={14} />
                  Cargar Archivo
                </button>

                <ModalReporteErrores
                  errores={erroresCarga}
                  isOpen={isModalOpen}
                  onClose={() => setIsModalOpen(false)}
                />

                {/* Eliminar Carga Button (Rojo) */}
                <button
                  onClick={handleDeleteCarga}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 text-[11px] font-medium text-white hover:bg-red-700 transition-colors shadow-xs"
                >
                  <MdDelete size={14} />
                  Eliminar Carga
                </button>
              </div>

              {/* SECCIÓN OBTENER DATOS (AL FINAL SI CABE, O AL INICIO SI PASA A LA SIGUIENTE FILA) */}
              <div className="flex flex-wrap items-center gap-2 ml-0 2xl:ml-auto">
                <span className="text-[11px] font-semibold text-gray-800 uppercase flex items-center gap-1.5 whitespace-nowrap">
                   Obtener Datos
                </span>

                <select
                  id="countries"
                  className="h-8 rounded-md border border-gray-200 bg-gray-50 px-2 text-[11px] focus:border-brandPrimary focus:outline-none min-w-[140px]"
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

                {/* Obtener (Azul) */}
                <button
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brandPrimary px-3 text-[11px] font-medium text-white hover:bg-brandPrimary-hover transition-colors shadow-xs"
                  onClick={() => onOpen()}
                >
                  Obtener
                  <IoSendSharp size={12} />
                </button>

                {/* Guardar (Verde) */}
                <button
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brandSecondary px-3 text-[11px] font-medium text-white hover:bg-brandSecondary-hover transition-colors shadow-xs"
                  onClick={() => guardar(false)}
                >
                  Guardar
                  <IoSave size={12} />
                </button>

                <ModalObtenerServicios
                  isOpen={isOpen}
                  onOpenChange={onOpenChange}
                  onRespuesta={manejarRespuestaModal}
                />

                {/* Publicar (Azul) */}
                <button
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brandPrimary px-3 text-[11px] font-medium text-white hover:bg-brandPrimary-hover transition-colors shadow-xs"
                  onClick={handlePublicar}
                >
                  Publicar
                </button>
              </div>
            </div>

            {/* FILA 3: FILTRAR DATOS & CONTADORES */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 text-[11px] font-semibold text-gray-800 uppercase flex items-center gap-1.5 whitespace-nowrap">
               Filtrar Datos
              </span>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <select
                  onChange={handleFiltrar}
                  id="countries"
                  className="h-8 rounded-md border border-gray-200 bg-gray-50 px-2 text-[11px] focus:border-brandPrimary focus:outline-none"
                >
                  <option value="all">Todos</option>
                  {cabeceras.map((cabecera, index) => (
                    <option
                      key={index}
                      value={`${cabecera.empresa} | ${cabecera.fecha}`}
                    >
                      {cabecera.empresa} - {cabecera.fecha}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  className="h-8 w-60 rounded-md border border-gray-200 bg-gray-50 px-2 text-[11px] focus:border-brandPrimary focus:outline-none"
                  placeholder="Nombre del pasajero"
                  value={nombrePasajero}
                  onChange={(e) => setNombrePasajero(e.target.value)}
                />

                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-medium text-gray-600">
                    Hora:
                  </span>
                  <FiltroHoras
                    filtroHora={filtroHora}
                    setFiltroHora={setFiltroHora}
                  />
                  {filtroHora && (
                    <button
                      onClick={() => setFiltroHora('')}
                      className="h-7 rounded bg-gray-500 px-1.5 text-[10px] text-white hover:bg-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Eliminados Button */}
                <button
                  onClick={alternarEstado}
                  className={`inline-flex h-8 items-center justify-center gap-1 rounded-md px-3 text-[11px] font-medium text-white transition-colors shadow-xs ${
                    modoVista === 'Eliminados'
                      ? 'bg-brandPrimary hover:bg-brandPrimary-hover'
                      : 'bg-brandSecondary hover:bg-brandSecondary-hover'
                  }`}
                >
                  {modoVista}
                </button>

                {/* Limpiar Eliminados (Azul) */}
                <button
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-brandPrimary px-3 text-[11px] font-medium text-white hover:bg-brandPrimary-hover transition-colors shadow-xs"
                  onClick={() => {
                    if (ejecutarGrupoCeroRef.current) {
                      ejecutarGrupoCeroRef.current();
                    }
                  }}
                >
                  Limpiar Eliminados
                </button>

                {/* + Nuevo Grupo (Verde) */}
                <button
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-brandSecondary px-3 text-[11px] font-medium text-white hover:bg-brandSecondary-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50 shadow-xs"
                  onClick={() => setModalNuevoGrupoOpen(true)}
                  disabled={!empresaConfirmada || !dato}
                  title={
                    !empresaConfirmada || !dato
                      ? 'Primero debe obtener datos de una empresa'
                      : 'Agregar nuevo grupo'
                  }
                >
                  <MdAdd size={14} />
                  Nuevo Grupo
                </button>

                {/* Indicadores de Totales */}
                <div className="ml-auto flex items-center gap-2">
                  <div className="inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-[11px]">
                    <MdHomeRepairService size={14} className="text-blue-700" />
                    <span className="font-semibold text-blue-800">
                      Total Servicios:
                    </span>
                    <span className="font-bold text-blue-700">
                      {datosServicios.totalGrupos}
                    </span>
                  </div>

                  <div className="inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-[11px]">
                    <FaUsers size={14} className="text-emerald-700" />
                    <span className="font-semibold text-emerald-800">
                      Total Pasajeros:
                    </span>
                    <span className="font-bold text-emerald-800">
                      {datosServicios.totalPasajeros}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mx-2 bg-gray-100 py-1 text-xs shadow-sm">
          <div className="flex max-w-full items-center space-x-2 overflow-x-auto">
            <h3 className="whitespace-nowrap text-sm font-semibold text-gray-800">
              Lista de archivos cargados :
            </h3>
            {archivosRecientes.length === 0 ? (
              <span className="whitespace-nowrap italic text-gray-500">
                No hay archivos recientes
              </span>
            ) : (
              <span className="whitespace-nowrap text-gray-700">
                {archivosRecientes.map((archivo, i) => (
                  <span key={i} className="mr-2 last:mr-0">
                    <span className="font-medium text-gray-900">{i + 1}.</span>{' '}
                    {archivo.nombre} –{' '}
                    <time dateTime={archivo.fecha} className="text-gray-600">
                      {new Date(archivo.fecha).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </time>
                    {i !== archivosRecientes.length - 1 && <span>,</span>}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className="grupoServicios relative overflow-y-auto"
        style={{ height: `calc(100vh - ${isVisible ? 180 : 85}px)` }}
      >
        {!empresaConfirmada || !dato ? (
          <div className="absolute inset-0 ml-2 mr-2 flex items-center justify-center bg-gray-100">
            <div className="grid h-full w-full overflow-hidden bg-white md:grid-cols-2">
              <div className="relative flex items-center justify-center bg-gray-200 p-8">
                {/* Fondo desenfocado naranja */}
                <div className="absolute inset-0 z-0 flex items-center justify-center">
                  <div className="h-[300px] w-[300px] rounded-full bg-orange-400 opacity-30 blur-3xl"></div>
                </div>

                {/* Imagen principal */}
                <Image
                  src="/man_conf.png"
                  alt="Sin datos"
                  width={350}
                  height={350}
                  className="relative z-10 object-contain"
                />
              </div>

              <div className="flex flex-col justify-center gap-6 bg-gray-100 px-24 text-center md:text-left">
                <h2 className="text-2xl font-bold text-[#0d1b2a]">
                  ¡Atención!
                </h2>
                <p className="text-[12px] text-gray-700">
                  Aún no has seleccionado una <strong>empresa</strong> o una{' '}
                  <strong>fecha válida</strong>. Por favor asegúrate de
                  completar ambos campos para visualizar los datos
                  correctamente.
                </p>
                <p className="text-sm text-gray-500">
                  En Velsat, trabajamos para ofrecerte soluciones de monitoreo y
                  planificación precisas. Si necesitas ayuda, no dudes en
                  contactarnos.
                </p>
                <p className="mt-4 text-xs text-gray-400">
                  © {new Date().getFullYear()} Velsat | Todos los derechos
                  reservados
                </p>
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
              fechaSeleccionada={selectedDate}
              // onAgregarGrupoReady={(fn) => (agregarGrupoRef.current = fn)} // ← ESTA LÍNEA FALTA
            />

            <ModalNuevoGrupo
              isOpen={modalNuevoGrupoOpen}
              onClose={() => setModalNuevoGrupoOpen(false)}
              onRefrescarDatos={handleRefrescarDatos}
              empresaActual={empresaConfirmada || ''}
              fechaActual={selectedDate ? formatFechaDMY(selectedDate) : ''}
              totalGruposActuales={datosServicios.totalGrupos}
            />
          </div>
        )}
      </div>
    </div>
  );
}
