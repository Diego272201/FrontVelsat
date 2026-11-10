'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';
import '@/app/styles/sonner.css';
import { mensajeError, useServiciosRutasApi } from '../api';
import { Ruta } from '../types';
import EncabezadoRutas from './EncabezadoRutas';
import ModalRuta, { RutaForm, rutaFormAGuardar } from './ModalRuta';
import TablaRutas from './TablaRutas';

// Administración de rutas y paraderos (api/servicios-rutas: rutas).
const AdministrarRutasPage: React.FC = () => {
  const api = useServiciosRutasApi();
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [grupoFiltro, setGrupoFiltro] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
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

  const texto = busqueda.trim().toLowerCase();
  const rutasVisibles = rutas.filter(
    (r) =>
      (grupoFiltro === 'TODOS' || r.grupo === grupoFiltro) &&
      (texto === '' ||
        r.codigo.toLowerCase().includes(texto) ||
        r.nombre.toLowerCase().includes(texto)),
  );

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
      setRutas((prev) =>
        prev.map((r) =>
          r.id === ruta.id ? { ...r, activo: !ruta.activo } : r,
        ),
      );
    } catch (error) {
      toast.error(
        mensajeError(error, 'No se pudo cambiar el estado de la ruta'),
      );
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
    <div className="flex h-screen w-full flex-col bg-slate-100">
      <Toaster position="top-right" richColors />

      <EncabezadoRutas
        totalVisibles={rutasVisibles.length}
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        grupos={grupos}
        grupoFiltro={grupoFiltro}
        onGrupo={setGrupoFiltro}
        cantidadPorGrupo={(g) =>
          g === 'TODOS'
            ? rutas.length
            : rutas.filter((r) => r.grupo === g).length
        }
        nuevaDeshabilitada={!api.listo}
        onNueva={abrirNueva}
      />

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <TablaRutas
          rutas={rutasVisibles}
          cargando={cargando}
          hayRutas={rutas.length > 0}
          onEditar={abrirEdicion}
          onToggleActivo={toggleActivo}
        />
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
