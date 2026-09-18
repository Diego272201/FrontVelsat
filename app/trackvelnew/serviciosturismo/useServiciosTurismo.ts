import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUsername } from '@/hooks/useUsername';
import { API_BASE, API_TAXI, API_UNIDADES, CLAVE_OPCIONES_AVANZADAS } from './constants';
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
import {
  enviarAlertasWhatsappLote,
  MENSAJE_NUEVO_SERVICIO,
  MENSAJE_SERVICIO_MODIFICADO,
  ResultadoAlertasWhatsapp,
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

// Arma un ServicioTurismo "de vista previa" a partir del payload de creación, para mostrarlo
// en la tabla de inmediato mientras el POST real está pendiente de sincronizar.
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

  // true cuando la tabla se está mostrando desde IndexedDB porque el último intento de traer
  // la lista real falló por red/backend caído (no es un estado de error: hay data para mostrar).
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

  // Filtros de columna al estilo Excel: por columna, null = sin filtro (se muestra todo),
  // o un array con los valores exactos (ya normalizados con trim) que deben quedar visibles.
  const [filtrosColumna, setFiltrosColumna] = useState<
    Partial<Record<ColumnaFiltrable, string[] | null>>
  >({});

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formEdicion, setFormEdicion] = useState<EditFormServicio | null>(null);
  // Servicio tal como estaba al entrar a edición: permite reenviar bus/placa sin reformatear
  // cuando el usuario no tocó el selector de unidad (ver guardarEdicion).
  const [servicioEnEdicion, setServicioEnEdicion] =
    useState<ServicioTurismoVista | null>(null);
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

  // "Opciones avanzadas": clave hardcodeada que destraba el historial de cambios y el botón
  // "Eliminar carga". Solo vive en memoria (useState): sobrevive a un fetchServicios (ej. click en
  // "Consultar") porque el hook no se remonta, pero se pierde al recargar o cerrar la página.
  // El desbloqueo no es automático al tipear: se confirma con un botón (verificarOpcionesAvanzadas).
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
      // Un solo input de fecha en la UI: se envía el mismo valor como fechaInicio y fechaFin.
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
          // Backend caído/en mantenimiento (502/503/504): mismo tratamiento que sin red.
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
      // Sin red o backend caído: se muestra la última data conocida de esta fecha (si existe)
      // en vez de vaciar la tabla. Importante: NO se resetean los filtros del usuario en este
      // camino, a diferencia de una carga exitosa.
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

  // Encola una mutación que no se pudo enviar por falta de red/backend caído, y refleja el
  // cambio de inmediato en la tabla (optimistic update) marcado como "pendiente de sincronizar".
  // servicioNuevo se usa para creación (inserta una fila con id temporal negativo); para el resto
  // de operaciones se mergean cambiosOptimistas sobre el servicio existente.
  const encolarYAplicarOptimista = useCallback(
    async (params: {
      tipo: TipoOperacionPendiente;
      idservicio: number;
      payload?: OperacionPendiente['payload'];
      cambiosOptimistas?: Partial<ServicioTurismo>;
      servicioNuevo?: ServicioTurismo;
      celularParaWhatsapp?: string | null;
      mensajeWhatsapp?: string;
    }) => {
      const operacion: OperacionPendiente = {
        id: generarIdOperacion(),
        tipo: params.tipo,
        idservicio: params.idservicio,
        fecha,
        payload: params.payload,
        celularParaWhatsapp: params.celularParaWhatsapp ?? null,
        mensajeWhatsapp: params.mensajeWhatsapp,
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

  // Recorre la cola en orden y reintenta cada operación contra el backend real. Se detiene ante
  // el primer fallo de red (probablemente seguimos sin conexión); un error de negocio al
  // sincronizar se descarta de la cola (no se reintenta indefinidamente) y se avisa al usuario.
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

          if (op.celularParaWhatsapp) {
            enviarAlertasWhatsappLote([op.celularParaWhatsapp], op.mensajeWhatsapp)
              .then((resultadoWa) => {
                if (resultadoWa.enviados > 0) {
                  mostrarNotificacion(
                    'success',
                    'Alerta de WhatsApp enviada al piloto (cambio ya sincronizado)',
                  );
                }
              })
              .catch(() => {});
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
  }, [fecha, fetchServicios, mostrarNotificacion]);

  // Al montar: cuenta lo que haya quedado pendiente de una sesión anterior (persistido en
  // IndexedDB) para que el banner de "pendientes" no arranque en 0 mientras se sincroniza.
  useEffect(() => {
    listarOperacionesPendientes().then((pendientes) =>
      setPendientesCount(pendientes.length),
    );
  }, []);

  // Reintenta la cola al recuperar conexión, y además con un intervalo de respaldo: el evento
  // "online" del navegador no avisa si hay internet pero el backend sigue caído/en mantenimiento.
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
          // localStorage puede no estar disponible (modo privado, cuota llena); no es crítico.
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

    // El selector de unidad muestra "bus-placa" ya normalizado (combinarPlaca le quita
    // puntuación a la placa para armar el código de unidad). Si el usuario no tocó ese
    // selector, reenviar bus/placa tal cual venían del servicio (sin pasarlos por el
    // split de abajo) evita que se pierda el formato original (ej. guiones en la placa)
    // y que el backend detecte un "cambio" falso que resaltaba la celda en negrita.
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

    // limpiarNulos=true: el formulario de edición envía el objeto completo, así que un campo
    // que quedó en blanco debe borrarse en la BD (no simplemente "no tocar" ese campo).
    // usuario/motivo quedan en la auditoría del backend por cada campo que realmente cambió.
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
        celularParaWhatsapp: formEdicion.celular.trim() || null,
        mensajeWhatsapp: MENSAJE_SERVICIO_MODIFICADO,
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

        if (formEdicion.celular.trim() !== '') {
          enviarAlertasWhatsappLote([formEdicion.celular], MENSAJE_SERVICIO_MODIFICADO)
            .then((resultado) => {
              if (resultado.total === 0) {
                mostrarNotificacion(
                  'error',
                  'Celular del piloto inválido: no se envió la alerta de WhatsApp',
                );
              } else if (resultado.enviados > 0) {
                mostrarNotificacion('success', 'Alerta de WhatsApp enviada al piloto');
              } else {
                mostrarNotificacion(
                  'error',
                  'No se pudo enviar la alerta de WhatsApp al piloto',
                );
              }
            })
            .catch((error) => {
              console.error('Error al enviar alerta de WhatsApp:', error);
              mostrarNotificacion(
                'error',
                'Error de conexión al enviar la alerta de WhatsApp',
              );
            });
        }

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

  // Borra físicamente TODOS los servicios de la fecha consultada (deshacer una carga de Excel
  // completa). Requiere haber destrabado "Opciones avanzadas". Acción irreversible: se confirma
  // con ModalConfirmarEliminarCarga antes de llamar al endpoint.
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

  // Crea un servicio nuevo. Si no hay red/backend, lo guarda con un id temporal (negativo) y
  // lo encola para sincronizar; el WhatsApp al piloto recién se dispara cuando eso ocurra de
  // verdad. Usada por ModalAgregarServicioTurismo, que arma "campos" a partir de su formulario.
  const crearServicio = useCallback(
    async (
      campos: Record<string, unknown>,
      celularPiloto: string,
    ): Promise<{
      ok: boolean;
      offline: boolean;
      mensaje: string;
      whatsapp: ResultadoAlertasWhatsapp | null;
    }> => {
      const crearOffline = async () => {
        const idTemporal = generarIdTemporal();
        await encolarYAplicarOptimista({
          tipo: 'crear',
          idservicio: idTemporal,
          payload: { campos },
          servicioNuevo: construirServicioOptimista(idTemporal, campos),
          celularParaWhatsapp: celularPiloto.trim() || null,
          mensajeWhatsapp: MENSAJE_NUEVO_SERVICIO,
        });
        return {
          ok: true,
          offline: true,
          mensaje: 'Guardado localmente. Se sincronizará cuando vuelva la conexión.',
          whatsapp: null,
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
          let whatsapp: ResultadoAlertasWhatsapp | null = null;
          if (celularPiloto.trim() !== '') {
            try {
              whatsapp = await enviarAlertasWhatsappLote([celularPiloto]);
            } catch (error) {
              console.error('Error al enviar alerta de WhatsApp:', error);
            }
          }
          fetchServicios(fecha);
          return {
            ok: true,
            offline: false,
            mensaje: data?.mensaje || 'Servicio creado correctamente',
            whatsapp,
          };
        }

        return {
          ok: false,
          offline: false,
          mensaje: data?.error || data?.mensaje || 'Error al crear el servicio',
          whatsapp: null,
        };
      } catch (err) {
        if (esFalloDeRed(err)) {
          return await crearOffline();
        }
        return {
          ok: false,
          offline: false,
          mensaje: 'Error de conexión al crear el servicio',
          whatsapp: null,
        };
      }
    },
    [encolarYAplicarOptimista, fecha, fetchServicios],
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
