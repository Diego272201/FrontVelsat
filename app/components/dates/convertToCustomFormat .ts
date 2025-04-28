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
  

export function validateDateRange(startDate: string, endDate: string, maxDays: number = 5): string | null {
  if (!startDate || !endDate) return 'Fechas incompletas';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
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