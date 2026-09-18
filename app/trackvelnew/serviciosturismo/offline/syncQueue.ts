import { API_BASE, API_LOTE_URL } from '../constants';
import { OperacionPendiente, PayloadCargaExcel, PayloadCrear, PayloadEditar } from './types';

export function esFalloDeRed(error: unknown, response?: Response): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (response && [502, 503, 504].includes(response.status)) return true;
  return error instanceof TypeError;
}

let contadorIdTemporal = 0;

export function generarIdTemporal(): number {
  contadorIdTemporal += 1;
  return -(Date.now() * 1000 + contadorIdTemporal);
}

export function generarIdOperacion(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type ResultadoOperacion =
  | { ok: true }
  | { ok: false; esFalloRed: boolean; error?: string };

export async function ejecutarOperacionPendiente(
  op: OperacionPendiente,
): Promise<ResultadoOperacion> {
  try {
    let res: Response;

    switch (op.tipo) {
      case 'crear': {
        const { campos } = op.payload as PayloadCrear;
        res = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campos),
        });
        break;
      }
      case 'editar': {
        const { campos, usuario, motivo } = op.payload as PayloadEditar;
        const params = new URLSearchParams({ limpiarNulos: 'true' });
        if (usuario) params.set('usuario', usuario);
        if (motivo) params.set('motivo', motivo);
        res = await fetch(`${API_BASE}/${op.idservicio}?${params.toString()}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campos),
        });
        break;
      }
      case 'cancelar':
        res = await fetch(`${API_BASE}/${op.idservicio}/cancelar`, {
          method: 'PATCH',
        });
        break;
      case 'standby':
        res = await fetch(`${API_BASE}/${op.idservicio}/standby`, {
          method: 'PATCH',
        });
        break;
      case 'reanudar':
        res = await fetch(`${API_BASE}/${op.idservicio}/reanudar`, {
          method: 'PATCH',
        });
        break;
      case 'cargaExcel': {
        const { registros } = op.payload as PayloadCargaExcel;
        res = await fetch(API_LOTE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registros),
        });
        break;
      }
    }

    if (res.ok) return { ok: true };

    if (esFalloDeRed(undefined, res)) {
      return { ok: false, esFalloRed: true };
    }

    const data = await res.json().catch(() => null);
    return {
      ok: false,
      esFalloRed: false,
      error: data?.error || data?.mensaje || `Error HTTP ${res.status}`,
    };
  } catch (error) {
    return { ok: false, esFalloRed: esFalloDeRed(error) };
  }
}
