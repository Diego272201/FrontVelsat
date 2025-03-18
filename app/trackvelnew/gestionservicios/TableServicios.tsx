import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  getKeyValue,
  Selection,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from '@nextui-org/react';
import axios from 'axios';
import { toast } from 'sonner';
import { BsArrowDownSquareFill } from 'react-icons/bs';
import { FaCar, FaUserTie } from 'react-icons/fa';
import Swal from 'sweetalert2';
import TableDraw from './TableDraw';
import Mapa from '@/app/components/Mapa';
import DragAndDropTable from './TableDraw';

const getFormattedDate = () => {
  const peruTime = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }),
  );

  const year = peruTime.getFullYear();
  const month = String(peruTime.getMonth() + 1).padStart(2, '0');
  const day = String(peruTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseFecha = (fechaStr: string | null) => {
  if (!fechaStr) return null;
  const [dia, mes, añoHora] = fechaStr.split('/');
  const [año, hora] = añoHora.split(' ');
  return new Date(`${año}-${mes}-${dia}T${hora}:00`).getTime();
};

const getEstadoYColor = (item: any) => {
  const fechaActual = new Date().getTime();
  const fechaProg = parseFecha(item.fecplan);
  const fechaInicio = parseFecha(item.newfechaini);
  const fechaFin = parseFecha(item.newfechafni);
  const fechaATO = parseFecha(item.fecha);

  if (!fechaProg) return { estado: 'ERROR', color: '#C9CECD' };
  if (item.estado === 'C') return { estado: 'CN', color: '#E5AFEF' };

  let estado = 'AS';
  let color = '#AFD5EF';

  if (!item.unidad?.codunidad) {
    estado = 'NA';
    color = '#FDBDAA';
  } else {
    // 🚨 Verificamos si ya pasó la fecha programada pero no ha iniciado
    if (fechaActual > fechaProg && !fechaInicio) {
      estado = 'NI';
      color = '#868887';
    }

    // Si el servicio ha finalizado
    if (fechaFin && fechaATO) {
      const diferenciaFin = fechaFin - fechaATO;
      if (item.tipo === 'I') {
        estado = diferenciaFin > 60000 ? 'FT' : 'FA';
        color = diferenciaFin > 60000 ? '#FAFAAD' : '#CFFBAC';
      } else {
        estado = 'FA';
        color = '#CFFBAC';
      }
    }

    // Si el servicio está en proceso
    if (fechaInicio && !fechaFin) {
      if (fechaATO) {
        const diferencia = fechaActual - fechaATO;
        if (item.tipo === 'I' || item.tipo === 'S') {
          estado = diferencia < 7200000 ? 'PR' : 'PR';
          color = '#EBF9F8';
        }
      }
    }
  }

  return { estado, color };
};

const columns = [
  { key: 'select', label: '' },
  { key: 'area', label: 'Área' },
  { key: 'numero', label: 'Número' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'empresa', label: 'Empresa' },
  { key: 'grupo', label: 'Grupo Turismo' },
  { key: 'horaProg', label: 'Hora Prog.' },
  { key: 'horaAto', label: 'Hora ATO' },
  { key: 'controlAto', label: 'Control ATO' },
  { key: 'unidad', label: 'Unidad' },
  { key: 'conductor', label: 'Conductor' },
  { key: 'estado', label: 'Estado' },
];

export default function App({
  isVisible,
  isVisibleAsignar,
  selectedArea,
  selectedEmpresa,
  selecteServicio,
  selecteNumServicio,
  selectedUnidad,
  selectedPasajeroCodlan,
  onSelectionChange,
  selectedDate,
  refreshFlag,
}: {
  isVisible: boolean;
  isVisibleAsignar: boolean;
  selectedArea: string;
  selectedEmpresa: string;
  selecteServicio: string;
  selecteNumServicio: string;
  selectedUnidad: string | null;
  selectedPasajeroCodlan: string | null;
  onSelectionChange: (selected: string[]) => void;
  selectedDate: string | null;
  refreshFlag: boolean;
}) {
  const [coordenadas, setCoordenadas] = useState<
    { lat: number; lng: number }[]
  >([]);

  const [isOpenA, setIsOpenA] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isOpenD, setIsOpenD] = useState(false);

  // Detecta clics fuera del dropdown y lo cierra
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpenA(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [refreshFlagDelete, setRefreshFlagDelete] = useState(false);

  const [page, setPage] = useState(1);

  const [rowsPerPage, setRowsPerPage] = useState(13);

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const handleCheckboxClick = (key: string) => {
    setSelectedKeys((prevKeys) => {
      const isSelected = prevKeys.includes(key);
      const newKeys = isSelected
        ? prevKeys.filter((k) => k !== key)
        : [...prevKeys, key];

      onSelectionChange(newKeys);
      return newKeys;
    });
  };

  useEffect(() => {
    console.log('Registros seleccionados:', selectedKeys);
  }, [selectedKeys]);

  useEffect(() => {
    console.log('isVisible:', isVisible, 'isVisibleAsignar:', isVisibleAsignar);

    const updateRowsPerPage = () => {
      const windowHeight = window.innerHeight;
      let headerHeight = 120; // Altura base

      if (isVisible && isVisibleAsignar) {
        headerHeight += 300; // Ambos activos, más espacio ocupado
      } else if (isVisible) {
        headerHeight += 250; // Solo `isVisible` activo
      } else if (isVisibleAsignar) {
        headerHeight += 150; // Solo `isVisibleAsignar` activo
      }

      const rowHeight = 48;
      const availableHeight = windowHeight - headerHeight;
      let calculatedRows = Math.floor(availableHeight / rowHeight);

      if (!isVisible && !isVisibleAsignar) {
        calculatedRows -= 1;
      }

      // Asegurar un mínimo de 5 filas
      setRowsPerPage(calculatedRows > 5 ? calculatedRows : 5);
    };

    updateRowsPerPage(); // Llamar al inicio

    window.addEventListener('resize', updateRowsPerPage);
    return () => window.removeEventListener('resize', updateRowsPerPage);
  }, [isVisible, isVisibleAsignar]);

  useEffect(() => {
    console.log('Nuevo rowsPerPage:', rowsPerPage);
  }, [rowsPerPage]);

  const [errorPasajero, setErrorPasajero] = useState<string | null>(null);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [selectedRow, setSelectedRow] = useState<any>(null);

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

  const [unidadA, setUnidadA] = useState('');
  const [unidadesA, setUnidadesA] = useState<
    { id: number; codunidad: string }[]
  >([]);
  const [showDropdownUnidadA, setShowDropdownUnidadA] = useState(false);

  const [unidadSeleccionadaA, setUnidadSeleccionadaA] = useState<string | null>(
    null,
  );

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
        setUnidadesA(response.data);
      } catch (error) {
        console.error('Error al obtener unidades:', error);
      }
    };

    fetchUnidades();
  }, []);

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
  const formatData = (rawData: any[]) => {
    return rawData.map((item: any) => {
      const { estado, color } = getEstadoYColor(item);
      const numpax = item.numpax ? parseInt(item.numpax, 10) - 1 : 0;
      return {
        key: item.codservicio,
        codServicio: item.codservicio,
        area: item.area,
        numero: item.numero,
        tipo:
          item.tipo === 'S'
            ? 'REPARTO'
            : item.tipo === 'I'
              ? 'RECOJO'
              : item.tipo,
        empresa: `${item.empresa} (${numpax})`,
        grupo: item.nomgrupo || 'NINGUNO',
        horaProg: item.fecplan ? item.fecplan.split(' ')[1] : '-',
        horaAto: item.fecha ? item.fecha.split(' ')[1] : '-',
        fechaCompleta: item.fecha || '-',
        fecPlanCompleta: item.fecplan || '-',
        empresaSinNumber: item.empresa,
        controlAto: item.newfechafni ? item.newfechafni.split(' ')[1] : '-',
        fechafin: item.newfechafni || '---',
        unidad: item.unidad?.codunidad
          ? item.unidad.codunidad.split('-')[0]
          : '-',
        conductor: item.conductor?.apepate || '-',
        estado,
        color,
      };
    });
  };

  const handleRowClick = (row: any) => {
    setSelectedRow(row);
    onOpen();
  };

  useEffect(() => {
    if (selectedPasajeroCodlan) return;

    const fetchData = async () => {
      const currentDate = selectedDate || getFormattedDate();

      const API_URL = `http://66.240.210.125:8586/api/Preplan/Getservicios?fecha=${currentDate}&usu=movilbus`;

      try {
        const response = await axios.get(API_URL);
        setData(formatData(response.data));
      } catch (error) {
        console.error('Error al obtener los datos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPasajeroCodlan, selectedDate, refreshFlag, refreshFlagDelete]);

  useEffect(() => {
    console.log('Datos formateados en data:', data);
  }, [data]);

  useEffect(() => {
    if (!selectedPasajeroCodlan) return;

    const fetchPasajeroData = async () => {
      const currentDate = selectedDate || getFormattedDate();

      const API_URL = `http://66.240.210.125:8586/api/Preplan/GetServicioPasajero?usuario=movilbus&fec=${currentDate}&codcliente=${selectedPasajeroCodlan}`;

      setLoading(true);
      setErrorPasajero(null);

      try {
        const response = await axios.get(API_URL);

        setData(formatData(response.data));
      } catch (error) {
        toast.error('No hay datos para ese pasajero.');

        console.error('Error al obtener datos del pasajero:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPasajeroData();
  }, [selectedPasajeroCodlan, selectedDate, refreshFlag, refreshFlagDelete]);

  useEffect(() => {
    setSelectedKeys([]);
    onSelectionChange([]);
  }, [selectedDate]);

  const filteredData = useMemo(() => {
    const unidadLimpia = selectedUnidad ? selectedUnidad.split('-')[0] : null;

    return data.filter(
      (item) =>
        (selectedArea ? item.area === selectedArea : true) &&
        (selectedEmpresa ? item.empresa === selectedEmpresa : true) &&
        (selecteServicio ? item.tipo === selecteServicio : true) &&
        (selecteNumServicio ? item.numero === selecteNumServicio : true) &&
        (unidadLimpia
          ? item.unidad.toLowerCase() === unidadLimpia.toLowerCase()
          : true),
    );
  }, [
    data,
    selectedArea,
    selectedEmpresa,
    selecteServicio,
    selecteNumServicio,
    selectedUnidad,
  ]);

  const pages = Math.ceil(filteredData.length / rowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredData.slice(start, end);
  }, [page, filteredData, rowsPerPage]);

  useEffect(() => {
    console.log(
      'Nuevo valor de conductorSeleccionado Modal:',
      conductorSeleccionado,
    );
  }, [conductorSeleccionado]);

  useEffect(() => {
    console.log(
      'Nuevo valor de UnidadSeleccionado Modal:',
      unidadSeleccionadaA,
    );
  }, [unidadSeleccionadaA]);

  const asignarServicios = async () => {
    if (!conductorSeleccionado || !unidadSeleccionadaA || !selectedRow) {
      toast.error('Debe seleccionar un servicio, un conductor y una unidad.');
      return;
    }

    const payload = [
      {
        codservicio: selectedRow.codServicio,
        conductor: { codigo: conductorSeleccionado },
        unidad: { codunidad: unidadSeleccionadaA },
      },
    ];

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

    const payload = [{ codservicio: selectedRow.codServicio }]; // 🔹 Corrección aquí

    try {
      await axios.delete(
        'http://66.240.210.125:8586/api/Preplan/eliminacionmultiple',
        {
          data: payload,
        },
      );

      toast.success('Eliminado con éxito.');
      setRefreshFlagDelete((prev) => !prev);
    } catch (error) {
      toast.error('Error al eliminar el servicio.');
      console.error('Error en la eliminación:', error);
    }
  };

  return (
    <div>
      {loading ? (
        <p>Cargando datos...</p>
      ) : (
        <Table
          aria-label="Tabla de servicios con paginación"
          selectionMode="single"
          bottomContent={
            <div className="flex w-full justify-center">
              <Pagination
                isCompact
                showControls
                showShadow
                color="warning"
                page={page}
                total={pages}
                onChange={setPage}
              />
            </div>
          }
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn
                className="uppercase text-[#212529]"
                key={column.key}
              >
                {column.label}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody items={items}>
            {(item) => (
              <TableRow
                key={item.key}
                style={{ backgroundColor: item.color }}
                onClick={() => handleRowClick(item)}
              >
                {(columnKey) =>
                  columnKey === 'select' ? (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 rounded text-blue-600"
                        onClick={() => handleCheckboxClick(item.key)}
                        defaultChecked={selectedKeys.includes(item.key)}
                      />
                    </TableCell>
                  ) : (
                    <TableCell>{item[columnKey]}</TableCell>
                  )
                }
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className="w-[90%] max-w-none"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Detalles del Servicio</ModalHeader>
              <ModalBody>
                {selectedRow ? (
                  <div className="bg-gray-100 p-4">
                    {/* Service Header */}
                    <div className="flex rounded-lg bg-white p-4 shadow-md">
                      <div className="mr-4 flex-1">
                        <h2 className="text-center text-lg font-semibold">
                          Ficha Servicio
                        </h2>
                        <div className="mt-2 border border-gray-300">
                          <div className="grid grid-cols-5 items-center border-b border-gray-300 p-2">
                            <p className="font-semibold">Servicio:</p>
                            <p className="col-span-3">
                              {selectedRow?.fechaCompleta} - {selectedRow.tipo}{' '}
                              ({selectedRow.numero}) -{' '}
                              {selectedRow.empresaSinNumber}
                            </p>
                          </div>
                          <div className="grid grid-cols-5 items-center border-b border-gray-300 p-2">
                            <p className="font-semibold">Programación:</p>
                            <p className="col-span-3">
                              {selectedRow?.fecPlanCompleta} -{' '}
                              {selectedRow.conductor} -{selectedRow.unidad}
                            </p>
                          </div>

                          <div className="grid grid-cols-5 items-center gap-2 border-b border-gray-300 p-2">
                            <p className="col-span-1 font-semibold">
                              Asignación:
                            </p>

                            <div className="relative col-span-2">
                              <input
                                type="text"
                                className="peer block w-full rounded-lg border-transparent bg-gray-100 px-16 py-2 ps-11 text-sm placeholder-zinc-500 disabled:pointer-events-none disabled:opacity-50"
                                placeholder="Escriba el Nombre del Conductor"
                                value={conductor}
                                onChange={handleConductorChange}
                                onFocus={() => setShowDropdown(true)}
                                onBlur={() =>
                                  setTimeout(() => setShowDropdown(false), 200)
                                }
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
                                        handleSelectConductor(
                                          c.codigo,
                                          c.apepate,
                                        )
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
                                className="peer block w-full rounded-lg border-transparent bg-gray-100 px-4 py-2 ps-11 text-sm placeholder-zinc-500 disabled:pointer-events-none disabled:opacity-50"
                                placeholder="Escriba Unidad"
                                value={unidadA}
                                onChange={handleUnidadAChange}
                                onFocus={() => setShowDropdownUnidadA(true)}
                                onBlur={() =>
                                  setTimeout(
                                    () => setShowDropdownUnidadA(false),
                                    200,
                                  )
                                }
                              />
                              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 peer-disabled:pointer-events-none peer-disabled:opacity-50">
                                <FaCar color="#343a40" />
                              </div>

                              {showDropdownUnidadA &&
                                filteredUnidadesA.length > 0 && (
                                  <ul className="fixed z-[9999] mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                                    {filteredUnidadesA.map((unidad) => (
                                      <li
                                        key={unidad.id}
                                        className="cursor-pointer px-4 py-2 hover:bg-gray-200"
                                        onClick={() =>
                                          handleSelectUnidadA(unidad.codunidad)
                                        }
                                      >
                                        {unidad.codunidad}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={asignarServicios}
                                className="w-96 rounded-md bg-blue-500 px-2 py-2 text-white transition-all duration-300 hover:bg-blue-400 hover:shadow-md active:scale-95 active:bg-blue-700"
                              >
                                Asignar Servicio
                              </button>

                              <button
                                onClick={eliminarServicio}
                                className="w-full rounded-md bg-red-600 px-2 py-2 text-white transition-all duration-300 hover:bg-red-500 hover:shadow-md active:scale-95 active:bg-red-700"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-5 items-center gap-2 p-2">
                            <p className="font-semibold">Modificar Servicio:</p>
                            <input
                              type="text"
                              placeholder="Ingrese Nombre Pasajero"
                              className="col-span-1 rounded border bg-gray-200 p-2"
                              disabled
                            />
                            <input
                              type="text"
                              placeholder="Hora Atención"
                              className="col-span-1 rounded border bg-gray-200 p-2"
                              disabled
                            />
                            <input
                              type="text"
                              placeholder="Nueva Hora Ato"
                              className="col-span-1 rounded border bg-gray-200 p-2"
                              disabled
                            />
                            <button className="rounded-md bg-gray-500 px-4 py-2 text-white">
                              Agregar
                            </button>
                          </div>
                        </div>
                      </div>
                      <div
                        className="rounded-lgp-3 flex w-1/6 flex-col items-center justify-center text-center"
                        style={{ backgroundColor: selectedRow.color }}
                      >
                        <p className="text-lg font-bold">
                          {selectedRow.estado}
                        </p>
                        <p className="text-xl font-bold">
                          {' '}
                          {selectedRow.fechafin}
                        </p>
                        <div className="relative mt-2 inline-block text-left">
                          <button
                            onClick={() => setIsOpenD(!isOpenD)}
                            className="flex w-48 items-center justify-between rounded-md bg-blue-500 px-4 py-2 text-white transition-all hover:bg-blue-600 active:bg-blue-700"
                          >
                            Opciones Servicio ▼
                          </button>

                          {isOpenD && (
                            <div className="absolute z-10 mt-2 w-48 rounded-md border border-gray-300 bg-white shadow-lg">
                              <ul className="py-1">
                                <li
                                  className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                  onClick={() => alert('Cancelar Servicio')}
                                >
                                  Cancelar Servicio
                                </li>
                                <li
                                  className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                  onClick={() => alert('Cancelar Asignación')}
                                >
                                  Cancelar Asignación
                                </li>
                                <li
                                  className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                  onClick={() => alert('Modificar Servicio')}
                                >
                                  Modificar Servicio
                                </li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Table & Map */}
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {/* Table */}
                      <div>
                        <TableDraw
                          codServicio={selectedRow.codServicio}
                          onCoordenadasUpdate={setCoordenadas}
                        ></TableDraw>
                      </div>

                      <div>
                        <Mapa
                          recorrido={coordenadas}
                          marcadores={coordenadas}
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex">
                      <p>
                        <strong>CodServicio:</strong> {selectedRow.codServicio}
                      </p>
                      <p>
                        <strong>Área:</strong> {selectedRow.area}
                      </p>
                      <p>
                        <strong>Número:</strong> {selectedRow.numero}
                      </p>
                      <p>
                        <strong>Tipo:</strong> {selectedRow.tipo}
                      </p>
                      <p>
                        <strong>Empresa:</strong> {selectedRow.empresa}
                      </p>
                      <p>
                        <strong>Grupo:</strong> {selectedRow.grupo}
                      </p>
                      <p>
                        <strong>Hora Programada:</strong> {selectedRow.horaProg}
                      </p>
                      <p>
                        <strong>Hora ATO:</strong> {selectedRow.horaAto}
                      </p>
                      <p>
                        <strong>Control ATO:</strong> {selectedRow.controlAto}
                      </p>
                      <p>
                        <strong>Unidad:</strong> {selectedRow.unidad}
                      </p>
                      <p>
                        <strong>Conductor:</strong> {selectedRow.conductor}
                      </p>
                      <p>
                        <strong>Estado:</strong> {selectedRow.estado}
                      </p>
                      <p>Fecha completa: {selectedRow?.fechaCompleta}</p>
                      <p>Fecha Fin: {selectedRow?.fechafin}</p>
                    </div>
                  </div>
                ) : (
                  <p>No hay datos seleccionados</p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="success" onPress={onClose}>
                  Guardar
                </Button>
                <Button color="danger" onPress={onClose}>
                  Cerrar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
