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
import { BiSolidError } from "react-icons/bi";
import '@/app/styles/table.css';
import useCalculateRowsPerPage from '@/app/components/table/useCalculateRowsPerPage';

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

  useEffect(() => {
    const storedErrors = localStorage.getItem('erroresReporte');
    if (storedErrors) {
      setErrores(JSON.parse(storedErrors));
    }
  }, []);

  useEffect(() => {
    setPage(1);
  }, [errores]);

  const rowsPerPage = useCalculateRowsPerPage(40, 5, 180);

  const pages = Math.ceil((errores?.length || 0) / rowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return errores.slice(start, end);
  }, [page, errores]);

  return (
    <div className='px-5'>
      <div className="mb-4 text-center">
        <h1 className="flex items-center justify-center gap-3   text-[15px] font-bold text-[#212529]">
          <BiSolidError  className="text-red-700" size={28} />
          REPORTE DE ERRORES EN CARGA DE ARCHIVOS
        </h1>
      </div>

      {errores.length > 0 ? (
        <Table
          aria-label="Tabla de errores en la carga de archivos"

          classNames={{ wrapper: 'min-h-[222px] rounded-none' }}
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
            <TableColumn className="headerColumT text-sm rounded-none">Item</TableColumn>
            <TableColumn className="headerColumT text-sm rounded-none">
              Código Oracle
            </TableColumn>
            <TableColumn className="headerColumT text-sm rounded-none">Nombre</TableColumn>
            <TableColumn className="headerColumT text-sm rounded-none">Subárea</TableColumn>
            <TableColumn className="headerColumT text-sm rounded-none">Rol</TableColumn>
            <TableColumn className="headerColumT text-sm rounded-none">Motivo</TableColumn>
            <TableColumn className="headerColumT text-sm rounded-none">Archivo</TableColumn>
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
