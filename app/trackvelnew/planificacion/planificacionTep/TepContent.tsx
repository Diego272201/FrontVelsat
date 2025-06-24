'use client';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import { useDisclosure } from '@nextui-org/react';
import * as xlsx from 'xlsx';
import { tiposArchivos, empresa } from './tiposArchivo';
import { Toaster, toast } from 'sonner';
import '@/app/styles/planiTep.css';
import { FaDatabase, FaFileAlt, FaFileExcel } from 'react-icons/fa';
import Servicios from './Servicios';
import axios from 'axios';
import { MdAdd, MdDelete, MdFilterAlt } from 'react-icons/md';
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
import { ArchiveRestore, Database, DatabaseZap, Funnel } from 'lucide-react';

export default function TepContent() {
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
  const [guardar, setGuardar] = useState<(auto?: boolean) => void>(
    () => () => {},
  );

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

  const [nombrePasajero, setNombrePasajero] = useState('');
  const [totalFechas, setTotalFechas] = useState(0);
  const [fechasLlenas, setFechasLlenas] = useState(0);
  const [actualizacion, setActualizacion] = useState(0);

  const actualizarCabeceras = (
    nuevasCabeceras: { empresa: string; fecha: string }[],
  ) => {
    setCabeceras(nuevasCabeceras);
  };

  const actualizarFechas = ({
    totalFechas,
    fechasLlenas,
  }: {
    totalFechas: number;
    fechasLlenas: number;
  }) => {
    setTotalFechas(totalFechas);
    setFechasLlenas(fechasLlenas);
  };

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

  const actualizarDatosServicios = (datos: {
    totalGrupos: number;
    totalPasajeros: number;
  }) => {
    setDatosServicios(datos);
  };

  const manejarRespuestaModal = (respuesta: string) => {
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
    setDato('');
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
            `${API_BASE_URL125}/api/preplan/insert?fecact=${fecact}&tipo=${encodeURIComponent(selectedEmpresa)}`,
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
          `${API_BASE_URL125}/api/preplan/servicios?fecha=${fecact}&empresa=${empresaSeleccionada}&usuario=movilbus`,
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
    if (!selectedDate) {
      toast.error('Por favor selecciona una fecha.');
      return;
    }

    if (!selectedEmpresa) {
      toast.error('Por favor selecciona una empresa.');
      return;
    }

    const fecact = formatFechaAMD(selectedDate);
    const url = `${API_BASE_URL125}/api/preplan/delete/?empresa=${encodeURIComponent(selectedEmpresa)}&fecha=${fecact}&usuario=movilbus`;

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

  useEffect(() => {
    if (guardar) {
      if (intervaloRef.current) clearInterval(intervaloRef.current);

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
    }
  }, [guardar]);

  function formatFechaDMY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return (
    <div className="containerTep">
      <Toaster richColors />
      <div>
        <div className="cabecera sticky top-0 z-50 py-1">
          <div className="progressAndTitle">
            <div className="contenedorcabecera">
              <div className="pl-1">
                <span className="titulocabecera">
                  MÓDULO DE PLANIFICACIÓN DE SERVICIOS
                </span>
              </div>
            </div>
            <div className="h-[30px] w-px bg-white"></div>

            <ProgressBar value={porcentajeLlenado}></ProgressBar>
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
          <div
            id="contenido"
            className="mx-2 border-b-1 border-gray-300 bg-gray-50"
          >
            <div className="fristFileT">
              <div className="cargaArchivos">
                <div className="relative flex items-center pb-2">
                  <span className="flex items-center gap-2 text-[12px] font-semibold text-gray-900 ">
                    <ArchiveRestore size={15} /> Carga de Archivos
                  </span>
                </div>

                <div className="cabeceraArchivos">
                  <div>
                    <div className="flex w-full border border-gray-300 bg-gray-200 p-0 text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0">
                      <div className="flex items-center px-4">
                        <FaFileExcel size={20} color="#307750" />
                        <p className="ml-3 text-[12px]">
                          {fileName || 'Ningún archivo seleccionado'}
                        </p>
                      </div>
                      <label
                        htmlFor="uploadExcel"
                        className="ml-auto block w-max cursor-pointer  bg-[#d62828] px-3 py-2 text-[12px] text-white outline-none hover:bg-gray-700"
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
                  </div>

                  <div>
                    <input
                      type="date"
                      value={
                        selectedDate
                          ? selectedDate.toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) => {
                        const [year, month, day] = e.target.value.split('-');
                        const selectedDate = new Date(
                          Number(year),
                          Number(month) - 1,
                          Number(day),
                        );
                        setSelectedDate(selectedDate);
                      }}
                      className="w-full border border-gray-300 bg-gray-200 p-[7px] text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0"
                    />
                  </div>

                  <div className="selectTipoA">
                    <select
                      className="w-full border border-gray-300 bg-gray-200 p-[8.2px] text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0"
                      value={selectedEmpresa}
                      onChange={(event) =>
                        setSelectedEmpresa(event.target.value)
                      }
                    >
                      <option value="" disabled>
                        Seleccione Archivo
                      </option>

                      {tiposArchivos.map((tipo, index) => (
                        <option key={index} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 text-[12px]">
                    <button
                      className="container-btn-file"
                      onClick={handleReadExcel}
                    >
                      <svg
                        fill="#fff"
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 50 50"
                      >
                        <path
                          d="M28.8125 .03125L.8125 5.34375C.339844 
                      5.433594 0 5.863281 0 6.34375L0 43.65625C0 
                      44.136719 .339844 44.566406 .8125 44.65625L28.8125 
                      49.96875C28.875 49.980469 28.9375 50 29 50C29.230469 
                      50 29.445313 49.929688 29.625 49.78125C29.855469 49.589844 
                      30 49.296875 30 49L30 1C30 .703125 29.855469 .410156 29.625 
                      .21875C29.394531 .0273438 29.105469 -.0234375 28.8125 .03125ZM32 
                      6L32 13L34 13L34 15L32 15L32 20L34 20L34 22L32 22L32 27L34 27L34 
                      29L32 29L32 35L34 35L34 37L32 37L32 44L47 44C48.101563 44 49 
                      43.101563 49 42L49 8C49 6.898438 48.101563 6 47 6ZM36 13L44 
                      13L44 15L36 15ZM6.6875 15.6875L11.8125 15.6875L14.5 21.28125C14.710938 
                      21.722656 14.898438 22.265625 15.0625 22.875L15.09375 22.875C15.199219 
                      22.511719 15.402344 21.941406 15.6875 21.21875L18.65625 15.6875L23.34375 
                      15.6875L17.75 24.9375L23.5 34.375L18.53125 34.375L15.28125 
                      28.28125C15.160156 28.054688 15.035156 27.636719 14.90625 
                      27.03125L14.875 27.03125C14.8125 27.316406 14.664063 27.761719 
                      14.4375 28.34375L11.1875 34.375L6.1875 34.375L12.15625 25.03125ZM36 
                      20L44 20L44 22L36 22ZM36 27L44 27L44 29L36 29ZM36 35L44 35L44 37L36 37Z"
                        ></path>
                      </svg>
                      Cargar Archivo
                    </button>

                    <ModalReporteErrores
                      errores={erroresCarga}
                      isOpen={isModalOpen}
                      onClose={() => setIsModalOpen(false)}
                    />
                    <button
                      onClick={handleDeleteCarga}
                      className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 px-4 py-2  text-[12px] font-medium text-white shadow-sm transition-all duration-200 hover:from-red-600 hover:to-red-700"
                    >
                      <MdDelete size={14} />
                      <span>Eliminar Carga</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="cargaArchivos">
                <div className="relative flex items-center pb-2.5">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-900">
                    <Database size={15} /> Obtener Datos
                  </span>
                </div>

                <div className="cabeceraArchivos">
                  <div className="selectTipoA">
                    <select
                      id="countries"
                      className="w-full  border border-gray-300 bg-gray-200 p-[7px] text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0"
                      value={empresaSeleccionada}
                      onChange={handleEmpresaChange}
                    >
                      <option value="" selected disabled>
                        Seleccione Empresa
                      </option>

                      {empresa.map((nombre, index) => (
                        <option key={index} value={nombre}>
                          {nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="buttonsTep">
                    <button
                      className="flex items-center gap-2  bg-blue-500 p-[7px] text-[12px] text-white hover:bg-blue-600 focus:outline-none"
                      onClick={() => {
                        setEmpresaConfirmada(empresaSeleccionada);
                        onOpen();
                      }}
                    >
                      Obtener
                      <IoSendSharp />
                    </button>

                    <button
                      className="flex items-center gap-2  bg-[#348357] p-[7px] text-[12px] text-[#fff] hover:bg-green-600 focus:outline-none"
                      onClick={() => guardar(false)}
                    >
                      Guardar
                      <IoSave color="#fff" />
                    </button>

                    <ModalObtenerServicios
                      isOpen={isOpen}
                      onOpenChange={onOpenChange}
                      onRespuesta={manejarRespuestaModal}
                    />

                    <button
                      className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2  text-xs font-medium text-white shadow-sm transition-all duration-200 hover:from-purple-600 hover:to-purple-700"
                      onClick={handlePublicar}
                    >
                      <span>Publicar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="fristFileT">
              <div className="cargaArchivos">
                <div className="filtrosPlanificacion">
                  <div className="relative flex items-center pb-1">
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-900">
                      <Funnel size={15} /> Filtrar Datos
                    </span>
                  </div>

                  <div className="cabeceraArchivos">
                    <div className="inputFiltros">
                      <select
                        onChange={handleFiltrar}
                        id="countries"
                        className="w-full  border border-gray-300 bg-gray-200 p-[7px] text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0"
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
                    </div>

                    <div className="max-w-lg">
                      <input
                        type="text"
                        id="input-label"
                        className="w-full  border border-gray-300 bg-gray-200 p-[7px] text-[12px] focus:border-gray-400 focus:outline-none focus:ring-0 dark:placeholder-neutral-800"
                        placeholder="Nombre del pasajero"
                        style={{ width: '280px' }}
                        value={nombrePasajero}
                        onChange={(e) => setNombrePasajero(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={alternarEstado}
                      className={`px-4 py-[8px]  text-[12px] font-medium shadow-sm transition-all duration-200 ${
                        modoVista === 'Eliminados'
                          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                          : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-600 hover:to-green-700'
                      }`}
                    >
                      {modoVista}
                    </button>

                    <button
                      className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 px-4 py-[8px]  text-[12px] font-medium text-white shadow-sm transition-all duration-200 hover:from-red-600 hover:to-red-700"
                      onClick={() => {
                        if (ejecutarGrupoCeroRef.current) {
                          ejecutarGrupoCeroRef.current();
                        }
                      }}
                    >
                      Limpiar Eliminados
                    </button>

                    <button
                      className="flex items-center gap-2 bg-green-700 p-[8px] text-[12px] text-white hover:bg-green-700 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400"
                      onClick={() => setModalNuevoGrupoOpen(true)}
                      disabled={!empresaConfirmada || !dato}
                      title={
                        !empresaConfirmada || !dato
                          ? 'Primero debe obtener datos de una empresa'
                          : 'Agregar nuevo grupo'
                      }
                    >
                      <MdAdd size={16} />
                      Nuevo Grupo
                    </button>
                  </div>
                </div>
              </div>

              <div className="cargaArchivos">
                <div className="grid grid-cols-2 gap-2">
                  {/* Card Total Servicios - Compacta con fondo azul claro */}
                  <div className="border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-1 shadow-sm flex justify-center items-center">
                    <div className="flex items-center space-x-2">
                      <div className="rounded-lg bg-blue-600 p-2 shadow-sm">
                        <MdHomeRepairService size={14} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-blue-700">
                          Total Servicios
                        </p>
                        <p className="text-sm font-bold text-blue-800">
                          {datosServicios.totalGrupos}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Total Pasajeros - Compacta con fondo verde claro */}
                  <div className="border border-green-200 bg-gradient-to-r from-green-50 to-emerald-100 p-1 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="rounded-lg bg-green-600 p-2 shadow-sm">
                        <FaUsers size={14} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-green-700">
                          Total Pasajeros
                        </p>
                        <p className="text-sm font-bold text-green-800">
                          {datosServicios.totalPasajeros}
                        </p>
                      </div>
                    </div>
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
        style={{ height: `calc(100vh - ${isVisible ? 240 : 85}px)` }}
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
                  src="https://res.cloudinary.com/dyc4ik1ko/image/upload/nodatavelsat_sd026b.png"
                  alt="Sin datos"
                  width={400}
                  height={400}
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
              onGuardar={setGuardar}
              onActualizarDatos={actualizarDatosServicios}
              onActualizarCabeceras={actualizarCabeceras}
              onActualizarFechas={actualizarFechas}
              filtro={filtro}
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
              onRefrescarDatos={handleRefrescarDatos} // Nueva función
              empresaActual={empresaConfirmada || ''}
              fechaActual={selectedDate ? formatFechaDMY(selectedDate) : ''}
              totalGruposActuales={datosServicios.totalGrupos} // Pasar el total de grupos actuales
            />
          </div>
        )}
      </div>
    </div>
  );
}
