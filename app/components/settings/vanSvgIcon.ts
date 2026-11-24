/**
 * Íconos SVG de vehículos (Auto, Van Sprinter y Camión cisterna):
 * - Vista cenital para el mapa: rotación exacta de 360°, indicador de estado y sombra
 *   proyectada con luz constante; pintura metalizada, vidrios con reflejo, neumáticos,
 *   faros con lente y detalles propios de cada tipo.
 * - Perfil 2D para la lista lateral y el tab Íconos: pintura con reflejo de horizonte,
 *   juntas de paneles, aros con frenos/tuercas y sombras de contacto.
 */

const svgDataUrlCache = new Map<string, string>();

/**
 * Normaliza un ángulo en grados a [0, 360) y lo cuantiza en pasos de 2°
 * (180 entradas máx. en caché: visualmente indistinguible de 1° y ultra eficiente).
 */
export function normalizeVehicleHeading(heading: number): number {
  const raw = ((Number(heading) || 0) % 360 + 360) % 360;
  return (Math.round(raw / 2) * 2) % 360;
}

export const normalizeVanHeading = normalizeVehicleHeading;

/**
 * Construye el SVG cenital de una Van Sprinter apuntando a `angle` grados (0° = Norte).
 */
export function buildVanSvg(angle: number, isMoving?: boolean): string {
  const statusColor =
    isMoving === undefined ? '#113EB9' : isMoving ? '#16a34a' : '#ef4444';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="vpaint" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8f98a4"/>
      <stop offset="0.1" stop-color="#c4cbd3"/>
      <stop offset="0.28" stop-color="#e9edf1"/>
      <stop offset="0.42" stop-color="#ffffff"/>
      <stop offset="0.58" stop-color="#e4e8ed"/>
      <stop offset="0.86" stop-color="#b9c0c9"/>
      <stop offset="1" stop-color="#858e9a"/>
    </linearGradient>
    <linearGradient id="vglass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5b6878"/>
      <stop offset="0.35" stop-color="#222a35"/>
      <stop offset="1" stop-color="#0b0f15"/>
    </linearGradient>
    <linearGradient id="vsky" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#dbeafe" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#dbeafe" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#dbeafe" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="vlens" cx="0.4" cy="0.4" r="0.7">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#e2e8f0"/>
      <stop offset="1" stop-color="#7c8794"/>
    </radialGradient>
    <linearGradient id="vtail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f87171"/>
      <stop offset="1" stop-color="#991b1b"/>
    </linearGradient>
    <linearGradient id="vroof" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c9cfd6"/>
      <stop offset="0.35" stop-color="#f2f4f6"/>
      <stop offset="0.5" stop-color="#ffffff"/>
      <stop offset="0.7" stop-color="#e5e9ee"/>
      <stop offset="1" stop-color="#bcc3cc"/>
    </linearGradient>
    <filter id="vshadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.8"/>
      <feOffset dx="1.4" dy="2.2" result="off"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.38"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <g filter="url(#vshadow)">
    <g transform="rotate(${angle} 32 32)">
      <!-- Neumáticos -->
      <rect x="21.0" y="11.8" width="1.9" height="6.6" rx="0.85" fill="#14181e"/><line x1="21.25" y1="13.12" x2="22.65" y2="13.12" stroke="#3a4049" stroke-width="0.3"/><line x1="21.25" y1="14.44" x2="22.65" y2="14.44" stroke="#3a4049" stroke-width="0.3"/><line x1="21.25" y1="15.76" x2="22.65" y2="15.76" stroke="#3a4049" stroke-width="0.3"/><line x1="21.25" y1="17.08" x2="22.65" y2="17.08" stroke="#3a4049" stroke-width="0.3"/><rect x="41.1" y="11.8" width="1.9" height="6.6" rx="0.85" fill="#14181e"/><line x1="41.35" y1="13.12" x2="42.75" y2="13.12" stroke="#3a4049" stroke-width="0.3"/><line x1="41.35" y1="14.44" x2="42.75" y2="14.44" stroke="#3a4049" stroke-width="0.3"/><line x1="41.35" y1="15.76" x2="42.75" y2="15.76" stroke="#3a4049" stroke-width="0.3"/><line x1="41.35" y1="17.08" x2="42.75" y2="17.08" stroke="#3a4049" stroke-width="0.3"/>
      <rect x="21.0" y="44.2" width="1.9" height="6.6" rx="0.85" fill="#14181e"/><line x1="21.25" y1="45.52" x2="22.65" y2="45.52" stroke="#3a4049" stroke-width="0.3"/><line x1="21.25" y1="46.84" x2="22.65" y2="46.84" stroke="#3a4049" stroke-width="0.3"/><line x1="21.25" y1="48.16" x2="22.65" y2="48.16" stroke="#3a4049" stroke-width="0.3"/><line x1="21.25" y1="49.48" x2="22.65" y2="49.48" stroke="#3a4049" stroke-width="0.3"/><rect x="41.1" y="44.2" width="1.9" height="6.6" rx="0.85" fill="#14181e"/><line x1="41.35" y1="45.52" x2="42.75" y2="45.52" stroke="#3a4049" stroke-width="0.3"/><line x1="41.35" y1="46.84" x2="42.75" y2="46.84" stroke="#3a4049" stroke-width="0.3"/><line x1="41.35" y1="48.16" x2="42.75" y2="48.16" stroke="#3a4049" stroke-width="0.3"/><line x1="41.35" y1="49.48" x2="42.75" y2="49.48" stroke="#3a4049" stroke-width="0.3"/>

      <!-- Espejos grandes con brazo -->
      <path d="M22.2 18.6 L19.8 17.6 L19.0 17.4 C18.4 17.3 18.3 20.2 19.0 20.4 L22.2 21.0 Z" fill="#161b22"/>
      <path d="M41.8 18.6 L44.2 17.6 L45.0 17.4 C45.6 17.3 45.7 20.2 45.0 20.4 L41.8 21.0 Z" fill="#161b22"/>
      <path d="M19.2 17.9 L19.2 19.9 M44.8 17.9 L44.8 19.9" stroke="#ffffff" stroke-width="0.3" opacity="0.5"/>

      <!-- Carrocería Sprinter -->
      <path d="M25.5 8.5 C28.2 7.3 35.8 7.3 38.5 8.5 C40.4 9.3 41.6 11.4 41.8 14.0 L42.0 52.0
               C42.0 54.4 40.3 56.0 38.0 56.0 L26.0 56.0 C23.7 56.0 22.0 54.4 22.0 52.0 L22.2 14.0
               C22.4 11.4 23.6 9.3 25.5 8.5 Z"
            fill="url(#vpaint)" stroke="#4b5563" stroke-width="0.8"/>

      <!-- Frente: parrilla, faros e intermitentes -->
      <path d="M27.6 8.2 C30.4 7.8 33.6 7.8 36.4 8.2" fill="none" stroke="#1f2937" stroke-width="0.8"/>
      <path d="M28.0 8.0 C30.6 7.7 33.4 7.7 36.0 8.0" fill="none" stroke="#e5e9ee" stroke-width="0.3"/>
      <path d="M23.3 11.0 C24.2 9.5 25.6 8.9 27.0 8.7 L26.6 10.6 C25.4 10.8 24.4 11.3 23.7 12.1 Z" fill="#1b2129"/>
      <path d="M40.7 11.0 C39.8 9.5 38.4 8.9 37.0 8.7 L37.4 10.6 C38.6 10.8 39.6 11.3 40.3 12.1 Z" fill="#1b2129"/>
      <circle cx="25.2" cy="10.0" r="0.7" fill="url(#vlens)"/>
      <circle cx="38.8" cy="10.0" r="0.7" fill="url(#vlens)"/>
      <path d="M23.6 11.6 L24.4 10.8 M40.4 11.6 L39.6 10.8" stroke="#f59e0b" stroke-width="0.6" stroke-linecap="round"/>

      <!-- Capó corto con nervios -->
      <path d="M26.4 11.0 L25.8 15.0 M37.6 11.0 L38.2 15.0" stroke="#aab2bc" stroke-width="0.45"/>
      <path d="M26.9 11.0 L26.3 15.0 M38.1 11.0 L38.7 15.0" stroke="#ffffff" stroke-width="0.3" opacity="0.8"/>
      <path d="M29.6 9.6 L29.2 14.6" stroke="#ffffff" stroke-width="1.0" opacity="0.5" stroke-linecap="round"/>

      <!-- Parabrisas con reflejo y limpiaparabrisas -->
      <path d="M24.0 15.8 C27.4 14.4 36.6 14.4 40.0 15.8 L39.3 22.4 C36.0 21.4 28.0 21.4 24.7 22.4 Z" fill="#0d1117"/>
      <path d="M24.6 16.2 C27.8 15.0 36.2 15.0 39.4 16.2 L38.8 21.8 C35.7 20.9 28.3 20.9 25.2 21.8 Z" fill="url(#vglass)"/>
      <path d="M25.8 16.6 C28.6 15.8 32.2 15.6 34.6 15.9 L30.4 21.0 C28.3 21.0 26.6 21.2 25.5 21.5 Z" fill="#ffffff" opacity="0.16"/>
      <path d="M27.0 21.2 L31.0 19.8 M33.0 21.2 L37.0 19.8" stroke="#05070a" stroke-width="0.45" stroke-linecap="round"/>

      <!-- Ventanas de las puertas delanteras -->
      <path d="M22.7 22.6 L24.2 22.9 L24.2 28.4 L22.7 27.8 Z" fill="url(#vglass)"/>
      <path d="M41.3 22.6 L39.8 22.9 L39.8 28.4 L41.3 27.8 Z" fill="url(#vglass)"/>

      <!-- Techo alto con nervios longitudinales -->
      <rect x="24.4" y="23.0" width="15.2" height="30.4" rx="2.6" fill="url(#vroof)" stroke="#aab2bc" stroke-width="0.5"/>
      <line x1="27.0" y1="25.0" x2="27.0" y2="51.6" stroke="#aab2bc" stroke-width="0.5"/><line x1="27.45" y1="25.0" x2="27.45" y2="51.6" stroke="#ffffff" stroke-width="0.35" opacity="0.85"/><line x1="30.0" y1="25.0" x2="30.0" y2="51.6" stroke="#aab2bc" stroke-width="0.5"/><line x1="30.45" y1="25.0" x2="30.45" y2="51.6" stroke="#ffffff" stroke-width="0.35" opacity="0.85"/><line x1="34.0" y1="25.0" x2="34.0" y2="51.6" stroke="#aab2bc" stroke-width="0.5"/><line x1="34.45" y1="25.0" x2="34.45" y2="51.6" stroke="#ffffff" stroke-width="0.35" opacity="0.85"/><line x1="37.0" y1="25.0" x2="37.0" y2="51.6" stroke="#aab2bc" stroke-width="0.5"/><line x1="37.45" y1="25.0" x2="37.45" y2="51.6" stroke="#ffffff" stroke-width="0.35" opacity="0.85"/>
      <line x1="25.0" y1="36.0" x2="39.0" y2="36.0" stroke="#c4cbd3" stroke-width="0.3"/><line x1="25.0" y1="44.0" x2="39.0" y2="44.0" stroke="#c4cbd3" stroke-width="0.3"/>
      <path d="M32.6 24.0 L32.6 52.4" stroke="#ffffff" stroke-width="1.4" opacity="0.35" stroke-linecap="round"/>

      <!-- Unidad de A/C con rejilla -->
      <rect x="28.2" y="26.6" width="7.6" height="6.0" rx="1.5" fill="#e7ebef" stroke="#7c8592" stroke-width="0.5"/>
      <path d="M29.2 28.0 L34.8 28.0 M29.2 31.2 L34.8 31.2" stroke="#9aa3ae" stroke-width="0.35"/>

      <!-- Riel de puerta corrediza y juntas laterales -->
      <path d="M41.7 33.0 L41.7 49.0" stroke="#2a313b" stroke-width="0.6"/>
      <path d="M22.3 29.0 L23.6 29.0 M41.7 29.0 L40.4 29.0" stroke="#5f6874" stroke-width="0.4"/>

      <!-- Spoiler trasero con tercera luz de freno -->
      <rect x="25.6" y="53.0" width="12.8" height="1.6" rx="0.8" fill="#2a313b"/>
      <rect x="30.4" y="53.4" width="3.2" height="0.8" rx="0.4" fill="#ef4444"/>
      <!-- Puertas traseras, parachoques y luces -->
      <line x1="32.0" y1="54.6" x2="32.0" y2="55.9" stroke="#5f6874" stroke-width="0.4"/>
      <rect x="23.0" y="54.0" width="2.6" height="1.8" rx="0.6" fill="url(#vtail)"/>
      <rect x="38.4" y="54.0" width="2.6" height="1.8" rx="0.6" fill="url(#vtail)"/>
      <rect x="24.6" y="55.6" width="14.8" height="1.1" rx="0.5" fill="#1f2937"/>

      <!-- Estado -->
      <circle cx="32.0" cy="29.6" r="2.0" fill="#ffffff" opacity="0.9"/><circle cx="32.0" cy="29.6" r="1.45" fill="${statusColor}"/><circle cx="31.58" cy="29.14" r="0.45" fill="#ffffff" opacity="0.75"/>
    </g>
  </g>
</svg>`;
}

/**
 * Construye el SVG cenital de un Camión Cisterna apuntando a `angle` grados (0° = Norte),
 * con cabina delantera, tanque cilíndrico metálico con efecto 3D, pasarela y 3 escotillas.
 */
export function buildCisternaSvg(angle: number, isMoving?: boolean): string {
  const statusColor =
    isMoving === undefined ? '#113EB9' : isMoving ? '#16a34a' : '#ef4444';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="cpaint" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8f98a4"/>
      <stop offset="0.1" stop-color="#c4cbd3"/>
      <stop offset="0.28" stop-color="#e9edf1"/>
      <stop offset="0.42" stop-color="#ffffff"/>
      <stop offset="0.58" stop-color="#e4e8ed"/>
      <stop offset="0.86" stop-color="#b9c0c9"/>
      <stop offset="1" stop-color="#858e9a"/>
    </linearGradient>
    <linearGradient id="cglass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5b6878"/>
      <stop offset="0.35" stop-color="#222a35"/>
      <stop offset="1" stop-color="#0b0f15"/>
    </linearGradient>
    <linearGradient id="csky" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#dbeafe" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#dbeafe" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#dbeafe" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="clens" cx="0.4" cy="0.4" r="0.7">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#e2e8f0"/>
      <stop offset="1" stop-color="#7c8794"/>
    </radialGradient>
    <linearGradient id="ctail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f87171"/>
      <stop offset="1" stop-color="#991b1b"/>
    </linearGradient>
    <linearGradient id="ctank" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5f6874"/>
      <stop offset="0.08" stop-color="#9ea7b2"/>
      <stop offset="0.22" stop-color="#e6eaee"/>
      <stop offset="0.32" stop-color="#ffffff"/>
      <stop offset="0.45" stop-color="#d7dce2"/>
      <stop offset="0.62" stop-color="#eef1f4"/>
      <stop offset="0.82" stop-color="#a6aeb9"/>
      <stop offset="0.93" stop-color="#c3c9d1"/>
      <stop offset="1" stop-color="#58616d"/>
    </linearGradient>
    <radialGradient id="croof" cx="0.45" cy="0.4" r="0.75">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.55" stop-color="#e4e8ec"/>
      <stop offset="1" stop-color="#a9b1bb"/>
    </radialGradient>
    <radialGradient id="cdome" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#cfd5dc"/>
      <stop offset="1" stop-color="#7c8592"/>
    </radialGradient>
    <filter id="cshadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.8"/>
      <feOffset dx="1.4" dy="2.2" result="off"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.38"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <g filter="url(#cshadow)">
    <g transform="rotate(${angle} 32 32)">
      <!-- Neumáticos casi ocultos (eje delantero bajo la cabina, tándem dual bajo el tanque) -->
      <rect x="22.2" y="9.6" width="1.2" height="5.0" rx="0.54" fill="#14181e"/><line x1="22.45" y1="10.85" x2="23.15" y2="10.85" stroke="#3a4049" stroke-width="0.3"/><line x1="22.45" y1="12.10" x2="23.15" y2="12.10" stroke="#3a4049" stroke-width="0.3"/><line x1="22.45" y1="13.35" x2="23.15" y2="13.35" stroke="#3a4049" stroke-width="0.3"/><rect x="40.6" y="9.6" width="1.2" height="5.0" rx="0.54" fill="#14181e"/><line x1="40.85" y1="10.85" x2="41.55" y2="10.85" stroke="#3a4049" stroke-width="0.3"/><line x1="40.85" y1="12.10" x2="41.55" y2="12.10" stroke="#3a4049" stroke-width="0.3"/><line x1="40.85" y1="13.35" x2="41.55" y2="13.35" stroke="#3a4049" stroke-width="0.3"/>
      <rect x="22.0" y="41.4" width="1.4" height="5.0" rx="0.63" fill="#14181e"/><line x1="22.25" y1="42.65" x2="23.15" y2="42.65" stroke="#3a4049" stroke-width="0.3"/><line x1="22.25" y1="43.90" x2="23.15" y2="43.90" stroke="#3a4049" stroke-width="0.3"/><line x1="22.25" y1="45.15" x2="23.15" y2="45.15" stroke="#3a4049" stroke-width="0.3"/><rect x="40.6" y="41.4" width="1.4" height="5.0" rx="0.63" fill="#14181e"/><line x1="40.85" y1="42.65" x2="41.75" y2="42.65" stroke="#3a4049" stroke-width="0.3"/><line x1="40.85" y1="43.90" x2="41.75" y2="43.90" stroke="#3a4049" stroke-width="0.3"/><line x1="40.85" y1="45.15" x2="41.75" y2="45.15" stroke="#3a4049" stroke-width="0.3"/>
      <rect x="22.0" y="48.0" width="1.4" height="5.0" rx="0.63" fill="#14181e"/><line x1="22.25" y1="49.25" x2="23.15" y2="49.25" stroke="#3a4049" stroke-width="0.3"/><line x1="22.25" y1="50.50" x2="23.15" y2="50.50" stroke="#3a4049" stroke-width="0.3"/><line x1="22.25" y1="51.75" x2="23.15" y2="51.75" stroke="#3a4049" stroke-width="0.3"/><rect x="40.6" y="48.0" width="1.4" height="5.0" rx="0.63" fill="#14181e"/><line x1="40.85" y1="49.25" x2="41.75" y2="49.25" stroke="#3a4049" stroke-width="0.3"/><line x1="40.85" y1="50.50" x2="41.75" y2="50.50" stroke="#3a4049" stroke-width="0.3"/><line x1="40.85" y1="51.75" x2="41.75" y2="51.75" stroke="#3a4049" stroke-width="0.3"/>

      <!-- Chasis visible entre cabina y tanque -->
      <rect x="26.4" y="17.6" width="11.2" height="5.4" fill="#1f252d"/>
      <path d="M28.0 17.6 L28.0 23.0 M36.0 17.6 L36.0 23.0" stroke="#4b5563" stroke-width="1.1"/>
      <path d="M26.4 20.2 L37.6 20.2" stroke="#3a4250" stroke-width="0.6"/>
      <!-- Depósitos de aire a los lados del chasis -->
      <rect x="24.0" y="18.4" width="2.0" height="3.6" rx="1.0" fill="#9aa3ae" stroke="#5f6874" stroke-width="0.3"/>
      <rect x="38.0" y="18.4" width="2.0" height="3.6" rx="1.0" fill="#9aa3ae" stroke="#5f6874" stroke-width="0.3"/>

      <!-- Espejos: brazo fino y cabezal delgado -->
      <path d="M23.4 8.0 L20.6 7.6 M40.6 8.0 L43.4 7.6" stroke="#2a313b" stroke-width="0.45" stroke-linecap="round"/>
      <rect x="19.9" y="6.8" width="1.0" height="3.0" rx="0.4" fill="#2a313b"/>
      <rect x="43.1" y="6.8" width="1.0" height="3.0" rx="0.4" fill="#2a313b"/>

      <!-- Cabina: frente curvo, parabrisas al frente y techo abombado -->
      <path d="M25.4 6.0 C28.6 5.4 35.4 5.4 38.6 6.0 C40.0 6.3 40.9 7.3 40.9 8.8 L40.9 16.6 C40.9 17.6 40.2 18.2 39.2 18.2
               L24.8 18.2 C23.8 18.2 23.1 17.6 23.1 16.6 L23.1 8.8 C23.1 7.3 24.0 6.3 25.4 6.0 Z"
            fill="url(#cpaint)" stroke="#4b5563" stroke-width="0.7"/>
      <path d="M24.4 6.9 C28.0 6.2 36.0 6.2 39.6 6.9 L39.3 8.7 C35.8 8.2 28.2 8.2 24.7 8.7 Z" fill="url(#cglass)"/>
      <path d="M25.6 7.0 L31.0 6.7 L29.0 8.4 L25.2 8.6 Z" fill="#ffffff" opacity="0.2"/>
      <path d="M24.6 9.2 C28.2 8.7 35.8 8.7 39.4 9.2 L39.4 17.0 C35.8 17.4 28.2 17.4 24.6 17.0 Z" fill="url(#croof)"/>
      <!-- Escotilla de techo -->
      <rect x="29.4" y="11.2" width="5.2" height="3.6" rx="0.8" fill="#c9cfd6" stroke="#7c8592" stroke-width="0.35"/>
      <!-- Faros en las esquinas del frente -->
      <path d="M24.0 6.4 L26.4 6.0 L26.4 6.7 L23.8 7.2 Z" fill="#e2e8f0" stroke="#5f6874" stroke-width="0.2"/>
      <path d="M40.0 6.4 L37.6 6.0 L37.6 6.7 L40.2 7.2 Z" fill="#e2e8f0" stroke="#5f6874" stroke-width="0.2"/>
      <!-- Juntas de las puertas de la cabina -->
      <path d="M23.1 13.6 L24.4 13.6 M40.9 13.6 L39.6 13.6" stroke="#5f6874" stroke-width="0.35"/>

      <!-- Tanque cilíndrico con cabezales abombados -->
      <path d="M23.0 25.2 C23.0 23.0 27.0 21.8 32.0 21.8 C37.0 21.8 41.0 23.0 41.0 25.2 L41.0 53.2
               C41.0 55.4 37.0 56.6 32.0 56.6 C27.0 56.6 23.0 55.4 23.0 53.2 Z"
            fill="url(#ctank)" stroke="#3f4752" stroke-width="0.7"/>
      <path d="M23.4 25.4 C27.2 24.0 36.8 24.0 40.6 25.4" fill="none" stroke="#ffffff" stroke-width="0.4" opacity="0.8"/>
      <path d="M23.4 52.8 C27.2 54.2 36.8 54.2 40.6 52.8" fill="none" stroke="#6b7480" stroke-width="0.4"/>
      <path d="M23.2 31.4 C27.0 32.3 37.0 32.3 40.8 31.4" fill="none" stroke="#7c8592" stroke-width="0.5"/><path d="M23.2 31.9 C27.0 32.8 37.0 32.8 40.8 31.9" fill="none" stroke="#ffffff" stroke-width="0.3" opacity="0.75"/><path d="M23.2 40.2 C27.0 41.1 37.0 41.1 40.8 40.2" fill="none" stroke="#7c8592" stroke-width="0.5"/><path d="M23.2 40.7 C27.0 41.6 37.0 41.6 40.8 40.7" fill="none" stroke="#ffffff" stroke-width="0.3" opacity="0.75"/><path d="M23.2 49.0 C27.0 49.9 37.0 49.9 40.8 49.0" fill="none" stroke="#7c8592" stroke-width="0.5"/><path d="M23.2 49.5 C27.0 50.4 37.0 50.4 40.8 49.5" fill="none" stroke="#ffffff" stroke-width="0.3" opacity="0.75"/>
      <!-- Reflejo longitudinal del cilindro -->
      <path d="M28.4 23.2 L28.4 55.0" stroke="#ffffff" stroke-width="1.0" opacity="0.55" stroke-linecap="round"/>

      <!-- Pasarela angosta con barandas -->
      <rect x="30.4" y="24.2" width="3.2" height="29.8" rx="0.6" fill="#8f98a4" fill-opacity="0.45"/>
      <path d="M30.0 24.4 L30.0 53.8 M34.0 24.4 L34.0 53.8" stroke="#4b5563" stroke-width="0.35"/>
      <!-- Escotillas -->
      <circle cx="32.0" cy="28.0" r="1.75" fill="#5f6874"/><circle cx="32.0" cy="28.0" r="1.55" fill="url(#cdome)"/><circle cx="33.35" cy="28.00" r="0.16" fill="#4b5563"/><circle cx="32.67" cy="29.17" r="0.16" fill="#4b5563"/><circle cx="31.32" cy="29.17" r="0.16" fill="#4b5563"/><circle cx="30.65" cy="28.00" r="0.16" fill="#4b5563"/><circle cx="31.32" cy="26.83" r="0.16" fill="#4b5563"/><circle cx="32.67" cy="26.83" r="0.16" fill="#4b5563"/>
      <circle cx="32.0" cy="39.2" r="1.75" fill="#5f6874"/><circle cx="32.0" cy="39.2" r="1.55" fill="url(#cdome)"/><circle cx="33.35" cy="39.20" r="0.16" fill="#4b5563"/><circle cx="32.67" cy="40.37" r="0.16" fill="#4b5563"/><circle cx="31.32" cy="40.37" r="0.16" fill="#4b5563"/><circle cx="30.65" cy="39.20" r="0.16" fill="#4b5563"/><circle cx="31.32" cy="38.03" r="0.16" fill="#4b5563"/><circle cx="32.67" cy="38.03" r="0.16" fill="#4b5563"/>
      <circle cx="32.0" cy="50.4" r="1.75" fill="#5f6874"/><circle cx="32.0" cy="50.4" r="1.55" fill="url(#cdome)"/><circle cx="33.35" cy="50.40" r="0.16" fill="#4b5563"/><circle cx="32.67" cy="51.57" r="0.16" fill="#4b5563"/><circle cx="31.32" cy="51.57" r="0.16" fill="#4b5563"/><circle cx="30.65" cy="50.40" r="0.16" fill="#4b5563"/><circle cx="31.32" cy="49.23" r="0.16" fill="#4b5563"/><circle cx="32.67" cy="49.23" r="0.16" fill="#4b5563"/>

      <!-- Escalera trasera y luces -->
      <path d="M29.6 55.6 L29.6 57.4 M31.4 55.8 L31.4 57.6" stroke="#4b5563" stroke-width="0.35"/>
      <rect x="24.6" y="56.4" width="14.8" height="1.2" rx="0.5" fill="#1f2937"/>
      <rect x="24.8" y="56.5" width="2.6" height="1.0" rx="0.4" fill="url(#ctail)"/>
      <rect x="36.6" y="56.5" width="2.6" height="1.0" rx="0.4" fill="url(#ctail)"/>

      <!-- Estado (sobre la escotilla del techo de la cabina) -->
      <circle cx="32.0" cy="13.0" r="2.0" fill="#ffffff" opacity="0.9"/><circle cx="32.0" cy="13.0" r="1.45" fill="${statusColor}"/><circle cx="31.58" cy="12.54" r="0.45" fill="#ffffff" opacity="0.75"/>
    </g>
  </g>
</svg>`;
}

/**
 * Construye el SVG cenital de un Auto / Sedán deportivo apuntando a `angle` grados (0° = Norte),
 * con techo panorámico oscuro, parabrisas curvo, faros LED y sombra con luz constante.
 */
export function buildAutoSvg(angle: number, isMoving?: boolean): string {
  const statusColor =
    isMoving === undefined ? '#113EB9' : isMoving ? '#16a34a' : '#ef4444';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="apaint" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8f98a4"/>
      <stop offset="0.1" stop-color="#c4cbd3"/>
      <stop offset="0.28" stop-color="#e9edf1"/>
      <stop offset="0.42" stop-color="#ffffff"/>
      <stop offset="0.58" stop-color="#e4e8ed"/>
      <stop offset="0.86" stop-color="#b9c0c9"/>
      <stop offset="1" stop-color="#858e9a"/>
    </linearGradient>
    <linearGradient id="aglass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5b6878"/>
      <stop offset="0.35" stop-color="#222a35"/>
      <stop offset="1" stop-color="#0b0f15"/>
    </linearGradient>
    <linearGradient id="asky" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#dbeafe" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#dbeafe" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#dbeafe" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="alens" cx="0.4" cy="0.4" r="0.7">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#e2e8f0"/>
      <stop offset="1" stop-color="#7c8794"/>
    </radialGradient>
    <linearGradient id="atail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f87171"/>
      <stop offset="1" stop-color="#991b1b"/>
    </linearGradient>
    <linearGradient id="ashield" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fa0b4"/>
      <stop offset="0.45" stop-color="#3c4756"/>
      <stop offset="1" stop-color="#151b24"/>
    </linearGradient>
    <linearGradient id="aroofg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0b0f15"/>
      <stop offset="0.3" stop-color="#2a3442"/>
      <stop offset="0.5" stop-color="#1a212c"/>
      <stop offset="1" stop-color="#080b10"/>
    </linearGradient>
    <radialGradient id="ahood" cx="0.5" cy="0.2" r="0.8">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="ashadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.8"/>
      <feOffset dx="1.4" dy="2.2" result="off"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.38"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <g filter="url(#ashadow)">
    <g transform="rotate(${angle} 32 32)">
      <!-- Neumáticos (apenas asoman bajo los guardabarros) -->
      <rect x="21.5" y="14.8" width="1.6" height="6.6" rx="0.72" fill="#14181e"/><line x1="21.75" y1="16.12" x2="22.85" y2="16.12" stroke="#3a4049" stroke-width="0.3"/><line x1="21.75" y1="17.44" x2="22.85" y2="17.44" stroke="#3a4049" stroke-width="0.3"/><line x1="21.75" y1="18.76" x2="22.85" y2="18.76" stroke="#3a4049" stroke-width="0.3"/><line x1="21.75" y1="20.08" x2="22.85" y2="20.08" stroke="#3a4049" stroke-width="0.3"/><rect x="40.9" y="14.8" width="1.6" height="6.6" rx="0.72" fill="#14181e"/><line x1="41.15" y1="16.12" x2="42.25" y2="16.12" stroke="#3a4049" stroke-width="0.3"/><line x1="41.15" y1="17.44" x2="42.25" y2="17.44" stroke="#3a4049" stroke-width="0.3"/><line x1="41.15" y1="18.76" x2="42.25" y2="18.76" stroke="#3a4049" stroke-width="0.3"/><line x1="41.15" y1="20.08" x2="42.25" y2="20.08" stroke="#3a4049" stroke-width="0.3"/>
      <rect x="21.5" y="42.0" width="1.6" height="6.6" rx="0.72" fill="#14181e"/><line x1="21.75" y1="43.32" x2="22.85" y2="43.32" stroke="#3a4049" stroke-width="0.3"/><line x1="21.75" y1="44.64" x2="22.85" y2="44.64" stroke="#3a4049" stroke-width="0.3"/><line x1="21.75" y1="45.96" x2="22.85" y2="45.96" stroke="#3a4049" stroke-width="0.3"/><line x1="21.75" y1="47.28" x2="22.85" y2="47.28" stroke="#3a4049" stroke-width="0.3"/><rect x="40.9" y="42.0" width="1.6" height="6.6" rx="0.72" fill="#14181e"/><line x1="41.15" y1="43.32" x2="42.25" y2="43.32" stroke="#3a4049" stroke-width="0.3"/><line x1="41.15" y1="44.64" x2="42.25" y2="44.64" stroke="#3a4049" stroke-width="0.3"/><line x1="41.15" y1="45.96" x2="42.25" y2="45.96" stroke="#3a4049" stroke-width="0.3"/><line x1="41.15" y1="47.28" x2="42.25" y2="47.28" stroke="#3a4049" stroke-width="0.3"/>

      <!-- Carrocería: nariz redondeada, guardabarros marcados y cintura -->
      <path d="M28 9.8 C30.5 9.4 33.5 9.4 36 9.8 C38.8 10.3 40.6 11.9 41.2 14.6 C41.6 16.6 41.7 19 41.6 21 C41.3 25 41.1 29 41.1 32 C41.1 36 41.4 40 41.7 43.5 C41.9 46.5 41.6 49.5 40.8 51.4 C39.6 53.8 36.8 54.8 32 54.9 C27.2 54.8 24.4 53.8 23.2 51.4 C22.4 49.5 22.1 46.5 22.3 43.5 C22.6 40 22.9 36 22.9 32 C22.9 29 22.7 25 22.4 21 C22.3 19 22.4 16.6 22.8 14.6 C23.4 11.9 25.2 10.3 28 9.8 Z" fill="url(#apaint)" stroke="#4b5563" stroke-width="0.75"/>

      <!-- Capó: brillo central y nervios que convergen -->
      <path d="M26.6 11.4 C29.6 10.6 34.4 10.6 37.4 11.4 L38.6 20.6 C35.6 19.9 28.4 19.9 25.4 20.6 Z" fill="url(#ahood)" opacity="0.7"/>
      <path d="M27.6 12.0 C27.0 15.0 26.6 17.8 26.4 20.4 M36.4 12.0 C37.0 15.0 37.4 17.8 37.6 20.4" fill="none" stroke="#a9b1bb" stroke-width="0.4"/>
      <path d="M28.1 12.0 C27.5 15.0 27.1 17.8 26.9 20.4 M36.9 12.0 C37.5 15.0 37.9 17.8 38.1 20.4" fill="none" stroke="#ffffff" stroke-width="0.3" opacity="0.85"/>
      <!-- Línea del paragolpes delantero -->
      <path d="M25.0 11.6 C28.6 10.5 35.4 10.5 39.0 11.6" fill="none" stroke="#8a939e" stroke-width="0.3"/>
      <!-- Brillo de los guardabarros (hombros) -->
      <path d="M40.4 15.0 C40.9 17.4 40.9 20.0 40.6 22.4 M23.6 15.0 C23.1 17.4 23.1 20.0 23.4 22.4" fill="none" stroke="#ffffff" stroke-width="0.45" opacity="0.8"/>
      <path d="M40.6 42.0 C41.0 44.6 40.9 47.4 40.4 49.6 M23.4 42.0 C23.0 44.6 23.1 47.4 23.6 49.6" fill="none" stroke="#ffffff" stroke-width="0.45" opacity="0.7"/>

      <!-- Faros barridos con lente y LED -->
      <path d="M37.4 10.4 C39.2 10.8 40.5 12.0 41.0 13.6 L40.2 14.0 C39.6 12.8 38.6 11.9 37.2 11.5 Z" fill="#1b2129"/>
      <path d="M26.6 10.4 C24.8 10.8 23.5 12.0 23.0 13.6 L23.8 14.0 C24.4 12.8 25.4 11.9 26.8 11.5 Z" fill="#1b2129"/>
      <path d="M37.6 10.8 C39.0 11.2 40.0 12.1 40.6 13.4 M26.4 10.8 C25.0 11.2 24.0 12.1 23.4 13.4" fill="none" stroke="#ffffff" stroke-width="0.35"/>
      <circle cx="39.3" cy="12.3" r="0.45" fill="#e2e8f0"/><circle cx="24.7" cy="12.3" r="0.45" fill="#e2e8f0"/>

      <!-- Espejos en la base del pilar A -->
      <path d="M40.0 21.8 L42.8 21.0 C43.6 20.9 43.8 22.5 43.0 22.8 L40.0 23.6 Z" fill="url(#apaint)" stroke="#4b5563" stroke-width="0.3"/>
      <path d="M24.0 21.8 L21.2 21.0 C20.4 20.9 20.2 22.5 21.0 22.8 L24.0 23.6 Z" fill="url(#apaint)" stroke="#4b5563" stroke-width="0.3"/>

      <!-- Cabina de vidrio (más angosta que la carrocería) con marco negro -->
      <path d="M24.4 21.2 C27.4 20.0 36.6 20.0 39.6 21.2 L38.9 27.0 C39.1 31.0 39.1 36.0 38.9 40.0 L38.4 45.8
               C35.7 46.9 28.3 46.9 25.6 45.8 L25.1 40.0 C24.9 36.0 24.9 31.0 25.1 27.0 Z" fill="#0a0d12"/>
      <!-- Parabrisas con reflejo del cielo -->
      <path d="M25.1 21.7 C28.0 20.7 36.0 20.7 38.9 21.7 L38.3 26.5 C35.6 25.9 28.4 25.9 25.7 26.5 Z" fill="url(#ashield)"/>
      <path d="M26.2 22.2 C28.6 21.5 31.8 21.4 33.6 21.5 L29.6 26.0 L26.0 26.3 Z" fill="#ffffff" opacity="0.22"/>
      <!-- Techo de vidrio -->
      <path d="M25.8 27.3 C28.6 26.9 35.4 26.9 38.2 27.3 C38.4 31.0 38.4 36.0 38.2 39.6 C35.4 40.0 28.6 40.0 25.8 39.6 C25.6 36.0 25.6 31.0 25.8 27.3 Z" fill="url(#aroofg)"/>
      <path d="M27.4 28.4 L29.0 28.2 L28.4 38.8 L27.0 38.6 Z" fill="#ffffff" opacity="0.12"/>
      <!-- Luneta trasera -->
      <path d="M25.9 40.4 C28.6 40.8 35.4 40.8 38.1 40.4 L37.8 45.2 C35.4 46.0 28.6 46.0 26.2 45.2 Z" fill="url(#aglass)"/>
      <path d="M27.0 41.2 L30.0 41.4 L28.2 44.8 L26.8 44.6 Z" fill="#ffffff" opacity="0.14"/>
      <!-- Ventanas laterales (vistas de canto) -->
      <path d="M24.8 27.6 L25.4 27.4 L25.4 39.8 L24.9 39.6 Z M39.2 27.6 L38.6 27.4 L38.6 39.8 L39.1 39.6 Z" fill="#2a3442"/>

      <!-- Juntas de puertas -->
      <path d="M22.9 28.6 L24.6 28.6 M41.1 28.6 L39.4 28.6 M23.0 36.6 L24.7 36.6 M41.0 36.6 L39.3 36.6" stroke="#5f6874" stroke-width="0.35"/>

      <!-- Maletero, spoiler y luces traseras envolventes -->
      <path d="M25.6 47.4 C28.6 48.2 35.4 48.2 38.4 47.4" fill="none" stroke="#8a939e" stroke-width="0.35"/>
      <path d="M26.4 52.4 C29.0 53.2 35.0 53.2 37.6 52.4" fill="none" stroke="#ffffff" stroke-width="0.4" opacity="0.8"/>
      <path d="M40.9 50.6 C40.2 52.6 38.6 53.8 36.2 54.3 L36.4 53.2 C38.2 52.8 39.6 51.8 40.2 50.4 Z" fill="url(#atail)"/>
      <path d="M23.1 50.6 C23.8 52.6 25.4 53.8 27.8 54.3 L27.6 53.2 C25.8 52.8 24.4 51.8 23.8 50.4 Z" fill="url(#atail)"/>

      <!-- Estado -->
      <circle cx="32.0" cy="33.4" r="2.0" fill="#ffffff" opacity="0.9"/><circle cx="32.0" cy="33.4" r="1.45" fill="${statusColor}"/><circle cx="31.58" cy="32.94" r="0.45" fill="#ffffff" opacity="0.75"/>
    </g>
  </g>
</svg>`;
}

/** Devuelve el data URL (cacheado) del SVG de Auto rotado al rumbo exacto. */
export function getAutoSvgDataUrl(heading: number, isMoving?: boolean): string {
  const angle = normalizeVehicleHeading(heading);
  const key = `auto_${angle}_${isMoving === undefined ? 'n' : isMoving ? 'm' : 's'}`;
  const cached = svgDataUrlCache.get(key);
  if (cached) return cached;

  const svg = buildAutoSvg(angle, isMoving);
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  svgDataUrlCache.set(key, url);
  return url;
}

/** Devuelve el data URL (cacheado) del SVG de Van rotado al rumbo exacto. */
export function getVanSvgDataUrl(heading: number, isMoving?: boolean): string {
  const angle = normalizeVehicleHeading(heading);
  const key = `van_${angle}_${isMoving === undefined ? 'n' : isMoving ? 'm' : 's'}`;
  const cached = svgDataUrlCache.get(key);
  if (cached) return cached;

  const svg = buildVanSvg(angle, isMoving);
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  svgDataUrlCache.set(key, url);
  return url;
}

/** Devuelve el data URL (cacheado) del SVG de Cisterna rotado al rumbo exacto. */
export function getCisternaSvgDataUrl(heading: number, isMoving?: boolean): string {
  const angle = normalizeVehicleHeading(heading);
  const key = `cisterna_${angle}_${isMoving === undefined ? 'n' : isMoving ? 'm' : 's'}`;
  const cached = svgDataUrlCache.get(key);
  if (cached) return cached;

  const svg = buildCisternaSvg(angle, isMoving);
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  svgDataUrlCache.set(key, url);
  return url;
}

/**
 * Perfil 2D (vista lateral, mirando a la izquierda) para la lista lateral y el tab Íconos.
 * Auto: sedán eléctrico tipo fastback con techo de vidrio y aros aero, acabado realista en gris plomo claro metalizado. Relación 2:1 (400×200).
 */
export function getAutoSideSvgDataUrl(): string {
  const key = 'auto_side_profile';
  const cached = svgDataUrlCache.get(key);
  if (cached) return cached;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="44" viewBox="0 0 400 200">
  <defs>
    <linearGradient id="paint" gradientUnits="userSpaceOnUse" x1="0" y1="84" x2="0" y2="152">
      <stop offset="0" stop-color="#e3e7ec"/>
      <stop offset="0.10" stop-color="#f4f6f8"/>
      <stop offset="0.24" stop-color="#dce1e7"/>
      <stop offset="0.29" stop-color="#f7f8fa"/>
      <stop offset="0.33" stop-color="#b6bec8"/>
      <stop offset="0.42" stop-color="#cfd5dc"/>
      <stop offset="0.64" stop-color="#d9dee4"/>
      <stop offset="0.82" stop-color="#b3bbc5"/>
      <stop offset="1" stop-color="#838c98"/>
    </linearGradient>
    <linearGradient id="paintV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4f6f8"/>
      <stop offset="0.45" stop-color="#d6dbe1"/>
      <stop offset="1" stop-color="#9aa3ae"/>
    </linearGradient>
    <linearGradient id="glassSide" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a3aebb"/>
      <stop offset="0.18" stop-color="#5d6978"/>
      <stop offset="0.48" stop-color="#28313d"/>
      <stop offset="1" stop-color="#11161e"/>
    </linearGradient>
    <linearGradient id="glassFront" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b8c2cd"/>
      <stop offset="0.35" stop-color="#6b7786"/>
      <stop offset="1" stop-color="#1c232d"/>
    </linearGradient>
    <linearGradient id="roofGlass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3b4553"/>
      <stop offset="0.5" stop-color="#151b24"/>
      <stop offset="1" stop-color="#0a0e14"/>
    </linearGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3d4552"/>
      <stop offset="0.5" stop-color="#151a22"/>
      <stop offset="1" stop-color="#07090d"/>
    </linearGradient>
    <linearGradient id="satin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a5260"/>
      <stop offset="0.35" stop-color="#2a313b"/>
      <stop offset="1" stop-color="#12161c"/>
    </linearGradient>
    <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.45" stop-color="#9aa3ae"/>
      <stop offset="0.55" stop-color="#5f6874"/>
      <stop offset="1" stop-color="#e5e9ee"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="lowShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1f2937" stop-opacity="0"/>
      <stop offset="1" stop-color="#1f2937" stop-opacity="0.32"/>
    </linearGradient>
    <linearGradient id="lampHousing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4a5361"/>
      <stop offset="0.5" stop-color="#1b2129"/>
      <stop offset="1" stop-color="#0b0e13"/>
    </linearGradient>
    <linearGradient id="lampClear" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.5" stop-color="#e5eaf0"/>
      <stop offset="1" stop-color="#9aa4b0"/>
    </linearGradient>
    <linearGradient id="tail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fca5a5"/>
      <stop offset="0.3" stop-color="#ef4444"/>
      <stop offset="1" stop-color="#7f1d1d"/>
    </linearGradient>
    <linearGradient id="amber" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fde68a"/>
      <stop offset="1" stop-color="#d97706"/>
    </linearGradient>
    <radialGradient id="lens" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#dbe3ec"/>
      <stop offset="1" stop-color="#7c8794"/>
    </radialGradient>
    <radialGradient id="tire" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.62" stop-color="#2c3037"/>
      <stop offset="0.86" stop-color="#1a1d22"/>
      <stop offset="1" stop-color="#0a0c0f"/>
    </radialGradient>
    <radialGradient id="archIn" cx="0.5" cy="1" r="1">
      <stop offset="0" stop-color="#05070a"/>
      <stop offset="0.8" stop-color="#11151b"/>
      <stop offset="1" stop-color="#1f252e"/>
    </radialGradient>
    <radialGradient id="disc" cx="0.45" cy="0.4" r="0.6">
      <stop offset="0" stop-color="#c5cbd2"/>
      <stop offset="0.7" stop-color="#8b929b"/>
      <stop offset="1" stop-color="#4b525b"/>
    </radialGradient>
    <linearGradient id="spoke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#9aa1aa"/>
      <stop offset="0.5" stop-color="#5b616a"/>
      <stop offset="1" stop-color="#2c3036"/>
    </linearGradient>
    <radialGradient id="steelDish" cx="0.42" cy="0.36" r="0.72">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.45" stop-color="#dfe4ea"/>
      <stop offset="0.8" stop-color="#aab2bc"/>
      <stop offset="1" stop-color="#7c8592"/>
    </radialGradient>
    <radialGradient id="hubCap" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#c9cfd6"/>
      <stop offset="1" stop-color="#7e8793"/>
    </radialGradient>
    <filter id="blurL" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="4.5"/></filter>
    <filter id="blurS" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="1.8"/></filter>
    <filter id="glow" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="1.4"/></filter>
  </defs>

  <!-- Sombras de piso y de contacto -->
  <ellipse cx="202" cy="180" rx="182" ry="7" fill="#0f172a" opacity="0.42" filter="url(#blurL)"/>
  <ellipse cx="92" cy="180" rx="24.6" ry="3.2" fill="#000000" opacity="0.6" filter="url(#blurS)"/>
  <ellipse cx="312" cy="180" rx="24.6" ry="3.2" fill="#000000" opacity="0.6" filter="url(#blurS)"/>

  <!-- Marco negro brillante del techo de vidrio -->
  <path d="M140 86 C160 72 188 60 214 56 C240 52 270 52 292 56 C320 62 345 74 362 86 Z" fill="url(#gloss)" stroke="#0b0f14" stroke-width="1.2" stroke-linejoin="round"/>
  <!-- Techo panorámico de vidrio con reflejo largo -->
  <path d="M146 85 C164 73 190 62 214 58.5 C240 55 270 55 292 58.5 C318 64 342 75 356 85 Z" fill="url(#roofGlass)"/>
  <path d="M190 64 C220 57 262 56 296 60" fill="none" stroke="url(#shine)" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>
  <!-- Parabrisas (canto) con reflejo de cielo -->
  <path d="M142 86 C152 79 160 74 168 70 L172 85 Z" fill="url(#glassFront)"/>

  <!-- Ventanas laterales -->
  <path d="M168 85 C183 74 199 67 218 64 L253 62.5 L253 85 Z" fill="url(#glassSide)"/>
  <path d="M260 62.5 L292 64 C311 68 328 76 340 85 L260 85 Z" fill="url(#glassSide)"/>
  <!-- Siluetas del interior (apoyacabezas) -->
  <path d="M226 72 C226 68 230 66 235 66 C240 66 243 68 243 72 L243 80 L226 80 Z" fill="#06080b" opacity="0.55"/>
  <path d="M292 73 C292 69 296 67 300 67 C305 67 308 69 308 73 L308 81 L292 81 Z" fill="#06080b" opacity="0.5"/>
  <!-- Reflejos del cielo sobre los vidrios -->
  <path d="M176 84 C188 75 200 69 214 66 L232 65 L198 84 Z" fill="#ffffff" opacity="0.2"/>
  <path d="M266 84 L276 64 L290 64.5 L280 84 Z" fill="#ffffff" opacity="0.12"/>
  <!-- Pilar B negro brillante -->
  <rect x="253" y="61" width="7" height="25" fill="url(#gloss)"/>
  <line x1="255" y1="63" x2="255" y2="84" stroke="#ffffff" stroke-opacity="0.35" stroke-width="0.8"/>

  <!-- Carrocería -->
  <path d="M30 140 C22 136 18 126 20 116 C22 106 30 100 44 97 C70 92 110 88 140 86 L362 86 C372 88 380 92 382 100 C384 110 384 124 380 134 C378 142 372 146 364 147 L346 147 A34 34 0 0 0 278 147 L126 150 A34 34 0 0 0 58 149 L40 148 C35 147 32 144 30 140 Z" fill="url(#paint)" stroke="#6b7380" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M22 118 L382 116 L380 134 C378 142 372 146 364 147 L346 147 A34 34 0 0 0 278 147 L126 150 A34 34 0 0 0 58 149 L40 148 C32 146 22 136 22 118 Z" fill="url(#lowShade)"/>
  <!-- Moldura negra de la línea de cintura -->
  <path d="M146 85.5 L360 85.5 L360 88 L148 88.5 Z" fill="url(#gloss)"/>
  <line x1="150" y1="88.6" x2="358" y2="88.1" stroke="#ffffff" stroke-opacity="0.8" stroke-width="0.7"/>

  <!-- Nervadura del hombro y concavidad inferior -->
  <path d="M40 106 C140 101 260 99 380 101" fill="none" stroke="#b4bcc6" stroke-width="1.3"/>
  <path d="M40 104.4 C140 99.4 260 97.4 380 99.4" fill="none" stroke="#ffffff" stroke-width="1.1" opacity="0.95"/>
  <path d="M132 128 C190 125.5 240 125 276 125" fill="none" stroke="#c9cfd6" stroke-width="1"/>
  <path d="M60 94 C120 90 170 89 210 89" fill="none" stroke="url(#shine)" stroke-width="3" stroke-linecap="round" opacity="0.9"/>

  <!-- Juntas de paneles -->
  <path d="M150 89 C152 104 152 122 147 140" fill="none" stroke="#5f6874" stroke-width="1.3" stroke-linecap="round"/><path d="M150 89 C152 104 152 122 147 140" transform="translate(1.1 0.6)" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M257 89 L258 146" fill="none" stroke="#5f6874" stroke-width="1.3" stroke-linecap="round"/><path d="M257 89 L258 146" transform="translate(1.1 0.6)" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M336 89 C333 104 328 118 321 128" fill="none" stroke="#5f6874" stroke-width="1.3" stroke-linecap="round"/><path d="M336 89 C333 104 328 118 321 128" transform="translate(1.1 0.6)" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M150 139 L256 138" fill="none" stroke="#5f6874" stroke-width="1.3" stroke-linecap="round"/><path d="M150 139 L256 138" transform="translate(1.1 0.6)" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M260 138 L318 136" fill="none" stroke="#5f6874" stroke-width="1.3" stroke-linecap="round"/><path d="M260 138 L318 136" transform="translate(1.1 0.6)" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M362 88 C368 89 373 93 375 97" fill="none" stroke="#5f6874" stroke-width="1.3" stroke-linecap="round"/><path d="M362 88 C368 89 373 93 375 97" transform="translate(1.1 0.6)" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M24 121 C36 119 50 120 60 123" fill="none" stroke="#5f6874" stroke-width="1.3" stroke-linecap="round"/><path d="M24 121 C36 119 50 120 60 123" transform="translate(1.1 0.6)" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.8" stroke-linecap="round"/>

  <!-- Manijas al ras -->
  <rect x="210" y="96" width="20" height="4.5" rx="2.25" fill="#1d232b"/>
  <rect x="211" y="96.4" width="18" height="1.2" rx="0.6" fill="#ffffff" opacity="0.55"/>
  <rect x="296" y="95" width="20" height="4.5" rx="2.25" fill="#1d232b"/>
  <rect x="297" y="95.4" width="18" height="1.2" rx="0.6" fill="#ffffff" opacity="0.55"/>

  <!-- Repetidor/cámara lateral -->
  <rect x="118" y="99" width="8" height="3.6" rx="1.8" fill="#11161d"/>
  <rect x="119" y="99.4" width="4" height="1" rx="0.5" fill="#ffffff" opacity="0.5"/>

  <!-- Espejo retrovisor -->
  <path d="M143 81 C146 73 158 71 166 75 C168 79 168 84 166 87 L150 88 Z" fill="url(#paintV)" stroke="#6b7380" stroke-width="1"/>
  <path d="M148 79 C152 75 160 74 164 76" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.9"/>
  <path d="M150 86.5 L166 86 L166 89.5 L152 90 Z" fill="#0d1116"/>

  <!-- Faro: carcasa, proyectores y LED -->
  <path d="M21 108.5 C31 102 46 98.6 66 97.6 L61 105.4 C46 106.2 33 108.6 22.5 113.5 Z" fill="url(#lampHousing)" stroke="#0b0e13" stroke-width="0.6"/>
  <circle cx="42" cy="104" r="2.6" fill="url(#lens)"/>
  <circle cx="53" cy="102" r="2.1" fill="url(#lens)"/>
  <path d="M25 108.5 C35 104 46 101.6 60 100.6" fill="none" stroke="#dbeafe" stroke-width="3" stroke-linecap="round" opacity="0.8" filter="url(#glow)"/>
  <path d="M25 108.5 C35 104 46 101.6 60 100.6" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round"/>
  <!-- Brillo especular del frontal -->
  <ellipse cx="25" cy="120" rx="2.6" ry="7" fill="#ffffff" opacity="0.7" filter="url(#glow)"/>
  <!-- Toma inferior y sensor -->
  <path d="M22 128 C30 131 42 132.4 56 132.6 L56 136 C42 135.8 30 134.6 22.5 131.6 Z" fill="#12161c"/>
  <path d="M24 129.2 C32 131.6 42 132.8 54 133" fill="none" stroke="#4b5563" stroke-width="0.6"/>

  <!-- Faldón/zócalo negro satinado -->
  <path d="M128 141 L276 138 L278 147 L126 150 Z" fill="url(#satin)"/>
  <line x1="129" y1="141.4" x2="275" y2="138.4" stroke="#9aa3ae" stroke-width="0.7"/>
  <!-- Difusor trasero -->
  <path d="M350 141 L380 134 C378 142 372 146 364 147 L347 147 Z" fill="url(#satin)"/>

  <!-- Luz trasera LED -->
  <path d="M365 94.6 C373 96.6 379.6 100.6 382 107 L382.2 113.4 L365.5 108.4 Z" fill="url(#tail)" stroke="#7f1d1d" stroke-width="0.5"/>
  <path d="M367 99 C373 100.4 377.6 103 380 107" fill="none" stroke="#fecaca" stroke-width="2.4" opacity="0.8" filter="url(#glow)"/>
  <path d="M367 99 C373 100.4 377.6 103 380 107" fill="none" stroke="#fff1f2" stroke-width="0.9"/>

  <!-- Ruedas -->
  <path d="M59 150 A33 33 0 0 1 125 150 Z" fill="url(#archIn)"/><path d="M58.9 144.2 A33.6 33.6 0 0 1 125.1 144.2" fill="none" stroke="#6b7480" stroke-width="1.2"/><path d="M59.5 138.2 A34.6 34.6 0 0 1 98.0 115.9" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1"/>
  <path d="M279 147 A33 33 0 0 1 345 147 Z" fill="url(#archIn)"/><path d="M278.9 141.2 A33.6 33.6 0 0 1 345.1 141.2" fill="none" stroke="#6b7480" stroke-width="1.2"/><path d="M279.5 135.2 A34.6 34.6 0 0 1 318.0 112.9" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1"/>
  <circle cx="92" cy="152" r="29" fill="url(#tire)"/><circle cx="92" cy="152" r="27.0" fill="none" stroke="#3a3f47" stroke-width="1"/><path d="M65.1 144.8 A27.8 27.8 0 0 1 99.2 125.1" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.6" stroke-linecap="round"/><path d="M70.2 144.1 A23.2 23.2 0 0 1 92.0 128.8" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/><circle cx="92" cy="152" r="20.3" fill="#15191f"/><circle cx="92" cy="152" r="18.3" fill="url(#disc)"/><circle cx="106.2" cy="152.0" r="0.7" fill="#4b525b"/><circle cx="105.4" cy="156.9" r="0.7" fill="#4b525b"/><circle cx="102.9" cy="161.1" r="0.7" fill="#4b525b"/><circle cx="99.1" cy="164.3" r="0.7" fill="#4b525b"/><circle cx="94.5" cy="166.0" r="0.7" fill="#4b525b"/><circle cx="89.5" cy="166.0" r="0.7" fill="#4b525b"/><circle cx="84.9" cy="164.3" r="0.7" fill="#4b525b"/><circle cx="81.1" cy="161.1" r="0.7" fill="#4b525b"/><circle cx="78.6" cy="156.9" r="0.7" fill="#4b525b"/><circle cx="77.8" cy="152.0" r="0.7" fill="#4b525b"/><circle cx="78.6" cy="147.1" r="0.7" fill="#4b525b"/><circle cx="81.1" cy="142.9" r="0.7" fill="#4b525b"/><circle cx="84.9" cy="139.7" r="0.7" fill="#4b525b"/><circle cx="89.5" cy="138.0" r="0.7" fill="#4b525b"/><circle cx="94.5" cy="138.0" r="0.7" fill="#4b525b"/><circle cx="99.1" cy="139.7" r="0.7" fill="#4b525b"/><circle cx="102.9" cy="142.9" r="0.7" fill="#4b525b"/><circle cx="105.4" cy="147.1" r="0.7" fill="#4b525b"/><path d="M97.1 137.9 A15.0 15.0 0 0 1 107.0 153.3" fill="none" stroke="#b91c1c" stroke-width="5.3" stroke-linecap="round"/><path d="M99.6 137.7 A16.2 16.2 0 0 1 108.0 149.2" fill="none" stroke="#f87171" stroke-width="0.8" stroke-linecap="round"/><path d="M90.5 147.0 L87.5 133.2 L91.2 132.7 L92.1 146.7 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M91.9 146.7 L92.8 132.7 L96.5 133.2 L93.5 147.0 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M96.3 149.0 L108.4 141.9 L110.1 145.2 L97.0 150.5 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M97.0 150.3 L110.6 146.8 L111.2 150.5 L97.3 151.9 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M96.2 155.2 L106.7 164.5 L104.0 167.1 L95.0 156.3 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M95.2 156.2 L102.6 168.1 L99.4 169.8 L93.7 157.0 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M90.3 157.0 L84.6 169.8 L81.4 168.1 L88.8 156.2 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M89.0 156.3 L80.0 167.1 L77.3 164.5 L87.8 155.2 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M86.7 151.9 L72.8 150.5 L73.4 146.8 L87.0 150.3 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M87.0 150.5 L73.9 145.2 L75.6 141.9 L87.7 149.0 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><circle cx="92" cy="152" r="20.3" fill="none" stroke="#7c838c" stroke-width="1.6"/><path d="M72.9 145.1 A20.3 20.3 0 0 1 98.9 132.9" fill="none" stroke="#e5e9ee" stroke-width="0.9"/><circle cx="92" cy="152" r="5.5" fill="url(#hubCap)" stroke="#5b616a" stroke-width="0.6"/><circle cx="94.0" cy="149.2" r="0.9" fill="#4b525b"/><circle cx="95.3" cy="153.1" r="0.9" fill="#4b525b"/><circle cx="92.0" cy="155.5" r="0.9" fill="#4b525b"/><circle cx="88.7" cy="153.1" r="0.9" fill="#4b525b"/><circle cx="90.0" cy="149.2" r="0.9" fill="#4b525b"/><circle cx="92" cy="152" r="1.6" fill="#2c3036"/>
  <circle cx="312" cy="150" r="29" fill="url(#tire)"/><circle cx="312" cy="150" r="27.0" fill="none" stroke="#3a3f47" stroke-width="1"/><path d="M285.1 142.8 A27.8 27.8 0 0 1 319.2 123.1" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.6" stroke-linecap="round"/><path d="M290.2 142.1 A23.2 23.2 0 0 1 312.0 126.8" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/><circle cx="312" cy="150" r="20.3" fill="#15191f"/><circle cx="312" cy="150" r="18.3" fill="url(#disc)"/><circle cx="326.2" cy="150.0" r="0.7" fill="#4b525b"/><circle cx="325.4" cy="154.9" r="0.7" fill="#4b525b"/><circle cx="322.9" cy="159.1" r="0.7" fill="#4b525b"/><circle cx="319.1" cy="162.3" r="0.7" fill="#4b525b"/><circle cx="314.5" cy="164.0" r="0.7" fill="#4b525b"/><circle cx="309.5" cy="164.0" r="0.7" fill="#4b525b"/><circle cx="304.9" cy="162.3" r="0.7" fill="#4b525b"/><circle cx="301.1" cy="159.1" r="0.7" fill="#4b525b"/><circle cx="298.6" cy="154.9" r="0.7" fill="#4b525b"/><circle cx="297.8" cy="150.0" r="0.7" fill="#4b525b"/><circle cx="298.6" cy="145.1" r="0.7" fill="#4b525b"/><circle cx="301.1" cy="140.9" r="0.7" fill="#4b525b"/><circle cx="304.9" cy="137.7" r="0.7" fill="#4b525b"/><circle cx="309.5" cy="136.0" r="0.7" fill="#4b525b"/><circle cx="314.5" cy="136.0" r="0.7" fill="#4b525b"/><circle cx="319.1" cy="137.7" r="0.7" fill="#4b525b"/><circle cx="322.9" cy="140.9" r="0.7" fill="#4b525b"/><circle cx="325.4" cy="145.1" r="0.7" fill="#4b525b"/><path d="M317.1 135.9 A15.0 15.0 0 0 1 327.0 151.3" fill="none" stroke="#b91c1c" stroke-width="5.3" stroke-linecap="round"/><path d="M319.6 135.7 A16.2 16.2 0 0 1 328.0 147.2" fill="none" stroke="#f87171" stroke-width="0.8" stroke-linecap="round"/><path d="M310.5 145.0 L307.5 131.2 L311.2 130.7 L312.1 144.7 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M311.9 144.7 L312.8 130.7 L316.5 131.2 L313.5 145.0 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M316.3 147.0 L328.4 139.9 L330.1 143.2 L317.0 148.5 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M317.0 148.3 L330.6 144.8 L331.2 148.5 L317.3 149.9 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M316.2 153.2 L326.7 162.5 L324.0 165.1 L315.0 154.3 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M315.2 154.2 L322.6 166.1 L319.4 167.8 L313.7 155.0 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M310.3 155.0 L304.6 167.8 L301.4 166.1 L308.8 154.2 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M309.0 154.3 L300.0 165.1 L297.3 162.5 L307.8 153.2 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M306.7 149.9 L292.8 148.5 L293.4 144.8 L307.0 148.3 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><path d="M307.0 148.5 L293.9 143.2 L295.6 139.9 L307.7 147.0 Z" fill="url(#spoke)" stroke="#b4bac2" stroke-width="0.35"/><circle cx="312" cy="150" r="20.3" fill="none" stroke="#7c838c" stroke-width="1.6"/><path d="M292.9 143.1 A20.3 20.3 0 0 1 318.9 130.9" fill="none" stroke="#e5e9ee" stroke-width="0.9"/><circle cx="312" cy="150" r="5.5" fill="url(#hubCap)" stroke="#5b616a" stroke-width="0.6"/><circle cx="314.0" cy="147.2" r="0.9" fill="#4b525b"/><circle cx="315.3" cy="151.1" r="0.9" fill="#4b525b"/><circle cx="312.0" cy="153.5" r="0.9" fill="#4b525b"/><circle cx="308.7" cy="151.1" r="0.9" fill="#4b525b"/><circle cx="310.0" cy="147.2" r="0.9" fill="#4b525b"/><circle cx="312" cy="150" r="1.6" fill="#2c3036"/>
</svg>`;

  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  svgDataUrlCache.set(key, url);
  return url;
}

/**
 * Perfil 2D (vista lateral, mirando a la izquierda) para la lista lateral y el tab Íconos.
 * Van: Sprinter de techo alto con puerta corrediza, franja lateral y aros de acero, acabado realista en gris plomo claro metalizado. Relación 2:1 (400×200).
 */
export function getVanSideSvgDataUrl(): string {
  const key = 'van_side_profile';
  const cached = svgDataUrlCache.get(key);
  if (cached) return cached;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="44" viewBox="0 0 400 200">
  <defs>
    <linearGradient id="paint" gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="152">
      <stop offset="0" stop-color="#e3e7ec"/>
      <stop offset="0.10" stop-color="#f4f6f8"/>
      <stop offset="0.24" stop-color="#dce1e7"/>
      <stop offset="0.29" stop-color="#f7f8fa"/>
      <stop offset="0.33" stop-color="#b6bec8"/>
      <stop offset="0.42" stop-color="#cfd5dc"/>
      <stop offset="0.64" stop-color="#d9dee4"/>
      <stop offset="0.82" stop-color="#b3bbc5"/>
      <stop offset="1" stop-color="#838c98"/>
    </linearGradient>
    <linearGradient id="paintV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4f6f8"/>
      <stop offset="0.45" stop-color="#d6dbe1"/>
      <stop offset="1" stop-color="#9aa3ae"/>
    </linearGradient>
    <linearGradient id="glassSide" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a3aebb"/>
      <stop offset="0.18" stop-color="#5d6978"/>
      <stop offset="0.48" stop-color="#28313d"/>
      <stop offset="1" stop-color="#11161e"/>
    </linearGradient>
    <linearGradient id="glassFront" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b8c2cd"/>
      <stop offset="0.35" stop-color="#6b7786"/>
      <stop offset="1" stop-color="#1c232d"/>
    </linearGradient>
    <linearGradient id="roofGlass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3b4553"/>
      <stop offset="0.5" stop-color="#151b24"/>
      <stop offset="1" stop-color="#0a0e14"/>
    </linearGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3d4552"/>
      <stop offset="0.5" stop-color="#151a22"/>
      <stop offset="1" stop-color="#07090d"/>
    </linearGradient>
    <linearGradient id="satin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a5260"/>
      <stop offset="0.35" stop-color="#2a313b"/>
      <stop offset="1" stop-color="#12161c"/>
    </linearGradient>
    <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.45" stop-color="#9aa3ae"/>
      <stop offset="0.55" stop-color="#5f6874"/>
      <stop offset="1" stop-color="#e5e9ee"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="lowShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1f2937" stop-opacity="0"/>
      <stop offset="1" stop-color="#1f2937" stop-opacity="0.32"/>
    </linearGradient>
    <linearGradient id="lampHousing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4a5361"/>
      <stop offset="0.5" stop-color="#1b2129"/>
      <stop offset="1" stop-color="#0b0e13"/>
    </linearGradient>
    <linearGradient id="lampClear" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.5" stop-color="#e5eaf0"/>
      <stop offset="1" stop-color="#9aa4b0"/>
    </linearGradient>
    <linearGradient id="tail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fca5a5"/>
      <stop offset="0.3" stop-color="#ef4444"/>
      <stop offset="1" stop-color="#7f1d1d"/>
    </linearGradient>
    <linearGradient id="amber" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fde68a"/>
      <stop offset="1" stop-color="#d97706"/>
    </linearGradient>
    <radialGradient id="lens" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#dbe3ec"/>
      <stop offset="1" stop-color="#7c8794"/>
    </radialGradient>
    <radialGradient id="tire" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.62" stop-color="#2c3037"/>
      <stop offset="0.86" stop-color="#1a1d22"/>
      <stop offset="1" stop-color="#0a0c0f"/>
    </radialGradient>
    <radialGradient id="archIn" cx="0.5" cy="1" r="1">
      <stop offset="0" stop-color="#05070a"/>
      <stop offset="0.8" stop-color="#11151b"/>
      <stop offset="1" stop-color="#1f252e"/>
    </radialGradient>
    <radialGradient id="disc" cx="0.45" cy="0.4" r="0.6">
      <stop offset="0" stop-color="#c5cbd2"/>
      <stop offset="0.7" stop-color="#8b929b"/>
      <stop offset="1" stop-color="#4b525b"/>
    </radialGradient>
    <linearGradient id="spoke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#9aa1aa"/>
      <stop offset="0.5" stop-color="#5b616a"/>
      <stop offset="1" stop-color="#2c3036"/>
    </linearGradient>
    <radialGradient id="steelDish" cx="0.42" cy="0.36" r="0.72">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.45" stop-color="#dfe4ea"/>
      <stop offset="0.8" stop-color="#aab2bc"/>
      <stop offset="1" stop-color="#7c8592"/>
    </radialGradient>
    <radialGradient id="hubCap" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#c9cfd6"/>
      <stop offset="1" stop-color="#7e8793"/>
    </radialGradient>
    <filter id="blurL" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="4.5"/></filter>
    <filter id="blurS" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="1.8"/></filter>
    <filter id="glow" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="1.4"/></filter>
  </defs>

  <!-- Sombras de piso y de contacto -->
  <ellipse cx="204" cy="180" rx="186" ry="7" fill="#0f172a" opacity="0.42" filter="url(#blurL)"/>
  <ellipse cx="78" cy="180" rx="22.1" ry="3.2" fill="#000000" opacity="0.6" filter="url(#blurS)"/>
  <ellipse cx="300" cy="180" rx="22.1" ry="3.2" fill="#000000" opacity="0.6" filter="url(#blurS)"/>

  <!-- Carrocería Sprinter de techo alto -->
  <path d="M26 146 C20 142 18 132 20 122 L24 106 C26 100 32 96 42 94 L76 88 L106 52 C110 45 118 41 130 41 L372 40 C380 40 384 44 384 52 L384 140 C384 146 380 148 374 148 L330 148 A30 30 0 0 0 270 148 L108 150 A30 30 0 0 0 48 150 L32 148 C29 148 27 147 26 146 Z" fill="url(#paint)" stroke="#6b7380" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M20 118 L384 116 L384 140 C384 146 380 148 374 148 L330 148 A30 30 0 0 0 270 148 L108 150 A30 30 0 0 0 48 150 L32 148 C26 147 20 142 20 132 Z" fill="url(#lowShade)"/>

  <!-- Canaleta del techo y brillo superior -->
  <path d="M128 44.5 L376 43.5" fill="none" stroke="#9aa3ae" stroke-width="1"/>
  <path d="M136 47.5 L376 46.6" fill="none" stroke="url(#shine)" stroke-width="3.2" stroke-linecap="round"/>
  <!-- Estampado lateral (nervios horizontales) -->
  <path d="M188 72 L380 71" fill="none" stroke="#b4bcc6" stroke-width="1.2"/>
  <path d="M188 70.5 L380 69.5" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.9"/>
  <path d="M136 103 L382 101.5" fill="none" stroke="#b4bcc6" stroke-width="1.2"/>
  <path d="M136 101.5 L382 100" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.9"/>
  <path d="M190 86 L378 85" fill="none" stroke="url(#shine)" stroke-width="4" stroke-linecap="round" opacity="0.7"/>

  <!-- Parabrisas (canto) y pilar A -->
  <path d="M79 88 L106.5 53 C109.5 48.6 114 46.6 120 46.6 L127 46.6 L127 88 Z" fill="url(#gloss)"/>
  <path d="M83 87 L108 55 C110.6 51.4 114 49.6 119 49.6 L124 49.6 L124 87 Z" fill="url(#glassFront)"/>
  <path d="M90 85 L110 58 L116 58 L98 85 Z" fill="#ffffff" opacity="0.22"/>
  <!-- Ventana de la puerta del conductor -->
  <path d="M133 49 C133 47.4 134.4 46.4 136 46.4 L175 46.4 C177 46.4 178 47.4 178 49 L178 86 L133 89 Z" fill="url(#gloss)"/>
  <path d="M136 50 L175 49.6 L175 84 L136 86.6 Z" fill="url(#glassSide)"/>
  <path d="M140 51 L158 50.8 L142 76 Z" fill="#ffffff" opacity="0.22"/>
  <path d="M150 66 C150 62 154 60 158 60 C162 60 165 62 165 66 L165 76 L150 76 Z" fill="#06080b" opacity="0.5"/>

  <!-- Juntas: puertas, puerta corrediza y compuerta trasera -->
  <path d="M131 46 L131 148" fill="none" stroke="#5f6874" stroke-width="1.3" stroke-linecap="round"/><path d="M131 46 L131 148" transform="translate(1.1 0.6)" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M183 44 L183 148" fill="none" stroke="#5f6874" stroke-width="1.3" stroke-linecap="round"/><path d="M183 44 L183 148" transform="translate(1.1 0.6)" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M268 42 L268 146" fill="none" stroke="#5f6874" stroke-width="1.3" stroke-linecap="round"/><path d="M268 42 L268 146" transform="translate(1.1 0.6)" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M380 44 L380 146" fill="none" stroke="#5f6874" stroke-width="1.3" stroke-linecap="round"/><path d="M380 44 L380 146" transform="translate(1.1 0.6)" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M42 94.5 L77 88.6" fill="none" stroke="#5f6874" stroke-width="1.3" stroke-linecap="round"/><path d="M42 94.5 L77 88.6" transform="translate(1.1 0.6)" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.8" stroke-linecap="round"/>
  <!-- Riel de la puerta corrediza -->
  <path d="M268 88.6 L378 88" fill="none" stroke="url(#satin)" stroke-width="3"/>
  <line x1="268" y1="87.4" x2="378" y2="86.8" stroke="#ffffff" stroke-opacity="0.6" stroke-width="0.6"/>
  <!-- Manijas -->
  <rect x="156" y="94" width="18" height="5" rx="2.5" fill="#161b22"/>
  <rect x="157" y="94.5" width="16" height="1.3" rx="0.65" fill="#ffffff" opacity="0.45"/>
  <rect x="190" y="94" width="18" height="5" rx="2.5" fill="#161b22"/>
  <rect x="191" y="94.5" width="16" height="1.3" rx="0.65" fill="#ffffff" opacity="0.45"/>
  <!-- Tapa de combustible -->
  <circle cx="246" cy="112" r="6" fill="none" stroke="#7c8592" stroke-width="1"/>
  <path d="M239.6 109.7 A6.8 6.8 0 0 1 248.3 105.6" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="0.8"/>

  <!-- Espejo grande con brazo -->
  <path d="M120 74 L132 72 L132 78 L122 80 Z" fill="#11161d"/>
  <path d="M108 64 C108 61 110 59.6 113 59.6 L121 59.6 C123 59.6 124 61 124 63 L124 88 C124 90 122.6 91 121 91 L112 91 C109.8 91 108 89.4 108 87 Z" fill="url(#gloss)"/>
  <path d="M110.6 63 L113 62 L113 86 L110.6 87 Z" fill="#ffffff" opacity="0.25"/>
  <!-- Indicador lateral ámbar -->
  <rect x="64" y="104" width="10" height="3.6" rx="1.8" fill="url(#amber)"/>

  <!-- Franja lateral negra con filo de luz y molduras de paso de rueda -->
  <path d="M108 122 L270 120.4 L270 131 L108 133 Z" fill="url(#satin)"/>
  <path d="M330 119.6 L384 119 L384 130 L330 130.6 Z" fill="url(#satin)"/>
  <line x1="108" y1="122.3" x2="270" y2="120.7" stroke="#aab2bc" stroke-width="0.7"/>
  <line x1="330" y1="119.9" x2="384" y2="119.3" stroke="#aab2bc" stroke-width="0.7"/>
  <path d="M44.0 150.0 A34.0 34.0 0 0 1 112.0 150.0 L112 150 L112 152 L109.5 150.0 A31.5 31.5 0 0 1 46.5 150.0 Z" fill="url(#satin)"/>
  <path d="M266.0 148.0 A34.0 34.0 0 0 1 334.0 148.0 L334 148 L334 150 L331.5 148.0 A31.5 31.5 0 0 1 268.5 148.0 Z" fill="url(#satin)"/>

  <!-- Frente: faro con reflector, intermitente, parrilla y parachoques -->
  <path d="M25 104.6 L53 97.6 C55 97.2 56 98.2 56 100 L56.4 108.6 C56.4 110 55.4 110.8 54 111 L27 113.6 Z" fill="url(#lampHousing)"/>
  <path d="M28 105.4 L44 101.4 L44.4 109.6 L28.6 111.6 Z" fill="url(#lampClear)"/>
  <circle cx="36" cy="106.6" r="3" fill="url(#lens)"/>
  <path d="M46 100.8 L54 99 L54.4 108.4 L46.4 109.2 Z" fill="url(#amber)" opacity="0.9"/>
  <path d="M27 105.8 L54 99.4" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.8"/>
  <path d="M20 112 L24.6 104.4 L26 120 L20 121.6 Z" fill="#2a313b"/>
  <path d="M21 108 L24.4 106.6 M20.6 112 L24.8 111 M20.4 116 L25.2 115.4" stroke="#9aa3ae" stroke-width="0.8"/>
  <path d="M20 120 L56 118 L58 142 L34 148 C26 147 20 142 20 132 Z" fill="url(#satin)"/>
  <path d="M21 121 L56 119.2" stroke="#8a939e" stroke-width="0.7"/>
  <path d="M22 134 L46 133 L46 137 L23 138 Z" fill="#0b0e12"/>
  <ellipse cx="24" cy="113" rx="2" ry="6" fill="#ffffff" opacity="0.6" filter="url(#glow)"/>

  <!-- Luz trasera vertical y parachoques trasero -->
  <rect x="378.6" y="80" width="5.6" height="38" rx="1.6" fill="#7f1d1d"/>
  <rect x="379.2" y="81" width="4.4" height="14" rx="1" fill="url(#tail)"/>
  <rect x="379.2" y="96" width="4.4" height="8" rx="1" fill="url(#amber)"/>
  <rect x="379.2" y="105" width="4.4" height="12" rx="1" fill="url(#tail)"/>
  <path d="M352 140 L384 139.4 L384 140 C384 146 380 148 374 148 L350 148 Z" fill="url(#satin)"/>

  <!-- Ruedas -->
  <path d="M48 150 A30 30 0 0 1 108 150 Z" fill="url(#archIn)"/><path d="M47.9 144.7 A30.6 30.6 0 0 1 108.1 144.7" fill="none" stroke="#6b7480" stroke-width="1.2"/><path d="M48.3 139.2 A31.6 31.6 0 0 1 83.5 118.9" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1"/>
  <path d="M270 148 A30 30 0 0 1 330 148 Z" fill="url(#archIn)"/><path d="M269.9 142.7 A30.6 30.6 0 0 1 330.1 142.7" fill="none" stroke="#6b7480" stroke-width="1.2"/><path d="M270.3 137.2 A31.6 31.6 0 0 1 305.5 116.9" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1"/>
  <circle cx="78" cy="153" r="26" fill="url(#tire)"/><circle cx="78" cy="153" r="24.2" fill="none" stroke="#3a3f47" stroke-width="1"/><path d="M53.9 146.5 A25.0 25.0 0 0 1 84.5 128.9" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.6" stroke-linecap="round"/><path d="M58.5 145.9 A20.8 20.8 0 0 1 78.0 132.2" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/><circle cx="78" cy="153" r="17.2" fill="url(#steelDish)" stroke="#6b7380" stroke-width="0.8"/><circle cx="78" cy="153" r="13.7" fill="none" stroke="#97a0ab" stroke-width="1.1"/><circle cx="78" cy="153" r="14.1" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="0.6"/><ellipse cx="87.6" cy="155.6" rx="2.4" ry="1.4" transform="rotate(105 87.6 155.6)" fill="#20252c"/><ellipse cx="88.2" cy="156.2" rx="2.1" ry="0.6" transform="rotate(105 88.2 156.2)" fill="#ffffff" opacity="0.35"/><ellipse cx="80.6" cy="162.6" rx="2.4" ry="1.4" transform="rotate(165 80.6 162.6)" fill="#20252c"/><ellipse cx="80.7" cy="163.7" rx="2.1" ry="0.6" transform="rotate(165 80.7 163.7)" fill="#ffffff" opacity="0.35"/><ellipse cx="71.0" cy="160.0" rx="2.4" ry="1.4" transform="rotate(225 71.0 160.0)" fill="#20252c"/><ellipse cx="70.5" cy="161.0" rx="2.1" ry="0.6" transform="rotate(225 70.5 161.0)" fill="#ffffff" opacity="0.35"/><ellipse cx="68.4" cy="150.4" rx="2.4" ry="1.4" transform="rotate(285 68.4 150.4)" fill="#20252c"/><ellipse cx="67.8" cy="150.8" rx="2.1" ry="0.6" transform="rotate(285 67.8 150.8)" fill="#ffffff" opacity="0.35"/><ellipse cx="75.4" cy="143.4" rx="2.4" ry="1.4" transform="rotate(345 75.4 143.4)" fill="#20252c"/><ellipse cx="75.3" cy="143.3" rx="2.1" ry="0.6" transform="rotate(345 75.3 143.3)" fill="#ffffff" opacity="0.35"/><ellipse cx="85.0" cy="146.0" rx="2.4" ry="1.4" transform="rotate(405 85.0 146.0)" fill="#20252c"/><ellipse cx="85.5" cy="146.0" rx="2.1" ry="0.6" transform="rotate(405 85.5 146.0)" fill="#ffffff" opacity="0.35"/><circle cx="78" cy="153" r="6.5" fill="url(#hubCap)" stroke="#6b7380" stroke-width="0.7"/><circle cx="82.8" cy="153.0" r="0.9" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="80.4" cy="157.2" r="0.9" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="75.6" cy="157.2" r="0.9" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="73.2" cy="153.0" r="0.9" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="75.6" cy="148.8" r="0.9" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="80.4" cy="148.8" r="0.9" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="78" cy="153" r="2.1" fill="#8a939e"/>
  <circle cx="300" cy="151" r="26" fill="url(#tire)"/><circle cx="300" cy="151" r="24.2" fill="none" stroke="#3a3f47" stroke-width="1"/><path d="M275.9 144.5 A25.0 25.0 0 0 1 306.5 126.9" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.6" stroke-linecap="round"/><path d="M280.5 143.9 A20.8 20.8 0 0 1 300.0 130.2" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/><circle cx="300" cy="151" r="17.2" fill="url(#steelDish)" stroke="#6b7380" stroke-width="0.8"/><circle cx="300" cy="151" r="13.7" fill="none" stroke="#97a0ab" stroke-width="1.1"/><circle cx="300" cy="151" r="14.1" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="0.6"/><ellipse cx="309.6" cy="153.6" rx="2.4" ry="1.4" transform="rotate(105 309.6 153.6)" fill="#20252c"/><ellipse cx="310.2" cy="154.2" rx="2.1" ry="0.6" transform="rotate(105 310.2 154.2)" fill="#ffffff" opacity="0.35"/><ellipse cx="302.6" cy="160.6" rx="2.4" ry="1.4" transform="rotate(165 302.6 160.6)" fill="#20252c"/><ellipse cx="302.7" cy="161.7" rx="2.1" ry="0.6" transform="rotate(165 302.7 161.7)" fill="#ffffff" opacity="0.35"/><ellipse cx="293.0" cy="158.0" rx="2.4" ry="1.4" transform="rotate(225 293.0 158.0)" fill="#20252c"/><ellipse cx="292.5" cy="159.0" rx="2.1" ry="0.6" transform="rotate(225 292.5 159.0)" fill="#ffffff" opacity="0.35"/><ellipse cx="290.4" cy="148.4" rx="2.4" ry="1.4" transform="rotate(285 290.4 148.4)" fill="#20252c"/><ellipse cx="289.8" cy="148.8" rx="2.1" ry="0.6" transform="rotate(285 289.8 148.8)" fill="#ffffff" opacity="0.35"/><ellipse cx="297.4" cy="141.4" rx="2.4" ry="1.4" transform="rotate(345 297.4 141.4)" fill="#20252c"/><ellipse cx="297.3" cy="141.3" rx="2.1" ry="0.6" transform="rotate(345 297.3 141.3)" fill="#ffffff" opacity="0.35"/><ellipse cx="307.0" cy="144.0" rx="2.4" ry="1.4" transform="rotate(405 307.0 144.0)" fill="#20252c"/><ellipse cx="307.5" cy="144.0" rx="2.1" ry="0.6" transform="rotate(405 307.5 144.0)" fill="#ffffff" opacity="0.35"/><circle cx="300" cy="151" r="6.5" fill="url(#hubCap)" stroke="#6b7380" stroke-width="0.7"/><circle cx="304.8" cy="151.0" r="0.9" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="302.4" cy="155.2" r="0.9" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="297.6" cy="155.2" r="0.9" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="295.2" cy="151.0" r="0.9" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="297.6" cy="146.8" r="0.9" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="302.4" cy="146.8" r="0.9" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="300" cy="151" r="2.1" fill="#8a939e"/>
</svg>`;

  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  svgDataUrlCache.set(key, url);
  return url;
}

/**
 * Perfil 2D (vista lateral, mirando a la izquierda) para la lista lateral y el tab Íconos.
 * Cisterna: camión de cabina frontal plana con tanque cilíndrico, escotillas y tres ejes, acabado realista en gris plomo claro metalizado. Relación 2:1 (400×200).
 */
export function getCisternaSideSvgDataUrl(): string {
  const key = 'cisterna_side_profile';
  const cached = svgDataUrlCache.get(key);
  if (cached) return cached;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="44" viewBox="0 0 400 200">
  <defs>
    <linearGradient id="paint" gradientUnits="userSpaceOnUse" x1="0" y1="34" x2="0" y2="150">
      <stop offset="0" stop-color="#e3e7ec"/>
      <stop offset="0.10" stop-color="#f4f6f8"/>
      <stop offset="0.24" stop-color="#dce1e7"/>
      <stop offset="0.29" stop-color="#f7f8fa"/>
      <stop offset="0.33" stop-color="#b6bec8"/>
      <stop offset="0.42" stop-color="#cfd5dc"/>
      <stop offset="0.64" stop-color="#d9dee4"/>
      <stop offset="0.82" stop-color="#b3bbc5"/>
      <stop offset="1" stop-color="#838c98"/>
    </linearGradient>
    <linearGradient id="paintV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4f6f8"/>
      <stop offset="0.45" stop-color="#d6dbe1"/>
      <stop offset="1" stop-color="#9aa3ae"/>
    </linearGradient>
    <linearGradient id="glassSide" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a3aebb"/>
      <stop offset="0.18" stop-color="#5d6978"/>
      <stop offset="0.48" stop-color="#28313d"/>
      <stop offset="1" stop-color="#11161e"/>
    </linearGradient>
    <linearGradient id="glassFront" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b8c2cd"/>
      <stop offset="0.35" stop-color="#6b7786"/>
      <stop offset="1" stop-color="#1c232d"/>
    </linearGradient>
    <linearGradient id="roofGlass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3b4553"/>
      <stop offset="0.5" stop-color="#151b24"/>
      <stop offset="1" stop-color="#0a0e14"/>
    </linearGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3d4552"/>
      <stop offset="0.5" stop-color="#151a22"/>
      <stop offset="1" stop-color="#07090d"/>
    </linearGradient>
    <linearGradient id="satin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a5260"/>
      <stop offset="0.35" stop-color="#2a313b"/>
      <stop offset="1" stop-color="#12161c"/>
    </linearGradient>
    <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.45" stop-color="#9aa3ae"/>
      <stop offset="0.55" stop-color="#5f6874"/>
      <stop offset="1" stop-color="#e5e9ee"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="lowShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1f2937" stop-opacity="0"/>
      <stop offset="1" stop-color="#1f2937" stop-opacity="0.32"/>
    </linearGradient>
    <linearGradient id="lampHousing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4a5361"/>
      <stop offset="0.5" stop-color="#1b2129"/>
      <stop offset="1" stop-color="#0b0e13"/>
    </linearGradient>
    <linearGradient id="lampClear" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.5" stop-color="#e5eaf0"/>
      <stop offset="1" stop-color="#9aa4b0"/>
    </linearGradient>
    <linearGradient id="tail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fca5a5"/>
      <stop offset="0.3" stop-color="#ef4444"/>
      <stop offset="1" stop-color="#7f1d1d"/>
    </linearGradient>
    <linearGradient id="amber" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fde68a"/>
      <stop offset="1" stop-color="#d97706"/>
    </linearGradient>
    <radialGradient id="lens" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#dbe3ec"/>
      <stop offset="1" stop-color="#7c8794"/>
    </radialGradient>
    <radialGradient id="tire" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.62" stop-color="#2c3037"/>
      <stop offset="0.86" stop-color="#1a1d22"/>
      <stop offset="1" stop-color="#0a0c0f"/>
    </radialGradient>
    <radialGradient id="archIn" cx="0.5" cy="1" r="1">
      <stop offset="0" stop-color="#05070a"/>
      <stop offset="0.8" stop-color="#11151b"/>
      <stop offset="1" stop-color="#1f252e"/>
    </radialGradient>
    <radialGradient id="disc" cx="0.45" cy="0.4" r="0.6">
      <stop offset="0" stop-color="#c5cbd2"/>
      <stop offset="0.7" stop-color="#8b929b"/>
      <stop offset="1" stop-color="#4b525b"/>
    </radialGradient>
    <linearGradient id="spoke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#9aa1aa"/>
      <stop offset="0.5" stop-color="#5b616a"/>
      <stop offset="1" stop-color="#2c3036"/>
    </linearGradient>
    <radialGradient id="steelDish" cx="0.42" cy="0.36" r="0.72">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.45" stop-color="#dfe4ea"/>
      <stop offset="0.8" stop-color="#aab2bc"/>
      <stop offset="1" stop-color="#7c8592"/>
    </radialGradient>
    <radialGradient id="hubCap" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#c9cfd6"/>
      <stop offset="1" stop-color="#7e8793"/>
    </radialGradient>
    <filter id="blurL" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="4.5"/></filter>
    <filter id="blurS" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="1.8"/></filter>
    <filter id="glow" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="1.4"/></filter>
    <linearGradient id="tank" gradientUnits="userSpaceOnUse" x1="0" y1="58" x2="0" y2="128">
      <stop offset="0" stop-color="#8d96a2"/>
      <stop offset="0.07" stop-color="#d9dee4"/>
      <stop offset="0.17" stop-color="#ffffff"/>
      <stop offset="0.26" stop-color="#cfd5dc"/>
      <stop offset="0.44" stop-color="#f2f4f6"/>
      <stop offset="0.62" stop-color="#b8c0c9"/>
      <stop offset="0.78" stop-color="#9aa3ae"/>
      <stop offset="0.9" stop-color="#d3d8de"/>
      <stop offset="1" stop-color="#727c89"/>
    </linearGradient>
    <radialGradient id="tankCap" cx="0.2" cy="0.35" r="0.9">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.5" stop-color="#c3cad2"/>
      <stop offset="1" stop-color="#6b7480"/>
    </radialGradient>
    <linearGradient id="alu" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4f6f8"/>
      <stop offset="0.3" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="#b9c1ca"/>
      <stop offset="1" stop-color="#7c8592"/>
    </linearGradient>
  </defs>

  <!-- Sombras de piso y de contacto -->
  <ellipse cx="202" cy="180" rx="190" ry="7" fill="#0f172a" opacity="0.42" filter="url(#blurL)"/>
  <ellipse cx="58" cy="180" rx="20.4" ry="3.2" fill="#000000" opacity="0.6" filter="url(#blurS)"/>
  <ellipse cx="290" cy="180" rx="18.7" ry="3.2" fill="#000000" opacity="0.6" filter="url(#blurS)"/>
  <ellipse cx="340" cy="180" rx="18.7" ry="3.2" fill="#000000" opacity="0.6" filter="url(#blurS)"/>

  <!-- Chasis -->
  <path d="M90 127 L386 127 L386 140 L90 140 Z" fill="url(#satin)"/>
  <line x1="90" y1="127.5" x2="386" y2="127.5" stroke="#8a939e" stroke-width="0.7"/>

  <!-- Tanque de aluminio pulido -->
  <path d="M104 58 L372 58 C382 58 388 72 388 93 C388 114 382 128 372 128 L104 128 C98 128 96 114 96 93 C96 72 98 58 104 58 Z"
        fill="url(#tank)" stroke="#5f6874" stroke-width="1.4"/>
  <path d="M372 58 C382 58 388 72 388 93 C388 114 382 128 372 128 C378 120 381 108 381 93 C381 78 378 66 372 58 Z" fill="url(#tankCap)"/>
  <!-- Anillos con remaches -->
  <path d="M160 58.5 C162.4 80 162.4 106 160 127.5 M230 58.5 C232.4 80 232.4 106 230 127.5 M300 58.5 C302.4 80 302.4 106 300 127.5"
        fill="none" stroke="#7c8592" stroke-width="2.4"/>
  <path d="M161.6 58.5 C164 80 164 106 161.6 127.5 M231.6 58.5 C234 80 234 106 231.6 127.5 M301.6 58.5 C304 80 304 106 301.6 127.5"
        fill="none" stroke="#ffffff" stroke-width="0.9" opacity="0.8"/>
  <circle cx="160" cy="64" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="160" cy="72" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="160" cy="80" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="160" cy="88" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="160" cy="96" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="160" cy="104" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="160" cy="112" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="160" cy="120" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="230" cy="64" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="230" cy="72" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="230" cy="80" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="230" cy="88" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="230" cy="96" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="230" cy="104" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="230" cy="112" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="230" cy="120" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="300" cy="64" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="300" cy="72" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="300" cy="80" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="300" cy="88" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="300" cy="96" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="300" cy="104" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="300" cy="112" r="0.75" fill="#ffffff" opacity="0.75"/><circle cx="300" cy="120" r="0.75" fill="#ffffff" opacity="0.75"/>
  <!-- Reflejos largos del cilindro -->
  <path d="M110 69 L372 69" fill="none" stroke="url(#shine)" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M120 120 L360 120" fill="none" stroke="url(#shine)" stroke-width="2" stroke-linecap="round" opacity="0.6"/>

  <!-- Barandal abatible, escotillas y tubo de vapor -->
  <path d="M106 48 L372 48" stroke="#9aa3ae" stroke-width="2"/>
  <path d="M106 47.2 L372 47.2" stroke="#ffffff" stroke-width="0.6" opacity="0.8"/>
  <path d="M112 48 L112 58" stroke="#8a939e" stroke-width="1.4"/><path d="M144 48 L144 58" stroke="#8a939e" stroke-width="1.4"/><path d="M176 48 L176 58" stroke="#8a939e" stroke-width="1.4"/><path d="M208 48 L208 58" stroke="#8a939e" stroke-width="1.4"/><path d="M240 48 L240 58" stroke="#8a939e" stroke-width="1.4"/><path d="M272 48 L272 58" stroke="#8a939e" stroke-width="1.4"/><path d="M304 48 L304 58" stroke="#8a939e" stroke-width="1.4"/><path d="M336 48 L336 58" stroke="#8a939e" stroke-width="1.4"/><path d="M368 48 L368 58" stroke="#8a939e" stroke-width="1.4"/>
  <path d="M140 53 C140 50 143 49 146 49 L170 49 C173 49 176 50 176 53 L176 58 L140 58 Z" fill="url(#alu)" stroke="#6b7380" stroke-width="0.8"/>
  <path d="M210 53 C210 50 213 49 216 49 L240 49 C243 49 246 50 246 53 L246 58 L210 58 Z" fill="url(#alu)" stroke="#6b7380" stroke-width="0.8"/>
  <path d="M280 53 C280 50 283 49 286 49 L310 49 C313 49 316 50 316 53 L316 58 L280 58 Z" fill="url(#alu)" stroke="#6b7380" stroke-width="0.8"/>
  <path d="M110 55.5 L370 55.5" stroke="#6b7380" stroke-width="1.6"/>
  <!-- Escalera trasera -->
  <path d="M377 60 L377 126 M385 64 L385 122" stroke="#5f6874" stroke-width="1.6"/>
  <path d="M377 72 L385 72 M377 84 L385 84 M377 96 L385 96 M377 108 L385 108 M377 120 L385 120" stroke="#5f6874" stroke-width="1.3"/>

  <!-- Tanque de combustible, bandejas de mangueras y válvulas -->
  <rect x="100" y="131" width="44" height="17" rx="8.5" fill="url(#alu)" stroke="#6b7380" stroke-width="0.8"/>
  <path d="M110 131 L110 148 M134 131 L134 148" stroke="#7c8592" stroke-width="1.4"/>
  <rect x="150" y="131" width="100" height="10" rx="5" fill="url(#alu)" stroke="#6b7380" stroke-width="0.7"/>
  <path d="M154 133.5 L246 133.5" stroke="#ffffff" stroke-width="0.8" opacity="0.9"/>
  <rect x="154" y="142" width="64" height="9" rx="1.5" fill="url(#satin)"/>
  <path d="M158 145 L214 145" stroke="#6b7380" stroke-width="0.8"/>
  <circle cx="232" cy="146" r="4" fill="#2a313b" stroke="#9aa3ae" stroke-width="0.8"/>
  <circle cx="246" cy="146" r="4" fill="#2a313b" stroke="#9aa3ae" stroke-width="0.8"/>
  <!-- Guardabarros tándem y faldones -->
  <path d="M258 154 C258 139 270 131 286 131 L344 131 C360 131 372 139 372 154 L366 154 C366 143 356 136 342 136 L288 136 C274 136 264 143 264 154 Z" fill="url(#satin)"/>
  <rect x="368" y="138" width="5" height="22" rx="1" fill="#11161d"/>

  <!-- Cabina frontal plana -->
  <path d="M20 148 C16 146 14 142 14 136 L16 52 C16 42 22 36 32 35 L80 34 C88 34 92 38 92 46 L94 148 Z" fill="url(#paint)" stroke="#6b7380" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M14 112 L93 112 L94 148 L20 148 C16 146 14 142 14 136 Z" fill="url(#lowShade)"/>
  <!-- Deflector aerodinámico -->
  <path d="M28 36 C40 25 60 21 84 21 C89.4 21 92 25 92 34 L32 35 Z" fill="url(#paintV)" stroke="#6b7380" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M38 30 C52 25.6 68 24.4 86 24.6" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.95"/>
  <!-- Parabrisas (canto) -->
  <path d="M16 45 L22.6 43.2 L22.6 87 L16 89 Z" fill="url(#glassFront)"/>
  <!-- Ventana de la puerta y ventila -->
  <path d="M28 47 C28 44.6 30 43.4 32.6 43.4 L71 42.4 C73.4 42.4 75 43.8 75 46.2 L75 83 L28 87.6 Z" fill="url(#gloss)"/>
  <path d="M31 47 L72 46 L72 81.4 L31 85 Z" fill="url(#glassSide)"/>
  <path d="M31 47 L40 46.8 L31 60 Z" fill="#0b0f14" opacity="0.6"/>
  <path d="M41 47.4 L54 47 L38 74 Z" fill="#ffffff" opacity="0.22"/>
  <path d="M50 64 C50 60 53 58 57 58 C61 58 64 60 64 64 L64 74 L50 74 Z" fill="#06080b" opacity="0.5"/>
  <!-- Juntas, manija, asideros y escalones -->
  <path d="M80 40 L82 141" fill="none" stroke="#5f6874" stroke-width="1.3" stroke-linecap="round"/><path d="M80 40 L82 141" transform="translate(1.1 0.6)" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M24 96 L80 95" fill="none" stroke="#5f6874" stroke-width="1.3" stroke-linecap="round"/><path d="M24 96 L80 95" transform="translate(1.1 0.6)" fill="none" stroke="#ffffff" stroke-opacity="0.65" stroke-width="0.8" stroke-linecap="round"/>
  <rect x="60" y="90" width="14" height="4.5" rx="2.25" fill="#161b22"/>
  <rect x="61" y="90.4" width="12" height="1.2" rx="0.6" fill="#ffffff" opacity="0.45"/>
  <rect x="85" y="52" width="3.4" height="52" rx="1.7" fill="url(#chrome)"/>
  <path d="M30 116 L76 116 L76 123 L30 123 Z M32 131 L76 131 L76 138 L32 138 Z" fill="url(#satin)"/>
  <path d="M34 118.6 L72 118.6 M34 120.6 L72 120.6 M36 133.6 L72 133.6 M36 135.6 L72 135.6" stroke="#6b7380" stroke-width="0.6"/>
  <path d="M38 99 L88 98" fill="none" stroke="url(#shine)" stroke-width="3" stroke-linecap="round"/>
  <!-- Espejos: principal y gran angular -->
  <path d="M8 50 L15 48.4 L15 52 L10 53 Z" fill="#11161d"/>
  <path d="M2 54 C2 52 3.4 50.6 5.4 50.6 L10.6 50.6 C12.4 50.6 13.6 52 13.6 54 L13.6 82 C13.6 84 12.4 85.4 10.6 85.4 L5.4 85.4 C3.4 85.4 2 84 2 82 Z" fill="url(#gloss)"/>
  <path d="M4 55 L6 54 L6 80 L4 81 Z" fill="#ffffff" opacity="0.28"/>
  <rect x="3.4" y="88" width="9" height="11" rx="2" fill="url(#gloss)"/>
  <!-- Faros e intermitente -->
  <rect x="13" y="112" width="11" height="10" rx="1.6" fill="url(#lampHousing)"/>
  <rect x="14.2" y="113.2" width="8.6" height="5" rx="1" fill="url(#lampClear)"/>
  <rect x="14.2" y="118.6" width="8.6" height="2.4" rx="0.8" fill="url(#amber)"/>
  <!-- Parachoques -->
  <path d="M12 125 L31 125 L31 148 L20 148 C15 147 12 143 12 138 Z" fill="url(#satin)"/>
  <path d="M12.6 126 L30 126" stroke="#8a939e" stroke-width="0.6"/>
  <ellipse cx="15" cy="72" rx="1.6" ry="14" fill="#ffffff" opacity="0.5" filter="url(#glow)"/>

  <!-- Luces traseras -->
  <rect x="380" y="129" width="7" height="10" rx="1.5" fill="url(#tail)"/>
  <rect x="380" y="140" width="7" height="4" rx="1" fill="url(#amber)"/>

  <!-- Ruedas -->
  <path d="M30 150 A28 28 0 0 1 86 150 Z" fill="url(#archIn)"/><path d="M29.8 145.0 A28.6 28.6 0 0 1 86.2 145.0" fill="none" stroke="#6b7480" stroke-width="1.2"/><path d="M30.2 139.9 A29.6 29.6 0 0 1 63.1 120.8" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1"/>
  <circle cx="58" cy="154" r="24" fill="url(#tire)"/><circle cx="58" cy="154" r="22.3" fill="none" stroke="#3a3f47" stroke-width="1"/><path d="M35.7 148.0 A23.0 23.0 0 0 1 64.0 131.7" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.6" stroke-linecap="round"/><path d="M40.0 147.4 A19.2 19.2 0 0 1 58.0 134.8" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/><circle cx="58" cy="154" r="15.8" fill="url(#steelDish)" stroke="#6b7380" stroke-width="0.8"/><circle cx="58" cy="154" r="12.7" fill="none" stroke="#97a0ab" stroke-width="1.1"/><circle cx="58" cy="154" r="13.0" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="0.6"/><ellipse cx="66.9" cy="156.4" rx="2.2" ry="1.3" transform="rotate(105 66.9 156.4)" fill="#20252c"/><ellipse cx="67.5" cy="157.0" rx="1.9" ry="0.6" transform="rotate(105 67.5 157.0)" fill="#ffffff" opacity="0.35"/><ellipse cx="62.6" cy="162.0" rx="2.2" ry="1.3" transform="rotate(150 62.6 162.0)" fill="#20252c"/><ellipse cx="62.9" cy="163.0" rx="1.9" ry="0.6" transform="rotate(150 62.9 163.0)" fill="#ffffff" opacity="0.35"/><ellipse cx="55.6" cy="162.9" rx="2.2" ry="1.3" transform="rotate(195 55.6 162.9)" fill="#20252c"/><ellipse cx="55.5" cy="164.0" rx="1.9" ry="0.6" transform="rotate(195 55.5 164.0)" fill="#ffffff" opacity="0.35"/><ellipse cx="50.0" cy="158.6" rx="2.2" ry="1.3" transform="rotate(240 50.0 158.6)" fill="#20252c"/><ellipse cx="49.5" cy="159.4" rx="1.9" ry="0.6" transform="rotate(240 49.5 159.4)" fill="#ffffff" opacity="0.35"/><ellipse cx="49.1" cy="151.6" rx="2.2" ry="1.3" transform="rotate(285 49.1 151.6)" fill="#20252c"/><ellipse cx="48.5" cy="152.0" rx="1.9" ry="0.6" transform="rotate(285 48.5 152.0)" fill="#ffffff" opacity="0.35"/><ellipse cx="53.4" cy="146.0" rx="2.2" ry="1.3" transform="rotate(330 53.4 146.0)" fill="#20252c"/><ellipse cx="53.1" cy="146.0" rx="1.9" ry="0.6" transform="rotate(330 53.1 146.0)" fill="#ffffff" opacity="0.35"/><ellipse cx="60.4" cy="145.1" rx="2.2" ry="1.3" transform="rotate(375 60.4 145.1)" fill="#20252c"/><ellipse cx="60.5" cy="145.0" rx="1.9" ry="0.6" transform="rotate(375 60.5 145.0)" fill="#ffffff" opacity="0.35"/><ellipse cx="66.0" cy="149.4" rx="2.2" ry="1.3" transform="rotate(420 66.0 149.4)" fill="#20252c"/><ellipse cx="66.5" cy="149.6" rx="1.9" ry="0.6" transform="rotate(420 66.5 149.6)" fill="#ffffff" opacity="0.35"/><circle cx="58" cy="154" r="6.0" fill="url(#hubCap)" stroke="#6b7380" stroke-width="0.7"/><circle cx="62.4" cy="154.0" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="61.6" cy="156.6" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="59.4" cy="158.2" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="56.6" cy="158.2" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="54.4" cy="156.6" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="53.6" cy="154.0" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="54.4" cy="151.4" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="56.6" cy="149.8" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="59.4" cy="149.8" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="61.6" cy="151.4" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="58" cy="154" r="2.7" fill="#9aa2ad" stroke="#5f6874" stroke-width="0.6"/><circle cx="57.2" cy="153.2" r="1.1" fill="#ffffff" opacity="0.8"/>
  <circle cx="290" cy="156" r="22" fill="url(#tire)"/><circle cx="290" cy="156" r="20.5" fill="none" stroke="#3a3f47" stroke-width="1"/><path d="M269.6 150.5 A21.1 21.1 0 0 1 295.5 135.6" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.6" stroke-linecap="round"/><path d="M273.5 150.0 A17.6 17.6 0 0 1 290.0 138.4" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/><circle cx="290" cy="156" r="14.5" fill="url(#steelDish)" stroke="#6b7380" stroke-width="0.8"/><circle cx="290" cy="156" r="11.6" fill="none" stroke="#97a0ab" stroke-width="1.1"/><circle cx="290" cy="156" r="11.9" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="0.6"/><ellipse cx="298.1" cy="158.2" rx="2.0" ry="1.2" transform="rotate(105 298.1 158.2)" fill="#20252c"/><ellipse cx="298.7" cy="158.8" rx="1.7" ry="0.5" transform="rotate(105 298.7 158.8)" fill="#ffffff" opacity="0.35"/><ellipse cx="294.2" cy="163.3" rx="2.0" ry="1.2" transform="rotate(150 294.2 163.3)" fill="#20252c"/><ellipse cx="294.5" cy="164.3" rx="1.7" ry="0.5" transform="rotate(150 294.5 164.3)" fill="#ffffff" opacity="0.35"/><ellipse cx="287.8" cy="164.1" rx="2.0" ry="1.2" transform="rotate(195 287.8 164.1)" fill="#20252c"/><ellipse cx="287.7" cy="165.2" rx="1.7" ry="0.5" transform="rotate(195 287.7 165.2)" fill="#ffffff" opacity="0.35"/><ellipse cx="282.7" cy="160.2" rx="2.0" ry="1.2" transform="rotate(240 282.7 160.2)" fill="#20252c"/><ellipse cx="282.2" cy="161.0" rx="1.7" ry="0.5" transform="rotate(240 282.2 161.0)" fill="#ffffff" opacity="0.35"/><ellipse cx="281.9" cy="153.8" rx="2.0" ry="1.2" transform="rotate(285 281.9 153.8)" fill="#20252c"/><ellipse cx="281.3" cy="154.2" rx="1.7" ry="0.5" transform="rotate(285 281.3 154.2)" fill="#ffffff" opacity="0.35"/><ellipse cx="285.8" cy="148.7" rx="2.0" ry="1.2" transform="rotate(330 285.8 148.7)" fill="#20252c"/><ellipse cx="285.5" cy="148.7" rx="1.7" ry="0.5" transform="rotate(330 285.5 148.7)" fill="#ffffff" opacity="0.35"/><ellipse cx="292.2" cy="147.9" rx="2.0" ry="1.2" transform="rotate(375 292.2 147.9)" fill="#20252c"/><ellipse cx="292.3" cy="147.8" rx="1.7" ry="0.5" transform="rotate(375 292.3 147.8)" fill="#ffffff" opacity="0.35"/><ellipse cx="297.3" cy="151.8" rx="2.0" ry="1.2" transform="rotate(420 297.3 151.8)" fill="#20252c"/><ellipse cx="297.8" cy="152.0" rx="1.7" ry="0.5" transform="rotate(420 297.8 152.0)" fill="#ffffff" opacity="0.35"/><circle cx="290" cy="156" r="5.5" fill="url(#hubCap)" stroke="#6b7380" stroke-width="0.7"/><circle cx="294.1" cy="156.0" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="293.3" cy="158.4" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="291.3" cy="159.9" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="288.7" cy="159.9" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="286.7" cy="158.4" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="285.9" cy="156.0" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="286.7" cy="153.6" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="288.7" cy="152.1" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="291.3" cy="152.1" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="293.3" cy="153.6" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="290" cy="156" r="2.5" fill="#9aa2ad" stroke="#5f6874" stroke-width="0.6"/><circle cx="289.2" cy="155.2" r="1.0" fill="#ffffff" opacity="0.8"/>
  <circle cx="340" cy="156" r="22" fill="url(#tire)"/><circle cx="340" cy="156" r="20.5" fill="none" stroke="#3a3f47" stroke-width="1"/><path d="M319.6 150.5 A21.1 21.1 0 0 1 345.5 135.6" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.6" stroke-linecap="round"/><path d="M323.5 150.0 A17.6 17.6 0 0 1 340.0 138.4" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/><circle cx="340" cy="156" r="14.5" fill="url(#steelDish)" stroke="#6b7380" stroke-width="0.8"/><circle cx="340" cy="156" r="11.6" fill="none" stroke="#97a0ab" stroke-width="1.1"/><circle cx="340" cy="156" r="11.9" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="0.6"/><ellipse cx="348.1" cy="158.2" rx="2.0" ry="1.2" transform="rotate(105 348.1 158.2)" fill="#20252c"/><ellipse cx="348.7" cy="158.8" rx="1.7" ry="0.5" transform="rotate(105 348.7 158.8)" fill="#ffffff" opacity="0.35"/><ellipse cx="344.2" cy="163.3" rx="2.0" ry="1.2" transform="rotate(150 344.2 163.3)" fill="#20252c"/><ellipse cx="344.5" cy="164.3" rx="1.7" ry="0.5" transform="rotate(150 344.5 164.3)" fill="#ffffff" opacity="0.35"/><ellipse cx="337.8" cy="164.1" rx="2.0" ry="1.2" transform="rotate(195 337.8 164.1)" fill="#20252c"/><ellipse cx="337.7" cy="165.2" rx="1.7" ry="0.5" transform="rotate(195 337.7 165.2)" fill="#ffffff" opacity="0.35"/><ellipse cx="332.7" cy="160.2" rx="2.0" ry="1.2" transform="rotate(240 332.7 160.2)" fill="#20252c"/><ellipse cx="332.2" cy="161.0" rx="1.7" ry="0.5" transform="rotate(240 332.2 161.0)" fill="#ffffff" opacity="0.35"/><ellipse cx="331.9" cy="153.8" rx="2.0" ry="1.2" transform="rotate(285 331.9 153.8)" fill="#20252c"/><ellipse cx="331.3" cy="154.2" rx="1.7" ry="0.5" transform="rotate(285 331.3 154.2)" fill="#ffffff" opacity="0.35"/><ellipse cx="335.8" cy="148.7" rx="2.0" ry="1.2" transform="rotate(330 335.8 148.7)" fill="#20252c"/><ellipse cx="335.5" cy="148.7" rx="1.7" ry="0.5" transform="rotate(330 335.5 148.7)" fill="#ffffff" opacity="0.35"/><ellipse cx="342.2" cy="147.9" rx="2.0" ry="1.2" transform="rotate(375 342.2 147.9)" fill="#20252c"/><ellipse cx="342.3" cy="147.8" rx="1.7" ry="0.5" transform="rotate(375 342.3 147.8)" fill="#ffffff" opacity="0.35"/><ellipse cx="347.3" cy="151.8" rx="2.0" ry="1.2" transform="rotate(420 347.3 151.8)" fill="#20252c"/><ellipse cx="347.8" cy="152.0" rx="1.7" ry="0.5" transform="rotate(420 347.8 152.0)" fill="#ffffff" opacity="0.35"/><circle cx="340" cy="156" r="5.5" fill="url(#hubCap)" stroke="#6b7380" stroke-width="0.7"/><circle cx="344.1" cy="156.0" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="343.3" cy="158.4" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="341.3" cy="159.9" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="338.7" cy="159.9" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="336.7" cy="158.4" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="335.9" cy="156.0" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="336.7" cy="153.6" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="338.7" cy="152.1" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="341.3" cy="152.1" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="343.3" cy="153.6" r="0.8" fill="#d4d9df" stroke="#5f6874" stroke-width="0.4"/><circle cx="340" cy="156" r="2.5" fill="#9aa2ad" stroke="#5f6874" stroke-width="0.6"/><circle cx="339.2" cy="155.2" r="1.0" fill="#ffffff" opacity="0.8"/>
</svg>`;

  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  svgDataUrlCache.set(key, url);
  return url;
}
