import axios from 'axios';

export interface SpeedPoint {
  t: number;
  speed: number;
}

export interface GeneralPoint extends SpeedPoint {
  odometer: number;
}

export interface RoutePoint extends SpeedPoint {
  distanceKm: number;
}

export interface StopItem {
  start: number;
  end: number;
  minutes: number;
  address: string;
}

export interface KmItem {
  deviceId: string;
  km: number;
}

// Las APIs devuelven fechas como "dd/MM/yyyy" o "yyyy-MM-dd" y horas "HH:mm[:ss]" (a veces con a. m./p. m.)
export function parseDateTime(date?: string, time?: string): number {
  if (!date) return NaN;
  let d = date.trim();
  let t = (time ?? '').trim();

  if (d.includes('T')) {
    const [datePart, timePart] = d.split('T');
    d = datePart;
    if (!t) t = timePart;
  } else if (d.includes(' ') && !t) {
    const [datePart, ...rest] = d.split(' ');
    d = datePart;
    t = rest.join(' ');
  }

  let year: number;
  let month: number;
  let day: number;
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(d)) {
    [year, month, day] = d.split('-').map(Number);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
    [day, month, year] = d.split('/').map(Number);
  } else {
    return Date.parse(`${date} ${time ?? ''}`.trim());
  }

  const match = t.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap])?/i);
  let hours = match ? Number(match[1]) : 0;
  const minutes = match ? Number(match[2]) : 0;
  const seconds = match?.[3] ? Number(match[3]) : 0;
  const meridiem = match?.[4]?.toLowerCase();
  if (meridiem === 'p' && hours < 12) hours += 12;
  if (meridiem === 'a' && hours === 12) hours = 0;

  return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
}

function parseDurationToMinutes(value: string): number {
  if (!value) return 0;
  const h = value.match(/(\d+)\s*h/i);
  const m = value.match(/(\d+)\s*m/i);
  const s = value.match(/(\d+)\s*s/i);
  if (h || m || s) {
    return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0) + (s ? +s[1] / 60 : 0);
  }
  const parts = value.split(':').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2 && !parts.some(isNaN)) return parts[0] * 60 + parts[1];
  return 0;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const byTime = <T extends { t: number }>(a: T, b: T) => a.t - b.t;

export async function fetchSpeed(
  baseUrl: string,
  start: string,
  end: string,
  deviceId: string,
  username: string,
): Promise<SpeedPoint[]> {
  const { data } = await axios.get(
    `${baseUrl}/api/Reporting/speed/${start}/${end}/${deviceId}/0/${username}`,
  );
  const rows: any[] = Array.isArray(data?.result) ? data.result : [];
  return rows
    .map((r) => ({ t: parseDateTime(r.date, r.time), speed: Number(r.speedKPH) || 0 }))
    .filter((p) => Number.isFinite(p.t))
    .sort(byTime);
}

export async function fetchGeneral(
  baseUrl: string,
  start: string,
  end: string,
  deviceId: string,
  username: string,
): Promise<GeneralPoint[]> {
  const { data } = await axios.get(
    `${baseUrl}/api/Reporting/general/${start}/${end}/${deviceId}/${username}`,
  );
  const rows: any[] = Array.isArray(data?.result?.listaTablas) ? data.result.listaTablas : [];
  return rows
    .map((r) => ({
      t: parseDateTime(r.fecha, r.hora),
      speed: Number(r.speedKPH) || 0,
      odometer: Number(r.odometerKM) || 0,
    }))
    .filter((p) => Number.isFinite(p.t))
    .sort(byTime);
}

export async function fetchRoute(
  baseUrl: string,
  start: string,
  end: string,
  deviceId: string,
  username: string,
): Promise<RoutePoint[]> {
  const enc = encodeURIComponent;
  const { data } = await axios.get(
    `${baseUrl}/api/Reporting/details/${enc(start)}/${enc(end)}/${enc(deviceId)}/${enc(username)}`,
  );
  const rows: any[] = Array.isArray(data?.result) ? data.result : [];
  const sorted = rows
    .map((r) => ({
      t: parseDateTime(r.date, r.time),
      speed: Number(r.speed) || 0,
      lat: Number(r.latitude),
      lng: Number(r.longitude),
    }))
    .filter((p) => Number.isFinite(p.t))
    .sort(byTime);

  let total = 0;
  return sorted.map((p, i) => {
    const prev = sorted[i - 1];
    if (prev && Number.isFinite(prev.lat) && Number.isFinite(p.lat)) {
      total += haversineKm(prev.lat, prev.lng, p.lat, p.lng);
    }
    return { t: p.t, speed: p.speed, distanceKm: total };
  });
}

export async function fetchStops(
  baseUrl: string,
  start: string,
  end: string,
  deviceId: string,
  username: string,
): Promise<StopItem[]> {
  const { data } = await axios.get(
    `${baseUrl}/api/Reporting/stops/${start}/${end}/${deviceId}/${username}`,
  );
  const rows: any[] = Array.isArray(data?.result) ? data.result : [];
  return rows
    .map((r) => {
      const s = parseDateTime(r.startDate, r.startTime);
      const e = parseDateTime(r.endDate, r.endTime);
      const minutes =
        Number.isFinite(s) && Number.isFinite(e) && e > s
          ? (e - s) / 60000
          : parseDurationToMinutes(r.totalTime);
      return {
        start: s,
        end: Number.isFinite(e) && e > s ? e : s + minutes * 60000,
        minutes,
        address: r.address || '',
      };
    })
    .filter((s) => Number.isFinite(s.start))
    .sort((a, b) => a.start - b.start);
}

export async function fetchKilometers(
  baseUrl: string,
  start: string,
  end: string,
  username: string,
): Promise<KmItem[]> {
  const { data } = await axios.get(
    `${baseUrl}/api/Kilometer/kilometerall/${start}/${end}/${username}`,
  );
  const rows: any[] = Array.isArray(data?.listaKilometros) ? data.listaKilometros : [];
  return rows
    .map((r) => ({
      deviceId: String(r.deviceId ?? ''),
      km: Math.max(0, (Number(r.maximo) || 0) - (Number(r.minimo) || 0)),
    }))
    .filter((r) => r.deviceId)
    .sort((a, b) => b.km - a.km);
}
