'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Notificacion } from '../types';
import { formatoFechaHora } from '../utils';
import { useNotificaciones } from './useNotificaciones';
import { CATEGORIA_CLASE } from './constantes';

// Campana de la cabecera: contador de no leídas, aviso al llegar una nueva y lista de las últimas.
const CampanaNotificaciones: React.FC = () => {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  const { noLeidas, recientes } = useNotificaciones((n: Notificacion) => {
    const quien = [n.conductorNombre, n.deviceID].filter(Boolean).join(' · ');
    toast(n.titulo, {
      description: [quien, n.paraderoNombre, n.comentario].filter(Boolean).join(' — ') || undefined,
      duration: 10000,
    });
  });

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [abierto]);

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/15"
        title="Notificaciones de los conductores"
      >
        <Bell className="h-4 w-4" />
        {noLeidas > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-10 z-[2000] w-80 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-800 shadow-xl">
          <div className="border-b border-slate-100 px-3 py-2 text-[12px] font-semibold">
            Notificaciones {noLeidas > 0 && <span className="text-red-600">({noLeidas} sin leer)</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {recientes.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12px] text-slate-500">Sin notificaciones</p>
            ) : (
              recientes.map((n) => (
                <div key={n.id} className={`border-b border-slate-100 px-3 py-2 ${n.leida ? '' : 'bg-blue-50/60'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${CATEGORIA_CLASE[n.categoria]}`}>
                      {n.categoria}
                    </span>
                    <span className="truncate text-[12px] font-semibold">{n.titulo}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {[n.conductorNombre, n.deviceID, n.paraderoNombre].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatoFechaHora(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
          <Link
            href="/trackvelnew/serviciosrutas/notificaciones"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-slate-50 px-3 py-2 text-center text-[12px] font-semibold text-[#113EB9] hover:bg-slate-100"
          >
            Ver historial y administrar mensajes
          </Link>
        </div>
      )}
    </div>
  );
};

export default CampanaNotificaciones;
