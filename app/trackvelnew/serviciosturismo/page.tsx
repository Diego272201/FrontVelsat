'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { CloudOff } from 'lucide-react';
import ModalCargaExcelTurismo from './ModalCargaExcelTurismo';
import ModalAgregarServicioTurismo from './ModalAgregarServicioTurismo';
import ModalConfirmarCancelarServicio from './ModalConfirmarCancelarServicio';
import ModalConfirmarEliminarCarga from './ModalConfirmarEliminarCarga';
import NotificacionesFlotantes from './NotificacionesFlotantes';
import BarraFiltros from './BarraFiltros';
import TablaServicios from './TablaServicios';
import { useServiciosTurismo } from './useServiciosTurismo';
import { isoToDdMmYyyy, calcularEstado } from './utils';

const ServiciosTurismoPage: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

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

  const handleToggleEstadoFiltro = (sigla: string) => {
    setEstadoFiltro((prev) => (prev === sigla ? null : sigla));
  };

  const handleDescargarResumen = () => {
    if (serviciosFiltrados.length === 0) return;
    const dataExcel = serviciosFiltrados.map((s) => ({
      Fecha: s.fechainicio || '',
      'Hora Inicio': s.horainicio || '',
      'Hora Retorno': s.horaretorno || '',
      'Tipo Unidad': s.tipounidad || '',
      Placa: s.placaCombinada || '',
      Piloto: s.piloto || '',
      Brevete: s.brevete || '',
      Celular: s.celular || '',
      Copiloto: s.copiloto || '',
      Cliente: s.cliente || '',
      Grupo: s.grupo || '',
      'N° Pax': s.numpax || '',
      Origen: s.origen || '',
      Destino: s.destino || '',
      'Guía Turista': s.guiaturista || '',
      'Vuelo Cliente': s.vuelocliente || '',
      Ejecutivo: s.ejecutivo || '',
      Cotización: s.cotizacion || '',
      Instrucciones: s.instrucciones || '',
      Indicaciones: s.indicaciones || '',
      Observaciones: s.observaciones || '',
      Estado: calcularEstado(s),
    }));

    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Servicios');
    XLSX.writeFile(
      wb,
      `Resumen_Servicios_Turismo_${isoToDdMmYyyy(fecha).replace(/\//g, '-')}.xlsx`,
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NotificacionesFlotantes notificaciones={notificaciones} />

      <BarraFiltros
        totalServicios={serviciosFiltrados.length}
        totalPilotos={totalPilotos}
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
        estadoFiltro={estadoFiltro}
        onToggleEstadoFiltro={handleToggleEstadoFiltro}
        conteosEstado={conteosEstado}
        isVisible={isVisible}
        onToggleVisible={() => setIsVisible((prev) => !prev)}
        deshabilitado={hayEdicionActiva}
        onConsultar={() => fetchServicios(fecha)}
        onDescargarResumen={handleDescargarResumen}
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
        cargarServiciosExcel={cargarServiciosExcel}
      />

      <ModalAgregarServicioTurismo
        isOpen={showModalAgregar}
        onClose={() => setShowModalAgregar(false)}
        crearServicio={crearServicio}
        unidades={listaUnidades}
      />

      <div className="w-full">
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
          onNotificarConductor={notificarConductor}
          notificandoConductorId={notificandoConductorId}
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
