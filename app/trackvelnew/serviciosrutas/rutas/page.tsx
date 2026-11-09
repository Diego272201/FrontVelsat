'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { mensajeError, useServiciosRutasApi } from '../api';
import { Ruta } from '../types';
import ModalRuta, { RutaForm, rutaFormAGuardar } from './ModalRuta';

// Administración de rutas y paraderos (api/servicios-rutas: rutas).
const AdministrarRutasPage: React.FC = () => {
  const api = useServiciosRutasApi();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [grupoFiltro, setGrupoFiltro] = useState<string>('TODOS');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [rutaEditando, setRutaEditando] = useState<Ruta | null>(null);

  const cargarRutas = useCallback(async () => {
    if (!api.listo) return;
    try {
      setRutas(await api.getRutas(true));
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudieron cargar las rutas'));
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => {
    cargarRutas();
  }, [cargarRutas]);

  // Los grupos salen de las rutas existentes, así un grupo nuevo aparece solo.
  const grupos = Array.from(new Set(rutas.map((r) => r.grupo))).sort();

  const rutasVisibles = rutas.filter((r) => grupoFiltro === 'TODOS' || r.grupo === grupoFiltro);

  const abrirNueva = () => {
    setRutaEditando(null);
    setModalAbierto(true);
  };

  // El listado no trae los paraderos: se pide el detalle de la ruta antes de editar.
  const abrirEdicion = async (ruta: Ruta) => {
    try {
      setRutaEditando(await api.getRuta(ruta.id));
      setModalAbierto(true);
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo cargar la ruta'));
    }
  };

  // No se borran rutas: se activan / desactivan (conservan su historial de servicios).
  const toggleActivo = async (ruta: Ruta) => {
    try {
      await api.setRutaActiva(ruta.id, !ruta.activo);
      setRutas((prev) => prev.map((r) => (r.id === ruta.id ? { ...r, activo: !ruta.activo } : r)));
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo cambiar el estado de la ruta'));
    }
  };

  const handleGuardar = async (form: RutaForm) => {
    const datos = rutaFormAGuardar(form);

    setGuardando(true);
    try {
      if (rutaEditando) {
        await api.actualizarRuta(rutaEditando.id, datos);
      } else {
        await api.crearRuta(datos);
      }
      setModalAbierto(false);
      toast.success('Ruta guardada');
      await cargarRutas();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar la ruta'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-gray-100">
      <Toaster position="top-right" richColors />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-3">
          <Link
            href="/trackvelnew/serviciosrutas"
            className="flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-[12px] font-medium text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Servicios
          </Link>
          <div>
            <h1 className="text-[15px] font-bold text-gray-800">Administrar rutas</h1>
            <p className="text-[11.5px] text-gray-500">{rutasVisibles.length} rutas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={grupoFiltro}
            onChange={(e) => setGrupoFiltro(e.target.value)}
            className="h-8 rounded-md border border-gray-300 px-2 text-[12px] text-gray-800"
          >
            <option value="TODOS">Todos los grupos</option>
            {grupos.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={abrirNueva}
            disabled={!api.listo}
            className="flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[12px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva ruta
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        <div className="overflow-auto rounded-md border border-gray-300 bg-white">
          <table className="w-full border-collapse text-[12px]">
            <thead className="sticky top-0 bg-slate-100 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2 font-semibold">Código</th>
                <th className="px-3 py-2 font-semibold">Nombre</th>
                <th className="px-3 py-2 font-semibold">Grupo</th>
                <th className="px-3 py-2 font-semibold">Sentido</th>
                <th className="px-3 py-2 font-semibold">Pareja</th>
                <th className="px-3 py-2 font-semibold">Paraderos</th>
                <th className="px-3 py-2 font-semibold">Duración</th>
                <th className="px-3 py-2 font-semibold">Distancia</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rutasVisibles.map((r) => (
                <tr
                  key={r.id}
                  className={`border-t border-gray-100 hover:bg-slate-50 ${r.activo ? '' : 'text-gray-400'}`}
                >
                  <td className="px-3 py-2 font-medium">{r.codigo}</td>
                  <td className="px-3 py-2">{r.nombre}</td>
                  <td className="px-3 py-2">{r.grupo}</td>
                  <td className="px-3 py-2">{r.sentido === 'REGRESO' ? 'Regreso' : 'Ida'}</td>
                  <td className="px-3 py-2">{r.rutaParejaCodigo ?? '—'}</td>
                  <td className="px-3 py-2">{r.cantidadParaderos}</td>
                  <td className="px-3 py-2">{r.duracionMin} min</td>
                  <td className="px-3 py-2">
                    {r.distanciaKm != null ? `${r.distanciaKm} km` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleActivo(r)}
                      title={r.activo ? 'Desactivar ruta' : 'Activar ruta'}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        r.activo
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {r.activo ? 'Activa' : 'Inactiva'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => abrirEdicion(r)}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-300 px-2 text-[12px] font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {!cargando && rutasVisibles.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                    No hay rutas. Crea la primera con “Nueva ruta”.
                  </td>
                </tr>
              )}
              {cargando && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                    Cargando rutas…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalRuta
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        ruta={rutaEditando}
        grupos={grupos}
        rutas={rutas}
        guardando={guardando}
        onGuardar={handleGuardar}
      />
    </div>
  );
};

export default AdministrarRutasPage;
