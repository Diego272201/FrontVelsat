import { ReporteParadaItem, ReporteServicio, ResumenKpisData, TipoParada, EstadoPuntualidad } from './types';
import { sumarMinutos } from '../utils';

// Helper para convertir HH:mm a minutos desde medianoche
function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Helper para convertir minutos a HH:mm
function minutosAHora(minutos: number): string {
  const normalizados = ((minutos % 1440) + 1440) % 1440;
  const h = Math.floor(normalizados / 60);
  const m = normalizados % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Pseudo-random determinista según semilla numérica
function pseudoRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Definición estática de paradas por ruta base
interface RutaDef {
  id: number;
  codigo: string;
  nombre: string;
  grupo: string;
  color: string;
  placa: string;
  conductor: string;
  brevete: string;
  celular: string;
  horaBaseSalida: string;
  paradas: { nombre: string; minDesdeAnterior: number; radioMetros: number }[];
}

const RUTAS_BASE_MOCK: RutaDef[] = [
  {
    id: 3,
    codigo: 'RT-001',
    nombre: 'Ruta 1',
    grupo: 'Ruta REP San Isidro',
    color: '#3B5BDB',
    placa: 'BCJ-814',
    conductor: 'Carlos Mendoza Ramos',
    brevete: 'Q12894562',
    celular: '984 512 873',
    horaBaseSalida: '06:30',
    paradas: [
      { nombre: 'Avenida El Sol & Avenida Guardia Civil Sur', minDesdeAnterior: 0, radioMetros: 25 },
      { nombre: 'Tottus', minDesdeAnterior: 7, radioMetros: 30 },
      { nombre: 'Av Tomás Marsan & Av. Andrés Tinoco (Wong)', minDesdeAnterior: 7, radioMetros: 25 },
      { nombre: 'Avenida Ayacucho & Doña Rosa', minDesdeAnterior: 4, radioMetros: 20 },
      { nombre: 'Avenida Ayacucho & Doña Ana', minDesdeAnterior: 1, radioMetros: 20 },
      { nombre: 'Avenida La Merced & Avenida Mariscal Ramón Castilla', minDesdeAnterior: 5, radioMetros: 25 },
      { nombre: 'Avenida Roca y Boloña & Avenida República de Panamá', minDesdeAnterior: 8, radioMetros: 25 },
      { nombre: 'Av. República de Panamá & Tienda Mass', minDesdeAnterior: 1, radioMetros: 20 },
      { nombre: 'Avenida Domingo Orué & Avenida República de Panamá', minDesdeAnterior: 4, radioMetros: 25 },
      { nombre: 'Av. Domingo Orué & C. Los Halcones (caseta serenazgo)', minDesdeAnterior: 1, radioMetros: 20 },
      { nombre: 'Av. Sta. Cruz 120 (Destino)', minDesdeAnterior: 5, radioMetros: 35 },
    ],
  },
  {
    id: 4,
    codigo: 'RT-002',
    nombre: 'Ruta 2',
    grupo: 'Ruta REP San Isidro',
    color: '#0CA678',
    placa: 'F7A-921',
    conductor: 'Juan Pérez Quispe',
    brevete: 'Q45892110',
    celular: '992 145 632',
    horaBaseSalida: '06:45',
    paradas: [
      { nombre: 'Avenida Los Constructores & Los Industriales', minDesdeAnterior: 0, radioMetros: 25 },
      { nombre: 'Av. Flora Tristán & Av. Los Constructores', minDesdeAnterior: 5, radioMetros: 25 },
      { nombre: 'Av. La Molina & Av. Javier Prado', minDesdeAnterior: 6, radioMetros: 30 },
      { nombre: 'Óvalo Monitor Huáscar', minDesdeAnterior: 8, radioMetros: 30 },
      { nombre: 'Javier Prado Este & Av. San Luis', minDesdeAnterior: 9, radioMetros: 25 },
      { nombre: 'Avenida Aviación & Javier Prado', minDesdeAnterior: 5, radioMetros: 25 },
      { nombre: 'Avenida Guardia Civil & Calle Morelli', minDesdeAnterior: 4, radioMetros: 20 },
      { nombre: 'Avenida Canaval y Moreyra & Vía Expresa', minDesdeAnterior: 5, radioMetros: 25 },
      { nombre: 'Avenida Las Begonias & Calle Dean Valdivia', minDesdeAnterior: 3, radioMetros: 20 },
      { nombre: 'Av. Sta. Cruz 120 (Destino)', minDesdeAnterior: 4, radioMetros: 35 },
    ],
  },
  {
    id: 5,
    codigo: 'RT-003',
    nombre: 'Ruta 3',
    grupo: 'Ruta REP San Isidro',
    color: '#7048E8',
    placa: 'D4E-712',
    conductor: 'Víctor Huamán Cárdenas',
    brevete: 'Q87451230',
    celular: '978 412 559',
    horaBaseSalida: '07:00',
    paradas: [
      { nombre: 'Avenida Universitaria & Avenida Santa Elvira', minDesdeAnterior: 0, radioMetros: 25 },
      { nombre: 'Avenida Universitaria & Avenida Naranjal', minDesdeAnterior: 5, radioMetros: 25 },
      { nombre: 'Avenida Universitaria & Avenida Los Alisos', minDesdeAnterior: 4, radioMetros: 20 },
      { nombre: 'Avenida Carlos Izaguirre & Antúnez de Mayolo', minDesdeAnterior: 6, radioMetros: 30 },
      { nombre: 'Avenida Angélica Gamarra & Av. Universitaria', minDesdeAnterior: 5, radioMetros: 25 },
      { nombre: 'Av 12 octubre & Av. Tomás Valle', minDesdeAnterior: 4, radioMetros: 25 },
      { nombre: 'Av. Germán Amézaga (Puerta San Marcos)', minDesdeAnterior: 7, radioMetros: 30 },
      { nombre: 'Jirón Huancayo & Calle José Gálvez', minDesdeAnterior: 5, radioMetros: 20 },
      { nombre: 'Av. Perú 2400', minDesdeAnterior: 4, radioMetros: 25 },
      { nombre: 'Av. Zarumilla & Puente Pocitos', minDesdeAnterior: 5, radioMetros: 25 },
      { nombre: 'Av. Alfonso Ugarte & Plaza Dos de Mayo', minDesdeAnterior: 6, radioMetros: 30 },
      { nombre: 'Av. Guzmán Blanco & Plaza Bolognesi', minDesdeAnterior: 3, radioMetros: 25 },
      { nombre: 'Av. Salaverry & Av. 28 de Julio', minDesdeAnterior: 4, radioMetros: 25 },
      { nombre: 'AV TINGO MARÍA (UPN)', minDesdeAnterior: 5, radioMetros: 25 },
      { nombre: 'Av. Salaverry & Av. Cuba', minDesdeAnterior: 3, radioMetros: 20 },
      { nombre: 'Av. Salaverry & Av. Santa Cruz', minDesdeAnterior: 4, radioMetros: 25 },
      { nombre: 'Av. Santa Cruz & Ovalo Gutiérrez', minDesdeAnterior: 3, radioMetros: 25 },
      { nombre: 'Av. Sta. Cruz 120 (Destino)', minDesdeAnterior: 3, radioMetros: 35 },
    ],
  },
  {
    id: 6,
    codigo: 'RT-004',
    nombre: 'Ruta 4',
    grupo: 'Ruta REP San Isidro',
    color: '#D6336C',
    placa: 'A1B-305',
    conductor: 'Luis Morales Soto',
    brevete: 'Q65412398',
    celular: '965 874 123',
    horaBaseSalida: '07:15',
    paradas: [
      { nombre: 'Avenida Próceres & Av. San Hilarión Oeste', minDesdeAnterior: 0, radioMetros: 25 },
      { nombre: 'Av. Próceres & Estación Los Jardines', minDesdeAnterior: 6, radioMetros: 25 },
      { nombre: 'Av. Próceres & Los Acebos', minDesdeAnterior: 4, radioMetros: 20 },
      { nombre: 'Av. Malecón Checa & Chinchaysuyo', minDesdeAnterior: 7, radioMetros: 30 },
      { nombre: 'Paradero Puente Nuevo & Vía de Evitamiento', minDesdeAnterior: 5, radioMetros: 30 },
      { nombre: 'Puente Azul (El Agustino)', minDesdeAnterior: 4, radioMetros: 25 },
      { nombre: 'Trébol de Javier Prado & Evitamiento', minDesdeAnterior: 8, radioMetros: 35 },
      { nombre: 'Avenida Javier Prado Este & San Luis', minDesdeAnterior: 7, radioMetros: 25 },
      { nombre: 'Avenida Aviación & Javier Prado Este', minDesdeAnterior: 5, radioMetros: 25 },
      { nombre: 'Av. Guardia Civil & Parque Sur', minDesdeAnterior: 4, radioMetros: 20 },
      { nombre: 'Av. Rivera Navarrete & Av. Amador Merino', minDesdeAnterior: 5, radioMetros: 25 },
      { nombre: 'Av. Sta. Cruz 120 (Destino)', minDesdeAnterior: 6, radioMetros: 35 },
    ],
  },
  {
    id: 7,
    codigo: 'RT-005',
    nombre: 'Ruta 5',
    grupo: 'Ruta REP San Isidro',
    color: '#E8590C',
    placa: 'Z3X-509',
    conductor: 'Jorge Alvares Flores',
    brevete: 'Q98745612',
    celular: '954 123 687',
    horaBaseSalida: '07:30',
    paradas: [
      { nombre: 'Avenida Elmer Faucett & Avenida Venezuela', minDesdeAnterior: 0, radioMetros: 25 },
      { nombre: 'Av. Venezuela & Av. Faucett (Metro)', minDesdeAnterior: 2, radioMetros: 20 },
      { nombre: 'Av. La Marina & Parque de las Leyendas', minDesdeAnterior: 5, radioMetros: 25 },
      { nombre: 'Avenida Universitaria & Avenida La Mar', minDesdeAnterior: 4, radioMetros: 20 },
      { nombre: 'Plaza San Miguel (Av. La Marina)', minDesdeAnterior: 3, radioMetros: 30 },
      { nombre: 'Av. Sucre & Jr. Junín (Magdalena)', minDesdeAnterior: 4, radioMetros: 25 },
      { nombre: 'Av. Brasil & Av. Javier Prado Oeste', minDesdeAnterior: 4, radioMetros: 25 },
      { nombre: 'Av. Javier Prado Oeste & Av. Juan de Aliaga', minDesdeAnterior: 3, radioMetros: 20 },
      { nombre: 'Av. Javier Prado Oeste & Jirón Trujillo', minDesdeAnterior: 2, radioMetros: 20 },
      { nombre: 'Avenida Salaverry & Javier Prado Oeste', minDesdeAnterior: 3, radioMetros: 25 },
      { nombre: 'AV. ALBERTO DEL CAMPO & AV SALAVERRY', minDesdeAnterior: 2, radioMetros: 20 },
      { nombre: 'Calle Los Pinos & Av. Pezet', minDesdeAnterior: 2, radioMetros: 20 },
      { nombre: 'Av. Sta. Cruz 120 (Destino)', minDesdeAnterior: 2, radioMetros: 35 },
    ],
  },
];

/**
 * Genera el reporte estático/simulado para una fecha y filtro de ruta, calculando
 * permanencias, horas reales de llegada y salida, y estado de puntualidad.
 */
export function generarReporteServicios(fechaIso: string, rutaIdSeleccionada: number | 'TODAS' = 'TODAS'): ReporteServicio[] {
  // Convertir fecha a semilla numérica para determinismo
  const [yyyy, mm, dd] = fechaIso.split('-').map(Number);
  const semillaBase = (yyyy || 2026) * 10000 + (mm || 1) * 100 + (dd || 1);

  const [dia, mes, anio] = [String(dd).padStart(2, '0'), String(mm).padStart(2, '0'), String(yyyy)];
  const fechaTexto = `${dia}/${mes}/${anio}`;

  const rutasFiltradas = rutaIdSeleccionada === 'TODAS'
    ? RUTAS_BASE_MOCK
    : RUTAS_BASE_MOCK.filter((r) => r.id === rutaIdSeleccionada);

  return rutasFiltradas.map((r, rIndex) => {
    const rnd = pseudoRandom(semillaBase + r.id * 73 + rIndex);

    // Variación pequeña de la hora de salida según el día (+/- 4 min)
    const varSalida = Math.floor(rnd() * 7) - 3;
    const horaSalidaRealMin = horaAMinutos(r.horaBaseSalida) + varSalida;
    const horaSalidaReal = minutosAHora(horaSalidaRealMin);

    let acumMin = 0;
    let paradasCompletadas = 0;
    let paradasATiempo = 0;
    let paradasAdelantadas = 0;
    let paradasRetrasadas = 0;
    let paradasOmitidas = 0;
    let tiempoTotalParadas = 0;

    const paradasReporte: ReporteParadaItem[] = r.paradas.map((p, idx) => {
      acumMin += p.minDesdeAnterior;
      const esOrigen = idx === 0;
      const esDestino = idx === r.paradas.length - 1;
      const tipo: TipoParada = esOrigen ? 'ORIGEN' : esDestino ? 'DESTINO' : 'INTERMEDIO';

      // Hora programada según itinerario teórico
      const horaProg = sumarMinutos(r.horaBaseSalida, acumMin);
      const horaProgMin = horaAMinutos(horaProg);

      // Simulación de tráfico acumulado y tiempos de parada
      // Desvío en minutos respecto al programado (-3 min a +8 min)
      const desvio = esOrigen
        ? varSalida
        : varSalida + Math.floor((rnd() * 8) - 2) + Math.floor(idx * 0.3);

      const horaLlegadaRealMin = horaProgMin + desvio;
      const horaLlegadaReal = minutosAHora(horaLlegadaRealMin);

      // Minutos de permanencia en la parada:
      // Origen suele esperar 3-5 min, intermedias 1-3 min, destino finaliza
      let tiempoPermanencia: number;
      if (esOrigen) {
        tiempoPermanencia = Math.floor(rnd() * 3) + 3; // 3 a 5 min
      } else if (esDestino) {
        tiempoPermanencia = Math.floor(rnd() * 2) + 2; // 2 a 3 min
      } else {
        // En intermedias: 1 a 4 min según flujo de pasajeros
        tiempoPermanencia = Math.floor(rnd() * 3) + 1;
      }
      tiempoTotalParadas += tiempoPermanencia;

      const horaSalidaRealMin = horaLlegadaRealMin + tiempoPermanencia;
      const horaSalidaReal = minutosAHora(horaSalidaRealMin);

      // Evaluación de puntualidad:
      // A_TIEMPO: entre -2 min y +3 min
      // ADELANTADO: < -2 min
      // RETRASADO: > +3 min
      let estadoPuntualidad: EstadoPuntualidad = 'A_TIEMPO';
      let observaciones = '';

      if (desvio > 3) {
        estadoPuntualidad = 'RETRASADO';
        paradasRetrasadas++;
        observaciones = `Congestión vehicular (+${desvio} min)`;
      } else if (desvio < -2) {
        estadoPuntualidad = 'ADELANTADO';
        paradasAdelantadas++;
        observaciones = `Paso anticipado (${desvio} min)`;
      } else {
        estadoPuntualidad = 'A_TIEMPO';
        paradasATiempo++;
        observaciones = 'Dentro del rango óptimo';
      }

      paradasCompletadas++;

      return {
        id: idx + 1,
        orden: idx + 1,
        nombre: p.nombre,
        tipo,
        radioMetros: p.radioMetros,
        minutosAcumulados: acumMin,
        horaProgramada: horaProg,
        horaLlegadaReal,
        tiempoPermanenciaMin: tiempoPermanencia,
        horaSalidaReal,
        diferenciaMinutos: desvio,
        estadoPuntualidad,
        observaciones,
      };
    });

    const duracionEstimadaMin = acumMin;
    const duracionRealMin = acumMin + (horaAMinutos(paradasReporte[paradasReporte.length - 1].horaLlegadaReal || '00:00') - horaAMinutos(r.horaBaseSalida));

    return {
      id: r.id * 100 + (dd || 1),
      rutaId: r.id,
      rutaCodigo: r.codigo,
      rutaNombre: r.nombre,
      grupo: r.grupo,
      color: r.color,
      fechaSalida: fechaTexto,
      fechaIso,
      horaSalidaProgramada: r.horaBaseSalida,
      horaSalidaReal,
      horaLlegadaEstimada: sumarMinutos(r.horaBaseSalida, duracionEstimadaMin),
      horaLlegadaReal: paradasReporte[paradasReporte.length - 1].horaLlegadaReal,
      duracionEstimadaMin,
      duracionRealMin,
      deviceID: r.placa,
      conductorNombre: r.conductor,
      conductorBrevete: r.brevete,
      conductorCelular: r.celular,
      estadoServicio: 'FINALIZADO',
      totalParadas: paradasReporte.length,
      paradasCompletadas,
      paradasATiempo,
      paradasAdelantadas,
      paradasRetrasadas,
      paradasOmitidas,
      tiempoTotalParadasMin: tiempoTotalParadas,
      paradas: paradasReporte,
    };
  });
}

/**
 * Calcula KPIs consolidados para el dashboard de reportes.
 */
export function calcularKpis(servicios: ReporteServicio[]): ResumenKpisData {
  let totalParadas = 0;
  let paradasCompletadas = 0;
  let paradasATiempo = 0;
  let paradasAdelantadas = 0;
  let paradasRetrasadas = 0;
  let paradasOmitidas = 0;
  let tiempoTotalEnParadasMin = 0;

  for (const s of servicios) {
    totalParadas += s.totalParadas;
    paradasCompletadas += s.paradasCompletadas;
    paradasATiempo += s.paradasATiempo;
    paradasAdelantadas += s.paradasAdelantadas;
    paradasRetrasadas += s.paradasRetrasadas;
    paradasOmitidas += s.paradasOmitidas;
    tiempoTotalEnParadasMin += s.tiempoTotalParadasMin;
  }

  const porcentajePuntualidad =
    paradasCompletadas > 0 ? Math.round((paradasATiempo / paradasCompletadas) * 100) : 0;

  const promedioPermanenciaMin =
    paradasCompletadas > 0
      ? Number((tiempoTotalEnParadasMin / paradasCompletadas).toFixed(1))
      : 0;

  return {
    totalServicios: servicios.length,
    totalParadas,
    paradasCompletadas,
    paradasATiempo,
    paradasAdelantadas,
    paradasRetrasadas,
    paradasOmitidas,
    porcentajePuntualidad,
    promedioPermanenciaMin,
    tiempoTotalEnParadasMin,
  };
}
