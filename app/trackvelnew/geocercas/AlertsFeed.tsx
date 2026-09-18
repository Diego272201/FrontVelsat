'use client';
import React from 'react';
import { BellRing, LogOut, X } from 'lucide-react';
import { GeofenceAlert } from './types';

interface AlertsFeedProps {
  alerts: GeofenceAlert[];
  onDismiss: (id: string) => void;
}

export default function AlertsFeed({ alerts, onDismiss }: AlertsFeedProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-5 right-5 z-30 flex w-[310px] flex-col gap-2">
      {alerts.map((alert) => {
        const isEnter = alert.kind === 'enter';
        return (
          <div
            key={alert.id}
            className="geocercas-alert pointer-events-auto flex items-start gap-2.5 rounded-lg border-l-4 bg-white/97 px-3 py-2.5 shadow-xl backdrop-blur-md"
            style={{ borderLeftColor: isEnter ? alert.color : '#94a3b8' }}
          >
            <div
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: isEnter ? `${alert.color}1a` : '#f1f5f9',
                color: isEnter ? alert.color : '#64748b',
              }}
            >
              {isEnter ? <BellRing size={14} /> : <LogOut size={14} />}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-gray-800">
                {alert.vehicleId}{' '}
                <span className="font-medium text-gray-500">
                  {isEnter ? 'ingresó a' : 'salió de'}
                </span>
              </p>
              <p className="truncate text-[11.5px] font-semibold text-gray-700">
                {alert.geofenceName}
              </p>
              <p className="mt-0.5 text-[10px] text-gray-400">
                {new Date(alert.at).toLocaleTimeString('es-PE')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(alert.id)}
              title="Descartar"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
