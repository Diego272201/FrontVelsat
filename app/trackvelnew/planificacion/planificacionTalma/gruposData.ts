import { Grupo } from "./types";

export const gruposIniciales: Grupo[] = [
  {
    id: 'grupo-1',
    numero: 1,
    tipoSalida: 'Salida',
    empresa: 'Rep',
    destino: 'Destino Isa Rep (san Juan De Miraflores)',
    inicio: new Date(2025, 11, 27, 7, 10),
    fin: new Date(2025, 11, 27, 7, 10),
    tarifa: 'Latam',
    conductor: '',
    unidad: '',
    duracion: '0h 0min',
    pasajeros: [
      {
        id: 'p1',
        nombre: 'José Velásquez Sanchez ( 990930796 )',
        distrito: 'SURCO',
        direccion: 'Jr. Tacna 207 Depto C403 Santiago de Surco Alt. Cuadra 1 de Av. Ayacucho',
        fecha: '27/12/2025 07:10',
        area: 'REP'
      },
      {
        id: 'p2',
        nombre: 'María González López (987654321)',
        distrito: 'SURCO',
        direccion: 'Av. Principal 456',
        fecha: '27/12/2025 07:10',
        area: 'REP'
      },
      {
        id: 'p3',
        nombre: 'Carlos Ramírez Torres (912345678)',
        distrito: 'SURCO',
        direccion: 'Calle Los Pinos 789',
        fecha: '27/12/2025 07:10',
        area: 'REP'
      },
      {
        id: 'p7',
        nombre: 'Pedro Martínez Silva (998877665)',
        distrito: 'SURCO',
        direccion: 'Av. Benavides 890',
        fecha: '27/12/2025 07:10',
        area: 'REP'
      },
      {
        id: 'p8',
        nombre: 'Laura Castro Vega (987654322)',
        distrito: 'SURCO',
        direccion: 'Jr. Los Rosales 234',
        fecha: '27/12/2025 07:10',
        area: 'REP'
      }
    ]
  },
  {
    id: 'grupo-2',
    numero: 2,
    tipoSalida: 'Salida',
    empresa: 'Rep',
    destino: 'Destino Isa Rep (san Juan De Miraflores)',
    inicio: new Date(2025, 11, 27, 7, 10),
    fin: new Date(2025, 11, 27, 7, 10),
    tarifa: 'Latam',
    conductor: '',
    unidad: '',
    duracion: '0h 0min',
    pasajeros: [
      {
        id: 'p4',
        nombre: 'Jimmy Benites Espinoza - SMP / 935386749',
        distrito: 'SMP',
        direccion: 'Urb. Virol El Naranjal Mz "A" Lt 01 San Martín de Porres A dos cuadras del mercado Virol',
        fecha: '27/12/2025 07:10',
        area: 'REP'
      },
      {
        id: 'p5',
        nombre: 'Ana Pérez Ruiz (923456789)',
        distrito: 'SMP',
        direccion: 'Jr. Las Flores 321',
        fecha: '27/12/2025 07:10',
        area: 'REP'
      }
    ]
  },
  {
    id: 'grupo-3',
    numero: 3,
    tipoSalida: 'Salida',
    empresa: 'Rep',
    destino: 'Destino Isa Rep (san Juan De Miraflores)',
    inicio: new Date(2025, 11, 27, 8, 0),
    fin: new Date(2025, 11, 27, 8, 0),
    tarifa: 'Latam',
    conductor: '',
    unidad: '',
    duracion: '0h 0min',
    pasajeros: [
      {
        id: 'p6',
        nombre: 'Luis Fernández Castro (934567890)',
        distrito: 'MIRAFLORES',
        direccion: 'Av. Larco 1234',
        fecha: '27/12/2025 08:00',
        area: 'REP'
      }
    ]
  }
];