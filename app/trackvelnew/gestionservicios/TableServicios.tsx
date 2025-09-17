import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from '@nextui-org/react';
import axios from 'axios';
import { toast } from 'sonner';
import { FaCar, FaUserTie } from 'react-icons/fa';
import Swal from 'sweetalert2';
import TableDraw from './TableDraw';
import Mapa from '@/app/components/Mapa';
import { getEstadoYColor, getEstadoYColorVerifica } from './ObtenerEstadoColor';
import ModalUpdDestino from './ModalUpdDestino';
import dynamic from 'next/dynamic';
import { RiSaveFill } from 'react-icons/ri';
import { BiSolidEdit } from 'react-icons/bi';
import { useUsername } from '@/hooks/useUsername';

const SeguirUnidad = dynamic(() => import('@/app/request/seguirUnidad'), {
  ssr: false,
});

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
  { key: 'horaProg', label: 'Hora Prog' },
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
  refreshSearch,
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
  refreshSearch: number;
}) {
  const { username, isReady } = useUsername();

  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number }[]>([]);
  const [centroMapa, setCentroMapa] = useState<{lat: number; lng: number;} | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isOpenD, setIsOpenD] = useState(false);
  const [isModalDestinoOpen, setIsModalDestinoOpen] = useState(false);

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
  const [resetMap, setResetMap] = useState(false);

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
          `https://velsat.pe:2096/api/Preplan/GetPasajeros?palabra=${pasajero}&codusuario=${username}`,
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
  }, [pasajero, seleccionado, username, isReady]);

  const [horaAtencion, setHoraAtencion] = useState('');
  const [horaAto, setHoraAto] = useState('');

  const [horaAtencionFinal, setHoraAtencionFinal] = useState<string>('');

  useEffect(() => {
    setIsEditing(false);
    setHoraAtencion('');
    setHoraAto('');
    setPasajero('');
    setSugerencias([]);
    setSeleccionado(false);
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
    if (!pasajero) {
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

    setDataSeleccionada([nuevaData]);
    setAgregarTrigger((prev) => prev + 1);
    setHoraAtencionFinal(horaAtencion);
  };

  useEffect(() => {
    console.log('DataSeleccionada actualizada:', dataSeleccionada);
  }, [dataSeleccionada]);

  useEffect(() => {
  const fetchConductores = async () => {
    if (!isReady) {
      console.log('useUsername hook not ready yet');
      return;
    }

    if (!username || username.trim() === '') {
      console.error('Username is empty or invalid:', username);
      return;
    }

    try {
      const encodedUsername = encodeURIComponent(username);
      const url = `https://velsat.pe:2096/api/Preplan/conductores?usuario=${encodedUsername}`;
      console.log('Making request to:', url);
      
      const response = await axios.get(url);
      setConductores(response.data);
    } catch (error) {
      console.error('Error al obtener conductores:', error);
    }
  };

  fetchConductores();
}, [username, isReady]);

  useEffect(() => {
    const fetchUnidades = async () => {
      try {
        const response = await axios.get(
          `https://velsat.pe:2096/api/Preplan/unidades?usuario=${username}`,
        );
        setUnidadesA(response.data);
      } catch (error) {
        console.error('Error al obtener unidades:', error);
      }
    };

    fetchUnidades();
  }, [username]);

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
        destino: item.destino || '-',
        nomDestino: item.nomDestino || 'Sin destino',
        estado,
        color,
      };
    });
  };

  const [editandoFecha, setEditandoFecha] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState('');

  const [editandoFechaProg, setEditandoFechaProg] = useState(false);
  const [nuevaFechaProg, setNuevaFechaProg] = useState('');

  const handleRowClick = (row: any) => {
    setSelectedRow(row);
    setPreviousSelectedCod(row.codServicio);
    setResetMap(true);
    setCentroMapa(null);
    onOpen();
  };

  useEffect(() => {
    if (selectedPasajeroCodlan) return;

    const fetchData = async () => {
      if (!isReady) return;
      setLoading(true);
      const currentDate = selectedDate || getFormattedDate();
      const API_URL = `https://velsat.pe:2096/api/Preplan/Getservicios?fecha=${currentDate}&usu=${username}`;
      try {
        const response = await axios.get(API_URL);
        setData(formatData(response.data));
      } catch (error) {
        console.error('Error al obtener los datos:', error);
        setData([]);
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
    refreshSearch,
    username,
    isReady
  ]);

  useEffect(() => {
    console.log('Datos formateados en data:', data);
  }, [data]);

  useEffect(() => {
    if (!selectedPasajeroCodlan) return;

    const fetchPasajeroData = async () => {
      if (!isReady) return;
      const currentDate = selectedDate || getFormattedDate();
      const API_URL = `https://velsat.pe:2096/api/Preplan/GetServicioPasajero?usuario=${username}&fec=${currentDate}&codcliente=${selectedPasajeroCodlan}`;

      console.log(API_URL)

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
    username,
    isReady
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
      const empresaLimpia = item.empresa.split(' (')[0];

      return (
        (selectedArea ? item.area === selectedArea : true) &&
        (selectedEmpresa ? empresaLimpia === selectedEmpresa : true) &&
        (selecteServicio ? item.tipo === selecteServicio : true) &&
        (selecteNumServicio ? item.numero === selecteNumServicio : true) &&
        (unidadLimpia
          ? item.unidad.toLowerCase().includes(unidadLimpia.toLowerCase())
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
        'https://velsat.pe:2096/api/Preplan/AsignarServicio',
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
        `https://velsat.pe:2096/api/Preplan/canasig/${codServicio}`,
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
        `https://velsat.pe:2096/api/Preplan/cancelar/${codServicio}`,
      );

      setData((prevData) =>
        prevData.map((item) => {
          if (item.codServicio === codServicio) {
            const updatedItem = { ...item, estado: 'C' };
            const { estado, color } = getEstadoYColorVerifica(updatedItem);

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
        'https://velsat.pe:2096/api/Preplan/eliminacionmultiple',
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

    const API_URL = `https://velsat.pe:2096/api/Reporting/details/${encodeURIComponent(fechaInicial)}/${encodeURIComponent(fechaFinal)}/${encodeURIComponent(selectedRow.unidadSF)}/${username}`;

    console.log('Llamando a la API con URL:', API_URL);

    axios
      .get(API_URL)
      .then((response) => {
        console.log('Respuesta de la API:', response.data);

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
    setNuevaFecha('');
    setNuevaFechaProg('');
    setResetMap(true);
    setCentroMapa(null);
    setTimeout(() => setResetMap(false), 500);
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
              fechaCompleta: horaAto ? parseFecha(horaAto) : item.fechaCompleta,
            }
          : item,
      ),
    );
  };

  const handleGuardarHoras = async () => {
    if (!selectedRow) return;

    const codservicio = selectedRow.codServicio;
    const fecha = nuevaFecha
      ? parseFecha(nuevaFecha)
      : selectedRow.fechaCompleta || '';
    const fecplan = nuevaFechaProg
      ? parseFecha(nuevaFechaProg)
      : selectedRow.fecPlanCompleta || '';

    try {
      const url = `https://velsat.pe:2096/api/Preplan/UpdateHoras?codservicio=${codservicio}&fecha=${encodeURIComponent(fecha)}&fecplan=${encodeURIComponent(fecplan)}`;

      const response = await axios.put(url);

      console.log('Respuesta de la API Wua:', response.data);
      console.log('Respuesta de la API CODservicio:', codservicio);
      console.log('Respuesta de la API Hora Ato :', fecha);
      console.log('Respuesta de la API Hora Prog:', fecplan);
      console.log('La URL ES : ' + url);

      setData((prevData) =>
        prevData.map((item) =>
          item.codServicio === selectedRow.codServicio
            ? {
                ...item,
                horaAto: nuevaFecha
                  ? nuevaFecha.split('T')[1].slice(0, 5)
                  : item.horaAto,
                horaProg: nuevaFechaProg
                  ? nuevaFechaProg.split('T')[1].slice(0, 5)
                  : item.horaProg,
                fechaCompleta: nuevaFecha
                  ? parseFecha(nuevaFecha)
                  : item.fechaCompleta,
                fecPlanCompleta: nuevaFechaProg
                  ? parseFecha(nuevaFechaProg)
                  : item.fecPlanCompleta,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error('Error al actualizar horas:', error);
    }
  };

  function formatearFechaParaMostrar(fechaISO: string) {
    const [fecha, hora] = fechaISO.split('T');
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio} ${hora}`;
  }

  const altura =
    isVisible && isVisibleAsignar
      ? 280
      : isVisible
        ? 200
        : isVisibleAsignar
          ? 120
          : 60;

  useEffect(() => {
    if (!isOpen) {
      setIsOpenD(false);
      setResetMap(true);
      setCentroMapa(null);
    } else {
      setTimeout(() => setResetMap(false), 500);
    }
  }, [isOpen]);

  useEffect(() => {
    if (resetMap) {
      const timer = setTimeout(() => {
        setResetMap(false);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [resetMap]);

  return (
    <div>
      {loading ? (
        <div
          className="overflow-auto border border-gray-300"
          style={{ height: `calc(100vh - ${isVisible ? 350 : 158}px)` }}
        >
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-[#1C5ED8]">
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
          className="overflow-auto border border-gray-300"
          style={{ height: `calc(100vh - ${altura}px)` }}
        >
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#1C5ED8]">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-2 uppercase text-[#fff]"
                    style={{ fontSize: '11px' }}
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
                    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-r from-gray-900 to-gray-700 p-6 text-center shadow-lg">
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
                        style={{ fontSize: '11px' }}
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
          onOpenChange();
          if (!open) {
            handleLimpiarAll();
          }
        }}
        className="full max-w-none bg-gray-100"
        scrollBehavior="inside"
      >
        <ModalContent style={{ marginTop: '80px' }}>
          {(onClose) => (
            <>
              <ModalBody>
                {selectedRow ? (
                  <div>
                    <div className="flex  p-2" style={{ fontSize: '13px' }}>
                      <div className="mr-4 flex-1">
                        <h2 className="text-center text-[14px] font-semibold">
                          SERVICIO
                        </h2>

                        <div className="mt-2 border border-gray-300">
                          <div className="grid grid-cols-5 items-center border-b border-gray-300 p-2">
                            <p className="font-semibold">Destino:</p>

                            <div className="col-span-3 flex items-center gap-2">
                              <span className="uppercase">
                                {selectedRow?.nomDestino ||
                                  'Sin destino asignado'}
                              </span>

                              {!['FA', 'FT', 'CN'].includes(
                                selectedRow?.estado,
                              ) && (
                                <button
                                  onClick={() => {
                                    setIsModalDestinoOpen(true);
                                  }}
                                  className="flex justify-center rounded bg-blue-700 px-1 py-1 text-gray-100 hover:bg-blue-500"
                                >
                                  <BiSolidEdit />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-5 items-center border-b border-gray-300 p-2">
                            <p className="font-semibold">Programación:</p>

                            <div className="col-span-3 flex items-center gap-2">
                              {!editandoFechaProg ? (
                                <>
                                  <span>
                                    {nuevaFechaProg
                                      ? formatearFechaParaMostrar(
                                          nuevaFechaProg,
                                        )
                                      : selectedRow?.fecPlanCompleta}
                                  </span>
                                  <span>
                                    - {selectedRow.conductor} -{' '}
                                    {selectedRow.unidad}
                                  </span>

                                  {!['FA', 'FT', 'CN'].includes(
                                    selectedRow?.estado,
                                  ) && (
                                    <button
                                      onClick={() => {
                                        if (selectedRow?.fecPlanCompleta) {
                                          const [dia, mes, anioHora] =
                                            selectedRow.fecPlanCompleta.split(
                                              '/',
                                            );
                                          const [anio, hora] =
                                            anioHora.split(' ');
                                          const fechaFormateada = `${anio}-${mes}-${dia}T${hora}`;
                                          setNuevaFechaProg(fechaFormateada);
                                        }
                                        setEditandoFechaProg(true);
                                      }}
                                      className="flex justify-center rounded bg-blue-700 px-1 py-1 text-gray-100 hover:bg-blue-500"
                                    >
                                      <BiSolidEdit />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <input
                                    type="datetime-local"
                                    value={nuevaFechaProg}
                                    onChange={(e) =>
                                      setNuevaFechaProg(e.target.value)
                                    }
                                    className="rounded border bg-gray-100 p-1"
                                  />
                                  <button
                                    onClick={() => {
                                      console.log(
                                        'Nueva fecha programación:',
                                        nuevaFechaProg,
                                      );
                                      setEditandoFechaProg(false);
                                    }}
                                    className="rounded bg-green-700 px-2 py-[6px] text-gray-100 hover:bg-green-500"
                                  >
                                    <RiSaveFill />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-5 items-center border-b border-gray-300 p-2">
                            <p className="font-semibold">Servicio:</p>

                            <div className="col-span-3 flex items-center gap-2">
                              {!editandoFecha ? (
                                <>
                                  <span>
                                    {nuevaFecha
                                      ? formatearFechaParaMostrar(nuevaFecha)
                                      : horaAto
                                        ? parseFecha(horaAto)
                                        : selectedRow?.fechaCompleta}
                                  </span>

                                  <span>
                                    - {selectedRow.tipo} ({selectedRow.numero})
                                    - {selectedRow.empresaSinNumber}
                                  </span>

                                  {!['FA', 'FT', 'CN'].includes(
                                    selectedRow?.estado,
                                  ) && (
                                    <button
                                      onClick={() => {
                                        if (selectedRow?.fechaCompleta) {
                                          const [dia, mes, anioHora] =
                                            selectedRow.fechaCompleta.split(
                                              '/',
                                            );
                                          const [anio, hora] =
                                            anioHora.split(' ');
                                          const fechaFormateada = `${anio}-${mes}-${dia}T${hora}`;
                                          setNuevaFecha(fechaFormateada);
                                        }
                                        setEditandoFecha(true);
                                      }}
                                      className="flex justify-center rounded bg-blue-700 px-1 py-1 text-gray-100 hover:bg-blue-500"
                                    >
                                      <BiSolidEdit />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <input
                                    type="datetime-local"
                                    value={nuevaFecha}
                                    onChange={(e) =>
                                      setNuevaFecha(e.target.value)
                                    }
                                    className="rounded border bg-gray-100 p-1"
                                  />
                                  <button
                                    onClick={() => {
                                      console.log('Nueva fecha:', nuevaFecha);
                                      setEditandoFecha(false);
                                    }}
                                    className="rounded bg-green-700 px-2 py-[6px] text-gray-100 hover:bg-green-500"
                                  >
                                    <RiSaveFill />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-5 items-center gap-2 border-b border-gray-300 p-2">
                            <p className="col-span-1 font-semibold">
                              Asignación:
                            </p>

                            <div className="relative col-span-2">
                              <input
                                type="text"
                                className="peer block w-full rounded-lg border border-transparent bg-gray-200 px-16 py-1.5 ps-11 text-sm placeholder-zinc-500 focus:border-gray-300 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
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
                                className="peer block w-full rounded-lg border border-transparent bg-gray-200 px-16 py-1.5 ps-11 text-sm placeholder-zinc-500 focus:border-gray-300 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
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

                            <div className="flex h-[100%] flex-col justify-end">
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
                              <div className="z-9999 absolute mt-2 w-[150px] rounded-md border border-gray-300 bg-white shadow-lg">
                                <ul className="py-1">
                                  {['AS', 'NI', 'NA'].includes(
                                    selectedRow.estado,
                                  ) && (
                                    <li
                                      className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                      onClick={async (e) => {
                                        e.stopPropagation();

                                        const result = await Swal.fire({
                                          title: '¿Estás seguro?',
                                          text: '¿Deseas cancelar este servicio?',
                                          icon: 'warning',
                                          showCancelButton: true,
                                          confirmButtonColor: '#3085d6',
                                          cancelButtonColor: '#d33',
                                          confirmButtonText: 'Sí, cancelar',
                                          cancelButtonText: 'No, mantener',
                                        });

                                        if (result.isConfirmed) {
                                          handleClickOption(() =>
                                            handleCancelarServicio(
                                              selectedRow.codServicio,
                                            ),
                                          );
                                        }
                                      }}
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
                                        handleClickOption(async () => {
                                          const result = await Swal.fire({
                                            title: '¿Estás seguro?',
                                            text: '¿Deseas cancelar esta asignación?',
                                            icon: 'warning',
                                            showCancelButton: true,
                                            confirmButtonColor: '#3085d6',
                                            cancelButtonColor: '#d33',
                                            confirmButtonText: 'Sí, cancelar',
                                            cancelButtonText: 'No, mantener',
                                          });

                                          if (result.isConfirmed) {
                                            handleCancelarAsignacion(
                                              selectedRow.codServicio,
                                            );
                                          }
                                        })
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
                            nuevaFecha
                              ? formatearFechaParaMostrar(nuevaFecha)
                              : horaAto
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
                            resetMap={resetMap}
                          />
                        ) : (
                          <div className="rounded-lg bg-white p-3">
                            <SeguirUnidad
                              deviceId={selectedRow.unidadSF?.toLowerCase()}
                              height="30vh"
                              marcadores={coordenadas}
                              centro={centroMapa}
                              resetMap={resetMap}
                            />
                          </div>
                        )}
                      </div>
                    </div>
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
                    handleGuardarHoras();
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

      <ModalUpdDestino
        isOpen={isModalDestinoOpen}
        onClose={() => setIsModalDestinoOpen(false)}
        codservicio={selectedRow?.codServicio} // Pasar el código de servicio
        onDestinoSeleccionado={(nombre, codigo) => {
          // Actualizar el destino en la tabla local
          setData((prevData) =>
            prevData.map((item) =>
              item.codServicio === selectedRow?.codServicio
                ? { ...item, nomDestino: nombre }
                : item,
            ),
          );

          // Actualizar el selectedRow también
          if (selectedRow) {
            setSelectedRow({
              ...selectedRow,
              nomDestino: nombre,
            });
          }
        }}
      />
    </div>
  );
}
