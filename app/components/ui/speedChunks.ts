import axios from 'axios';

interface SpeedChunkParams {
  startDate: string;
  endDate: string;
  deviceId: string;
  speedCar: string;
  username: string;
  isAllUnits: boolean;
}

interface SpeedRow {
  item: number;
  deviceId?: string;
  speedKPH: number;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  address: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

const formatLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const rowKey = (r: SpeedRow) =>
  `${r.deviceId ?? ''}|${r.date}|${r.time}|${r.latitude}|${r.longitude}|${r.speedKPH}`;

// Parte el rango en bloques (1 día para todas las unidades, 3 para una unidad)
// para evitar timeouts. Devuelve undefined si el rango cabe en una sola consulta.
export function buildSpeedChunkUrls({
  startDate,
  endDate,
  deviceId,
  speedCar,
  username,
  isAllUnits,
}: SpeedChunkParams): string[] | undefined {
  if (!username || !startDate || !endDate) return undefined;
  const chunkDays = isAllUnits ? 1 : 3;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return undefined;
  if ((end.getTime() - start.getTime()) / 86400000 <= chunkDays) return undefined;

  const urls: string[] = [];
  let cursor = new Date(start);
  while (cursor < end) {
    const next = new Date(cursor);
    next.setDate(next.getDate() + chunkDays);
    const chunkEnd = next > end ? end : next;
    urls.push(
      isAllUnits
        ? `/api/Reporting/speedall/${formatLocal(cursor)}/${formatLocal(chunkEnd)}/${speedCar}/${username}`
        : `/api/Reporting/speed/${formatLocal(cursor)}/${formatLocal(chunkEnd)}/${deviceId}/${speedCar}/${username}`,
    );
    cursor = chunkEnd;
  }
  return urls;
}

// Descarga el Excel de velocidad consultando por bloques y enviando los datos
// unidos al backend, que arma el mismo archivo.
export async function downloadSpeedExcelChunked(
  baseUrl: string,
  urls: string[],
  params: SpeedChunkParams,
  onProgress?: (percent: number) => void,
): Promise<ArrayBuffer> {
  const rows: SpeedRow[] = [];
  let previousKeys = new Set<string>();

  for (let i = 0; i < urls.length; i++) {
    const response = await axios.get(`${baseUrl}${urls[i]}`);
    const data = response.data;
    const chunk: SpeedRow[] = Array.isArray(data) ? data : (data?.result ?? []);
    // Los bloques comparten el instante de corte: se descartan repetidos
    rows.push(...chunk.filter((r) => !previousKeys.has(rowKey(r))));
    previousKeys = new Set(chunk.map(rowKey));
    onProgress?.(Math.round(((i + 1) / (urls.length + 1)) * 100));
  }

  const response = await axios.post(
    `${baseUrl}/api/Reporting/downloadExcelVFromData`,
    {
      fechaIni: params.startDate,
      fechaFin: params.endDate,
      deviceId: params.isAllUnits ? '' : params.deviceId,
      accountID: params.username,
      allUnits: params.isAllUnits,
      rows: rows.map((r, idx) => ({ ...r, item: idx + 1 })),
    },
    { responseType: 'arraybuffer' },
  );
  onProgress?.(100);
  return response.data;
}
