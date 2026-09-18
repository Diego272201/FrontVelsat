import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUsername } from '@/hooks/useUsername';
import { API_BASE, API_LOTE_URL, API_TAXI, API_UNIDADES, CLAVE_OPCIONES_AVANZADAS } from './constants';
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
  calcularEstado,
} from './utils';
import {
  enviarAlertasWhatsappLote,
  resolverTelefonosConductoresDesdeBrevete,
  TipoPlantillaWhatsapp,
} from './whatsappAlerta';
import {
  agregarOperacionPendiente,
  guardarSnapshot,
  listarOperacionesPendientes,
  obtenerSnapshot,
  quitarOperacionPendiente,
} from './offline/db';
import {
  ejecutarOperacionPendiente,
  esFalloDeRed,
  generarIdOperacion,
  generarIdTemporal,
} from './offline/syncQueue';
import { OperacionPendiente, TipoOperacionPendiente } from './offline/types';

function construirServicioOptimista(
  idservicio: number,
  campos: Record<string, unknown>,
): ServicioTurismo {
  const texto = (clave: string) => (campos[clave] as string | undefined) ?? null;
  return {
    idservicio,
    fechainicio: texto('fechainicio'),
    instrucciones: texto('instrucciones'),
    horainicio: texto('horainicio'),
    indicaciones: texto('indicaciones'),
    horaretorno: texto('horaretorno'),
    bus: texto('bus'),
    placa: texto('placa'),
    brevete: texto('brevete'),
    piloto: texto('piloto'),
    celular: texto('celular'),
    cobrevete: texto('cobrevete'),
    copiloto: texto('copiloto'),
    cocelular: texto('cocelular'),
    tipounidad: texto('tipounidad'),
    cliente: texto('cliente'),
    grupo: texto('grupo'),
    numpax: texto('numpax'),
    origen: texto('origen'),
    destino: texto('destino'),
    guiaturista: texto('guiaturista'),
    vuelocliente: texto('vuelocliente'),
    observaciones: texto('observaciones'),
    ejecutivo: texto('ejecutivo'),
    cotizacion: texto('cotizacion'),
    visto: null,
    confirmado: null,
    finalizado: null,
    cancelado: null,
    standby: null,
    reprogramado: null,
    ultimaModificacion: null,
  };
}

