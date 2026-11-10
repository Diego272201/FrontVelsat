'use client';

import { useCallback, useState } from 'react';
import type { Punto } from './trazado';

const MAX_HISTORIAL = 60;

interface Estado {
  trazado: Punto[];
  pasado: Punto[][];
  futuro: Punto[][];
  /** El usuario cambió el trazado: solo entonces se envía al guardar. */
  editado: boolean;
}

/**
 * Estado del trazado que se edita en el mapa, con deshacer / rehacer.
 * Cada cambio (arrastrar un punto, agregar, recortar, unir…) es un paso del historial.
 */
export function useEditorTrazado(inicial: readonly Punto[] | null) {
  const [estado, setEstado] = useState<Estado>(() => ({
    trazado: inicial ? [...inicial] : [],
    pasado: [],
    futuro: [],
    editado: false,
  }));

  const aplicar = useCallback((nuevo: Punto[]) => {
    setEstado((e) => ({
      trazado: nuevo,
      pasado: [...e.pasado, e.trazado].slice(-MAX_HISTORIAL),
      futuro: [],
      editado: true,
    }));
  }, []);

  const deshacer = useCallback(() => {
    setEstado((e) => {
      if (e.pasado.length === 0) return e;
      return {
        trazado: e.pasado[e.pasado.length - 1],
        pasado: e.pasado.slice(0, -1),
        futuro: [e.trazado, ...e.futuro],
        editado: true,
      };
    });
  }, []);

  const rehacer = useCallback(() => {
    setEstado((e) => {
      if (e.futuro.length === 0) return e;
      return {
        trazado: e.futuro[0],
        pasado: [...e.pasado, e.trazado],
        futuro: e.futuro.slice(1),
        editado: true,
      };
    });
  }, []);

  return {
    trazado: estado.trazado,
    editado: estado.editado,
    puedeDeshacer: estado.pasado.length > 0,
    puedeRehacer: estado.futuro.length > 0,
    aplicar,
    deshacer,
    rehacer,
  };
}
