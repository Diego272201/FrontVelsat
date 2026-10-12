'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Search } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/app/components/ui/alert-dialog';
import { ConductorRevision } from './types';
import { PLANTILLAS_WHATSAPP } from './whatsappAlerta';

const plantillaRevision = PLANTILLAS_WHATSAPP.find((p) => p.id === 'revision')!;

// Mismo criterio que NormalizarCelularPeru en el backend: 9 dígitos, o 11 empezando con 51.
function celularValido(telefono: string | null): boolean {
  const digitos = (telefono || '').replace(/\D/g, '');
  return digitos.length === 9 || (digitos.length === 11 && digitos.startsWith('51'));
}

const ModalConfirmarNotificarRevision: React.FC<{
  abierto: boolean;
  fecha: string;
  conductores: ConductorRevision[];
  notificando: boolean;
  onCancelar: () => void;
  onConfirmar: (brevetes: string[]) => void;
}> = ({ abierto, fecha, conductores, notificando, onCancelar, onConfirmar }) => {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState('');

  // Al abrir: se marcan todos los que aún tienen algo pendiente; los que ya finalizaron todo
  // el día quedan desmarcados (se pueden marcar a mano).
  useEffect(() => {
    if (!abierto) return;
    setSeleccionados(
      new Set(conductores.filter((c) => c.pendientes > 0).map((c) => c.brevete)),
    );
    setBusqueda('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return conductores;
    return conductores.filter(
      (c) => c.nombre.toLowerCase().includes(texto) || c.brevete.toLowerCase().includes(texto),
    );
  }, [conductores, busqueda]);

  const todosMarcados = conductores.length > 0 && seleccionados.size === conductores.length;

  const alternarTodos = () => {
    setSeleccionados(todosMarcados ? new Set() : new Set(conductores.map((c) => c.brevete)));
  };

  const alternar = (brevete: string) => {
    setSeleccionados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(brevete)) siguiente.delete(brevete);
      else siguiente.add(brevete);
      return siguiente;
    });
  };

  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(open) => {
        if (!open && !notificando) onCancelar();
      }}
    >
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 sm:mx-0">
            <MessageCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <AlertDialogTitle className="text-center sm:text-left">
            Notificar revisión · <strong>{fecha}</strong>
            <br />
            <span className="text-sm font-normal text-gray-500">
              Un solo mensaje por conductor, por WhatsApp y en la app. No se listan servicios
              cancelados ni en stand by.
            </span>
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          {plantillaRevision.construirTexto({ fecha, hora: '' })}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={todosMarcados}
              ref={(el) => {
                if (el) el.indeterminate = seleccionados.size > 0 && !todosMarcados;
              }}
              onChange={alternarTodos}
              disabled={notificando}
              className="h-4 w-4 accent-emerald-600"
            />
            Seleccionar todos
          </label>
          <span className="text-[11px] text-gray-500">
            {seleccionados.size} de {conductores.length} seleccionados
          </span>
          <div className="relative ml-auto flex items-center">
            <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conductor"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-7 w-40 rounded-md border border-gray-300 pl-7 pr-2 text-[12px] focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border border-gray-200">
          {visibles.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-gray-500">Sin conductores</p>
          ) : (
            visibles.map((c) => (
              <label
                key={c.brevete}
                className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-b-0 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={seleccionados.has(c.brevete)}
                  onChange={() => alternar(c.brevete)}
                  disabled={notificando}
                  className="h-4 w-4 accent-emerald-600"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-slate-700">{c.nombre}</p>
                  <p className="text-[11px] text-gray-500">
                    {c.brevete} · {c.servicios} servicio{c.servicios === 1 ? '' : 's'}
                  </p>
                </div>
                {c.pendientes === 0 && (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                    Todo finalizado
                  </span>
                )}
                {!celularValido(c.telefono) && (
                  <span
                    title="Sin celular válido en su ficha: solo recibirá la notificación en la app"
                    className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                  >
                    Sin celular
                  </span>
                )}
              </label>
            ))
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={notificando}
            onClick={onCancelar}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // Se mantiene abierto mientras envía; el hook lo cierra al terminar.
              e.preventDefault();
              onConfirmar(Array.from(seleccionados));
            }}
            disabled={notificando || seleccionados.size === 0}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50"
          >
            {notificando
              ? 'Notificando...'
              : `Notificar a ${seleccionados.size} conductor${seleccionados.size === 1 ? '' : 'es'}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ModalConfirmarNotificarRevision;
