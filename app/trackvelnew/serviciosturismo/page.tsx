'use client';

import React, { useState } from 'react';
import { exportarExcelEstilizado, type ColumnaExcel } from './exportarExcel';
import { CloudOff } from 'lucide-react';
import ModalCargaExcelTurismo from './ModalCargaExcelTurismo';
import ModalAgregarServicioTurismo from './ModalAgregarServicioTurismo';
import ModalConfirmarCancelarServicio from './ModalConfirmarCancelarServicio';
import ModalConfirmarEliminarCarga from './ModalConfirmarEliminarCarga';
import NotificacionesFlotantes from './NotificacionesFlotantes';
import BarraFiltros from './BarraFiltros';
import TablaServicios from './TablaServicios';
import AlertasMensajesTurismo from './AlertasMensajesTurismo';
import ModalDetalleMensajeTurismo from './ModalDetalleMensajeTurismo';
import { useServiciosTurismo } from './useServiciosTurismo';
import { useMensajesTurismo } from './useMensajesTurismo';
import { MensajeTurismo } from './types';
import { isoToDdMmYyyy, calcularEstado, formatFechaHoraAuditoria } from './utils';

const ServiciosTurismoPage: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [mensajeAbierto, setMensajeAbierto] = useState<MensajeTurismo | null>(null);
  const { alertas, marcarAtendida } = useMensajesTurismo();

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
    const columnas: ColumnaExcel[] = [
      { header: '#', width: 6, align: 'center' },
      { header: 'Fecha', width: 12, align: 'center' },
      { header: 'Hora Inicio', width: 11, align: 'center' },
      { header: 'Hora Retorno', width: 12, align: 'center' },
      { header: 'Tipo Unidad', width: 16 },
      { header: 'Placa', width: 16 },
      { header: 'Piloto', width: 28 },
      { header: 'Brevete', width: 14 },
      { header: 'Celular', width: 14 },
      { header: 'Copiloto', width: 24 },
      { header: 'Cliente', width: 26 },
      { header: 'Grupo', width: 20 },
      { header: 'N° Pax', width: 8, align: 'center' },
      { header: 'Origen', width: 26 },
      { header: 'Destino', width: 26 },
      { header: 'Guía Turista', width: 22 },
      { header: 'Vuelo Cliente', width: 16 },
      { header: 'Ejecutivo', width: 20 },
      { header: 'Cotización', width: 14 },
      { header: 'Instrucciones', width: 34 },
      { header: 'Indicaciones', width: 34 },
      { header: 'Observaciones', width: 34 },
      { header: 'Estado', width: 26, align: 'center' },
      { header: 'Hora Inicio (Conductor)', width: 20, align: 'center', colorTexto: 'FF15803D' },
      { header: 'Hora Finalización', width: 20, align: 'center', colorTexto: 'FFB91C1C' },
    ];

    const filas = serviciosFiltrados.map((s, i) => [
      i + 1,
      s.fechainicio || '',
      s.horainicio || '',
      s.horaretorno || '',
      s.tipounidad || '',
      s.placaCombinada || '',
      s.piloto || '',
      s.brevete || '',
      s.celular || '',
      s.copiloto || '',
      s.cliente || '',
      s.grupo || '',
      s.numpax || '',
      s.origen || '',
      s.destino || '',
      s.guiaturista || '',
      s.vuelocliente || '',
      s.ejecutivo || '',
      s.cotizacion || '',
      s.instrucciones || '',
      s.indicaciones || '',
      s.observaciones || '',
      calcularEstado(s) as string,
      s.horainiciado ? formatFechaHoraAuditoria(s.horainiciado) : '',
      s.horafinalizado ? formatFechaHoraAuditoria(s.horafinalizado) : '',
    ]);

    const fechaTexto = isoToDdMmYyyy(fecha);
    exportarExcelEstilizado([{
      sheetName: 'Servicios',
      titulo: `VELSAT — Resumen de Servicios Turismo · ${fechaTexto}`,
      subtitulo: `Generado el ${new Date().toLocaleString('es-PE')}  ·  ${filas.length} servicio(s)  ·  ${totalPilotos} piloto(s)`,
      columnas,
      filas,
      columnaEstado: 22,
    }], `Resumen_Servicios_Turismo_${fechaTexto.replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      <NotificacionesFlotantes notificaciones={notificaciones} />

      <AlertasMensajesTurismo
        alertas={alertas}
        onAbrir={setMensajeAbierto}
        onCerrar={marcarAtendida}
      />

      <ModalDetalleMensajeTurismo
        mensaje={mensajeAbierto}
        onCerrar={() => setMensajeAbierto(null)}
        onAtender={(idmensaje) => {
          marcarAtendida(idmensaje);
          setMensajeAbierto(null);
        }}
      />

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
        onReporteKilometraje={() =>
          window.open(`/trackvelnew/serviciosturismo/reportekilometraje?fecha=${fecha}`, '_blank')
        }
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
