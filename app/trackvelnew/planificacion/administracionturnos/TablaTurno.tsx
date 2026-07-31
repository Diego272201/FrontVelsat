import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import { Input, Select, SelectItem } from '@nextui-org/react';
import { SearchIcon } from './SearchIcon';
import ModalTurnos from './ModalTurnos';
import ModalTurnoEdit from './ModalTurnoEdit';
import Swal from 'sweetalert2';
import { MdDelete } from 'react-icons/md';
import { useUsername } from '@/hooks/useUsername';

const columns = [
  { name: 'N°', uid: 'n' },
  { name: 'EMPRESA', uid: 'empresa' },
  { name: 'ÁREA', uid: 'area' },
  { name: 'SUB ÁREA', uid: 'subarea' },
  { name: 'ROL', uid: 'rol' },
  { name: 'HORA', uid: 'hora' },
  { name: 'PRO', uid: 'programacion' },
  { name: 'OPERACIONES', uid: 'operaciones' },
];

interface User {
  id: number;
  codigo: string;
  n: number;
  empresa: string;
  area: string;
  subarea: string;
  rol: string;
  hora: string;
  programacion: string;
}

interface TablaTurnoProps {
  users: User[];
  title: string;
  onSaveSuccess: () => void;
  onEditSuccess: () => void;
}

