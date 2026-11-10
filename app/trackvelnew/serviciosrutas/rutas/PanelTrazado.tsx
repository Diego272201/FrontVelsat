'use client';

import React, { useState } from 'react';
import {
  ArrowUpDown,
  CheckCircle2,
  Info,
  Redo2,
  Route,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Ruta } from '../types';
import { Punto, invertir, largoMetros } from './trazado';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';

interface PanelTrazadoProps {
  trazado: readonly Punto[];
  seleccionado?: number | null;
  /** Hay demasiados puntos a la vista para mostrar los tiradores: hay que acercar el mapa. */
  demasiadosPuntos?: boolean;
  /** Los clics en el mapa agregan puntos al inicio (true) o al final (false). */
  alInicio: boolean;
  onAlInicio: (valor: boolean) => void;
  puedeDeshacer: boolean;
  puedeRehacer: boolean;
  onDeshacer: () => void;
  onRehacer: () => void;
  /** Reemplaza el trazado (cada llamada es un paso del historial). */
  onAplicar: (nuevo: Punto[]) => void;
  onDeseleccionar?: () => void;
  /** Otras rutas (opcional para compatibilidad) */
  otrasRutas?: readonly Ruta[];
  onCargarTrazadoDe?: (rutaId: number) => Promise<Punto[]>;
  origen?: Punto | null;
  destino?: Punto | null;
  onUsarDistancia?: (km: number) => void;
}

const botonSecundario =
  'flex h-7 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-[11.5px] font-medium text-slate-700 transition hover:border-blue-500 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-700';

