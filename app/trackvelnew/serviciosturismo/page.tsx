'use client';

import React from 'react';
import ModalCargaExcelTurismo from './ModalCargaExcelTurismo';
import ModalAgregarServicioTurismo from './ModalAgregarServicioTurismo';
import ModalConfirmarCancelarServicio from './ModalConfirmarCancelarServicio';
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
    tiposUnidadDisponibles,
    listaUnidades,
    conductores,
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
    procesandoStandbyId,
    ponerEnStandby,
    reanudarServicio,
    notificaciones,
  } = useServiciosTurismo();

  return (
    <div className="min-h-screen bg-gray-100">
      <NotificacionesFlotantes notificaciones={notificaciones} />

      <BarraFiltros
        totalServicios={serviciosFiltrados.length}
        fecha={fecha}
        onCambiarFecha={setFecha}
        busquedaTexto={busquedaTexto}
        onCambiarBusquedaTexto={setBusquedaTexto}
        horaFiltro={horaFiltro}
        onCambiarHoraFiltro={setHoraFiltro}
        horasDisponibles={horasDisponibles}
        tipoUnidadFiltro={tipoUnidadFiltro}
        onCambiarTipoUnidadFiltro={setTipoUnidadFiltro}
        tiposUnidadDisponibles={tiposUnidadDisponibles}
        deshabilitado={hayEdicionActiva}
        onConsultar={() => fetchServicios(fecha)}
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
          unidades={listaUnidades}
          conductores={conductores}
          expandidos={expandidos}
          onToggleExpandido={toggleExpandido}
          editandoId={editandoId}
          formEdicion={formEdicion}
          guardandoEdicion={guardandoEdicion}
          onCambioCampo={actualizarCampoEdicion}
          onIniciarEdicion={iniciarEdicion}
          onCancelarEdicion={cancelarEdicion}
          onGuardarEdicion={guardarEdicion}
          onSolicitarCancelar={setServicioACancelar}
          onPonerEnStandby={ponerEnStandby}
          onReanudar={reanudarServicio}
          procesandoStandbyId={procesandoStandbyId}
        />
      </div>

      <ModalConfirmarCancelarServicio
        servicio={servicioACancelar}
        cancelando={cancelando}
        onCancelar={() => setServicioACancelar(null)}
        onConfirmar={confirmarCancelar}
      />
    </div>
  );
};

export default ServiciosTurismoPage;
