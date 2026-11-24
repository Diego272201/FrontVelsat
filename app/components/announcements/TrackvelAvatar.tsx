'use client';

import React from 'react';
import Image from 'next/image';

/** Proporción de public/avatar.webp (871 × 1116) */
const RATIO = 871 / 1116;

/**
 * Asistente de Trackvel (public/avatar.webp, fondo transparente). Va pegado al
 * borde inferior de la pantalla y entra con un pequeño balanceo de saludo.
 * Next/Image entrega una versión liviana y del tamaño justo de la imagen.
 */
export default function TrackvelAvatar({ height = 150 }: { height?: number }) {
  const width = Math.round(height * RATIO);
  return (
    <div className="trackvel-avatar" style={{ width, height }}>
      <Image
        src="/avatar.webp"
        alt="Asistente de Trackvel"
        width={width}
        height={height}
        sizes={`${width}px`}
        priority
        className="tva-hello block h-full w-full object-contain object-bottom drop-shadow-[0_4px_12px_rgba(15,23,42,0.18)]"
      />

      <style>{`
        .trackvel-avatar .tva-hello {
          transform-origin: 50% 100%;
          animation: tva-hello 1s ease-out 0.2s 1 both;
        }
        @keyframes tva-hello {
          0% { transform: translateY(24px) rotate(0deg); opacity: 0; }
          35% { transform: translateY(0) rotate(-3deg); opacity: 1; }
          60% { transform: rotate(2.5deg); }
          80% { transform: rotate(-1.5deg); }
          100% { transform: rotate(0deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .trackvel-avatar .tva-hello { animation: none; }
        }
      `}</style>
    </div>
  );
}
