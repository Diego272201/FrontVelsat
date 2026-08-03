'use client';

import React from 'react';
import ModalCargaExcelTurismo from './ModalCargaExcelTurismo';
import ModalAgregarServicioTurismo from './ModalAgregarServicioTurismo';
import ModalConfirmarEliminarServicio from './ModalConfirmarEliminarServicio';
import NotificacionesFlotantes from './NotificacionesFlotantes';
import BarraFiltros from './BarraFiltros';
import TablaServicios from './TablaServicios';
import { useServiciosTurismo } from './useServiciosTurismo';

const ServiciosTurismoPage: React.FC = () => {
  const {
    fecha,
    setFecha,
    loading,
    loadingUnidades,
    error,
    serviciosVisibles,
    serviciosFiltrados,
    horasDisponibles,
    listaUnidades,
    busquedaPiloto,
    setBusquedaPiloto,
    horaFiltro,
    setHoraFiltro,
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
    servicioAEliminar,
    setServicioAEliminar,
    eliminando,
    confirmarEliminar,
    notificaciones,
  } = useServiciosTurismo();

  return (
    <div className="min-h-screen bg-gray-100">
      <NotificacionesFlotantes notificaciones={notificaciones} />

      <BarraFiltros
        totalServicios={serviciosFiltrados.length}
        fecha={fecha}
        onCambiarFecha={setFecha}
        busquedaPiloto={busquedaPiloto}
        onCambiarBusquedaPiloto={setBusquedaPiloto}
        horaFiltro={horaFiltro}
        onCambiarHoraFiltro={setHoraFiltro}
        horasDisponibles={horasDisponibles}
        deshabilitado={hayEdicionActiva}
        onAgregarServicio={() => setShowModalAgregar(true)}
        onCargarExcel={() => setShowModalCarga(true)}
      />

      <ModalCargaExcelTurismo
        isOpen={showModalCarga}
        onClose={() => setShowModalCarga(false)}
        onUploaded={() => fetchServicios(fecha)}
      />

      <ModalAgregarServicioTurismo
        isOpen={showModalAgregar}
        onClose={() => setShowModalAgregar(false)}
        onCreated={() => fetchServicios(fecha)}
        unidades={listaUnidades}
      />

      <div className="p-4">
        <TablaServicios
          cargando={loading}
          cargandoUnidades={loadingUnidades}
          error={error}
          servicios={serviciosFiltrados}
          totalSinFiltrar={serviciosVisibles.length}
          expandidos={expandidos}
          onToggleExpandido={toggleExpandido}
          editandoId={editandoId}
          formEdicion={formEdicion}
          guardandoEdicion={guardandoEdicion}
          onCambioCampo={actualizarCampoEdicion}
          onIniciarEdicion={iniciarEdicion}
          onCancelarEdicion={cancelarEdicion}
          onGuardarEdicion={guardarEdicion}
          onSolicitarEliminar={setServicioAEliminar}
        />
      </div>

      <ModalConfirmarEliminarServicio
        servicio={servicioAEliminar}
        eliminando={eliminando}
        onCancelar={() => setServicioAEliminar(null)}
        onConfirmar={confirmarEliminar}
      />
    </div>
  );
};

export default ServiciosTurismoPage;
