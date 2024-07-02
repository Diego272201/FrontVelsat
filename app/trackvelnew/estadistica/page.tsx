'use client';
import React, { useEffect } from 'react';

export default function Page() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Este código solo se ejecutará en el cliente
      console.log('Running on the client side');
    }
  }, []);

  return (
    <div>
      <h1>Estadística</h1>
    </div>
  );
}