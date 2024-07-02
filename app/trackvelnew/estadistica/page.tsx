'use client';
import React, { useEffect } from 'react';

export default function Page() {
  useEffect(() => {
    // Código que necesita `document` aquí.
    console.log(document);
  }, []);

  return (
    <div>
        <h1>Estadística</h1>
    </div>
  );
}

