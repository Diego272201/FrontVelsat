// convierte fromato de fecha Iso a fecha normal
export const formatDate = (dateString: any) => {
    if (!dateString) return '';
  
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
  
    const formattedDay = day < 10 ? `0${day}` : day;
    const formattedMonth = month < 10 ? `0${month}` : month;
    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  
    return `${formattedDay}/${formattedMonth}/${year} ${formattedHours}:${formattedMinutes}`;
  };
  

export function validateDateRange(startDate: string, endDate: string, maxDays: number = 11): string | null {
  if (!startDate || !endDate) return 'Fechas incompletas';

  const isoStart = formatDateToISO(startDate); // → "2026-03-10T00:00"
  const isoEnd = formatDateToISO(endDate);     // → "2026-03-11T23:59"

  const start = new Date(isoStart);
  const end = new Date(isoEnd);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Fechas inválidas';

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > maxDays) return `El límite de fechas es de ${maxDays} días`;

  return null;
}


export function formatDateToISO(fecha?: string): string {
  if (!fecha) return '';

  const regex = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/;
  const match = fecha.match(regex);

  if (!match) return '';

  const [, day, month, year, hours, minutes] = match;
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const parseFechaHora = (filtroFecha: string): string => {
  if (!filtroFecha) return '';
  const [dia, mes, año] = filtroFecha.split(' ')[0].split('/');
  const hora = filtroFecha.split(' ')[1];
  return `${año}-${mes}-${dia} ${hora}`;
};


// Convierte la fecha de un formato Date a formato dd/MM/yyyy
export const formatFecha = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Convierte la fecha de un formato Date a formato yyyy-MM-dd
export const formatFechaAMD = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

// Convierte una fecha ISO en formato dd/MM/yyyy HH:mm
export const parseFecha = (fechaISO: string | null): string | null => {
  if (!fechaISO) return null;
  const fecha = new Date(fechaISO);
  if (isNaN(fecha.getTime())) {
    return null;
  }

  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const año = fecha.getFullYear();
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');

  const fechaFormateada = `${dia}/${mes}/${año} ${horas}:${minutos}`;

  return fechaFormateada;
};


export function convertirFechaADDMMAAAA(fechaISO: string): string {
  if (!fechaISO) return '';
  const [año, mes, dia] = fechaISO.split('-');
  if (!año || !mes || !dia) return '';
  return `${dia}/${mes}/${año}`;
}

export function obtenerHora12(fecha: string): string {
  if (!fecha || typeof fecha !== 'string' || !fecha.includes('T')) return '';

  const partes = fecha.split('T');
  if (partes.length !== 2 || !partes[1].includes(':')) return '';

  const [hora, minutos] = partes[1].split(':');
  const hNum = parseInt(hora, 10);

  if (isNaN(hNum) || isNaN(parseInt(minutos, 10))) return '';

  let h = hNum % 12;
  h = h === 0 ? 12 : h;

  const ampm = hNum >= 12 ? 'PM' : 'AM';
  return `${h}:${minutos} ${ampm}`;
}

