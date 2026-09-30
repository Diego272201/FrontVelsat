'use client';

import React from 'react';
import { MessageSquareText, CalendarClock, X } from 'lucide-react';
import { MensajeTurismo } from './types';
import { combinarPlaca } from './utils';

const AlertasMensajesTurismo: React.FC<{
  alertas: MensajeTurismo[];
  onAbrir: (mensaje: MensajeTurismo) => void;
  onCerrar: (idmensaje: number) => void;
}> = ({ alertas, onAbrir, onCerrar }) => {
  if (alertas.length === 0) return null;

  return (
    <div className="fixed right-4 top-16 z-[60] w-80 space-y-2">
      {alertas.map((mensaje) => {
        const esAmpliacion = mensaje.tipo === 'ampliacion';
        const placaCombinada = combinarPlaca(mensaje.bus, mensaje.placa);

        return (
          <button
            key={mensaje.idmensaje}
            onClick={() => onAbrir(mensaje)}
            className={`block w-full rounded-lg border-l-4 bg-white p-3 text-left shadow-lg transition-transform hover:-translate-y-0.5 ${
              esAmpliacion ? 'border-orange-500' : 'border-[#113EB9]'
            }`}
          >
            <div className="flex items-start gap-2">
              <div
                className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                  esAmpliacion ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-[#113EB9]'
                }`}
              >
                {esAmpliacion ? (
                  <CalendarClock className="h-4 w-4" />
                ) : (
                  <MessageSquareText className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-slate-700">
                  {esAmpliacion ? 'Solicitud: Ampliación de servicio' : 'Observación del conductor'}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {placaCombinada || mensaje.brevete || 'Servicio'} · {mensaje.cliente || 'Sin cliente'}
                </p>
                {esAmpliacion && mensaje.horas != null && (
                  <p className="text-[11px] font-semibold text-orange-600">
                    {mensaje.horas} hora{mensaje.horas === 1 ? '' : 's'}
                  </p>
                )}
                {mensaje.texto && (
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{mensaje.texto}</p>
                )}
              </div>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onCerrar(mensaje.idmensaje);
                }}
                title="Descartar sin ver el detalle"
                className="flex-shrink-0 rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default AlertasMensajesTurismo;
