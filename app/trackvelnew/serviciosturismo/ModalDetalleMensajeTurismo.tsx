'use client';

import React from 'react';
import { X, MessageSquareText, CalendarClock, User, Car, MapPin } from 'lucide-react';
import { MensajeTurismo } from './types';
import { combinarPlaca } from './utils';
import DetalleCampo from './DetalleCampo';

const ModalDetalleMensajeTurismo: React.FC<{
  mensaje: MensajeTurismo | null;
  onCerrar: () => void;
  onAtender: (idmensaje: number) => void;
}> = ({ mensaje, onCerrar, onAtender }) => {
  if (!mensaje) return null;

  const esAmpliacion = mensaje.tipo === 'ampliacion';
  const placaCombinada = combinarPlaca(mensaje.bus, mensaje.placa);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className={`flex items-center justify-between px-4 py-3 ${
            esAmpliacion ? 'bg-orange-500' : 'bg-[#113EB9]'
          }`}
        >
          <div className="flex items-center gap-2 text-white">
            {esAmpliacion ? (
              <CalendarClock className="h-4.5 w-4.5" />
            ) : (
              <MessageSquareText className="h-4.5 w-4.5" />
            )}
            <span className="text-[13px] font-bold">
              {esAmpliacion ? 'Solicitud: Ampliación de servicio' : 'Observación del conductor'}
            </span>
          </div>
          <button onClick={onCerrar} className="text-white/80 hover:text-white">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {esAmpliacion && (
            <div className="rounded-lg bg-orange-50 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-500">
                Horas solicitadas
              </p>
              <p className="text-2xl font-bold text-orange-600">{mensaje.horas ?? '—'}</p>
            </div>
          )}

          {mensaje.texto && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {esAmpliacion ? 'Detalle' : 'Observación'}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-700">
                {mensaje.texto}
              </p>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
              <User className="h-3.5 w-3.5" /> Conductor
            </p>
            <div className="grid grid-cols-2 gap-2">
              <DetalleCampo label="Piloto" value={mensaje.piloto} />
              <DetalleCampo label="Brevete" value={mensaje.brevete} />
              <DetalleCampo label="Celular" value={mensaje.celular} />
              <DetalleCampo label="Placa" value={placaCombinada || null} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#113EB9]">
              <Car className="h-3.5 w-3.5" /> Servicio
            </p>
            <div className="grid grid-cols-2 gap-2">
              <DetalleCampo label="Fecha" value={mensaje.fechainicio} />
              <DetalleCampo label="Hora" value={mensaje.horainicio} />
              <DetalleCampo label="Cliente" value={mensaje.cliente} />
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-slate-600">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              <span className="truncate">
                {mensaje.origen || '—'} → {mensaje.destino || '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-100 p-4">
          <button
            onClick={onCerrar}
            className="flex-1 rounded-lg bg-slate-100 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-200"
          >
            Cerrar
          </button>
          <button
            onClick={() => onAtender(mensaje.idmensaje)}
            className="flex-1 rounded-lg bg-[#113EB9] py-2.5 text-[13px] font-semibold text-white hover:bg-[#0C2D78]"
          >
            Marcar como atendida
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleMensajeTurismo;
