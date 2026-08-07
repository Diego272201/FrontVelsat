import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUsername } from '@/hooks/useUsername';
import { API_BASE, API_UNIDADES } from './constants';
import {
  EditFormServicio,
  Notificacion,
  ServicioTurismo,
  ServicioTurismoVista,
} from './types';
import {
  combinarPlaca,
  construirFormDesdeServicio,
  getIsoToday,
  isoToDdMmYyyy,
} from './utils';

export function useServiciosTurismo() {
  const { username, isReady } = useUsername();

  const [fecha, setFecha] = useState<string>(getIsoToday());
  const [servicios, setServicios] = useState<ServicioTurismo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModalCarga, setShowModalCarga] = useState(false);
  const [showModalAgregar, setShowModalAgregar] = useState(false);

  const [unidadesRegistradas, setUnidadesRegistradas] = useState<Set<string>>(
    new Set(),
  );
  const [loadingUnidades, setLoadingUnidades] = useState(true);

  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [horaFiltro, setHoraFiltro] = useState('');
  const [tipoUnidadFiltro, setTipoUnidadFiltro] = useState('');

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formEdicion, setFormEdicion] = useState<EditFormServicio | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [servicioACancelar, setServicioACancelar] =
    useState<ServicioTurismoVista | null>(null);
  const [cancelando, setCancelando] = useState(false);

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  const mostrarNotificacion = useCallback(
    (tipo: 'success' | 'error', mensaje: string) => {
      const id = Math.random().toString(36).slice(2, 11);
      setNotificaciones((prev) => [...prev, { id, tipo, mensaje }]);
      setTimeout(() => {
        setNotificaciones((prev) => prev.filter((n) => n.id !== id));
      }, 4000);
    },
    [],
  );

  const fetchServicios = useCallback(async (isoDate: string) => {
    setLoading(true);
    setError(null);

    try {
      const fechaParam = isoToDdMmYyyy(isoDate);
      // Un solo input de fecha en la UI: se envía el mismo valor como fechaInicio y fechaFin.
      const res = await fetch(
        `${API_BASE}?fechaInicio=${fechaParam}&fechaFin=${fechaParam}`,
      );

      if (res.status === 404) {
        setServicios([]);
        return;
      }

      if (!res.ok) {
        throw new Error('Error al obtener los servicios de turismo');
      }

      const data = await res.json();
      setServicios(Array.isArray(data) ? data : []);
      setExpandidos(new Set());
      setEditandoId(null);
      setFormEdicion(null);
      setBusquedaTexto('');
      setHoraFiltro('');
      setTipoUnidadFiltro('');
    } catch {
      setError('No se pudieron cargar los servicios de turismo.');
      setServicios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Unidades (placas) ya registradas en el sistema; solo esas se muestran en la tabla de servicios.
  useEffect(() => {
    if (!isReady || !username) return;

    const fetchUnidades = async () => {
      setLoadingUnidades(true);
      try {
        const res = await fetch(`${API_UNIDADES}/${username}`);
        const data = await res.json();

        const codigos = (Array.isArray(data) ? data : [])
          .map((u: { codunidad?: string }) =>
            (u.codunidad || '').trim().toUpperCase(),
          )
          .filter((codigo: string) => codigo !== '');

        setUnidadesRegistradas(new Set(codigos));
      } catch {
        setUnidadesRegistradas(new Set());
      } finally {
        setLoadingUnidades(false);
      }
    };

    fetchUnidades();
  }, [isReady, username]);

  useEffect(() => {
    if (!isReady) return;
    fetchServicios(fecha);
  }, [isReady, fecha, fetchServicios]);

  const serviciosVisibles = useMemo<ServicioTurismoVista[]>(() => {
    return servicios
      .map((servicio) => ({
        ...servicio,
        placaCombinada: combinarPlaca(servicio.bus, servicio.placa),
      }))
      .filter((servicio) =>
        unidadesRegistradas.has(servicio.placaCombinada.toUpperCase()),
      );
  }, [servicios, unidadesRegistradas]);

  const listaUnidades = useMemo(
    () => Array.from(unidadesRegistradas).sort(),
    [unidadesRegistradas],
  );

  // Todas las horas de inicio presentes en los servicios cargados (para el select de filtro).
  const horasDisponibles = useMemo(() => {
    const horas = new Set<string>();
    serviciosVisibles.forEach((servicio) => {
      if (servicio.horainicio) horas.add(servicio.horainicio);
    });
    return Array.from(horas).sort();
  }, [serviciosVisibles]);

  // Todos los tipos de unidad presentes en los servicios cargados (para el select de filtro).
  const tiposUnidadDisponibles = useMemo(() => {
    const tipos = new Set<string>();
    serviciosVisibles.forEach((servicio) => {
      if (servicio.tipounidad) tipos.add(servicio.tipounidad);
    });
    return Array.from(tipos).sort();
  }, [serviciosVisibles]);

  const serviciosFiltrados = useMemo(() => {
    const texto = busquedaTexto.trim().toLowerCase();

    return serviciosVisibles.filter((servicio) => {
      const coincideTexto =
        texto === '' ||
        (servicio.piloto || '').toLowerCase().includes(texto) ||
        servicio.placaCombinada.toLowerCase().includes(texto) ||
        (servicio.cliente || '').toLowerCase().includes(texto) ||
        (servicio.origen || '').toLowerCase().includes(texto) ||
        (servicio.grupo || '').toLowerCase().includes(texto);
      const coincideHora =
        horaFiltro === '' || servicio.horainicio === horaFiltro;
      const coincideTipoUnidad =
        tipoUnidadFiltro === '' || servicio.tipounidad === tipoUnidadFiltro;
      return coincideTexto && coincideHora && coincideTipoUnidad;
    });
  }, [serviciosVisibles, busquedaTexto, horaFiltro, tipoUnidadFiltro]);

  const toggleExpandido = useCallback((idservicio: number) => {
    setExpandidos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(idservicio)) {
        nuevo.delete(idservicio);
      } else {
        nuevo.add(idservicio);
      }
      return nuevo;
    });
  }, []);

  const iniciarEdicion = useCallback((servicio: ServicioTurismoVista) => {
    setEditandoId((actual) => {
      if (actual !== null) return actual;
      setFormEdicion(construirFormDesdeServicio(servicio));
      return servicio.idservicio;
    });
  }, []);

  const cancelarEdicion = useCallback(() => {
    setEditandoId(null);
    setFormEdicion(null);
  }, []);

  const actualizarCampoEdicion = useCallback(
    (campo: keyof EditFormServicio, valor: string) => {
      setFormEdicion((prev) => (prev ? { ...prev, [campo]: valor } : prev));
    },
    [],
  );

  const guardarEdicion = useCallback(async () => {
    if (!formEdicion || editandoId === null) return;

    setGuardandoEdicion(true);

    try {
      const valorOVacio = (valor: string) =>
        valor.trim() === '' ? null : valor.trim();

      const idxGuion = formEdicion.placa.indexOf('-');
      const bus = formEdicion.placa
        ? idxGuion === -1
          ? formEdicion.placa
          : formEdicion.placa.slice(0, idxGuion)
        : '';
      const placa = formEdicion.placa
        ? idxGuion === -1
          ? ''
          : formEdicion.placa.slice(idxGuion + 1)
        : '';

      const payload = {
        fechainicio: formEdicion.fechainicio
          ? isoToDdMmYyyy(formEdicion.fechainicio)
          : null,
        horainicio: formEdicion.horainicio || null,
        horaretorno: valorOVacio(formEdicion.horaretorno),
        bus: valorOVacio(bus),
        placa: valorOVacio(placa),
        tipounidad: valorOVacio(formEdicion.tipounidad),
        piloto: valorOVacio(formEdicion.piloto),
        brevete: valorOVacio(formEdicion.brevete),
        celular: valorOVacio(formEdicion.celular),
        copiloto: valorOVacio(formEdicion.copiloto),
        cobrevete: valorOVacio(formEdicion.cobrevete),
        cocelular: valorOVacio(formEdicion.cocelular),
        cliente: valorOVacio(formEdicion.cliente),
        grupo: valorOVacio(formEdicion.grupo),
        numpax: valorOVacio(formEdicion.numpax),
        origen: valorOVacio(formEdicion.origen),
        destino: valorOVacio(formEdicion.destino),
        guiaturista: valorOVacio(formEdicion.guiaturista),
        vuelocliente: valorOVacio(formEdicion.vuelocliente),
        ejecutivo: valorOVacio(formEdicion.ejecutivo),
        cotizacion: valorOVacio(formEdicion.cotizacion),
        instrucciones: valorOVacio(formEdicion.instrucciones),
        indicaciones: valorOVacio(formEdicion.indicaciones),
        observaciones: valorOVacio(formEdicion.observaciones),
      };

      // limpiarNulos=true: el formulario de edición envía el objeto completo, así que un campo
      // que quedó en blanco debe borrarse en la BD (no simplemente "no tocar" ese campo).
      const res = await fetch(`${API_BASE}/${editandoId}?limpiarNulos=true`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        mostrarNotificacion(
          'success',
          data?.mensaje || 'Servicio actualizado correctamente',
        );
        cancelarEdicion();
        fetchServicios(fecha);
      } else {
        mostrarNotificacion(
          'error',
          data?.error || data?.mensaje || 'Error al actualizar el servicio',
        );
      }
    } catch {
      mostrarNotificacion(
        'error',
        'Error de conexión al actualizar el servicio',
      );
    } finally {
      setGuardandoEdicion(false);
    }
  }, [
    cancelarEdicion,
    editandoId,
    fecha,
    fetchServicios,
    formEdicion,
    mostrarNotificacion,
  ]);

  const confirmarCancelar = useCallback(async () => {
    if (!servicioACancelar) return;

    setCancelando(true);

    try {
      const res = await fetch(
        `${API_BASE}/${servicioACancelar.idservicio}/cancelar`,
        { method: 'PATCH' },
      );
      const data = await res.json().catch(() => null);

      if (res.ok) {
        mostrarNotificacion(
          'success',
          data?.mensaje || 'Servicio cancelado correctamente',
        );
        setServicioACancelar(null);
        fetchServicios(fecha);
      } else {
        mostrarNotificacion(
          'error',
          data?.error || data?.mensaje || 'Error al cancelar el servicio',
        );
      }
    } catch {
      mostrarNotificacion('error', 'Error de conexión al cancelar el servicio');
    } finally {
      setCancelando(false);
    }
  }, [fecha, fetchServicios, mostrarNotificacion, servicioACancelar]);

  const hayEdicionActiva = editandoId !== null;

  return {
    fecha,
    setFecha,
    loading,
    loadingUnidades,
    error,
    serviciosVisibles,
    serviciosFiltrados,
    horasDisponibles,
    tiposUnidadDisponibles,
    listaUnidades,
    busquedaTexto,
    setBusquedaTexto,
    horaFiltro,
    setHoraFiltro,
    tipoUnidadFiltro,
    setTipoUnidadFiltro,
    expandidos,
    toggleExpandido,
    showModalCarga,
    setShowModalCarga,
    showModalAgregar,
    setShowModalAgregar,
    fetchServicios,
    editandoId,
    formEdicion,
    guardandoEdicion,
    iniciarEdicion,
    cancelarEdicion,
    actualizarCampoEdicion,
    guardarEdicion,
    hayEdicionActiva,
    servicioACancelar,
    setServicioACancelar,
    cancelando,
    confirmarCancelar,
    notificaciones,
  };
}
