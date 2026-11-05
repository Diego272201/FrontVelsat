'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageSquareText, RefreshCw, Search } from 'lucide-react';
import { Spinner } from '@nextui-org/react';
import { API_BASE } from '../constants';
import { MensajeTurismo } from '../types';
import { combinarPlaca, getIsoToday } from '../utils';

type FiltroTipo = 'todos' | 'observacion' | 'ampliacion';

function formatearHora(fecha: string): string {
  const match = /T(\d{2}:\d{2}:\d{2})/.exec(fecha);
  return match ? match[1] : fecha;
}

export default function ReporteObservacionesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fecha = searchParams.get('fecha') || getIsoToday();

  const [mensajes, setMensajes] = useState<MensajeTurismo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [nonce, setNonce] = useState(0);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<MensajeTurismo[]>(`${API_BASE}/mensajes/reporte`, {
        params: { fecha },
      });
      setMensajes(Array.isArray(data) ? data : []);
    } catch {
      setMensajes([]);
      setError('No se pudo cargar el reporte de observaciones.');
    } finally {
      setLoading(false);
    }
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar, nonce]);

  const filas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return mensajes.filter((m) => {
      if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false;
      if (!texto) return true;
      return [
        m.enviadoPorNombre,
        m.piloto,
        m.copiloto,
        m.texto,
        m.cliente,
        m.origen,
        m.destino,
        m.placa,
        m.bus,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(texto));
    });
  }, [mensajes, busqueda, filtroTipo]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-100">
      <div className="flex flex-shrink-0 items-center justify-between bg-[#113EB9] px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-white" />
          <h1 className="text-[14px] font-bold uppercase tracking-[0.01em] text-white">
            Reporte Observaciones — Servicios Turismo
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fecha}
            onChange={(e) => {
              if (e.target.value) router.replace(`?fecha=${e.target.value}`);
            }}
            className="h-8 rounded-md border border-white/30 bg-white/10 px-2 text-[12px] text-white focus:outline-none [color-scheme:dark]"
          />
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-[11px] font-bold text-[#113EB9] transition-colors hover:bg-blue-50 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar (conductor, texto, cliente, placa...)"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-8 w-72 rounded-md border border-gray-300 bg-white py-1 pl-8 pr-2 text-[12px] text-gray-700 placeholder-gray-400 focus:border-[#113EB9] focus:outline-none focus:ring-1 focus:ring-[#113EB9] sm:w-96"
          />
        </div>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[12px] text-gray-700"
        >
          <option value="todos">Todos los tipos</option>
          <option value="observacion">Observaciones</option>
          <option value="ampliacion">Ampliaciones</option>
        </select>
        <span className="ml-auto text-[12px] text-slate-500">
          {filas.length} mensaje{filas.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <p className="text-center text-[13px] text-rose-600">{error}</p>
        ) : filas.length === 0 ? (
          <p className="text-center text-[13px] text-slate-500">
            Sin observaciones recibidas en esta fecha.
          </p>
        ) : (
          <table className="w-full border-collapse overflow-hidden rounded-lg bg-white text-left text-[12px] shadow-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Hora</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Enviado por</th>
                <th className="px-3 py-2">Mensaje</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Servicio</th>
                <th className="px-3 py-2">Placa</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((m) => {
                const esAmpliacion = m.tipo === 'ampliacion';
                return (
                  <tr key={m.idmensaje} className="border-t border-slate-100 align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {formatearHora(m.fecha)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          esAmpliacion
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-[#113EB9]'
                        }`}
                      >
                        {esAmpliacion ? 'Ampliación' : 'Observación'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <span className="font-semibold">
                        {m.enviadoPorNombre || m.piloto || '—'}
                      </span>{' '}
                      <span className="text-slate-500">({m.enviadoPorRol || 'Piloto'})</span>
                    </td>
                    <td className="max-w-md px-3 py-2 text-slate-700">
                      {esAmpliacion && m.horas != null && (
                        <p className="font-semibold text-orange-600">
                          {m.horas} hora{m.horas === 1 ? '' : 's'}
                        </p>
                      )}
                      {m.texto && <p className="whitespace-pre-wrap">{m.texto}</p>}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{m.cliente || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">
                      <p>
                        {m.fechainicio || '—'} {m.horainicio || ''}
                      </p>
                      <p className="text-slate-400">
                        {m.origen || '—'} → {m.destino || '—'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {combinarPlaca(m.bus, m.placa) || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          m.atendido ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {m.atendido ? 'Atendida' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
