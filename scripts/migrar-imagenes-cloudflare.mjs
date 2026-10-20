// Migra las imágenes de conductores del VPS a Cloudflare Images (carpeta "conductores/").
//
// Uso:
//   1) Exporta desde MySQL un CSV con columnas codtaxi,imagen:
//        SELECT codtaxi, imagen FROM taxi WHERE imagen LIKE 'http://66.240.210.125:8090%';
//   2) node scripts/migrar-imagenes-cloudflare.mjs conductores.csv [--limit 5] [--dry-run]
//
// No toca la base de datos: genera `scripts/migracion/actualizar-imagenes.sql` para que lo
// revises y lo ejecutes tú. Tampoco borra nada del VPS. Es reanudable: guarda el avance en
// `scripts/migracion/progreso.json` y salta lo que ya se subió.

import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join('scripts', 'migracion');
const PROGRESS_FILE = path.join(OUT_DIR, 'progreso.json');
const SQL_FILE = path.join(OUT_DIR, 'actualizar-imagenes.sql');
const FAILED_FILE = path.join(OUT_DIR, 'fallidos.txt');
const CONCURRENCY = 4;
const MAX_SIZE = 5 * 1024 * 1024;

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;

if (!csvPath) {
  console.error('Falta el CSV. Uso: node scripts/migrar-imagenes-cloudflare.mjs conductores.csv [--limit N] [--dry-run]');
  process.exit(1);
}

// --- Variables de entorno desde .env.local (sin dependencias) ---
const env = { ...process.env };
if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, NEXT_PUBLIC_CLOUDFLARE_DELIVERY_URL } = env;
if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !NEXT_PUBLIC_CLOUDFLARE_DELIVERY_URL) {
  console.error('Faltan CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN o NEXT_PUBLIC_CLOUDFLARE_DELIVERY_URL en .env.local');
  process.exit(1);
}

// --- Leer CSV (codtaxi,imagen) ---
const lines = fs
  .readFileSync(csvPath, 'utf8')
  .replace(/^﻿/, '')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => l.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, '')));
// Las columnas se ubican por el encabezado (puede haber otras, como codusuario).
const header = lines[0].map((h) => h.toLowerCase());
const idCol = header.includes('codtaxi') ? header.indexOf('codtaxi') : 0;
const urlCol = header.includes('imagen') ? header.indexOf('imagen') : 1;
const rows = lines
  .slice(1)
  .filter((c) => /^\d+$/.test(c[idCol] ?? '') && /^https?:\/\//i.test(c[urlCol] ?? ''))
  .map((c) => ({ codtaxi: c[idCol], url: c[urlCol] }));

fs.mkdirSync(OUT_DIR, { recursive: true });
const progress = fs.existsSync(PROGRESS_FILE) ? JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')) : {};
const pending = rows.filter((r) => !progress[r.codtaxi]).slice(0, limit);

console.log(`Filas en CSV: ${rows.length} | ya migradas: ${rows.length - rows.filter((r) => !progress[r.codtaxi]).length} | a procesar ahora: ${pending.length}`);
if (dryRun) {
  console.log('--dry-run: no se sube nada. Ejemplo:', pending.slice(0, 3));
  process.exit(0);
}

const failed = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function migrar({ codtaxi, url }) {
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`descarga ${imgRes.status}`);
  const type = imgRes.headers.get('content-type') || '';
  if (!type.startsWith('image/')) throw new Error(`no es imagen (${type || 'sin content-type'})`);
  const buf = await imgRes.arrayBuffer();
  if (buf.byteLength === 0) throw new Error('archivo vacío');
  if (buf.byteLength > MAX_SIZE) throw new Error('supera 5 MB');

  const imageId = `conductores/${codtaxi}-${Date.now()}`;
  for (let intento = 1; intento <= 3; intento++) {
    const form = new FormData();
    form.append('file', new Blob([buf], { type }), path.basename(new URL(url).pathname));
    form.append('id', imageId);
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
      body: form,
    });
    if (res.status === 429 || res.status >= 500) {
      await sleep(2000 * intento);
      continue;
    }
    const json = await res.json();
    if (!json.success) throw new Error(JSON.stringify(json.errors));
    return `${NEXT_PUBLIC_CLOUDFLARE_DELIVERY_URL}/${json.result.id}/public`;
  }
  throw new Error('Cloudflare no respondió tras 3 intentos');
}

let hechos = 0;
const cola = [...pending];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (cola.length) {
      const item = cola.shift();
      try {
        progress[item.codtaxi] = await migrar(item);
      } catch (e) {
        failed.push(`${item.codtaxi}\t${item.url}\t${e.message}`);
      }
      if (++hechos % 25 === 0) {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
        console.log(`${hechos}/${pending.length}...`);
      }
    }
  }),
);

fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
fs.writeFileSync(FAILED_FILE, failed.join('\n'));

// SQL de actualización: solo cambia filas que aún apuntan al VPS (WHERE imagen = url original).
const urlOriginal = new Map(rows.map((r) => [r.codtaxi, r.url]));
const sql = Object.entries(progress)
  .map(([id, nueva]) => {
    const vieja = (urlOriginal.get(id) || '').replace(/'/g, "''");
    return `UPDATE taxi SET imagen = '${nueva}' WHERE codtaxi = ${id} AND imagen = '${vieja}';`;
  })
  .join('\n');
fs.writeFileSync(SQL_FILE, sql + '\n');

console.log(`\nListo. Subidas en total: ${Object.keys(progress).length} | fallidas ahora: ${failed.length}`);
console.log(`SQL: ${SQL_FILE}`);
if (failed.length) console.log(`Fallidos (imagen inexistente en el VPS, etc.): ${FAILED_FILE}`);
