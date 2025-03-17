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
  const [isOpenA, setIsOpenA] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null); // 🔹 Definir el tipo correctamente

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

  const formatData = (rawData: any[]) => {
    return rawData.map((item: any) => {
      const { estado, color } = getEstadoYColor(item);
      return {
        key: item.codservicio,
        area: item.area,
        numero: item.numero,
        tipo: item.tipo,
        empresa: item.empresa,
        grupo: item.nomgrupo || 'NINGUNO',
        horaProg: item.fecplan ? item.fecplan.split(' ')[1] : '-',
        horaAto: item.fecha ? item.fecha.split(' ')[1] : '-',
        controlAto: item.newfechafni ? item.newfechafni.split(' ')[1] : '-',
        unidad: item.unidad?.codunidad || '-',
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
  }, [selectedPasajeroCodlan, selectedDate, refreshFlag]);

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
  }, [selectedPasajeroCodlan, selectedDate, refreshFlag]);

  useEffect(() => {
    setSelectedKeys([]);
    onSelectionChange([]);
  }, [selectedDate]);

  const filteredData = useMemo(() => {
    return data.filter(
      (item) =>
        (selectedArea ? item.area === selectedArea : true) &&
        (selectedEmpresa ? item.empresa === selectedEmpresa : true) &&
        (selecteServicio ? item.tipo === selecteServicio : true) &&
        (selecteNumServicio ? item.numero === selecteNumServicio : true) &&
        (selectedUnidad
          ? item.unidad.toLowerCase() === selectedUnidad.toLowerCase()
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
                              15/03/2025 00:25 - REPARTO (8) - DELTA
                            </p>
                          </div>
                          <div className="grid grid-cols-5 items-center border-b border-gray-300 p-2">
                            <p className="font-semibold">Programación:</p>
                            <p className="col-span-3">
                              15/03/2025 00:25 - RIVERA ROSALES HUGO FRANCISCO -
                              S110
                            </p>
                          </div>

                          <div className="grid grid-cols-5 items-center gap-2 border-b border-gray-300 p-2">
                            <p className="col-span-1 font-semibold">
                              Asignación:
                            </p>
                            <input
                              type="text"
                              placeholder="Escriba el nombre del conductor (mínimo 4 dígitos)"
                              className="col-span-2 rounded border p-2"
                            />
                            <input
                              type="text"
                              placeholder="Escriba la unidad (mínimo 3 dígitos)"
                              className="col-span-1 rounded border p-2"
                            />
                            <button className="w- rounded-md bg-blue-500 px-2 py-2 text-white">
                              Asignar Servicio
                            </button>
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
                      <div className="flex w-1/6 flex-col items-center justify-center rounded-lg bg-green-200 p-3 text-center">
                        <p className="text-lg font-bold">FA</p>
                        <p className="text-xl font-bold">15/03/2025 01:43</p>
                        <button className="mt-2 rounded-md bg-blue-500 px-4 py-2 text-white">
                          Opciones Servicio
                        </button>
                      </div>
                    </div>

                    {/* Table & Map */}
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {/* Table */}
                      <div className="rounded-lg bg-white p-4 shadow-md">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-200">
                              <th className="border p-2">Orden</th>
                              <th className="border p-2">Area</th>
                              <th className="border p-2">Nombre</th>
                              <th className="border p-2">Direccion</th>
                              <th className="border p-2">Distrito</th>
                              <th className="border p-2">Orden</th>
                              <th className="border p-2">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border">
                              <td className="border p-2">
                                <div
                                  className="relative flex items-center gap-2"
                                  ref={dropdownRef}
                                >
                                  <span>1</span>
                                  <button
                                    className="rounded bg-blue-200 p-1 hover:bg-gray-300"
                                    onClick={() => setIsOpenA(!isOpenA)}
                                  >
                                    <BsArrowDownSquareFill
                                      color="#0353a4"
                                      size={20}
                                    />
                                  </button>
                                  {isOpenA && (
                                    <div className="lefth-0 absolute top-8 z-10 w-40 rounded-md border bg-white shadow-lg">
                                      <ul className="text-sm">
                                        <li
                                          className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                          onClick={() => setIsOpenA(false)}
                                        >
                                          New file
                                        </li>
                                        <li
                                          className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                          onClick={() => setIsOpenA(false)}
                                        >
                                          Copy link
                                        </li>
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="border p-2">1</td>
                              <td className="border p-2">delta</td>
                              <td className="border p-2">
                                YANEYZA VENTE / 926972077
                              </td>
                              <td className="border p-2">
                                Pasaje San Martin Mz. P Lote 17
                              </td>
                              <td className="border p-2">CALLAO</td>
                              <td className="border p-2">CALLAO</td>

                              <td className="border p-2">NA</td>
                            </tr>
                            <tr className="border">
                              <td className="border p-2">2</td>
                              <td className="border p-2">delta</td>
                              <td className="border p-2">Max Raffo Velarde</td>
                              <td className="border p-2">
                                Calle la Habana 121 dep 102
                              </td>
                              <td className="border p-2">San Isidro</td>
                              <td className="border p-2">CALLAO</td>
                              <td className="border p-2">NA</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-center rounded-lg bg-white p-4 shadow-md">
                        <p className="text-gray-500">[Mapa aquí]</p>
                      </div>
                    </div>

                    <div className="mt-6 flex">
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
