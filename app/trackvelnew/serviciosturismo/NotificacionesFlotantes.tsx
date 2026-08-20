'use client';

import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Notificacion } from './types';

const NotificacionesFlotantes: React.FC<{ notificaciones: Notificacion[] }> = ({
  notificaciones,
}) => (
  <div className="fixed bottom-4 right-4 z-50 max-w-md space-y-2">
    {notificaciones.map((n) => (
      <div
        key={n.id}
        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[12px] font-medium shadow-sm ${
          n.tipo === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}
      >
        {n.tipo === 'success' ? (
          <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
        ) : (
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
        )}
        <span className="flex-1">{n.mensaje}</span>
      </div>
    ))}
  </div>
);

export default NotificacionesFlotantes;
