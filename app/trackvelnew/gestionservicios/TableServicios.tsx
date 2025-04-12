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
import { FaCar, FaUser, FaUserTie } from 'react-icons/fa';
import Swal from 'sweetalert2';
import TableDraw from './TableDraw';
import Mapa from '@/app/components/Mapa';
import SeguirUnidad from '@/app/request/seguirUnidad';
import { getEstadoYColor, getEstadoYColorVerifica } from './ObtenerEstadoColor';

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

  try {
    const fecha = new Date(fechaStr);

    if (isNaN(fecha.getTime())) {
      console.error('Fecha inválida:', fechaStr);
      return null;
    }

    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');

    return `${dia}/${mes}/${año} ${horas}:${minutos}`;
  } catch (error) {
    console.error('Error al parsear la fecha:', error);
    return null;
  }
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
  refreshFlagServicio,
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
  refreshFlagServicio: boolean;
}) {
  const [coordenadas, setCoordenadas] = useState<
    { lat: number; lng: number }[]
  >([]);

  const [centroMapa, setCentroMapa] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // const [isOpenA, setIsOpenA] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [isOpenD, setIsOpenD] = useState(false);

  const handleModificarServicio = () => {
    setIsEditing(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpenD(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClickOption = (callback: any) => {
    callback();
    setIsOpenD(false);
  };

  const [recorrido, setRecorrido] = useState<{ lat: number; lng: number }[]>(
    [],
  );

  const tableRef = useRef<{ actualizarOrdenEnServidor: () => void } | null>(
    null,
  );

  const [refreshFlagAsignar, setRefreshFlagAsignar] = useState(false);

  const handleCenterUpdate = (coords: { lat: number; lng: number }) => {
    setCentroMapa(coords);
  };

  // // Detecta clics fuera del dropdown y lo cierra
  // useEffect(() => {
  //   function handleClickOutside(event: MouseEvent) {
  //     if (
  //       dropdownRef.current &&
  //       !dropdownRef.current.contains(event.target as Node)
  //     ) {
  //       setIsOpenA(false);
  //     }
  //   }
  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside);
  //   };
  // }, []);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [refreshFlagDelete, setRefreshFlagDelete] = useState(false);

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

  const [errorPasajero, setErrorPasajero] = useState<string | null>(null);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [previousSelectedCod, setPreviousSelectedCod] = useState<string | null>(
    null,
  );

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

  const [pasajero, setPasajero] = useState('');

  const [sugerencias, setSugerencias] = useState<
    {
      apepate: string;
      codigo: string;
      codlugar: number;
      direccion: string;
      distrito: string;
      wx: string;
      wy: string;
    }[]
  >([]);

  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [seleccionado, setSeleccionado] = useState(false);

  const seleccionarPasajero = (
    nombre: string,
    codigo: string,
    codlugar: number,
    direccion: string,
    distrito: string,
    wx: string,
    wy: string,
  ) => {
    console.log('Pasajero seleccionado:', nombre, 'Código:', codigo);
    console.log(
      'Lugar:',
      'CodLugar:',
      codlugar,
      'Dirección:',
      direccion,
      'Distrito:',
      distrito,
      'Latitud',
      wx,
      'Longitud',
      wy,
    );

    setPasajero(nombre);
    setSugerencias([]);
    setMostrarSugerencias(false);
    setSeleccionado(true);
  };

  useEffect(() => {
    const fetchPasajeros = async () => {
      if (pasajero.length < 1) {
        setSugerencias([]);
        return;
      }

      try {
        const response = await axios.get(
          `https://66.240.210.125:8586/api/Preplan/GetPasajeros?palabra=${pasajero}`,
        );

        const resultados = response.data.map((item: any) => ({
          apepate: item.apepate,
          codigo: item.codigo,
          codlugar: item.lugar?.codlugar || 0,
          direccion: item.lugar?.direccion || 'No disponible',
          distrito: item.lugar?.distrito || 'No disponible',
          wx: item.lugar?.wx || '',
          wy: item.lugar?.wy || '',
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
  }, [pasajero, seleccionado]);

  const [horaAtencion, setHoraAtencion] = useState('');
  const [horaAto, setHoraAto] = useState('');

  const [horaAtencionFinal, setHoraAtencionFinal] = useState<string>(''); // Inicializamos con ""
  const [horaAtoFinal, setHoraAtoFinal] = useState<string>('');

  useEffect(() => {
    setIsEditing(false);
    setHoraAtencion('');
    setHoraAto('');
    setPasajero(''); // Limpiar el input del pasajero
    setSugerencias([]); // Limpiar las sugerencias si es necesario
    setSeleccionado(false); // Resetear el estado de selección
  }, [selectedRow]);

  const [dataSeleccionada, setDataSeleccionada] = useState<
    {
      nombre: string;
      codigo: string;
      codlugar: number;
      direccion: string;
      distrito: string;
      horaAtencion: string;
      wx: string;
      wy: string;
    }[]
  >([]);

  const [agregarTrigger, setAgregarTrigger] = useState(0);

  const handleAgregar = () => {
    if (!pasajero || !horaAtencion || !horaAto) {
      toast.error('Faltan datos para agregar.');
      return;
    }

    const nuevaData = {
      nombre: pasajero,
      codigo:
        sugerencias.find((item) => item.apepate === pasajero)?.codigo || '',
      codlugar:
        sugerencias.find((item) => item.apepate === pasajero)?.codlugar || 0,
      direccion:
        sugerencias.find((item) => item.apepate === pasajero)?.direccion ||
        'No disponible',
      distrito:
        sugerencias.find((item) => item.apepate === pasajero)?.distrito ||
        'No disponible',
      wx:
        sugerencias.find((item) => item.apepate === pasajero)?.wx ||
        'No disponible',
      wy:
        sugerencias.find((item) => item.apepate === pasajero)?.wy ||
        'No disponible',
      horaAtencion,
    };

    setDataSeleccionada([nuevaData]); // Reemplaza la data anterior
    setAgregarTrigger((prev) => prev + 1); // Cambia el trigger
    setHoraAtencionFinal(horaAtencion);
  };

  useEffect(() => {
    console.log('📌 dataSeleccionada actualizada:', dataSeleccionada);
  }, [dataSeleccionada]);

  useEffect(() => {
    const fetchConductores = async () => {
      try {
        const response = await axios.get(
          'https://66.240.210.125:8586/api/Preplan/conductores?usuario=movilbus',
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
          'https://66.240.210.125:8586/api/Preplan/unidades',
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
      const numpax =
        item.numpax && parseInt(item.numpax, 10) > 0
          ? parseInt(item.numpax, 10) - 1
          : 0;
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
        fechaini: item.newfechaini || '---',
        fechafin: item.newfechafni || '---',
        unidadSF: item.unidad?.codunidad,
        unidad: item.unidad?.codunidad
          ? item.unidad.codunidad.split('-')[0].charAt(0).toUpperCase() +
            item.unidad.codunidad.split('-')[0].slice(1)
          : '-',

        conductor: item.conductor?.apepate
          ? item.conductor.apepate.toUpperCase()
          : '-',
        estado,
        color,
      };
    });
  };

  // Sirve para actulizar los datos del modal al cambiar en opciones de servcio y llevarme al servcio que estana al incio

  // useEffect(() => {
  //   if (previousSelectedCod && data.length > 0) {
  //     const updatedRow = data.find((item) => item.codServicio === previousSelectedCod);
  //     if (updatedRow) {
  //       setSelectedRow({ ...updatedRow });
  //       setTimeout(() => {
  //         document.getElementById(`row-${previousSelectedCod}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  //       }, 100);
  //     }
  //   }
  // }, [data]);

  const handleRowClick = (row: any) => {
    setSelectedRow(row);
    setPreviousSelectedCod(row.codServicio);
    onOpen();
  };

  useEffect(() => {
    if (selectedPasajeroCodlan) return;

    const fetchData = async () => {
      setLoading(true);

      const currentDate = selectedDate || getFormattedDate();

      const API_URL = `https://66.240.210.125:8586/api/Preplan/Getservicios?fecha=${currentDate}&usu=movilbus`;

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
  }, [
    selectedPasajeroCodlan,
    selectedDate,
    refreshFlag,
    refreshFlagDelete,
    refreshFlagAsignar,
    refreshFlagServicio,
  ]);

  useEffect(() => {
    console.log('Datos formateados en data:', data);
  }, [data]);

  useEffect(() => {
    if (!selectedPasajeroCodlan) return;

    const fetchPasajeroData = async () => {
      const currentDate = selectedDate || getFormattedDate();

      const API_URL = `https://66.240.210.125:8586/api/Preplan/GetServicioPasajero?usuario=movilbus&fec=${currentDate}&codcliente=${selectedPasajeroCodlan}`;

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
  }, [
    selectedPasajeroCodlan,
    selectedDate,
    refreshFlag,
    refreshFlagDelete,
    refreshFlagServicio,
  ]);

  useEffect(() => {
    setSelectedKeys([]);
    onSelectionChange([]);
  }, [selectedDate]);

  useEffect(() => {
    console.log('Empresa es' + selectedEmpresa);
  }, [selectedEmpresa]);

  const filteredData = useMemo(() => {
    const unidadLimpia = selectedUnidad ? selectedUnidad.split('-')[0] : null;

    return data.filter((item) => {
      // Extraer solo el nombre de la empresa sin el (numpax)
      const empresaLimpia = item.empresa.split(' (')[0];

      return (
        (selectedArea ? item.area === selectedArea : true) &&
        (selectedEmpresa ? empresaLimpia === selectedEmpresa : true) &&
        (selecteServicio ? item.tipo === selecteServicio : true) &&
        (selecteNumServicio ? item.numero === selecteNumServicio : true) &&
        (unidadLimpia
          ? item.unidad.toLowerCase() === unidadLimpia.toLowerCase()
          : true)
      );
    });
  }, [
    data,
    selectedArea,
    selectedEmpresa,
    selecteServicio,
    selecteNumServicio,
    selectedUnidad,
  ]);

  const items = useMemo(() => {
    return filteredData;
  }, [filteredData]);

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
        'https://66.240.210.125:8586/api/Preplan/AsignarServicio',
        payload,
      );
      toast.success('Asignación realizada con éxito.');

      setRefreshFlagAsignar((prev) => !prev);
    } catch (error) {
      toast.error('Error al enviar la asignación.');
    }

    setConductor('');
    setUnidadA('');
  };

  const handleCancelarAsignacion = async (codServicio: string) => {
    try {
      await axios.put(
        `https://66.240.210.125:8586/api/Preplan/canasig/${codServicio}`,
      );

      setData((prevData) => {
        return prevData.map((item) => {
          if (item.codServicio === codServicio) {
            const updatedItem = { ...item, unidad: null, conductor: null };

            const { estado, color } = getEstadoYColorVerifica(updatedItem);
            return { ...updatedItem, estado, color };
          }
          return item;
        });
      });

      if (selectedRow?.codServicio === codServicio) {
        const updatedRow = {
          ...selectedRow,
          unidad: null,
          conductor: null,
          ...getEstadoYColorVerifica({
            ...selectedRow,
            unidad: null,
            conductor: null,
          }),
        };

        setSelectedRow(updatedRow);
      }

      toast.success('Asignación cancelada correctamente.');
    } catch (error) {
      toast.error('Error al cancelar la asignación.');
    }
  };

  const handleCancelarServicio = async (codServicio: string) => {
    try {
      await axios.delete(
        `https://66.240.210.125:8586/api/Preplan/cancelar/${codServicio}`,
      );

      setData((prevData) =>
        prevData.map((item) => {
          if (item.codServicio === codServicio) {
            const updatedItem = { ...item, estado: 'C' };
            const { estado, color } = getEstadoYColorVerifica(updatedItem); // Solo obtenemos el color

            return { ...updatedItem, color, estado };
          }
          return item;
        }),
      );

      if (selectedRow?.codServicio === codServicio) {
        const updatedRow = {
          ...selectedRow,
          ...getEstadoYColorVerifica({ ...selectedRow, estado: 'C' }),
        };

        setSelectedRow(updatedRow);
      }

      toast.success('Servicio cancelado correctamente.');
    } catch (error) {
      toast.error('Error al cancelar el servicio.');
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

    const payload = [{ codservicio: selectedRow.codServicio }];

    try {
      await axios.delete(
        'https://66.240.210.125:8586/api/Preplan/eliminacionmultiple',
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

  const formatFecha = (fechaStr: string | null | undefined) => {
    if (!fechaStr) return '';

    const [fecha, hora] = fechaStr.split(' ');
    if (!fecha || !hora) return '';

    const [dia, mes, año] = fecha.split('/');
    if (!dia || !mes || !año) return '';

    return `${año}-${mes}-${dia} ${hora}`;
  };

  useEffect(() => {
    console.log('❌ FECHAS', selectedRow?.fechaini, selectedRow?.fechafin);
    if (
      !selectedRow?.fechaini ||
      !selectedRow?.fechafin ||
      !selectedRow?.unidadSF
    ) {
      console.log('❌ No hay datos suficientes para llamar a la API');
      return;
    }

    setRecorrido([]);

    const fechaInicial = formatFecha(selectedRow?.fechaini);
    const fechaFinal = formatFecha(selectedRow?.fechafin);

    const API_URL = `https://66.240.210.125:8586/api/Reporting/details/${encodeURIComponent(fechaInicial)}/${encodeURIComponent(fechaFinal)}/${encodeURIComponent(selectedRow.unidadSF)}/movilbus`;

    console.log('🚀 Llamando a la API con URL:', API_URL);

    axios
      .get(API_URL)
      .then((response) => {
        console.log('✅ Respuesta de la API:', response.data);

        if (response.data.result) {
          const puntos = response.data.result.map((item: any) => ({
            lat: item.latitude,
            lng: item.longitude,
          }));
          setRecorrido(puntos);
        }
      })
      .catch((error) => console.error('❌ Error fetching route data:', error));
    return () => {
      setRecorrido([]);
    };
  }, [selectedRow?.fechaini, selectedRow?.fechafin, selectedRow?.unidadSF]);

  useEffect(() => {
    if (!isOpen) {
      setIsOpenD(false);
    }
  }, [isOpen]);

  const handleAgregarLimpiar = () => {
    setPasajero('');
    setHoraAtencion('');
  };

  const handleLimpiarAll = () => {
    setConductor('');
    setUnidadA('');
    setPasajero('');
    setHoraAtencion('');
    setHoraAto('');
  };

  const handleGuardarHoraAto = () => {
    setData((prevData) =>
      prevData.map((item) =>
        item.codServicio === selectedRow?.codServicio
          ? {
              ...item,
              horaAto: horaAto
                ? horaAto.split('T')[1].slice(0, 5)
                : item.horaAto,
              // Actualizar la fechaCompleta al formato YYYY-MM-DD HH:mm
              fechaCompleta: horaAto ? parseFecha(horaAto) : item.fechaCompleta,
            }
          : item,
      ),
    );
  };

  return (
    <div>
      {loading ? (
        <div
          className="overflow-auto rounded-lg border border-gray-300"
          style={{ height: `calc(100vh - ${isVisible ? 350 : 158}px)` }}
        >
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-gray-700">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-2 uppercase text-[#ffffff]"
                    style={{ fontSize: '12px', fontFamily: 'sans-serif' }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Skeleton de carga en filas */}
              {[...Array(5)].map((_, index) => (
                <tr key={index} className="border-t">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-2">
                      <div className="h-4 w-full animate-pulse rounded bg-slate-200"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="overflow-auto rounded-lg border border-gray-300"
          style={{ height: `calc(100vh - ${isVisible ? 265 : 110}px)` }}
        >
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-gray-700">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-2 uppercase text-[#ffffff]"
                    style={{ fontSize: '12px', fontFamily: 'sans-serif' }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="h-[50vh] py-4">
                    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-gray-600 bg-gradient-to-r from-gray-900 to-gray-700 p-6 text-center shadow-lg">
                      <svg
                        className="h-12 w-12 animate-pulse text-red-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="mt-4 animate-pulse text-lg font-semibold tracking-wide text-red-400">
                        No hay datos disponibles para esta fecha
                      </p>
                      <p className="mt-2 text-sm text-gray-400">
                        Por favor, selecciona otra fecha o intenta más tarde.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.key}
                    id={`row-${item.codServicio}`}
                    className="cursor-pointer border-t transition-colors duration-200 hover:!bg-gray-200"
                    style={{ backgroundColor: item.color }}
                    onClick={() => handleRowClick(item)}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="px-4 py-2"
                        style={{ fontSize: '12px' }}
                      >
                        {column.key === 'select' ? (
                          <input
                            type="checkbox"
                            className="form-checkbox h-4 w-4 rounded text-blue-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckboxClick(item.key);
                            }}
                            defaultChecked={selectedKeys.includes(item.key)}
                          />
                        ) : (
                          item[column.key]
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => {
          onOpenChange(); // Mantiene el comportamiento original
          if (!open) {
            handleLimpiarAll(); // Llama a handleLimpiarAll solo cuando se cierra
          }
        }}
        className="full max-w-none"
        scrollBehavior="inside"
      >
        <ModalContent style={{ marginTop: '80px' }}>
          {(onClose) => (
            <>
              <ModalBody>
                {selectedRow ? (
                  <div className="rounded-lg bg-gray-100 p-2">
                    {/* Service Header */}
                    <div
                      className="flex rounded-lg bg-white p-2 shadow-md"
                      style={{ fontSize: '13px' }}
                    >
                      <div className="mr-4 flex-1">
                        <h2 className="text-center text-lg font-semibold">
                          Ficha Servicio
                        </h2>

                        <div className="mt-2 border border-gray-300">
                          <div className="grid grid-cols-5 items-center border-b border-gray-300 p-2">
                            <p className="font-semibold">Servicio:</p>
                            <p className="col-span-3">
                              {horaAto
                                ? parseFecha(horaAto)
                                : selectedRow?.fechaCompleta}{' '}
                              - {selectedRow.tipo} ({selectedRow.numero}) -{' '}
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
                                className="peer block w-full rounded-lg border border-transparent bg-gray-100 px-16 py-1.5 ps-11 text-sm placeholder-zinc-500 focus:border-gray-300 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
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
                                className="peer block w-full rounded-lg border border-transparent bg-gray-100 px-16 py-1.5 ps-11 text-sm placeholder-zinc-500 focus:border-gray-300 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
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
                                className="w-96 rounded-md bg-blue-500 px-2 py-1.5 text-white transition-all duration-300 hover:bg-blue-400 hover:shadow-md active:scale-95 active:bg-blue-700"
                              >
                                Asignar Servicio
                              </button>

                              <button
                                onClick={eliminarServicio}
                                className="w-full rounded-md bg-red-600 px-2 py-1.5 text-white transition-all duration-300 hover:bg-red-500 hover:shadow-md active:scale-95 active:bg-red-700"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-5 items-center gap-2 p-2">
                            <p className="font-semibold">Modificar Servicio:</p>

                            <div className="flex flex-col">
                              <label
                                htmlFor="inputPasajero"
                                className="mb-1 text-xs font-medium text-gray-700"
                              >
                                Ingrese Pasajero:
                              </label>
                              <input
                                id="inputPasajero"
                                type="text"
                                className="peer block w-full rounded-lg border border-transparent bg-gray-300 px-16 py-1.5 ps-3 text-sm focus:outline-none disabled:pointer-events-none disabled:opacity-50 dark:border-stone-200 dark:placeholder:text-gray-700"
                                placeholder="Ingrese Nombre del Pasajero"
                                disabled={!isEditing}
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
                                  setTimeout(
                                    () => setMostrarSugerencias(false),
                                    100,
                                  )
                                }
                              />

                              {mostrarSugerencias && sugerencias.length > 0 && (
                                <ul className="fixed z-[9999] mt-14 max-h-60 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                                  {sugerencias.map((item, index) => (
                                    <li
                                      key={index}
                                      className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        seleccionarPasajero(
                                          item.apepate,
                                          item.codigo,
                                          item.codlugar,
                                          item.direccion,
                                          item.distrito,
                                          item.wx,
                                          item.wy,
                                        );

                                        setMostrarSugerencias(false);
                                        setSugerencias([]);

                                        setTimeout(() => {
                                          const input =
                                            document.getElementById(
                                              'inputPasajero',
                                            );
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

                            <div className="flex flex-col">
                              <label
                                htmlFor="fechaA"
                                className="mb-1 text-xs font-medium text-gray-700"
                              >
                                Hora Atención:
                              </label>
                              <input
                                type="datetime-local"
                                id="fechaA"
                                value={horaAtencion}
                                onChange={(e) =>
                                  setHoraAtencion(e.target.value)
                                }
                                className={`col-span-1 rounded border bg-gray-200 p-1 ${
                                  !horaAtencion ? 'text-gray-400' : 'text-black'
                                }`}
                                disabled={!isEditing}
                              />
                            </div>

                            <div className="flex flex-col">
                              <label
                                htmlFor="fecha"
                                className="mb-1 text-xs font-medium text-gray-700"
                              >
                                Nueva Hora Ato:
                              </label>
                              <input
                                id="fecha"
                                type="datetime-local"
                                value={horaAto}
                                onChange={(e) => setHoraAto(e.target.value)}
                                className={`col-span-1 rounded border bg-gray-200 p-1 ${
                                  !horaAto ? 'text-gray-400' : 'text-black'
                                }`}
                                disabled={!isEditing}
                              />
                            </div>

                            <div className="flex h-[100%] flex-col  justify-end">
                              <button
                                className="rounded-md bg-gray-500 px-4 py-1.5 text-white"
                                onClick={() => {
                                  handleAgregar();
                                  handleAgregarLimpiar();
                                }}
                              >
                                Agregar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div
                        className="rounded-lgp-3 flex w-[170px] flex-col items-center justify-center text-center"
                        style={{ backgroundColor: selectedRow.color }}
                      >
                        <p className="text-lg font-bold">
                          {selectedRow.estado}
                        </p>
                        <p className="text-lg font-bold">
                          {' '}
                          {selectedRow.fechafin}
                        </p>

                        {!['FA', 'FT', 'CN'].includes(selectedRow.estado) && (
                          <div
                            className="relative mt-2 inline-block text-left"
                            ref={dropdownRef}
                          >
                            <button
                              onClick={() => setIsOpenD(!isOpenD)}
                              className="w-46 flex items-center justify-between rounded-md bg-blue-500 px-4 py-2 text-white transition-all hover:bg-blue-600 active:bg-blue-700"
                            >
                              Opciones Servicio ▼
                            </button>

                            {isOpenD && (
                              <div className="absolute z-10 mt-2 w-48 rounded-md border border-gray-300 bg-white shadow-lg">
                                <ul className="py-1">
                                  {['AS', 'NI', 'NA'].includes(
                                    selectedRow.estado,
                                  ) && (
                                    <li
                                      className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                      onClick={() =>
                                        handleClickOption(() =>
                                          handleCancelarServicio(
                                            selectedRow.codServicio,
                                          ),
                                        )
                                      }
                                    >
                                      Cancelar Servicio
                                    </li>
                                  )}

                                  {['AS', 'NI'].includes(
                                    selectedRow.estado,
                                  ) && (
                                    <li
                                      className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                      onClick={() =>
                                        handleClickOption(() =>
                                          handleCancelarAsignacion(
                                            selectedRow.codServicio,
                                          ),
                                        )
                                      }
                                    >
                                      Cancelar Asignación
                                    </li>
                                  )}

                                  {['AS', 'NI', 'NA', 'PR'].includes(
                                    selectedRow.estado,
                                  ) && (
                                    <li
                                      className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                      onClick={() =>
                                        handleClickOption(() =>
                                          handleModificarServicio(),
                                        )
                                      }
                                    >
                                      Modificar Servicio
                                    </li>
                                  )}

                                  {['AS', 'PR'].includes(
                                    selectedRow.estado,
                                  ) && (
                                    <li
                                      className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                      onClick={() =>
                                        alert('Reiniciar Servicio')
                                      }
                                    >
                                      Reiniciar Servicio
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="">
                        <TableDraw
                          codServicio={selectedRow.codServicio}
                          fecha={selectedRow.fechaCompleta}
                          horaAtencion={horaAtencionFinal}
                          horaAto={
                            horaAto
                              ? parseFecha(horaAto)
                              : selectedRow?.fechaCompleta
                          }
                          dataAgregada={dataSeleccionada}
                          agregarTrigger={agregarTrigger}
                          onCoordenadasUpdate={setCoordenadas}
                          onCenterUpdate={handleCenterUpdate}
                          ref={tableRef}
                          areaLan={selectedRow.empresaSinNumber}
                        ></TableDraw>
                      </div>

                      <div>
                        {['FA', 'FT', 'CN', 'NA'].includes(
                          selectedRow.estado,
                        ) ? (
                          <Mapa
                            recorrido={recorrido}
                            marcadores={coordenadas}
                            centro={centroMapa}
                          />
                        ) : (
                          <div className="rounded-lg bg-white p-3">
                            <SeguirUnidad
                              deviceId={selectedRow.unidadSF?.toLowerCase()}
                              height="30vh"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <p>
                      <strong>CodServicio:</strong> {selectedRow.codServicio}
                    </p>

                    {/* <div className="mt-6 flex">
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
                      <p>Fecha Ini: {selectedRow?.fechaini}</p>
                    </div> */}

                    <p>Fecha completa: {selectedRow?.fechaCompleta}</p>
                  </div>
                ) : (
                  <p>No hay datos seleccionados</p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  color="success"
                  onPress={() => {
                    handleGuardarHoraAto();
                    tableRef.current?.actualizarOrdenEnServidor();
                    onClose();
                  }}
                >
                  Guardar
                </Button>
                <Button
                  color="danger"
                  onPress={() => {
                    onClose();
                    handleLimpiarAll();
                  }}
                >
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
