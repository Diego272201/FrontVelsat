export function getMarkerSVG(number: number): string {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="160" viewBox="0 0 120 160">
        <!-- Sombra -->
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="black" flood-opacity="0.4"/>
        </filter>
  
        <!-- Círculo más grande -->
        <circle cx="60" cy="60" r="45" fill="white" stroke="black" stroke-width="8" filter="url(#shadow)"/>
  
        <!-- Triángulo tipo gota -->
        <path d="M60 105 L35 155 L85 155 Z" fill="black" filter="url(#shadow)"/>
  
        <!-- Número aún más grande -->
        <text x="60" y="67" text-anchor="middle" font-size="60" font-family="Arial" font-weight="bold" fill="black" dominant-baseline="middle">${number}</text>
      </svg>
    `;
}