export function useServiciosTurismo() {
  const { username, isReady } = useUsername();

  const [fecha, setFecha] = useState<string>(getIsoToday());
  const [servicios, setServicios] = useState<ServicioTurismo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [usandoCache, setUsandoCache] = useState(false);
  const [pendientesCount, setPendientesCount] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

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
  const [estadoFiltro, setEstadoFiltro] = useState<string | null>(null);

  const [filtrosColumna, setFiltrosColumna] = useState<
    Partial<Record<ColumnaFiltrable, string[] | null>>
  >({});

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formEdicion, setFormEdicion] = useState<EditFormServicio | null>(null);
  const [servicioEnEdicion, setServicioEnEdicion] =
    useState<ServicioTurismoVista | null>(null);
  const [motivoEdicion, setMotivoEdicion] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

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
  const [notificandoConductorId, setNotificandoConductorId] = useState<
    number | null
  >(null);

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  const [claveOpcionesAvanzadas, setClaveOpcionesAvanzadas] = useState('');
  const [opcionesAvanzadasDesbloqueado, setOpcionesAvanzadasDesbloqueado] =
    useState(false);
  const verificarOpcionesAvanzadas = useCallback(() => {
    setOpcionesAvanzadasDesbloqueado(
      claveOpcionesAvanzadas === CLAVE_OPCIONES_AVANZADAS,
    );
  }, [claveOpcionesAvanzadas]);
  const [eliminandoCarga, setEliminandoCarga] = useState(false);
  const [mostrarModalEliminarCarga, setMostrarModalEliminarCarga] =
    useState(false);

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

    const resetearFiltrosYSeleccion = () => {
      setExpandidos(new Set());
      setEditandoId(null);
      setFormEdicion(null);
      setServicioEnEdicion(null);
      setBusquedaTexto('');
      setHoraFiltro('');
      setTipoUnidadFiltro('');
      setEstadoFiltro(null);
      setFiltrosColumna({});
    };

    const mostrarUltimaDataConocida = async () => {
      const snapshot = await obtenerSnapshot(isoDate);
      if (snapshot) {
        setServicios(snapshot.servicios);
        setUsandoCache(true);
      } else {
        setUsandoCache(false);
        setError('Sin conexión y sin datos guardados de esta fecha.');
        setServicios([]);
      }
    };

    try {
      const fechaParam = isoToDdMmYyyy(isoDate);
      const res = await fetch(
        `${API_BASE}?fechaInicio=${fechaParam}&fechaFin=${fechaParam}`,
      );

      if (res.status === 404) {
        setServicios([]);
        setUsandoCache(false);
        guardarSnapshot(isoDate, []);
        resetearFiltrosYSeleccion();
        return;
      }

      if (!res.ok) {
        if (esFalloDeRed(undefined, res)) {
          await mostrarUltimaDataConocida();
          return;
        }
        throw new Error('Error al obtener los servicios de turismo');
      }

      const data = await res.json();
      const lista: ServicioTurismo[] = Array.isArray(data) ? data : [];
      setServicios(lista);
      setUsandoCache(false);
      guardarSnapshot(isoDate, lista);
      resetearFiltrosYSeleccion();
    } catch (err) {
      if (esFalloDeRed(err)) {
        await mostrarUltimaDataConocida();
      } else {
        setUsandoCache(false);
        setError('No se pudieron cargar los servicios de turismo.');
        setServicios([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const encolarYAplicarOptimista = useCallback(
    async (params: {
      tipo: TipoOperacionPendiente;
      idservicio: number;
      payload?: OperacionPendiente['payload'];
      cambiosOptimistas?: Partial<ServicioTurismo>;
      servicioNuevo?: ServicioTurismo;
    }) => {
      const operacion: OperacionPendiente = {
        id: generarIdOperacion(),
        tipo: params.tipo,
        idservicio: params.idservicio,
        fecha,
        payload: params.payload,
        creadoEn: Date.now(),
      };
      await agregarOperacionPendiente(operacion);

      setServicios((prev) => {
        const actualizado = params.servicioNuevo
          ? [...prev, { ...params.servicioNuevo, _pendingSync: true }]
          : prev.map((s) =>
              s.idservicio === params.idservicio
                ? { ...s, ...(params.cambiosOptimistas || {}), _pendingSync: true }
                : s,
            );
        guardarSnapshot(fecha, actualizado);
        return actualizado;
      });

      setPendientesCount((prev) => prev + 1);
      mostrarNotificacion(
        'success',
        'Guardado localmente. Se sincronizará cuando vuelva la conexión.',
      );
    },
    [fecha, mostrarNotificacion],
  );

  const sincronizarCola = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const pendientes = await listarOperacionesPendientes();
    if (pendientes.length === 0) return;

    setSincronizando(true);
    let huboExito = false;

    try {
      for (const op of pendientes) {
        const resultado = await ejecutarOperacionPendiente(op);

        if (resultado.ok) {
          await quitarOperacionPendiente(op.id);
          huboExito = true;

          // Único caso con notificación automática: una carga de Excel que se guardó
          // localmente (sin conexión) y recién ahora terminó de sincronizarse.
          if (op.tipo === 'cargaExcel') {
            const { registros } = op.payload as { registros: Record<string, unknown>[] };
            const telefonos = resolverTelefonosConductoresDesdeBrevete(
              registros as { brevete?: string | null; cobrevete?: string | null }[],
              conductores,
            );
            if (telefonos.length > 0) {
              enviarAlertasWhatsappLote(telefonos)
                .then((resultadoWa) => {
                  if (resultadoWa.enviados > 0) {
                    mostrarNotificacion(
                      'success',
                      `Carga de Excel sincronizada: ${resultadoWa.enviados} notificación(es) de WhatsApp enviada(s)`,
                    );
                  }
                })
                .catch(() => {});
            }
          }
        } else if (resultado.esFalloRed) {
          break;
        } else {
          await quitarOperacionPendiente(op.id);
          mostrarNotificacion(
            'error',
            `No se pudo sincronizar un cambio pendiente: ${resultado.error || 'error desconocido'}`,
          );
        }
      }
    } finally {
      setSincronizando(false);
      const restantes = await listarOperacionesPendientes();
      setPendientesCount(restantes.length);
      if (huboExito) {
        fetchServicios(fecha);
      }
    }
  }, [conductores, fecha, fetchServicios, mostrarNotificacion]);

  useEffect(() => {
    listarOperacionesPendientes().then((pendientes) =>
      setPendientesCount(pendientes.length),
    );
  }, []);

  useEffect(() => {
    if (!isReady) return;

    sincronizarCola();

    const handleOnline = () => sincronizarCola();
    window.addEventListener('online', handleOnline);
    const intervalo = setInterval(() => sincronizarCola(), 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(intervalo);
    };
  }, [isReady, sincronizarCola]);

  // Unidades (placas) ya registradas en el sistema: se usan para marcar placaNoRegistrada
  // en cada servicio (el conductor no ve en su app los servicios con esa marca), pero ya
  // no se ocultan de la tabla web. Si falla por red/backend caído, se cae a la última lista
  // guardada en localStorage: sin esto, un fallo acá deja unidadesRegistradas vacío y todos
  // los servicios con placa quedarían marcados como no registrados aunque sí lo estén.
  useEffect(() => {
    if (!isReady || !username) return;
    const claveCache = `serviciosturismo_unidadesRegistradas_${username}`;

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
        try {
          localStorage.setItem(claveCache, JSON.stringify(codigos));
        } catch {
        }
      } catch {
        let codigosCache: string[] = [];
        try {
          codigosCache = JSON.parse(localStorage.getItem(claveCache) || '[]');
        } catch {
          codigosCache = [];
        }
        setUnidadesRegistradas(new Set(codigosCache));
      } finally {
        setLoadingUnidades(false);
      }
    };

    fetchUnidades();
  }, [isReady, username]);

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

  // Ya no se ocultan los servicios con placa no registrada (el conductor de todos modos
  // no los ve en la app móvil, que sí filtra) — se muestran igual en la tabla, marcados
  // con placaNoRegistrada para que el operador vea que ese servicio no le llega al conductor.
  const serviciosVisibles = useMemo<ServicioTurismoVista[]>(() => {
    return servicios.map((servicio) => {
      const placaCombinada = combinarPlaca(servicio.bus, servicio.placa);
      return {
        ...servicio,
        placaCombinada,
        placaNoRegistrada:
          placaCombinada !== '' && !unidadesRegistradas.has(placaCombinada.toUpperCase()),
      };
    });
  }, [servicios, unidadesRegistradas]);

  const listaUnidades = useMemo(
    () => Array.from(unidadesRegistradas).sort(),
    [unidadesRegistradas],
  );

  const horasDisponibles = useMemo(() => {
    const horas = new Set<string>();
    serviciosVisibles.forEach((servicio) => {
      if (servicio.horainicio) horas.add(servicio.horainicio);
    });
    return Array.from(horas).sort();
  }, [serviciosVisibles]);

  const tiposUnidadDisponibles = useMemo(() => {
    const tipos = new Set<string>();
    serviciosVisibles.forEach((servicio) => {
      if (servicio.tipounidad) tipos.add(servicio.tipounidad);
    });
    return Array.from(tipos).sort();
  }, [serviciosVisibles]);

  const valorColumna = useCallback(
    (servicio: ServicioTurismoVista, columna: ColumnaFiltrable): string =>
      (servicio[columna] as string | null) || '',
    [],
  );

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

  const conteosEstado = useMemo(() => {
    let f = 0;
    let vc = 0;
    let cc = 0;
    let placaNoRegistrada = 0;
    serviciosVisibles.forEach((servicio) => {
      const est = calcularEstado(servicio);
      if (est === 'Finalizado por Conductor') f++;
      else if (est === 'Visto por Conductor') vc++;
      else if (est === 'Confirmado por Conductor') cc++;
      if (servicio.placaNoRegistrada) placaNoRegistrada++;
    });
    return { F: f, VC: vc, CC: cc, PLACA_DESCONOCIDA: placaNoRegistrada };
  }, [serviciosVisibles]);

  const totalPilotos = useMemo(() => {
    const pilotos = new Set<string>();
    serviciosVisibles.forEach((servicio) => {
      if (servicio.piloto && servicio.piloto.trim()) {
        pilotos.add(servicio.piloto.trim().toUpperCase());
      }
    });
    return pilotos.size;
  }, [serviciosVisibles]);

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
      const coincideEstado =
        estadoFiltro === null ||
        (estadoFiltro === 'F' &&
          calcularEstado(servicio) === 'Finalizado por Conductor') ||
        (estadoFiltro === 'VC' &&
          calcularEstado(servicio) === 'Visto por Conductor') ||
        (estadoFiltro === 'CC' &&
          calcularEstado(servicio) === 'Confirmado por Conductor') ||
        (estadoFiltro === 'PLACA_DESCONOCIDA' && servicio.placaNoRegistrada);
      return (
        coincideTexto &&
        coincideHora &&
        coincideTipoUnidad &&
        coincideColumnas &&
        coincideEstado
      );
    });
  }, [
    serviciosVisibles,
    busquedaTexto,
    horaFiltro,
    tipoUnidadFiltro,
    estadoFiltro,
    filtrosColumna,
    valorColumna,
  ]);

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
          if (opcionesAvanzadasDesbloqueado) cargarAuditoria(idservicio);
        }
        return nuevo;
      });
    },
    [cargarAuditoria, opcionesAvanzadasDesbloqueado],
  );

  const iniciarEdicion = useCallback((servicio: ServicioTurismoVista) => {
    setEditandoId((actual) => {
      if (actual !== null) return actual;
      setFormEdicion(construirFormDesdeServicio(servicio));
      setServicioEnEdicion(servicio);
      setMotivoEdicion('');
      return servicio.idservicio;
    });
  }, []);

  const cancelarEdicion = useCallback(() => {
    setEditandoId(null);
    setFormEdicion(null);
    setServicioEnEdicion(null);
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

    const valorOVacio = (valor: string) =>
      valor.trim() === '' ? null : valor.trim();

    const placaSinTocar =
      servicioEnEdicion !== null &&
      formEdicion.placa === (servicioEnEdicion.placaCombinada || '');

    let bus: string;
    let placa: string;
    if (placaSinTocar && servicioEnEdicion) {
      bus = servicioEnEdicion.bus || '';
      placa = servicioEnEdicion.placa || '';
    } else {
      const idxGuion = formEdicion.placa.indexOf('-');
      bus = formEdicion.placa
        ? idxGuion === -1
          ? formEdicion.placa
          : formEdicion.placa.slice(0, idxGuion)
        : '';
      placa = formEdicion.placa
        ? idxGuion === -1
          ? ''
          : formEdicion.placa.slice(idxGuion + 1)
        : '';
    }

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

    const params = new URLSearchParams({ limpiarNulos: 'true' });
    if (username) params.set('usuario', username);
    if (motivoEdicion.trim() !== '') params.set('motivo', motivoEdicion.trim());

    const manejarOffline = async () => {
      await encolarYAplicarOptimista({
        tipo: 'editar',
        idservicio: editandoId,
        payload: {
          campos: payload,
          usuario: username || undefined,
          motivo: motivoEdicion.trim() || undefined,
        },
        cambiosOptimistas: payload,
      });
      setAuditoriaPorServicio((prev) => {
        const { [editandoId]: _descartado, ...resto } = prev;
        return resto;
      });
      cancelarEdicion();
    };

    try {
      const res = await fetch(`${API_BASE}/${editandoId}?${params.toString()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok && esFalloDeRed(undefined, res)) {
        await manejarOffline();
        return;
      }

      const data = await res.json().catch(() => null);

      if (res.ok) {
        mostrarNotificacion(
          'success',
          data?.mensaje || 'Servicio actualizado correctamente',
        );

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
    } catch (err) {
      if (esFalloDeRed(err)) {
        await manejarOffline();
      } else {
        mostrarNotificacion(
          'error',
          'Error de conexión al actualizar el servicio',
        );
      }
    } finally {
      setGuardandoEdicion(false);
    }
  }, [
    cancelarEdicion,
    editandoId,
    encolarYAplicarOptimista,
    fecha,
    fetchServicios,
    formEdicion,
    servicioEnEdicion,
    motivoEdicion,
    mostrarNotificacion,
    username,
  ]);

  const confirmarCancelar = useCallback(async () => {
    if (!servicioACancelar) return;

    setCancelando(true);
    const idservicio = servicioACancelar.idservicio;

    const manejarOffline = async () => {
      await encolarYAplicarOptimista({
        tipo: 'cancelar',
        idservicio,
        cambiosOptimistas: { cancelado: 1 },
      });
      setServicioACancelar(null);
    };

    try {
      const res = await fetch(`${API_BASE}/${idservicio}/cancelar`, {
        method: 'PATCH',
      });

      if (!res.ok && esFalloDeRed(undefined, res)) {
        await manejarOffline();
        return;
      }

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
    } catch (err) {
      if (esFalloDeRed(err)) {
        await manejarOffline();
      } else {
        mostrarNotificacion('error', 'Error de conexión al cancelar el servicio');
      }
    } finally {
      setCancelando(false);
    }
  }, [encolarYAplicarOptimista, fecha, fetchServicios, mostrarNotificacion, servicioACancelar]);

  const ponerEnStandby = useCallback(
    async (servicio: ServicioTurismoVista) => {
      setProcesandoStandbyId(servicio.idservicio);
      const idservicio = servicio.idservicio;

      const manejarOffline = async () => {
        await encolarYAplicarOptimista({
          tipo: 'standby',
          idservicio,
          cambiosOptimistas: { standby: 1 },
        });
      };

      try {
        const res = await fetch(`${API_BASE}/${idservicio}/standby`, {
          method: 'PATCH',
        });

        if (!res.ok && esFalloDeRed(undefined, res)) {
          await manejarOffline();
          return;
        }

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
      } catch (err) {
        if (esFalloDeRed(err)) {
          await manejarOffline();
        } else {
          mostrarNotificacion('error', 'Error de conexión al poner en Stand By');
        }
      } finally {
        setProcesandoStandbyId(null);
      }
    },
    [encolarYAplicarOptimista, fecha, fetchServicios, mostrarNotificacion],
  );

  const reanudarServicio = useCallback(
    async (servicio: ServicioTurismoVista) => {
      setProcesandoStandbyId(servicio.idservicio);
      const idservicio = servicio.idservicio;

      const manejarOffline = async () => {
        await encolarYAplicarOptimista({
          tipo: 'reanudar',
          idservicio,
          cambiosOptimistas: { standby: 0 },
        });
      };

      try {
        const res = await fetch(`${API_BASE}/${idservicio}/reanudar`, {
          method: 'PATCH',
        });

        if (!res.ok && esFalloDeRed(undefined, res)) {
          await manejarOffline();
          return;
        }

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
      } catch (err) {
        if (esFalloDeRed(err)) {
          await manejarOffline();
        } else {
          mostrarNotificacion('error', 'Error de conexión al reanudar el servicio');
        }
      } finally {
        setProcesandoStandbyId(null);
      }
    },
    [encolarYAplicarOptimista, fecha, fetchServicios, mostrarNotificacion],
  );

  // El backend envía por WhatsApp y por push de la app (Firebase) a la vez, resolviendo el
  // celular/token contra la ficha del conductor en la BD (vía brevete) — acá solo se manda el
  // tipo de plantilla elegido, nunca un texto ni un destino, para no depender de (ni poder
  // pisar) esos datos desde el front.
  const notificarConductor = useCallback(
    async (servicio: ServicioTurismoVista, tipo: TipoPlantillaWhatsapp) => {
      setNotificandoConductorId(servicio.idservicio);
      try {
        const res = await fetch(`${API_BASE}/${servicio.idservicio}/notificar`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo }),
        });
        const data = await res.json().catch(() => null);

        mostrarNotificacion(
          res.ok ? 'success' : 'error',
          res.ok
            ? data?.mensaje || 'Notificación enviada al conductor'
            : data?.error || data?.mensaje || 'No se pudo enviar la notificación',
        );
      } catch {
        mostrarNotificacion('error', 'Error de conexión al notificar al conductor');
      } finally {
        setNotificandoConductorId(null);
      }
    },
    [mostrarNotificacion],
  );

  const solicitarEliminarCarga = useCallback(() => {
    if (!opcionesAvanzadasDesbloqueado) return;
    setMostrarModalEliminarCarga(true);
  }, [opcionesAvanzadasDesbloqueado]);

  const cancelarEliminarCarga = useCallback(() => {
    setMostrarModalEliminarCarga(false);
  }, []);

  const confirmarEliminarCarga = useCallback(async () => {
    const fechaLegible = isoToDdMmYyyy(fecha);
    setEliminandoCarga(true);

    try {
      const res = await fetch(`${API_BASE}/fecha/${fechaLegible}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => null);

      if (res.ok) {
        mostrarNotificacion(
          'success',
          data?.mensaje || 'Servicios de la fecha eliminados correctamente',
        );
        setMostrarModalEliminarCarga(false);
        fetchServicios(fecha);
      } else {
        mostrarNotificacion(
          'error',
          data?.error || data?.mensaje || 'Error al eliminar los servicios de la fecha',
        );
      }
    } catch {
      mostrarNotificacion(
        'error',
        'Error de conexión al eliminar los servicios de la fecha',
      );
    } finally {
      setEliminandoCarga(false);
    }
  }, [fecha, fetchServicios, mostrarNotificacion]);

  const crearServicio = useCallback(
    async (
      campos: Record<string, unknown>,
    ): Promise<{
      ok: boolean;
      offline: boolean;
      mensaje: string;
    }> => {
      const crearOffline = async () => {
        const idTemporal = generarIdTemporal();
        await encolarYAplicarOptimista({
          tipo: 'crear',
          idservicio: idTemporal,
          payload: { campos },
          servicioNuevo: construirServicioOptimista(idTemporal, campos),
        });
        return {
          ok: true,
          offline: true,
          mensaje: 'Guardado localmente. Se sincronizará cuando vuelva la conexión.',
        };
      };

      try {
        const res = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campos),
        });

        if (!res.ok && esFalloDeRed(undefined, res)) {
          return await crearOffline();
        }

        const data = await res.json().catch(() => null);

        if (res.ok) {
          fetchServicios(fecha);
          return {
            ok: true,
            offline: false,
            mensaje: data?.mensaje || 'Servicio creado correctamente',
          };
        }

        return {
          ok: false,
          offline: false,
          mensaje: data?.error || data?.mensaje || 'Error al crear el servicio',
        };
      } catch (err) {
        if (esFalloDeRed(err)) {
          return await crearOffline();
        }
        return {
          ok: false,
          offline: false,
          mensaje: 'Error de conexión al crear el servicio',
        };
      }
    },
    [encolarYAplicarOptimista, fecha, fetchServicios],
  );

  // Único flujo con envío automático de WhatsApp: la carga masiva por Excel. El celular
  // siempre sale de la ficha del conductor en la BD (por brevete/cobrevete), nunca de la
  // columna "celular"/"cocelular" del archivo. Si no hay conexión, se guarda localmente y
  // la notificación se envía cuando `sincronizarCola` termine de subir el lote.
  const cargarServiciosExcel = useCallback(
    async (
      registros: Record<string, unknown>[],
    ): Promise<{
      ok: boolean;
      offline: boolean;
      mensaje: string;
      insertados: number;
      notificacionesEnviadas: number;
    }> => {
      const cargarOffline = async () => {
        const idTemporal = generarIdTemporal();
        await encolarYAplicarOptimista({
          tipo: 'cargaExcel',
          idservicio: idTemporal,
          payload: { registros },
        });
        return {
          ok: true,
          offline: true,
          mensaje: 'Guardado localmente. Se sincronizará y notificará a los conductores cuando vuelva la conexión.',
          insertados: registros.length,
          notificacionesEnviadas: 0,
        };
      };

      try {
        const res = await fetch(API_LOTE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registros),
        });

        if (!res.ok && esFalloDeRed(undefined, res)) {
          return await cargarOffline();
        }

        const data = await res.json().catch(() => null);

        if (res.ok) {
          let notificacionesEnviadas = 0;
          const telefonos = resolverTelefonosConductoresDesdeBrevete(
            registros as { brevete?: string | null; cobrevete?: string | null }[],
            conductores,
          );
          if (telefonos.length > 0) {
            try {
              const resultadoWa = await enviarAlertasWhatsappLote(telefonos);
              notificacionesEnviadas = resultadoWa.enviados;
            } catch {
              // No crítico: los servicios ya quedaron guardados.
            }
          }

          fetchServicios(fecha);
          return {
            ok: true,
            offline: false,
            mensaje: data?.mensaje || 'Servicios insertados correctamente.',
            insertados: data?.insertados ?? registros.length,
            notificacionesEnviadas,
          };
        }

        return {
          ok: false,
          offline: false,
          mensaje: data?.error || data?.mensaje || 'Ocurrió un error al insertar los servicios.',
          insertados: 0,
          notificacionesEnviadas: 0,
        };
      } catch (err) {
        if (esFalloDeRed(err)) {
          return await cargarOffline();
        }
        return {
          ok: false,
          offline: false,
          mensaje: 'Error de conexión al enviar los servicios.',
          insertados: 0,
          notificacionesEnviadas: 0,
        };
      }
    },
    [conductores, encolarYAplicarOptimista, fecha, fetchServicios],
  );

  const hayEdicionActiva = editandoId !== null;

  return {
    fecha,
    setFecha,
    loading,
    loadingUnidades,
    error,
    usandoCache,
    pendientesCount,
    sincronizando,
    crearServicio,
    cargarServiciosExcel,
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
    estadoFiltro,
    setEstadoFiltro,
    conteosEstado,
    totalPilotos,
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
    notificandoConductorId,
    notificarConductor,
    notificaciones,
    claveOpcionesAvanzadas,
    setClaveOpcionesAvanzadas,
    opcionesAvanzadasDesbloqueado,
    verificarOpcionesAvanzadas,
    eliminandoCarga,
    mostrarModalEliminarCarga,
    solicitarEliminarCarga,
    cancelarEliminarCarga,
    confirmarEliminarCarga,
  };
}
