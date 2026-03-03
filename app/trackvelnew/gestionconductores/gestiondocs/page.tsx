import { Suspense } from 'react';
import DocumentManagement from './DocumentManagement';

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <DocumentManagement />
    </Suspense>
  );
}