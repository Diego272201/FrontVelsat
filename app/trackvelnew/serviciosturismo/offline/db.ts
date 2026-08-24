import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { ServicioTurismo } from '../types';
import { OperacionPendiente } from './types';

export interface SnapshotServicios {
  fecha: string;
  servicios: ServicioTurismo[];
  guardadoEn: number;
}

interface ServiciosTurismoDB extends DBSchema {
  snapshots: {
    key: string;
    value: SnapshotServicios;
  };
  colaSync: {
    key: string;
    value: OperacionPendiente;
  };
}

const DB_NAME = 'serviciosturismo-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ServiciosTurismoDB>> | null = null;

// Guard de SSR/entorno sin IndexedDB: devuelve null en vez de intentar abrir la base.
function getDb(): Promise<IDBPDatabase<ServiciosTurismoDB>> | null {
  if (typeof indexedDB === 'undefined') return null;

  if (!dbPromise) {
    dbPromise = openDB<ServiciosTurismoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'fecha' });
        }
        if (!db.objectStoreNames.contains('colaSync')) {
          db.createObjectStore('colaSync', { keyPath: 'id' });
        }
      },
    });
  }

  return dbPromise;
}

export async function guardarSnapshot(
  fecha: string,
  servicios: ServicioTurismo[],
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.put('snapshots', { fecha, servicios, guardadoEn: Date.now() });
}

export async function obtenerSnapshot(
  fecha: string,
): Promise<SnapshotServicios | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  return db.get('snapshots', fecha);
}

export async function agregarOperacionPendiente(
  op: OperacionPendiente,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.put('colaSync', op);
}

// Ordenadas por fecha de creación: se sincronizan en el mismo orden en que se hicieron.
export async function listarOperacionesPendientes(): Promise<
  OperacionPendiente[]
> {
  const db = await getDb();
  if (!db) return [];
  const todas = await db.getAll('colaSync');
  return todas.sort((a, b) => a.creadoEn - b.creadoEn);
}

export async function quitarOperacionPendiente(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete('colaSync', id);
}
