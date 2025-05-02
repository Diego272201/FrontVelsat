// types/IDestino.ts

export interface Lugar {
    codlugar: number;
    direccion: string | null;
    distrito: string | null;
    wy: string | null;
    wx: string | null;
  }
  
  export interface IDestino {
    codigo: string;
    codlan: string;
    apepate: string;
    lugar: Lugar;
  }
  