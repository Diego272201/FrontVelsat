'use client';
import React, { useEffect, useState } from 'react';
import { Button, useDisclosure } from '@nextui-org/react';
import * as xlsx from 'xlsx';
import { tiposArchivos, empresa } from './tiposArchivo';
import { Toaster, toast } from 'sonner';
import '@/app/styles/planiTep.css';
import { FaFileExcel } from 'react-icons/fa';
import { DatePicker } from '@nextui-org/date-picker';
import Servicios from './Servicios';
import axios from 'axios';
import { MdDelete } from 'react-icons/md';
import App from '@/app/components/TimePicker';
import ModalObtenerServicios from './ModalObtenerServicios';
import ProgressBar from '@/app/components/ui/ProgressBar';
import { IoSave } from 'react-icons/io5';
import { IoSendSharp } from 'react-icons/io5';
import { MdHomeRepairService } from 'react-icons/md';
import { FaUsers } from 'react-icons/fa';
import ModalErroresCarga from './reporteerrores/ModalErroresCarga';
import ModalReporteErrores from './reporteerrores/ModalErroresCarga';

export default function Page() {
  const [date, setDate] = useState('');

  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<string>('');
  const [empresaConfirmada, setEmpresaConfirmada] = useState<string | null>(
    null,
  );
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [dato, setDato] = useState<string>('');

  const [modoVista, setModoVista] = useState('Eliminados');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [erroresCarga, setErroresCarga] = useState<any[]>([]);

  const alternarEstado = () => {
    setModoVista(modoVista === 'Eliminados' ? 'Total' : 'Eliminados');
  };

  const [guardar, setGuardar] = useState<() => void>(() => () => {});
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
  const [isVisible, setIsVisible] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');

  const handleStartDateSelect = (date: string) => {
    setStartDate(date);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setFileName(event.target.files[0].name);
    }
  };

  const formatFecha = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatFechaAMD = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
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

  const alertaGuardar = () => {
    toast.success('Datos guardados correctaemte');
  };

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
        const workbook = xlsx.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[1];
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

        setExcelData(filteredData);

        try {
          const response = await axios.post(
            `http://66.240.210.125:8586/api/preplan/insert?fecact=${fecact}&tipo=${encodeURIComponent(selectedEmpresa)}`,
            filteredData,
          );
          console.log(response.data);
          console.log(fecact);

          if (response.status === 200) {
            toast.success('Datos enviados correctamente a la API.');

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

  const handlePublicar = async () => {
    if (!selectedDate || !empresaSeleccionada) {
      toast.error("Debe seleccionar una fecha y una empresa.");
      return;
    }

    // Formatear la fecha en YYYY-MM-DD
    const fecact = formatFechaAMD(selectedDate);

    try {
      const response = await axios.post(
        `http://66.240.210.125:8586/api/preplan/servicios?fecha=${fecact}&empresa=${empresaSeleccionada}&usuario=movilbus`
      );
      toast.success("Datos enviados correctamente.");
      console.log("Respuesta de la API:", response.data);
      setActualizacion(prev => prev + 1);


    } catch (error) {
      toast.error("Error al enviar los datos.");
      console.error("Error en la solicitud:", error);
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
    const url = `http://66.240.210.125:8586/api/preplan/delete/?empresa=${encodeURIComponent(selectedEmpresa)}&fecha=${fecact}&usuario=movilbus`;
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
        toast.success('Carga eliminada correctamente.');
        setActualizacion((prev) => prev + 1);
      } else {
        toast.error('Error al eliminar la carga.');
      }
    } catch (error) {
      console.error('Error al eliminar la carga:', error);
      toast.error('Error al eliminar la carga.');
    }
  };

  const toggleContent = () => {
    setIsVisible((prev) => !prev);
  };

  useEffect(() => {
    setIsVisible(false);
  }, []);

  return (
    <div className="containerTep">
      <Toaster richColors />
      <div>
        <div className="cabecera">
          <div className="progressAndTitle">
            MÓDULO DE PLANIFICACIÓN DE SERVICIOS
            <ProgressBar value={porcentajeLlenado}></ProgressBar>
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
          <div id="contenido">
            <div className="fristFileT">
              <div className="cargaArchivos">
                <div className="relative flex items-center pb-2.5">
                  <span className="whitespace-nowrap text-gray-900">
                    Carga de Archivo
                  </span>
                  <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-stone-500 to-transparent"></div>
                </div>

                <div className="cabeceraArchivos">
                  <div>
                    <div className="p-0.4 mx-auto flex w-max min-w-[300px] items-center overflow-hidden rounded-md bg-[#ffffff] font-[sans-serif] text-[#333]">
                      <div className="flex px-4">
                        <FaFileExcel size={20} color="#307750" />
                        <p className="ml-3 text-sm">
                          {fileName || 'Ningún archivo seleccionado'}
                        </p>
                      </div>
                      <label
                        htmlFor="uploadExcel"
                        className="ml-auto block w-max cursor-pointer rounded-md bg-[#d62828] px-3 py-2.5 text-sm text-white outline-none hover:bg-gray-700"
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
                      value={selectedDate ? selectedDate.toISOString().split("T")[0] : ""}
                      onChange={(e) => {
                        const [year, month, day] = e.target.value.split("-");
                        const selectedDate = new Date(Number(year), Number(month) - 1, Number(day));
                        setSelectedDate(selectedDate);
                      }}
                        className="rounded-md border  p-2 focus:outline-none"
                      />
           
                  </div>

                  <div className="selectTipoA">
                    <select
                      className="block w-full max-w-xl rounded-lg border bg-gray-50 p-2.5 text-sm text-gray-900 focus:outline-none dark:border-stone-200 dark:bg-stone-50 dark:text-black dark:placeholder-gray-400"
                      value={selectedEmpresa}
                      onChange={(event) =>
                        setSelectedEmpresa(event.target.value)
                      }
                    >
                      <option value="" disabled>
                        Selecciona el tipo de Archivo
                      </option>

                      {tiposArchivos.map((tipo, index) => (
                        <option key={index} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
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

                    <Button color="danger" onClick={handleDeleteCarga}>
                      <MdDelete size={20} />
                      Eliminar Carga
                    </Button>
                  </div>
                </div>
              </div>

              <div className="cargaArchivos">
              <div className="relative flex items-center pb-2.5">
                  <span className="whitespace-nowrap text-gray-900">
                    Obtener Datos
                  </span>
                  <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-stone-500 to-transparent"></div>
                </div>

                <div className="cabeceraArchivos">
                  <div className="selectTipoA">
                    <select
                      id="countries"
                      className="block w-full rounded-lg border bg-gray-50 p-2.5 text-sm text-gray-900 focus:outline-none dark:border-stone-200 dark:bg-stone-50 dark:text-black dark:placeholder-gray-400"
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
                    <Button
                      color="primary"
                      onClick={() => {
                        setEmpresaConfirmada(empresaSeleccionada);
                        onOpen();
                      }}
                    >
                      Obtener
                      <IoSendSharp />
                    </Button>
                    <Button
                      color="success"
                      onClick={() => {
                        guardar();
                        alertaGuardar();
                      }}
                    >
                      Guardar
                      <IoSave color="#212529" />
                    </Button>
                    <ModalObtenerServicios
                      isOpen={isOpen}
                      onOpenChange={onOpenChange}
                      onRespuesta={manejarRespuestaModal} // Pasamos la función para manejar la respuesta del modal
                    />
                    <Button color="primary" onPress={handlePublicar}
                    >Publicar</Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="fristFileT">
              <div className="cargaArchivos">
                <div className="filtrosPlanificacion">
                <div className="relative flex items-center pb-2.5">
                  <span className="whitespace-nowrap text-gray-900">
                    Filtrar Datos
                  </span>
                  <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-stone-500 to-transparent"></div>
                </div>

                  <div className="cabeceraArchivos">
                    <div className="inputFiltros">
                      <select
                        onChange={handleFiltrar}
                        id="countries"
                        className="block w-full rounded-lg border bg-gray-50 p-2.5 text-sm text-gray-900 focus:outline-none dark:border-stone-200 dark:bg-stone-50 dark:text-black dark:placeholder-gray-400"
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
                        className="rounded-lg border-gray-200 px-4 py-2.5 text-sm disabled:pointer-events-none disabled:opacity-50 dark:bg-[#fff] dark:text-neutral-900 dark:placeholder-neutral-900 dark:focus:ring-neutral-600"
                        placeholder="Nombre del pasajero"
                        style={{ borderRadius: '0.5rem', width: '280px' }}
                        value={nombrePasajero}
                        onChange={(e) => setNombrePasajero(e.target.value)}
                      />
                    </div>

                    <Button
                      color={modoVista === 'Eliminados' ? 'danger' : 'success'}
                      onClick={alternarEstado}
                    >
                      {modoVista}{' '}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="cargaArchivos">
                <div className="InfoReportes">
                  <div className="z-50 flex w-60 flex-col gap-2 text-[10px] sm:w-40 sm:text-xs">
                    <div className="succsess-alert flex h-12 w-full cursor-default items-center justify-between rounded-lg bg-[#fff] px-[10px] sm:h-14">
                      <div className="flex gap-2">
                        <div className="rounded-lg bg-white/5 p-1 text-[#2b9875] backdrop-blur-xl">
                          <MdHomeRepairService size={20} />
                        </div>
                        <div>
                          <p className="text-black">Total Servicios</p>
                          <p className="text-gray-800">
                            {datosServicios.totalGrupos}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="z-50 flex w-60 flex-col gap-2 text-[10px] sm:w-40 sm:text-xs">
                    <div className="succsess-alert flex h-12 w-full cursor-default items-center justify-between rounded-lg bg-[#fff] px-[10px] sm:h-14">
                      <div className="flex gap-2">
                        <div className="rounded-lg bg-white/5 p-1 text-[#2b9875] backdrop-blur-xl">
                          <FaUsers size={20} />
                        </div>
                        <div>
                          <p className="text-black">Total Pasajeros</p>
                          <p className="text-gray-800">
                            {datosServicios.totalPasajeros}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>{' '}
              </div>
            </div>
          </div>
        )}
      </div>

      <div></div>
      {excelData.length > 0 && (
        <div style={{ overflow: 'auto', height: '70vh' }}>
          <h3>Datos del archivo:</h3>
          <p></p>
          <table className="table-auto border-collapse border border-gray-400">
            <tbody>
              {excelData.map((row, index) => (
                <tr key={index}>
                  <td className="border border-gray-400 px-4 py-2">
                    {row.CodigoOracle}
                  </td>
                  <td className="border border-gray-400 px-4 py-2">
                    {row.Nombre}
                  </td>
                  <td className="border border-gray-400 px-4 py-2">
                    {row.Subarea}
                  </td>
                  <td className="border border-gray-400 px-4 py-2">
                    {row.Area}
                  </td>
                  <td className="border border-gray-400 px-4 py-2">
                    {row.Rol}
                  </td>
                  <td className="border border-gray-400 px-4 py-2">
                    {row.Empresa}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="grupoServicios">
        {empresaConfirmada && dato && (
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
          />
        )}

        <p>el dato {dato}</p>
      </div>
    </div>
  );
}
