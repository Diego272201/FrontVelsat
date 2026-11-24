import { IBM_Plex_Sans } from 'next/font/google';

/** Fuente de las tablas de unidades del modal de configuración (Odómetro, Íconos). */
export const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

/** Estilo de la placa en las tablas de unidades. */
export const PLATE_CLASS = 'text-[12.5px] font-semibold tracking-[.02em] text-[#1e3a8a]';
