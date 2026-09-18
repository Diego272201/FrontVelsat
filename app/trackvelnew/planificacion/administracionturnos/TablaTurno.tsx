import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import { Search, ChevronDown, Trash2 } from 'lucide-react';
import ModalTurnos from './ModalTurnos';
import ModalTurnoEdit from './ModalTurnoEdit';
import Swal from 'sweetalert2';
import { useUsername } from '@/hooks/useUsername';

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

export default function TablaTurno({
  users,
  title,
  onSaveSuccess,
  onEditSuccess,
}: TablaTurnoProps) {
  const { username, isReady } = useUsername();
  const containerRef = useRef<HTMLDivElement>(null);
  const [filterValue, setFilterValue] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [rowsPerPage, setRowsPerPage] = useState(26);
  const [page, setPage] = useState(1);
  const [uniqueEmpresas, setUniqueEmpresas] = useState<string[]>([]);

  useEffect(() => {
    const calculateRowsPerPage = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const remainingHeight = window.innerHeight - rect.top - 150;
      const rowHeight = 30;
      const calculatedRows = Math.max(
        Math.floor(remainingHeight / rowHeight),
        10,
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
      .catch(() => {});
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
    } catch {}
  };

  const confirmDelete = (codigo: number) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'No podrás revertir esto',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#113EB9',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        handleDelete(codigo);
      }
    });
  };

  const renderProgramacionBadge = (prog: string) => {
    const p = (prog || '').toLowerCase();
    if (p.includes('actual') || p === '1') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Actual
        </span>
      );
    }
    if (p.includes('futura') || p === '2') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Futura
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Pasada
      </span>
    );
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full overflow-hidden bg-white">
      <div className="flex flex-col bg-white border-b border-slate-200 w-full flex-shrink-0">
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
          <h2 className="text-[13px] font-bold text-slate-800 tracking-tight">
            Turnos de {title.toLowerCase()}
          </h2>
          <span className="rounded-full border border-blue-200 bg-blue-50/80 px-2 py-0.5 text-[10px] font-bold text-[#113EB9]">
            {items.length} / {filteredItems.length}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="relative w-[170px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por rol"
                value={filterValue}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                  setPage(1);
                }}
                className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#113EB9] focus:outline-none transition-colors"
              />
            </div>

            <div className="relative">
              <select
                value={areaFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setAreaFilter(val);
                  setPage(1);
                }}
                className="h-8 appearance-none rounded-md border border-slate-300 bg-white pl-2.5 pr-7 text-xs text-slate-700 focus:border-[#113EB9] focus:outline-none cursor-pointer transition-colors"
              >
                <option value="all">Empresa: todas</option>
                {uniqueEmpresas.map((empresa) => (
                  <option key={empresa} value={empresa}>
                    Empresa: {empresa}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          <ModalTurnos
            titleM={title}
            onSaveSuccess={onSaveSuccess}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden w-full">
        <table className="w-full table-fixed border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-gray-200 text-gray-700">
            <tr className="h-[28px] border-b border-gray-300">
              <th className="w-[4%] px-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-700 border-r border-gray-300">
                N°
              </th>
              <th className="w-[19%] px-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-700 border-r border-gray-300">
                EMPRESA
              </th>
              <th className="w-[18%] px-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-700 border-r border-gray-300">
                ÁREA
              </th>
              <th className="w-[13%] px-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-700 border-r border-gray-300">
                SUB ÁREA
              </th>
              <th className="w-[13%] px-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-700 border-r border-gray-300">
                ROL
              </th>
              <th className="w-[10%] px-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-700 border-r border-gray-300">
                HORA
              </th>
              <th className="w-[13%] px-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-700 border-r border-gray-300">
                PRO
              </th>
              <th className="w-[10%] px-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-700">
                
              </th>
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
                  className="even:bg-slate-50/40 hover:bg-blue-50/60 transition-colors h-[30px]"
                >
                  <td className="px-1 py-0.5 text-center text-[11px] font-mono text-slate-400 border-r border-slate-100">
                    {row.n}
                  </td>
                  <td
                    className="px-2.5 py-0.5 text-[11px] font-bold text-slate-800 border-r border-slate-100 truncate whitespace-nowrap"
                    title={row.empresa}
                  >
                    {row.empresa}
                  </td>
                  <td
                    className="px-2.5 py-0.5 text-[11px] font-medium text-slate-400 border-r border-slate-100 truncate whitespace-nowrap"
                    title={row.area}
                  >
                    {row.area}
                  </td>
                  <td
                    className="px-1 py-0.5 text-center text-[11px] font-bold text-slate-800 border-r border-slate-100 truncate whitespace-nowrap uppercase"
                    title={row.subarea}
                  >
                    {row.subarea}
                  </td>
                  <td
                    className="px-1 py-0.5 text-center text-[11px] font-bold text-slate-800 border-r border-slate-100 truncate whitespace-nowrap uppercase"
                    title={row.rol}
                  >
                    {row.rol}
                  </td>
                  <td className="px-1 py-0.5 text-center text-[11px] font-mono font-medium text-slate-700 border-r border-slate-100 whitespace-nowrap">
                    {row.hora}
                  </td>
                  <td className="px-1 py-0.5 text-center border-r border-slate-100 whitespace-nowrap">
                    {renderProgramacionBadge(row.programacion)}
                  </td>
                  <td className="px-1 py-0.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
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
                            className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-400 hover:border-red-400 hover:bg-red-50 hover:text-red-600 focus:outline-none transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>

                          <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
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

      <div className="flex items-center justify-between bg-white px-3 py-1.5 border-t border-slate-200 text-xs flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {page > 1 && (
            <button
              onClick={() => handlePageChange(page - 1)}
              className="rounded border border-[#113EB9] bg-white px-2.5 py-1 text-[11px] font-medium text-[#113EB9] hover:bg-blue-50 transition-colors"
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
                      ? 'bg-[#113EB9] text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            }
            if (pageNumber === page - 3 || pageNumber === page + 3) {
              return (
                <span key={`dot-${pageNumber}`} className="text-slate-400 text-xs px-1">
                  ...
                </span>
              );
            }
            return null;
          })}

          {page < pages && (
            <button
              onClick={() => handlePageChange(page + 1)}
              className="rounded border border-[#113EB9] bg-white px-2.5 py-1 text-[11px] font-medium text-[#113EB9] hover:bg-blue-50 transition-colors"
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
