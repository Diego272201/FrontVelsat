'use client';

import { BrowserRouter as Router } from 'react-router-dom';
import React, { useEffect, useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex h-full flex-col space-y-6 p-4">
        <div className="h-10 w-full animate-pulse rounded bg-gray-200"></div>

        <div className="mx-auto h-12 w-48 animate-pulse rounded-lg bg-gray-200"></div>

        <div className="flex-1 animate-pulse overflow-hidden rounded-lg bg-gray-100 shadow-lg">
          <div className="mb-2 h-8 rounded-t-lg bg-gray-300"></div>

          {Array.from({ length: 6 }).map((_, index) => (
            <div className="mb-2 grid grid-cols-6 gap-2" key={index}>
              {Array.from({ length: 6 }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="col-span-1 h-4 rounded bg-gray-200"
                ></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div style={{ display: 'flex', height: '100vh' }}>
        <div className="mainPruebas">{children}</div>
      </div>
    </Router>
  );
}
