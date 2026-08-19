import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUsername } from '@/hooks/useUsername';
import { API_BASE, API_TAXI, API_UNIDADES } from './constants';
import { Conductor } from './SelectBuscable';
import {
  AuditoriaCampo,
  ColumnaFiltrable,
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
  const [conductores, setConductores] = useState<Conductor[]>([]);

  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [horaFiltro, setHoraFiltro] = useState('');
  const [tipoUnidadFiltro, setTipoUnidadFiltro] = useState('');

  // Filtros de columna al estilo Excel: por columna, null = sin filtro (se muestra todo),
  // o un array con los valores exactos (ya normalizados con trim) que deben quedar visibles.
  const [filtrosColumna, setFiltrosColumna] = useState<
    Partial<Record<ColumnaFiltrable, string[] | null>>
  >({});

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formEdicion, setFormEdicion] = useState<EditFormServicio | null>(null);
  const [motivoEdicion, setMotivoEdicion] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Historial de auditoría por servicio, cargado bajo demanda al expandir la fila (no se pide
  // completo para toda la tabla de una vez).
  const [auditoriaPorServicio, setAuditoriaPorServicio] = useState<
    Record<number, AuditoriaCampo[]>
  >({});
  const [cargandoAuditoriaId, setCargandoAuditoriaId] = useState<
    number | null
  >(null);

  const [servicioACancelar, setServicioACancelar] =
    useState<ServicioTurismoVista | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [procesandoStandbyId, setProcesandoStandbyId] = useState<
    number | null
  >(null);

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
      setFiltrosColumna({});
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

  // Conductores del usuario logueado, para autocompletar brevete/celular al elegir piloto o copiloto.
  useEffect(() => {
    if (!isReady || !username) return;

    const fetchConductores = async () => {
      try {
        const res = await fetch(`${API_TAXI}?codusuario=${username}`);
        if (!res.ok) {
          setConductores([]);
          return;
        }
        const data = await res.json();
        setConductores(Array.isArray(data) ? data : []);
      } catch {
        setConductores([]);
      }
    };

    fetchConductores();
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
      .filter(
        (servicio) =>
          servicio.placaCombinada === '' ||
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

  // Valor de cada columna filtrable tal como se compara/muestra en el panel: string vacío para
  // null/undefined (se agrupa como "(Vacías)" en el filtro, igual que Excel).
  const valorColumna = useCallback(
    (servicio: ServicioTurismoVista, columna: ColumnaFiltrable): string =>
      (servicio[columna] as string | null) || '',
    [],
  );

  // Valores únicos disponibles por columna, para poblar el panel "estilo Excel" de cada una.
  // Se calculan sobre serviciosVisibles (antes de aplicar los propios filtros de columna) para que,
  // al abrir el panel de una columna, sigan apareciendo las opciones que otros filtros ya ocultaron.
  const valoresPorColumna = useMemo(() => {
    const columnas: ColumnaFiltrable[] = [
      'fechainicio',
      'horainicio',
      'tipounidad',
      'placaCombinada',
      'piloto',
      'cliente',
      'grupo',
      'origen',
      'destino',
    ];
    const resultado = {} as Record<ColumnaFiltrable, string[]>;
    columnas.forEach((columna) => {
      const set = new Set<string>();
      serviciosVisibles.forEach((servicio) => set.add(valorColumna(servicio, columna)));
      resultado[columna] = Array.from(set).sort((a, b) =>
        a === '' ? -1 : b === '' ? 1 : a.localeCompare(b, 'es'),
      );
    });
    return resultado;
  }, [serviciosVisibles, valorColumna]);

  const setFiltroColumna = useCallback(
    (columna: ColumnaFiltrable, valores: string[] | null) => {
      setFiltrosColumna((prev) => ({ ...prev, [columna]: valores }));
    },
    [],
  );

  const limpiarFiltrosColumna = useCallback(() => {
    setFiltrosColumna({});
  }, []);

  const hayFiltrosColumnaActivos = Object.values(filtrosColumna).some(
    (valores) => valores !== null && valores !== undefined,
  );

  const serviciosFiltrados = useMemo(() => {
    const texto = busquedaTexto.trim().toLowerCase();
    const entradasFiltrosColumna = Object.entries(filtrosColumna) as [
      ColumnaFiltrable,
      string[] | null | undefined,
    ][];

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
      const coincideColumnas = entradasFiltrosColumna.every(
        ([columna, valores]) =>
          !valores || valores.includes(valorColumna(servicio, columna)),
      );
      return (
        coincideTexto && coincideHora && coincideTipoUnidad && coincideColumnas
      );
    });
  }, [
    serviciosVisibles,
    busquedaTexto,
    horaFiltro,
    tipoUnidadFiltro,
    filtrosColumna,
    valorColumna,
  ]);

  // Trae el historial de auditoría de un servicio una sola vez (se cachea en auditoriaPorServicio);
  // si ya se cargó (aunque esté vacío) no vuelve a pedirlo.
  const cargarAuditoria = useCallback(
    async (idservicio: number) => {
      if (auditoriaPorServicio[idservicio]) return;

      setCargandoAuditoriaId(idservicio);
      try {
        const res = await fetch(`${API_BASE}/${idservicio}/auditoria`);
        const data = res.status === 404 ? [] : await res.json().catch(() => []);
        setAuditoriaPorServicio((prev) => ({
          ...prev,
          [idservicio]: Array.isArray(data) ? data : [],
        }));
      } catch {
        setAuditoriaPorServicio((prev) => ({ ...prev, [idservicio]: [] }));
      } finally {
        setCargandoAuditoriaId(null);
      }
    },
    [auditoriaPorServicio],
  );

  const toggleExpandido = useCallback(
    (idservicio: number) => {
      setExpandidos((prev) => {
        const nuevo = new Set(prev);
        if (nuevo.has(idservicio)) {
          nuevo.delete(idservicio);
        } else {
          nuevo.add(idservicio);
          cargarAuditoria(idservicio);
        }
        return nuevo;
      });
    },
    [cargarAuditoria],
  );

  const iniciarEdicion = useCallback((servicio: ServicioTurismoVista) => {
    setEditandoId((actual) => {
      if (actual !== null) return actual;
      setFormEdicion(construirFormDesdeServicio(servicio));
      setMotivoEdicion('');
      return servicio.idservicio;
    });
  }, []);

  const cancelarEdicion = useCallback(() => {
    setEditandoId(null);
    setFormEdicion(null);
    setMotivoEdicion('');
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
      // usuario/motivo quedan en la auditoría del backend por cada campo que realmente cambió.
      const params = new URLSearchParams({ limpiarNulos: 'true' });
      if (username) params.set('usuario', username);
      if (motivoEdicion.trim() !== '') params.set('motivo', motivoEdicion.trim());

      const res = await fetch(`${API_BASE}/${editandoId}?${params.toString()}`, {
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
        // El historial cacheado de este servicio quedó desactualizado tras el guardado.
        setAuditoriaPorServicio((prev) => {
          const { [editandoId]: _descartado, ...resto } = prev;
          return resto;
        });
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
    motivoEdicion,
    mostrarNotificacion,
    username,
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

  const ponerEnStandby = useCallback(
    async (servicio: ServicioTurismoVista) => {
      setProcesandoStandbyId(servicio.idservicio);

      try {
        const res = await fetch(
          `${API_BASE}/${servicio.idservicio}/standby`,
          { method: 'PATCH' },
        );
        const data = await res.json().catch(() => null);

        if (res.ok) {
          mostrarNotificacion(
            'success',
            data?.mensaje || 'Servicio puesto en Stand By',
          );
          fetchServicios(fecha);
        } else {
          mostrarNotificacion(
            'error',
            data?.error || data?.mensaje || 'Error al poner en Stand By',
          );
        }
      } catch {
        mostrarNotificacion('error', 'Error de conexión al poner en Stand By');
      } finally {
        setProcesandoStandbyId(null);
      }
    },
    [fecha, fetchServicios, mostrarNotificacion],
  );

  const reanudarServicio = useCallback(
    async (servicio: ServicioTurismoVista) => {
      setProcesandoStandbyId(servicio.idservicio);

      try {
        const res = await fetch(
          `${API_BASE}/${servicio.idservicio}/reanudar`,
          { method: 'PATCH' },
        );
        const data = await res.json().catch(() => null);

        if (res.ok) {
          mostrarNotificacion(
            'success',
            data?.mensaje || 'Servicio reanudado',
          );
          fetchServicios(fecha);
        } else {
          mostrarNotificacion(
            'error',
            data?.error || data?.mensaje || 'Error al reanudar el servicio',
          );
        }
      } catch {
        mostrarNotificacion('error', 'Error de conexión al reanudar el servicio');
      } finally {
        setProcesandoStandbyId(null);
      }
    },
    [fecha, fetchServicios, mostrarNotificacion],
  );

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
    conductores,
    busquedaTexto,
    setBusquedaTexto,
    horaFiltro,
    setHoraFiltro,
    tipoUnidadFiltro,
    setTipoUnidadFiltro,
    valoresPorColumna,
    filtrosColumna,
    setFiltroColumna,
    limpiarFiltrosColumna,
    hayFiltrosColumnaActivos,
    expandidos,
    toggleExpandido,
    showModalCarga,
    setShowModalCarga,
    showModalAgregar,
    setShowModalAgregar,
    fetchServicios,
    editandoId,
    formEdicion,
    motivoEdicion,
    setMotivoEdicion,
    guardandoEdicion,
    iniciarEdicion,
    cancelarEdicion,
    actualizarCampoEdicion,
    guardarEdicion,
    hayEdicionActiva,
    auditoriaPorServicio,
    cargandoAuditoriaId,
    servicioACancelar,
    setServicioACancelar,
    cancelando,
    confirmarCancelar,
    procesandoStandbyId,
    ponerEnStandby,
    reanudarServicio,
    notificaciones,
  };
}
