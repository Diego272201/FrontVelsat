'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
} from '@nextui-org/react';
import { TbReportSearch } from 'react-icons/tb';
import '@/app/styles/table.css';

interface ErrorReporte {
  item: number;
  codigoOracle: string;
  nombre: string;
  subarea: string;
  rol: string;
  motivo: string;
  archivo: string;
}

export default function ReporteErrores() {
  const [errores, setErrores] = useState<ErrorReporte[]>([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  useEffect(() => {
    const storedErrors = localStorage.getItem('erroresReporte');
    if (storedErrors) {
      setErrores(JSON.parse(storedErrors));
    }
  }, []);

  useEffect(() => {
    setPage(1);
  }, [errores]);

  useEffect(() => {
    const calcularFilas = () => {
      const alturaDisponible = window.innerHeight - 200;
      const alturaFila = 40;
      setRowsPerPage(Math.floor(alturaDisponible / alturaFila));
    };

    calcularFilas();
    window.addEventListener('resize', calcularFilas);

    return () => {
      window.removeEventListener('resize', calcularFilas);
    };
  }, []);

  const pages = Math.ceil((errores?.length || 0) / rowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return errores.slice(start, end);
  }, [page, errores]);

  return (
    <div style={{ padding: '20px' }}>
      {/* ENCABEZADO MEJORADO */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            paddingBottom: '5px',
            borderBottom: '2px solid',
            borderImage: 'linear-gradient(to right, #ff4d4d, #b71c1c)',
            borderImageSlice: 1,
            color:'#0d1b2a'
          }}
        >
          <TbReportSearch size={28} style={{ color: '#b71c1c' }} />
          REPORTE DE ERRORES EN CARGA DE ARCHIVOS
        </h1>
      </div>

      {errores.length > 0 ? (
        <Table
          aria-label="Tabla de errores en la carga de archivos"
          classNames={{ wrapper: 'min-h-[222px]' }}
          bottomContent={
            <div className="mt-4 flex w-full justify-center">
              <Pagination
                isCompact
                showControls
                color="danger"
                page={page}
                total={pages}
                onChange={(page) => setPage(page)}
              />
            </div>
          }
        >
          <TableHeader>
            <TableColumn className="headerColumT text-sm">Item</TableColumn>
            <TableColumn className="headerColumT text-sm">
              Código Oracle
            </TableColumn>
            <TableColumn className="headerColumT text-sm">Nombre</TableColumn>
            <TableColumn className="headerColumT text-sm">Subárea</TableColumn>
            <TableColumn className="headerColumT text-sm">Rol</TableColumn>
            <TableColumn className="headerColumT text-sm">Motivo</TableColumn>
            <TableColumn className="headerColumT text-sm">Archivo</TableColumn>
          </TableHeader>
          <TableBody items={items}>
            {(error) => (
              <TableRow key={error.item}>
                <TableCell className="centerCell">{error.item}</TableCell>
                <TableCell className="centerCell">
                  {error.codigoOracle}
                </TableCell>
                <TableCell className="centerCell">{error.nombre}</TableCell>
                <TableCell className="centerCell">{error.subarea}</TableCell>
                <TableCell className="centerCell">
                  {error.rol || 'N/A'}
                </TableCell>
                <TableCell className="centerCell">{error.motivo}</TableCell>
                <TableCell className="centerCell">{error.archivo}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      ) : (
        <p
          style={{
            textAlign: 'center',
            fontSize: '16px',
            color: '#555',
            marginTop: '20px',
          }}
        >
          No hay errores registrados.
        </p>
      )}
    </div>
  );
}
