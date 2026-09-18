'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Filter, Search } from 'lucide-react';

export const ETIQUETA_VACIO = '(Vacías)';

const ANCHO_PANEL = 232;

const FiltroColumna: React.FC<{
  titulo: string;
  valores: string[];
  seleccionados: string[] | null;
  onAplicar: (valores: string[] | null) => void;
  deshabilitado?: boolean;
}> = ({ titulo, valores, seleccionados, onAplicar, deshabilitado }) => {
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activo = seleccionados !== null;

  const etiqueta = (valor: string) => (valor === '' ? ETIQUETA_VACIO : valor);

  const opciones = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (texto === '') return valores;
    return valores.filter((valor) =>
      etiqueta(valor).toLowerCase().includes(texto),
    );
  }, [valores, busqueda]);

  const abrir = () => {
    if (botonRef.current) {
      const rect = botonRef.current.getBoundingClientRect();
      setPosicion({
        top: rect.bottom + 4,
        left: Math.max(
          8,
          Math.min(rect.left, window.innerWidth - ANCHO_PANEL - 8),
        ),
      });
    }
    setBusqueda('');
    setSeleccion(
      new Set(
        seleccionados === null
          ? valores
          : valores.filter((valor) => seleccionados.includes(valor)),
      ),
    );
    setAbierto(true);
  };

  const cerrar = () => setAbierto(false);

  useEffect(() => {
    if (!abierto) return;
    const handleClickFuera = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        botonRef.current &&
        !botonRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const handleTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('keydown', handleTecla);
    return () => document.removeEventListener('keydown', handleTecla);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const handleScroll = (e: Event) => {
      if (panelRef.current && panelRef.current.contains(e.target as Node)) {
        return;
      }
      setAbierto(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [abierto]);

  const alternarValor = (valor: string) => {
    setSeleccion((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(valor)) {
        nuevo.delete(valor);
      } else {
        nuevo.add(valor);
      }
      return nuevo;
    });
  };

  const todosVisiblesMarcados =
    opciones.length > 0 && opciones.every((valor) => seleccion.has(valor));

  const alternarTodos = () => {
    setSeleccion((prev) => {
      const nuevo = new Set(prev);
      opciones.forEach((valor) => {
        if (todosVisiblesMarcados) {
          nuevo.delete(valor);
        } else {
          nuevo.add(valor);
        }
      });
      return nuevo;
    });
  };

  const aplicar = () => {
    const todo =
      seleccion.size === valores.length &&
      valores.every((valor) => seleccion.has(valor));
    onAplicar(todo ? null : Array.from(seleccion));
    setAbierto(false);
  };

  const limpiar = () => {
    onAplicar(null);
    setAbierto(false);
  };

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        disabled={deshabilitado}
        onClick={() => (abierto ? cerrar() : abrir())}
        title={
          activo
            ? `${titulo}: filtro activo (${seleccionados?.length ?? 0} valor(es))`
            : `Filtrar por ${titulo}`
        }
        className={`group flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-700 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 ${
          abierto ? 'bg-black/5' : ''
        }`}
      >
        <span className="truncate">{titulo}</span>
        <Filter
          className={`h-3.5 w-3.5 shrink-0 transition-all ${
            activo
              ? 'fill-amber-600 text-amber-600 opacity-100'
              : 'text-gray-500 opacity-80 group-hover:opacity-100'
          }`}
        />
      </button>

      {abierto &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              top: posicion.top,
              left: posicion.left,
              width: ANCHO_PANEL,
            }}
            className="fixed z-[100] overflow-hidden rounded-md border border-gray-300 bg-white"
          >
            <div className="border-b border-gray-100 px-2 py-1.5">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2 h-3 w-3 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  value={busqueda}
                  placeholder="Buscar..."
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full rounded border border-gray-200 bg-gray-50 py-1 pl-6 pr-2 text-[11px] placeholder-gray-400 focus:border-[#113EB9] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#113EB9]"
                />
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto py-1">
              {opciones.length === 0 ? (
                <p className="px-3 py-3 text-center text-[11px] text-gray-400">
                  Sin coincidencias
                </p>
              ) : (
                <>
                  <label className="flex cursor-pointer items-center gap-2 px-2 py-1 hover:bg-blue-50">
                    <input
                      type="checkbox"
                      checked={todosVisiblesMarcados}
                      onChange={alternarTodos}
                      className="h-3 w-3 accent-[#113EB9]"
                    />
                    <span className="text-[11px] font-semibold text-gray-700">
                      (Seleccionar todo)
                    </span>
                  </label>

                  {opciones.map((valor) => (
                    <label
                      key={valor}
                      className="flex cursor-pointer items-center gap-2 px-2 py-1 hover:bg-blue-50"
                    >
                      <input
                        type="checkbox"
                        checked={seleccion.has(valor)}
                        onChange={() => alternarValor(valor)}
                        className="h-3 w-3 accent-[#113EB9]"
                      />
                      <span
                        title={etiqueta(valor)}
                        className={`truncate text-[11px] ${
                          valor === ''
                            ? 'italic text-gray-400'
                            : 'text-gray-700'
                        }`}
                      >
                        {etiqueta(valor)}
                      </span>
                    </label>
                  ))}
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-2 py-1.5">
              <button
                type="button"
                onClick={limpiar}
                disabled={!activo}
                className="text-[11px] font-medium text-gray-500 hover:text-[#113EB9] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Limpiar
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={cerrar}
                  className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={aplicar}
                  disabled={seleccion.size === 0}
                  className="inline-flex items-center gap-1 rounded bg-[#113EB9] px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="h-3 w-3" />
                  Aceptar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default FiltroColumna;
