'use client';

import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Eraser,
  Link2,
  Loader2,
  Redo2,
  Scissors,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Ruta } from '../types';
import { inputClase, labelClase } from './formRuta';
import {
  Punto,
  desplazar,
  invertir,
  largoMetros,
  quitarAnteriores,
  quitarPosteriores,
  quitarPunto,
  simplificar,
  unir,
} from './trazado';

interface PanelTrazadoProps {
  trazado: readonly Punto[];
  seleccionado: number | null;
  /** Hay demasiados puntos a la vista para mostrar los tiradores: hay que acercar el mapa. */
  demasiadosPuntos: boolean;
  /** Los clics en el mapa agregan puntos al inicio (true) o al final (false). */
  alInicio: boolean;
  onAlInicio: (valor: boolean) => void;
  puedeDeshacer: boolean;
  puedeRehacer: boolean;
  onDeshacer: () => void;
  onRehacer: () => void;
  /** Reemplaza el trazado (cada llamada es un paso del historial). */
  onAplicar: (nuevo: Punto[]) => void;
  onDeseleccionar: () => void;
  /** Otras rutas de las que se puede copiar el trazado para unirlo. */
  otrasRutas: readonly Ruta[];
  onCargarTrazadoDe: (rutaId: number) => Promise<Punto[]>;
  origen: Punto | null;
  destino: Punto | null;
  onUsarDistancia: (km: number) => void;
}

const PASOS = [1, 5, 10, 25, 50, 100];

const Seccion: React.FC<{ titulo: string; children: React.ReactNode }> = ({
  titulo,
  children,
}) => (
  <section className="border-b border-slate-200 px-4 py-3">
    <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
      {titulo}
    </h4>
    {children}
  </section>
);

const botonSecundario =
  'flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-[12px] font-medium text-slate-700 transition hover:border-blue-500 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-700';