const PanelTrazado: React.FC<PanelTrazadoProps> = ({
  trazado,
  alInicio,
  onAlInicio,
  puedeDeshacer,
  puedeRehacer,
  onDeshacer,
  onRehacer,
  onAplicar,
  onDeseleccionar,
}) => {
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const hayTrazado = trazado.length > 0;
  const km = largoMetros(trazado) / 1000;
  const puntoInicio = hayTrazado ? trazado[0] : null;
  const puntoFin =
    hayTrazado && trazado.length > 1 ? trazado[trazado.length - 1] : null;

  const invertirSentido = () => {
    if (trazado.length < 2) return;
    onAplicar(invertir(trazado));
    setMensaje('Sentido del trazado invertido correctamente.');
    setTimeout(() => setMensaje(''), 3000);
  };

  const borrarTodo = () => {
    onAplicar([]);
    onDeseleccionar?.();
    setConfirmarBorrar(false);
    setMensaje('Trazado borrado. Puedes usar Deshacer si fue un error.');
    setTimeout(() => setMensaje(''), 4000);
  };

  return (
    <div className="space-y-3.5 p-4">
      {/* 1. Tarjeta principal: Conteo de puntos de trazado y distancia */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-sm">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-blue-700">
            <Route className="h-4 w-4" />
            <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-slate-800">
              Puntos de Trazado
            </h4>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onDeshacer}
              disabled={!puedeDeshacer}
              title="Deshacer cambio en trazado (Ctrl+Z)"
              className={botonSecundario}
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Deshacer</span>
            </button>
            <button
              type="button"
              onClick={onRehacer}
              disabled={!puedeRehacer}
              title="Rehacer cambio en trazado (Ctrl+Y)"
              className={botonSecundario}
            >
              <Redo2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rehacer</span>
            </button>
          </div>
        </div>

        {/* Métricas destacadas */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-blue-200/60 bg-blue-50/80 p-2.5">
            <p className="text-[11px] font-medium text-blue-600">Total de puntos</p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-blue-900">
                {trazado.length}
              </span>
              <span className="text-[11px] font-semibold text-blue-700">
                {trazado.length === 1 ? 'punto' : 'puntos'}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/80 p-2.5">
            <p className="text-[11px] font-medium text-emerald-600">
              Distancia trazada
            </p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-emerald-900">
                {km.toFixed(2)}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700">
                km
              </span>
            </div>
          </div>
        </div>

        {/* Detalle de inicio y fin */}
        {hayTrazado ? (
          <div className="mt-2.5 space-y-1.5 rounded-lg border border-slate-200/80 bg-white p-2.5 text-[11.5px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                Punto inicial (1):
              </span>
              <span className="font-mono text-[11px] text-slate-700">
                {puntoInicio
                  ? `${puntoInicio[0].toFixed(5)}, ${puntoInicio[1].toFixed(5)}`
                  : '-'}
              </span>
            </div>

            {trazado.length > 2 && (
              <div className="flex items-center justify-between text-slate-500">
                <span className="ml-3.5">Puntos intermedios:</span>
                <span className="font-semibold text-slate-600">
                  {trazado.length - 2} puntos
                </span>
              </div>
            )}

            {puntoFin && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-blue-600 ring-2 ring-blue-200" />
                  Punto final ({trazado.length}):
                </span>
                <span className="font-mono text-[11px] text-slate-700">
                  {`${puntoFin[0].toFixed(5)}, ${puntoFin[1].toFixed(5)}`}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-amber-50 p-2.5 text-[11.5px] text-amber-700">
            <Info className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Esta ruta aún no tiene trazado. Haz clic en el mapa para iniciar la
              línea.
            </span>
          </div>
        )}

        {mensaje && (
          <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {mensaje}
          </p>
        )}
      </div>

      {/* 2. Sección: Alargar con clics en el mapa */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-700">
          Alargar trazado con clics
        </h4>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-[12px] font-semibold">
          {[
            { valor: false, texto: 'Al final' },
            { valor: true, texto: 'Al inicio' },
          ].map((o) => (
            <button
              key={o.texto}
              type="button"
              onClick={() => onAlInicio(o.valor)}
              className={`rounded-md py-1.5 text-center transition ${
                alInicio === o.valor
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {o.texto}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-1.5 rounded-lg bg-slate-50 p-2.5 text-[11.5px] text-slate-600">
          <p className="flex items-start gap-1.5">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
            <span>
              Cada clic en un lugar vacío del mapa agrega un punto{' '}
              <strong className="text-slate-800">
                {alInicio ? 'antes del inicio' : 'después del final'}
              </strong>
              .
            </span>
          </p>
          <p className="flex items-start gap-1.5">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
            <span>Un clic sobre la línea roja inserta un punto intermedio.</span>
          </p>
          <p className="flex items-start gap-1.5">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
            <span>Arrastra cualquier punto de la línea para ajustar la curva.</span>
          </p>
          <p className="flex items-start gap-1.5">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
            <span>Clic derecho sobre un punto para eliminarlo.</span>
          </p>
        </div>
      </div>

      {/* 3. Acciones útiles */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-700">
          Acciones del trazado
        </h4>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={invertirSentido}
            disabled={trazado.length < 2}
            className={`${botonSecundario} h-8 w-full justify-center text-[12px]`}
            title="Invierte la dirección del recorrido (inicio <-> fin)"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-blue-600" />
            Invertir sentido del trazado
          </button>

          <button
            type="button"
            onClick={() => setConfirmarBorrar(true)}
            disabled={!hayTrazado}
            className={`${botonSecundario} h-8 w-full justify-center text-[12px] text-red-600 hover:border-red-400 hover:text-red-700`}
            title="Borra todos los puntos del trazado actual"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
            Borrar todo el trazado
          </button>
        </div>
      </div>

      {/* Diálogo para confirmar borrado de todo el trazado */}
      {confirmarBorrar && (
        <AlertDialog
          open={confirmarBorrar}
          onOpenChange={(open) => !open && setConfirmarBorrar(false)}
        >
          <AlertDialogContent className="z-[150] max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-semibold text-slate-900">
                ¿Borrar todo el trazado?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-600">
                Se eliminarán los {trazado.length} puntos de la línea de recorrido
                de esta ruta. Podrás deshacer este cambio con{' '}
                <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-800">
                  Ctrl+Z
                </kbd>{' '}
                antes de guardar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 gap-2">
              <AlertDialogCancel onClick={() => setConfirmarBorrar(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={borrarTodo}
              >
                Sí, borrar trazado
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default PanelTrazado;
