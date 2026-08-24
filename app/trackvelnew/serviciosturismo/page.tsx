'use client';

import React from 'react';
import { CloudOff } from 'lucide-react';
import ModalCargaExcelTurismo from './ModalCargaExcelTurismo';
import ModalAgregarServicioTurismo from './ModalAgregarServicioTurismo';
import ModalConfirmarCancelarServicio from './ModalConfirmarCancelarServicio';
import ModalConfirmarEliminarCarga from './ModalConfirmarEliminarCarga';
import NotificacionesFlotantes from './NotificacionesFlotantes';
import BarraFiltros from './BarraFiltros';
import TablaServicios from './TablaServicios';
import { useServiciosTurismo } from './useServiciosTurismo';
import { isoToDdMmYyyy } from './utils';

const ServiciosTurismoPage: React.FC = () => {
  const {
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
    servicioACancelar,
    setServicioACancelar,
    cancelando,
    confirmarCancelar,
    procesandoStandbyId,
    ponerEnStandby,
    reanudarServicio,
    notificaciones,
    auditoriaPorServicio,
    cargandoAuditoriaId,
    claveOpcionesAvanzadas,
    setClaveOpcionesAvanzadas,
    opcionesAvanzadasDesbloqueado,
    verificarOpcionesAvanzadas,
    eliminandoCarga,
    mostrarModalEliminarCarga,
    solicitarEliminarCarga,
    cancelarEliminarCarga,
    confirmarEliminarCarga,
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
        claveOpcionesAvanzadas={claveOpcionesAvanzadas}
        onCambiarClaveOpcionesAvanzadas={setClaveOpcionesAvanzadas}
        opcionesAvanzadasDesbloqueado={opcionesAvanzadasDesbloqueado}
        onVerificarClaveOpcionesAvanzadas={verificarOpcionesAvanzadas}
        onEliminarCarga={solicitarEliminarCarga}
        eliminandoCarga={eliminandoCarga}
      />

      {(usandoCache || pendientesCount > 0) && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] font-medium text-amber-700">
          <CloudOff className="h-4 w-4 flex-shrink-0" />
          <span>
            {usandoCache && 'Sin conexión: mostrando la última información guardada. '}
            {pendientesCount > 0 &&
              `${pendientesCount} cambio${pendientesCount === 1 ? '' : 's'} pendiente${pendientesCount === 1 ? '' : 's'} de sincronizar.`}
            {sincronizando && ' Sincronizando…'}
          </span>
        </div>
      )}

      <ModalCargaExcelTurismo
        isOpen={showModalCarga}
        onClose={() => setShowModalCarga(false)}
        onUploaded={() => fetchServicios(fecha)}
      />

      <ModalAgregarServicioTurismo
        isOpen={showModalAgregar}
        onClose={() => setShowModalAgregar(false)}
        crearServicio={crearServicio}
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
          valoresPorColumna={valoresPorColumna}
          filtrosColumna={filtrosColumna}
          onCambiarFiltroColumna={setFiltroColumna}
          onLimpiarFiltrosColumna={limpiarFiltrosColumna}
          hayFiltrosColumnaActivos={hayFiltrosColumnaActivos}
          expandidos={expandidos}
          onToggleExpandido={toggleExpandido}
          editandoId={editandoId}
          formEdicion={formEdicion}
          motivoEdicion={motivoEdicion}
          onCambiarMotivoEdicion={setMotivoEdicion}
          guardandoEdicion={guardandoEdicion}
          onCambioCampo={actualizarCampoEdicion}
          onIniciarEdicion={iniciarEdicion}
          onCancelarEdicion={cancelarEdicion}
          onGuardarEdicion={guardarEdicion}
          onSolicitarCancelar={setServicioACancelar}
          onPonerEnStandby={ponerEnStandby}
          onReanudar={reanudarServicio}
          procesandoStandbyId={procesandoStandbyId}
          auditoriaPorServicio={auditoriaPorServicio}
          cargandoAuditoriaId={cargandoAuditoriaId}
          opcionesAvanzadasDesbloqueado={opcionesAvanzadasDesbloqueado}
        />
      </div>

      <ModalConfirmarCancelarServicio
        servicio={servicioACancelar}
        cancelando={cancelando}
        onCancelar={() => setServicioACancelar(null)}
        onConfirmar={confirmarCancelar}
      />

      <ModalConfirmarEliminarCarga
        abierto={mostrarModalEliminarCarga}
        fecha={isoToDdMmYyyy(fecha)}
        eliminando={eliminandoCarga}
        onCancelar={cancelarEliminarCarga}
        onConfirmar={confirmarEliminarCarga}
      />
    </div>
  );
};

export default ServiciosTurismoPage;
