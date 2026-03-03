'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Truck, User, Calendar, AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Spinner } from '@nextui-org/react';
import { useSession } from 'next-auth/react';

interface DocumentoPorVencer {
  id: number;
  accountID: string;
  deviceID: string;
  tipo_documento: string;
  nombre_documento: string;
  archivo_url: string;
  fecha_vencimiento: string;
  observaciones: string | null;
  estado: string;
}

export default function DocumentosPorVencer() {
  const { data: session } = useSession();
  const username = session?.user?.username || '';
  const [docs, setDocs] = useState<DocumentoPorVencer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [closed, setClosed] = useState(false);

  const fetchDocumentosPorVencer = useCallback(async () => {
    if (!username) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://sub.velsat.pe:2096/api/Admin/DocumentosPorVencer?accountID=${username}`,
      );
      const json = await res.json();
      if (json.success && json.data) setDocs(json.data);
    } catch (e) {
      console.error('Error al cargar documentos por vencer:', e);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchDocumentosPorVencer();
  }, [fetchDocumentosPorVencer]);

  const getBadgeClasses = (estado: string) => {
    if (estado === 'Vencido') return 'bg-rose-50 text-rose-600 border-rose-200';
    return 'bg-amber-50 text-amber-600 border-amber-200';
  };

  const formatDate = (fecha: string) =>
    fecha.split('T')[0].split('-').reverse().join('/');

  if (closed || docs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-16 z-[999] w-64 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-amber-500 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-white" />
          <span className="text-[11px] font-bold text-white">
            Docs. por vencer ({docs.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(!minimized)}
            className="text-white/80 hover:text-white transition-colors"
          >
            {minimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => setClosed(true)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner color="warning" size="sm" />
            </div>
          ) : (
            docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-800 truncate">{doc.nombre_documento}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                    {doc.tipo_documento === '2' ? <Truck size={9} /> : <User size={9} />}
                    <span>{doc.tipo_documento === '2' ? doc.deviceID : 'Conductor'}</span>
                    <span>·</span>
                    <Calendar size={9} />
                    <span>{formatDate(doc.fecha_vencimiento)}</span>
                  </div>
                </div>
                <span className={`ml-2 shrink-0 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${getBadgeClasses(doc.estado)}`}>
                  {doc.estado}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}