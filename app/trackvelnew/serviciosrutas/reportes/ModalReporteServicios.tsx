'use client';

import React, { useEffect, useState } from 'react';
import { CalendarDays, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import BaseModal from '@/app/components/ui/BaseModal';
import { useApi } from '@/context/ApiContext';
import { mensajeError, useServiciosRutasApi } from '../api';
import { getIsoDesplazado, getIsoToday } from '../utils';
import {
  descargarReporteServicios,
  diasDelRango,
  MAX_DIAS_REPORTE_SERVICIOS,
} from './reporteServiciosExcel';

interface ModalReporteServiciosProps {
  isOpen: boolean;
  onClose: () => void;
}

// Reporte de servicios: solo se descarga en Excel (no se visualiza en la web).
const ModalReporteServicios: React.FC<ModalReporteServiciosProps> = ({ isOpen, onClose }) => {
  const api = useServiciosRutasApi();
  const { baseUrl } = useApi();
  const [desdeIso, setDesdeIso] = useState(getIsoDesplazado(-6));
  const [hastaIso, setHastaIso] = useState(getIsoToday());
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDesdeIso(getIsoDesplazado(-6));
      setHastaIso(getIsoToday());
    }
  }, [isOpen]);

  const dias = diasDelRango(desdeIso, hastaIso);
  const error =
    !desdeIso || !hastaIso
      ? 'Selecciona las fechas'
      : dias < 1
        ? 'La fecha final no puede ser anterior a la inicial'
        : dias > MAX_DIAS_REPORTE_SERVICIOS
          ? `El rango máximo es de ${MAX_DIAS_REPORTE_SERVICIOS} días (seleccionaste ${dias})`
          : null;

  const descargar = async () => {
    if (error || !api.listo) return;
    setGenerando(true);
    try {
      const reporte = await api.getReporteServicios(desdeIso, hastaIso);
      const res = await descargarReporteServicios(reporte.servicios, baseUrl, api.cuenta, desdeIso, hastaIso);
      if (res.filas === 0) {
        toast.warning('No hay servicios finalizados o en curso en ese rango');
      } else {
        toast.success(`Reporte descargado (${res.filas} servicios)`);
        if (res.consultasKmFallidas > 0 || res.kmSinCalcular > 0) {
          toast.warning(
            res.consultasKmFallidas > 0
              ? 'No se pudo consultar el kilometraje de algunos servicios; esas filas quedaron sin KM'
              : `${res.kmSinCalcular} servicio(s) quedaron sin KM por no tener hora de inicio o fin`,
          );
        }
        onClose();
      }
    } catch (e) {
      toast.error(mensajeError(e, 'No se pudo generar el reporte'));
    } finally {
      setGenerando(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Reporte de servicios"
      subtitle="Se descarga en Excel con el kilometraje de cada servicio"
      icon={<FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
      iconBgColor="bg-emerald-100"
      size="lg"
      confirmText="Descargar Excel"
      loadingText="Generando..."
      confirmIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
      onConfirm={descargar}
      isLoading={generando}
      isConfirmDisabled={error !== null || !api.listo}
      isDismissable={false}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px]">
          <CalendarDays className="h-4 w-4 shrink-0 text-[#113EB9]" />
          <input
            type="date"
            value={desdeIso}
            max={hastaIso || undefined}
            onChange={(e) => setDesdeIso(e.target.value)}
            className="cursor-pointer bg-transparent font-semibold text-slate-800 outline-none"
            title="Fecha desde"
          />
          <span className="px-1 text-[12px] font-semibold text-slate-400">al</span>
          <input
            type="date"
            value={hastaIso}
            min={desdeIso || undefined}
            onChange={(e) => setHastaIso(e.target.value)}
            className="cursor-pointer bg-transparent font-semibold text-slate-800 outline-none"
            title="Fecha hasta"
          />
        </div>

        {error ? (
          <p className="text-[12px] font-medium text-red-600">{error}</p>
        ) : (
          <p className="text-[12px] text-gray-500">
            {dias} {dias === 1 ? 'día' : 'días'} seleccionados (máximo {MAX_DIAS_REPORTE_SERVICIOS}). Incluye los servicios
            finalizados y en curso.
          </p>
        )}
      </div>
    </BaseModal>
  );
};

export default ModalReporteServicios;