// Herramientas para ajustar el trazado de la ruta: mover, alargar, recortar, unir y limpiar.
const PanelTrazado: React.FC<PanelTrazadoProps> = ({
  trazado,
  seleccionado,
  demasiadosPuntos,
  alInicio,
  onAlInicio,
  puedeDeshacer,
  puedeRehacer,
  onDeshacer,
  onRehacer,
  onAplicar,
  onDeseleccionar,
  otrasRutas,
  onCargarTrazadoDe,
  origen,
  destino,
  onUsarDistancia,
}) => {
  const [paso, setPaso] = useState(10);
  const [otraId, setOtraId] = useState('');
  const [unirAlFinal, setUnirAlFinal] = useState(true);
  const [invertirOtra, setInvertirOtra] = useState(false);
  const [uniendo, setUniendo] = useState(false);
  const [errorUnir, setErrorUnir] = useState('');
  const [mensaje, setMensaje] = useState('');

  const hayTrazado = trazado.length > 0;
  const km = largoMetros(trazado) / 1000;
  const hayPunto = seleccionado !== null && seleccionado < trazado.length;

  const mover = (norte: number, este: number) =>
    onAplicar(desplazar(trazado, norte, este));

  const unirConOtra = async () => {
    if (!otraId) return;
    setUniendo(true);
    setErrorUnir('');
    try {
      const otra = await onCargarTrazadoDe(Number(otraId));
      if (otra.length === 0) {
        setErrorUnir('Esa ruta no tiene trazado.');
        return;
      }
      onAplicar(unir(trazado, otra, unirAlFinal, invertirOtra));
      setMensaje(`Se unieron ${otra.length} puntos.`);
    } catch {
      setErrorUnir('No se pudo leer esa ruta.');
    } finally {
      setUniendo(false);
    }
  };

  const simplificarLinea = () => {
    const nuevo = simplificar(trazado, 2);
    setMensaje(
      nuevo.length < trazado.length
        ? `Se quitaron ${trazado.length - nuevo.length} puntos sobrantes.`
        : 'No había puntos sobrantes.',
    );
    if (nuevo.length < trazado.length) onAplicar(nuevo);
  };

  const pegarExtremos = () => {
    if (!origen || !destino || trazado.length < 2) return;
    onAplicar([origen, ...trazado.slice(1, -1), destino]);
    setMensaje('Los extremos quedaron en el origen y el destino.');
  };

  const borrarTodo = () => {
    if (
      window.confirm(
        '¿Borrar todo el trazado de esta ruta? Podrás deshacerlo mientras no guardes.',
      )
    ) {
      onAplicar([]);
      onDeseleccionar();
    }
  };

  return (
    <div>
      <Seccion titulo="Trazado actual">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12.5px] text-slate-700">
            <b>{trazado.length}</b> {trazado.length === 1 ? 'punto' : 'puntos'}{' '}
            · <b>{km.toFixed(2)} km</b>
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onDeshacer}
              disabled={!puedeDeshacer}
              title="Deshacer (Ctrl+Z)"
              className={botonSecundario}
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onRehacer}
              disabled={!puedeRehacer}
              title="Rehacer (Ctrl+Y)"
              className={botonSecundario}
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <p className="mt-2 rounded-md bg-slate-50 px-2.5 py-2 text-[11.5px] text-slate-600">
          Esta línea es exactamente la que se dibuja en el monitoreo: lo que
          ajustes aquí es lo que se verá allá.
        </p>
        {!hayTrazado && (
          <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-2 text-[12px] text-amber-700">
            Esta ruta aún no tiene trazado. Haz clic en el mapa para dibujarlo
            punto por punto, o únelo desde otra ruta.
          </p>
        )}
        {demasiadosPuntos && (
          <p className="mt-2 rounded-md bg-blue-50 px-2.5 py-2 text-[12px] text-blue-700">
            Hay muchos puntos a la vista: acerca el mapa para ver y mover cada
            punto, o usa “Quitar puntos sobrantes”.
          </p>
        )}
        {mensaje && (
          <p className="mt-2 text-[11.5px] font-medium text-green-600">
            {mensaje}
          </p>
        )}
        <button
          type="button"
          onClick={() => onUsarDistancia(Math.round(km * 100) / 100)}
          disabled={!hayTrazado}
          className={`${botonSecundario} mt-2 w-full`}
        >
          Usar {km.toFixed(2)} km como distancia de la ruta
        </button>
      </Seccion>

      <Seccion titulo="Alargar con clics en el mapa">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-[12px] font-semibold">
          {[
            { valor: false, texto: 'Al final' },
            { valor: true, texto: 'Al inicio' },
          ].map((o) => (
            <button
              key={o.texto}
              type="button"
              onClick={() => onAlInicio(o.valor)}
              className={`rounded-md py-1.5 transition ${
                alInicio === o.valor
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {o.texto}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] text-slate-500">
          Cada clic en un lugar vacío del mapa agrega un punto{' '}
          {alInicio ? 'antes del inicio' : 'después del final'}. Un clic sobre
          la línea inserta un punto en medio.
        </p>
      </Seccion>

      <Seccion titulo="Mover toda la línea">
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-3 gap-1">
            <span />
            <button
              type="button"
              onClick={() => mover(paso, 0)}
              disabled={!hayTrazado}
              title="Arriba (norte)"
              className={botonSecundario}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <span />
            <button
              type="button"
              onClick={() => mover(0, -paso)}
              disabled={!hayTrazado}
              title="Izquierda (oeste)"
              className={botonSecundario}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => mover(-paso, 0)}
              disabled={!hayTrazado}
              title="Abajo (sur)"
              className={botonSecundario}
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => mover(0, paso)}
              disabled={!hayTrazado}
              title="Derecha (este)"
              className={botonSecundario}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1">
            <label className={labelClase}>Distancia por clic</label>
            <select
              className={inputClase}
              value={paso}
              onChange={(e) => setPaso(Number(e.target.value))}
            >
              {PASOS.map((p) => (
                <option key={p} value={p}>
                  {p} m
                </option>
              ))}
            </select>
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Punto seleccionado">
        {hayPunto ? (
          <div className="space-y-1.5">
            <p className="text-[12px] text-slate-600">
              Punto <b>{seleccionado! + 1}</b> de {trazado.length}
              {seleccionado === 0
                ? ' (inicio)'
                : seleccionado === trazado.length - 1
                  ? ' (fin)'
                  : ''}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onAplicar(quitarAnteriores(trazado, seleccionado!));
                  onDeseleccionar();
                }}
                disabled={seleccionado === 0}
                className={botonSecundario}
                title="Acorta la línea: borra todo lo que va antes de este punto"
              >
                <Scissors className="h-3.5 w-3.5" />
                Quitar lo anterior
              </button>
              <button
                type="button"
                onClick={() => {
                  onAplicar(quitarPosteriores(trazado, seleccionado!));
                  onDeseleccionar();
                }}
                disabled={seleccionado === trazado.length - 1}
                className={botonSecundario}
                title="Acorta la línea: borra todo lo que va después de este punto"
              >
                <Scissors className="h-3.5 w-3.5" />
                Quitar lo posterior
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                onAplicar(quitarPunto(trazado, seleccionado!));
                onDeseleccionar();
              }}
              className={`${botonSecundario} w-full text-red-600 hover:border-red-400 hover:text-red-700`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar este punto
            </button>
          </div>
        ) : (
          <p className="text-[11.5px] text-slate-500">
            Haz clic en un punto de la línea para recortar desde ahí o
            eliminarlo. También puedes borrar un punto con clic derecho.
          </p>
        )}
      </Seccion>

      <Seccion titulo="Unir con otra ruta">
        <label className={labelClase}>Ruta a unir</label>
        <select
          className={inputClase}
          value={otraId}
          onChange={(e) => setOtraId(e.target.value)}
        >
          <option value="">Elige una ruta…</option>
          {otrasRutas.map((r) => (
            <option key={r.id} value={r.id}>
              {r.codigo} · {r.nombre}
            </option>
          ))}
        </select>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-[12px] font-semibold">
          {[
            { valor: true, texto: 'Pegar al final' },
            { valor: false, texto: 'Pegar al inicio' },
          ].map((o) => (
            <button
              key={o.texto}
              type="button"
              onClick={() => setUnirAlFinal(o.valor)}
              className={`rounded-md py-1.5 transition ${
                unirAlFinal === o.valor
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {o.texto}
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 text-[12px] text-slate-600">
          <input
            type="checkbox"
            checked={invertirOtra}
            onChange={(e) => setInvertirOtra(e.target.checked)}
          />
          Recorrer esa ruta al revés
        </label>
        {errorUnir && (
          <p className="mt-1.5 text-[11.5px] font-medium text-red-600">
            {errorUnir}
          </p>
        )}
        <button
          type="button"
          onClick={unirConOtra}
          disabled={!otraId || uniendo}
          className="mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 text-[12px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {uniendo ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Link2 className="h-3.5 w-3.5" />
          )}
          Unir trazados
        </button>
        <p className="mt-1.5 text-[11.5px] text-slate-500">
          Copia el trazado de la otra ruta y lo une a éste; la otra ruta no se
          modifica. Si quedan separados, se conectan con una línea recta que
          puedes ajustar.
        </p>
      </Seccion>

      <Seccion titulo="Otras acciones">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onAplicar(invertir(trazado))}
            disabled={trazado.length < 2}
            className={botonSecundario}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Invertir sentido
          </button>
          <button
            type="button"
            onClick={simplificarLinea}
            disabled={trazado.length < 3}
            className={botonSecundario}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Quitar puntos sobrantes
          </button>
          <button
            type="button"
            onClick={pegarExtremos}
            disabled={!origen || !destino || trazado.length < 2}
            className={`${botonSecundario} col-span-2`}
            title="Mueve el primer y el último punto del trazado al origen y al destino de la ruta"
          >
            Pegar extremos al origen y destino
          </button>
          <button
            type="button"
            onClick={borrarTodo}
            disabled={!hayTrazado}
            className={`${botonSecundario} col-span-2 text-red-600 hover:border-red-400 hover:text-red-700`}
          >
            <Eraser className="h-3.5 w-3.5" />
            Borrar todo el trazado
          </button>
        </div>
      </Seccion>
    </div>
  );
};

export default PanelTrazado;