export default function App({
  users,
  title,
  onSaveSuccess,
  onEditSuccess,
}: TablaTurnoProps) {
  const { username, isReady } = useUsername();
  const containerRef = useRef<HTMLDivElement>(null);
  const [filterValue, setFilterValue] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [page, setPage] = useState(1);
  const [uniqueEmpresas, setUniqueEmpresas] = useState<string[]>([]);

  useEffect(() => {
    const calculateRowsPerPage = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const remainingHeight = window.innerHeight - rect.top - 185;
      const rowHeight = 32;
      const calculatedRows = Math.max(
        Math.floor(remainingHeight / rowHeight),
        5,
      );
      setRowsPerPage(calculatedRows);
    };

    calculateRowsPerPage();
    window.addEventListener('resize', calculateRowsPerPage);

    return () => {
      window.removeEventListener('resize', calculateRowsPerPage);
    };
  }, []);

  useEffect(() => {
    if (!isReady || !username) return;

    axios
      .get(`https://do.velsat.pe:2083/api/Turnos/empresa/${username}`)
      .then((response) => {
        setUniqueEmpresas(response.data);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
      });
  }, [username, isReady, users]);

  const filteredItems = useMemo(() => {
    let filteredUsers = [...users];

    if (filterValue) {
      filteredUsers = filteredUsers.filter((user) =>
        user.rol.toLowerCase().includes(filterValue.toLowerCase()),
      );
    }

    if (areaFilter !== 'all' && areaFilter) {
      filteredUsers = filteredUsers.filter((user) => user.empresa === areaFilter);
    }

    return filteredUsers;
  }, [users, filterValue, areaFilter]);

  const pages = Math.ceil(filteredItems.length / rowsPerPage) || 1;

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredItems.slice(start, end);
  }, [page, filteredItems, rowsPerPage]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleDelete = async (codigo: number) => {
    try {
      await axios.delete(`https://do.velsat.pe:2083/api/Turnos/${codigo}`);
      onSaveSuccess();
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const confirmDelete = (codigo: number) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'No podrás revertir esto',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        handleDelete(codigo);
      }
    });
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full overflow-hidden bg-white">
      <div className="flex flex-col bg-white border-b border-slate-200 w-full flex-shrink-0">
        <div className="flex items-center justify-between bg-[#113eb9] px-3 py-1.5 text-white">
          <h2 className="text-xs font-bold uppercase tracking-wider">TURNOS DE {title}</h2>
          <span className="rounded bg-blue-900/60 px-2 py-0.5 text-[10px] font-semibold text-blue-100 border border-blue-400/30">
            Total: {filteredItems.length}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Input
              isClearable
              classNames={{
                base: 'w-[160px] sm:w-[170px]',
                inputWrapper: 'h-8 min-h-[32px] border border-slate-300 bg-white rounded-md text-xs px-2 shadow-none hover:border-slate-400 focus-within:border-blue-500',
                input: 'text-xs text-slate-800 placeholder:text-slate-400',
              }}
              placeholder="Buscar por Rol"
              size="sm"
              startContent={
                <SearchIcon className="text-slate-400 text-xs flex-shrink-0 mr-1" />
              }
              value={filterValue}
              variant="bordered"
              onClear={() => { setFilterValue(''); setPage(1); }}
              onValueChange={(val) => { setFilterValue(val); setPage(1); }}
            />

            <Select
              aria-label="Filtrar por Empresa"
              placeholder="Empresa"
              size="sm"
              className="w-[150px] sm:w-[160px]"
              classNames={{
                trigger: 'h-8 min-h-[32px] border border-slate-300 bg-white rounded-md text-xs px-2 shadow-none hover:border-slate-400 focus-within:border-blue-500',
                value: 'text-xs text-slate-800',
              }}
              disableSelectorIconRotation
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0]?.toString() || 'all';
                setAreaFilter(selected);
                setPage(1);
              }}
            >
              {uniqueEmpresas.map((empresa) => (
                <SelectItem key={empresa} className="text-xs">{empresa}</SelectItem>
              ))}
            </Select>
          </div>
          <ModalTurnos
            titleM={title}
            onSaveSuccess={onSaveSuccess}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden w-full">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-200 text-slate-700 text-[11px] font-semibold uppercase border-b border-slate-300">
            <tr>
              {columns.map((col) => (
                <th key={col.uid} className="px-3 py-1.5 border-r border-slate-300 last:border-r-0 whitespace-nowrap">
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">
                  No se encontraron registros
                </td>
              </tr>
            ) : (
              items.map((row, index) => (
                <tr
                  key={row.id || index}
                  className={`${
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                  } hover:bg-blue-50 transition-colors h-[32px]`}
                >
                  <td className="px-3 py-1 text-[11px] font-medium text-slate-900 border-r border-slate-100">
                    {row.n}
                  </td>
                  <td className="px-3 py-1 text-[11px] text-slate-700 border-r border-slate-100 whitespace-nowrap">
                    {row.empresa}
                  </td>
                  <td className="px-3 py-1 text-[11px] text-slate-700 border-r border-slate-100 whitespace-nowrap">
                    {row.area}
                  </td>
                  <td className="px-3 py-1 text-[11px] text-slate-700 border-r border-slate-100 whitespace-nowrap">
                    {row.subarea}
                  </td>
                  <td className="px-3 py-1 text-[11px] font-medium text-slate-900 border-r border-slate-100 capitalize">
                    {row.rol}
                  </td>
                  <td className="px-3 py-1 text-[11px] font-mono text-slate-700 border-r border-slate-100">
                    {row.hora}
                  </td>
                  <td className="px-3 py-1 text-[11px] text-slate-700 border-r border-slate-100 whitespace-nowrap">
                    {row.programacion}
                  </td>
                  <td className="px-3 py-1 text-[11px]">
                    <div className="flex items-center justify-center gap-2">
                      <ModalTurnoEdit
                        user={row}
                        titleM={title}
                        onEditSuccess={onEditSuccess}
                      />

                      <div className="relative h-6 w-6">
                        <div className="group relative h-full w-full">
                          <button
                            onClick={() => confirmDelete(parseInt(row.codigo))}
                            type="button"
                            className="flex h-full w-full items-center justify-center rounded bg-red-100 text-red-700 hover:bg-red-200 focus:outline-none transition-colors"
                          >
                            <MdDelete size={15} />
                          </button>

                          <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max -translate-x-1/2 rounded bg-red-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 shadow-md">
                            Eliminar turno
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 border-t border-slate-200 text-xs flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {page > 1 && (
            <button
              onClick={() => handlePageChange(page - 1)}
              className="rounded border border-blue-500 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Anterior
            </button>
          )}

          {Array.from({ length: pages }, (_, index) => {
            const pageNumber = index + 1;
            if (
              pageNumber === 1 ||
              pageNumber === pages ||
              Math.abs(pageNumber - page) <= 2
            ) {
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    page === pageNumber
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            }
            if (pageNumber === page - 3 || pageNumber === page + 3) {
              return <span key={`dot-${pageNumber}`} className="text-slate-400 text-xs px-1">...</span>;
            }
            return null;
          })}

          {page < pages && (
            <button
              onClick={() => handlePageChange(page + 1)}
              className="rounded border border-blue-500 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Siguiente
            </button>
          )}
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          Página {page} de {pages}
        </span>
      </div>
    </div>
  );
}
