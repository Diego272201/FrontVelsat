'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { FaUserTie, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { HiCalendarDateRange } from 'react-icons/hi2';
import { MdSave } from 'react-icons/md';
import axios from 'axios';
import Swal from 'sweetalert2';

const API_BASE = 'https://do.velsat.pe:2083/api/Preplan';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const HORAS = Array.from(
  { length: 24 },
  (_, i) => `${String(i).padStart(2, '0')}:00`,
);

interface Conductor {
  codigo: number;
  apellidos: string;
}

interface HorarioDia {
  fecha: string; // "YYYY-MM-DD" en el front
  hora_inicio: string; // "HH:mm"
  tipo: 'N' | 'T' | 'P';
  modificado?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conductores: Conductor[];
  username: string;
}

export default function ModalAdministrarHorarios({
  isOpen,
  onClose,
  conductores,
  username,
}: Props) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1); // 1-12
  const [conductorActivo, setConductorActivo] = useState<Conductor | null>(
    null,
  );
  const [calendario, setCalendario] = useState<HorarioDia[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mesVacio, setMesVacio] = useState(false);

  // Para generación inicial
  const [horaBase, setHoraBase] = useState('06:00');
  const [turnoBase, setTurnoBase] = useState('');

  // Modal de edición de celda
  const [celdaEditando, setCeldaEditando] = useState<HorarioDia | null>(null);
  const [nuevaHora, setNuevaHora] = useState('');
  const [tipoEdicion, setTipoEdicion] = useState<'T' | 'P'>('T');

  // Solo seleccionar conductor inicial cuando el modal se abre
  // y no hay ninguno seleccionado aún
  useEffect(() => {
    if (isOpen && conductores.length > 0 && !conductorActivo) {
      setConductorActivo(conductores[0]);
    }
  }, [isOpen]); // ← solo depende de isOpen, no de conductores

  useEffect(() => {
    if (!isOpen) {
      setConductorActivo(null);
      setCalendario([]);
      setMesVacio(false);
    }
  }, [isOpen]);

  // Cargar calendario al cambiar conductor o mes/año
  const cargarCalendario = useCallback(async () => {
    if (!conductorActivo?.codigo) return;
    setCargando(true);
    setCalendario([]);
    setMesVacio(false);
    try {
      const res = await axios.get(
        `${API_BASE}/HorarioCalendario/${conductorActivo.codigo}`,
        {
          params: { anio, mes },
        },
      );
      const data: any[] = res.data;

      // ← Ignorar si data no es array válido (primera llamada con undefined)
      if (!data || !Array.isArray(data)) return;

      if (data.length === 0) {
        setMesVacio(true);
      } else {
        setMesVacio(false); // ← explícito
        setCalendario(
          data.map((d) => ({
            fecha: (d.fecha ?? d.Fecha).split('T')[0],
            hora_inicio: d.horaInicio ?? d.hora_inicio ?? d.HoraInicio,
            tipo: (d.tipo ?? d.Tipo) as 'N' | 'T' | 'P',
            modificado: false,
          })),
        );
      }
    } catch (err) {
      toast.error('Error al cargar el calendario');
    } finally {
      setCargando(false);
    }
  }, [conductorActivo?.codigo, anio, mes]);

  useEffect(() => {
    if (isOpen && conductorActivo) cargarCalendario();
  }, [conductorActivo, anio, mes, isOpen]);

  const handleMesAnterior = () => {
    if (mes === 1) {
      setMes(12);
      setAnio((a) => a - 1);
    } else setMes((m) => m - 1);
  };

  const handleMesSiguiente = () => {
    if (mes === 12) {
      setMes(1);
      setAnio((a) => a + 1);
    } else setMes((m) => m + 1);
  };

  // Generar calendario base para el mes
  const handleGenerarMes = async () => {
    if (!conductorActivo || !horaBase) return;
    setGuardando(true);
    try {
      await axios.post(`${API_BASE}/generar`, {
        idConductor: conductorActivo.codigo,
        horaInicio: horaBase,
        turno: turnoBase,
        anio,
        mes,
      });
      toast.success('Calendario generado');
      cargarCalendario();
    } catch {
      toast.error('Error al generar el calendario');
    } finally {
      setGuardando(false);
    }
  };

  // Abrir modal de edición de celda
  const handleClickCelda = (dia: HorarioDia) => {
    setCeldaEditando(dia);
    setNuevaHora(dia.hora_inicio);
    setTipoEdicion('T');
  };

  // Confirmar edición de celda
  const handleConfirmarEdicion = async () => {
    if (!celdaEditando || !conductorActivo) return;

    const fechaAPI = celdaEditando.fecha.split('-').reverse().join('/');

    const payload = {
      idConductor: conductorActivo.codigo,
      fecha: fechaAPI,
      horaInicio: nuevaHora,
      turno: '',
      tipo: tipoEdicion,
      aplicarDesdeAqui: tipoEdicion === 'P',
    };

    console.log('Payload enviado:', payload);
    console.log('URL:', `${API_BASE}/actualizar`);

    setGuardando(true);
    try {
      const res = await axios.put(`${API_BASE}/actualizar`, payload);
      console.log('Respuesta exitosa:', res.data);

      setCalendario((prev) =>
        prev.map((d) => {
          if (tipoEdicion === 'P') {
            return d.fecha >= celdaEditando.fecha
              ? { ...d, hora_inicio: nuevaHora, tipo: 'P', modificado: true }
              : d;
          } else {
            return d.fecha === celdaEditando.fecha
              ? { ...d, hora_inicio: nuevaHora, tipo: 'T', modificado: true }
              : d;
          }
        }),
      );

      toast.success(
        tipoEdicion === 'P'
          ? 'Horario actualizado desde este día'
          : 'Horario del día actualizado',
      );
      setCeldaEditando(null);
    } catch (err: any) {
      console.log('Error status:', err?.response?.status);
      console.log('Error data:', err?.response?.data);
      console.log('Error headers:', err?.response?.headers);
      toast.error('Error al actualizar');
    } finally {
      setGuardando(false);
    }
  };

  const handleCopiarMesTodos = async () => {
    const mesAnteriorNombre = MESES[mes === 1 ? 11 : mes - 2];
    const mesActualNombre = MESES[mes - 1];

    const result = await Swal.fire({
      title: '¿Copiar horarios?',
      html: `Se copiarán los horarios de <b>${mesAnteriorNombre}</b> → <b>${mesActualNombre}</b> para <b>todos los conductores</b>.<br/><br/><span style="font-size:12px;color:#6b7280">Solo conductores que ya tengan horarios en ${mesAnteriorNombre}.</span>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, copiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
    });

    if (!result.isConfirmed) return;

    setGuardando(true);
    const toastId = toast.loading(
      'Copiando horarios de todos los conductores...',
    );
    try {
      const res = await axios.post(`${API_BASE}/copiarMesTodos`, {
        anio,
        mes,
        codusuario: username,
      });
      toast.dismiss(toastId);
      toast.success(
        `${res.data.filasAfectadas} registros copiados correctamente`,
      );
      cargarCalendario();
    } catch {
      toast.dismiss(toastId);
      toast.error('Error al copiar horarios');
    } finally {
      setGuardando(false);
    }
  };

  const diasEnMes = new Date(anio, mes, 0).getDate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[90vh] w-[95vw] max-w-6xl flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-xl border-b bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-3">
          <div className="flex items-center gap-2 text-white">
            <HiCalendarDateRange className="h-5 w-5" />
            <span className="text-sm font-semibold">Administrar Horarios</span>
          </div>
          <button
            onClick={onClose}
            className="text-lg font-bold text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar conductores */}
          {conductores.length > 1 && (
            <div className="w-52 shrink-0 overflow-y-auto border-r bg-gray-50 p-2">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase text-gray-400">
                Conductores
              </p>
              {conductores.map((c) => (
                <button
                  key={c.codigo}
                  onClick={() => setConductorActivo(c)}
                  className={`mb-1 w-full rounded-md px-3 py-2 text-left text-[11px] transition-colors ${
                    conductorActivo?.codigo === c.codigo
                      ? 'bg-indigo-600 font-medium text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FaUserTie className="mb-0.5 mr-1.5 inline" />
                  {c.apellidos}
                </button>
              ))}
            </div>
          )}

          {/* Contenido principal */}
          <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
            {/* Conductor activo + navegación mes */}
            {/* Conductor activo + navegación mes */}
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">
                {conductorActivo?.apellidos}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleMesAnterior}
                  className="rounded p-1 hover:bg-gray-100"
                >
                  <FaChevronLeft className="h-3 w-3 text-gray-600" />
                </button>
                <span className="w-32 text-center text-sm font-medium text-gray-700">
                  {MESES[mes - 1]} {anio}
                </span>
                <button
                  onClick={handleMesSiguiente}
                  className="rounded p-1 hover:bg-gray-100"
                >
                  <FaChevronRight className="h-3 w-3 text-gray-600" />
                </button>

                {/* ← Botón global */}
                <button
                  onClick={handleCopiarMesTodos}
                  disabled={guardando}
                  className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <MdSave className="h-3 w-3" />
                  Copiar horarios del mes anterior
                </button>
              </div>
            </div>

            {/* Cargando */}
            {cargando && (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
                Cargando...
              </div>
            )}

            {/* Mes vacío → formulario de generación */}
            {!cargando && mesVacio && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <p className="text-sm text-gray-500">
                  No hay horarios para este mes. Define la hora base:
                </p>
                <div className="flex items-center gap-3">
                  <label className="text-[11px] text-gray-600">
                    Hora inicio:
                  </label>
                  <select
                    value={horaBase}
                    onChange={(e) => setHoraBase(e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1.5 text-[11px]"
                  >
                    {HORAS.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleGenerarMes}
                  disabled={guardando}
                  className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-[11px] font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <MdSave className="h-4 w-4" />
                  {guardando
                    ? 'Generando...'
                    : `Generar calendario de ${MESES[mes - 1]}`}
                </button>
              </div>
            )}

            {/* Calendario */}
            {!cargando && !mesVacio && (
              <div className="flex-1 overflow-auto">
                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(diasEnMes, 31)}, minmax(52px, 1fr))`,
                  }}
                >
                  {/* Headers de días */}
                  {calendario.map((dia) => {
                    const d = new Date(dia.fecha + 'T00:00:00');
                    return (
                      <div
                        key={`h-${dia.fecha}`}
                        className="text-center text-[9px] font-semibold text-gray-400"
                      >
                        {d.getDate()}
                        <br />
                        <span className="text-[8px]">
                          {
                            ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][
                              d.getDay()
                            ]
                          }
                        </span>
                      </div>
                    );
                  })}

                  {/* Celdas de hora */}
                  {calendario.map((dia) => (
                    <button
                      key={`c-${dia.fecha}`}
                      onClick={() => handleClickCelda(dia)}
                      className={`rounded border py-2 text-center text-[10px] font-medium transition-all hover:scale-105 hover:shadow-md ${
                        dia.tipo === 'T'
                          ? 'border-blue-300 bg-blue-100 text-blue-800'
                          : dia.tipo === 'P'
                            ? 'border-amber-300 bg-amber-100 text-amber-800'
                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-indigo-50'
                      } ${dia.modificado ? 'ring-1 ring-indigo-400' : ''}`}
                    >
                      {dia.hora_inicio}
                    </button>
                  ))}
                </div>

                {/* Leyenda */}
                <div className="mt-3 flex gap-4 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded border border-gray-300 bg-gray-100"></span>{' '}
                    Normal
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded border border-blue-300 bg-blue-100"></span>{' '}
                    Temporal (ese día)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded border border-amber-300 bg-amber-100"></span>{' '}
                    Permanente (desde ese día)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mini modal edición celda */}
      {celdaEditando && (
        <div className="z-60 fixed inset-0 flex items-center justify-center bg-black/30">
          <div className="w-72 rounded-xl bg-white p-5 shadow-xl">
            <p className="mb-3 text-sm font-semibold text-gray-700">
              Editar horario —{' '}
              {celdaEditando.fecha.split('-').reverse().join('/')}
            </p>

            <label className="mb-1 block text-[11px] text-gray-500">
              Nueva hora de inicio
            </label>
            <select
              value={nuevaHora}
              onChange={(e) => setNuevaHora(e.target.value)}
              className="mb-3 w-full rounded border border-gray-300 px-2 py-1.5 text-[12px]"
            >
              {HORAS.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>

            <label className="mb-1 block text-[11px] text-gray-500">
              Tipo de cambio
            </label>
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setTipoEdicion('T')}
                className={`flex-1 rounded border py-1.5 text-[11px] font-medium transition-colors ${
                  tipoEdicion === 'T'
                    ? 'border-blue-400 bg-blue-100 text-blue-800'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                Solo este día
              </button>
              <button
                onClick={() => setTipoEdicion('P')}
                className={`flex-1 rounded border py-1.5 text-[11px] font-medium transition-colors ${
                  tipoEdicion === 'P'
                    ? 'border-amber-400 bg-amber-100 text-amber-800'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                De aquí en adelante
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCeldaEditando(null)}
                className="flex-1 rounded border border-gray-200 py-1.5 text-[11px] text-gray-500 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEdicion}
                disabled={guardando}
                className="flex-1 rounded bg-indigo-600 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
