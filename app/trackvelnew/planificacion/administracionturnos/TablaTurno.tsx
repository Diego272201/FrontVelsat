'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  Selection,
  SortDescriptor,
  Select,
  SelectItem,
  Tooltip,
} from '@nextui-org/react';

import { ChevronDownIcon } from './ChevronDownIcon';
import { SearchIcon } from './SearchIcon';
import { capitalize } from './utils';
import ModalTurnos from './ModalTurnos';
import ModalTurnoEdit from './ModalTurnoEdit';
import Swal from 'sweetalert2';
import { MdDelete } from 'react-icons/md';
import { useUsername } from '@/hooks/useUsername';

const columns = [
  { name: 'N°', uid: 'n', sortable: true },
  { name: 'EMPRESA', uid: 'empresa', sortable: true },
  { name: 'ÁREA', uid: 'area', sortable: true },
  { name: 'SUB ÁREA', uid: 'subarea', sortable: true },
  { name: 'ROL', uid: 'rol' },
  { name: 'HORA', uid: 'hora' },
  { name: 'PRO', uid: 'programacion', sortable: true },
  { name: 'OPERACIONES', uid: 'operaciones' },
];

interface User {
  id: number;
  codigo: string;
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

  const [filterValue, setFilterValue] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [visibleColumns, setVisibleColumns] = useState<Selection>( new Set(columns.map((c) => c.uid)),);
  const [areaFilter, setAreaFilter] = useState<Selection>(new Set(['all']));
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({column: 'n',direction: 'ascending',});
  const [page, setPage] = useState(1);
  const [uniqueEmpresas, setUniqueEmpresas] = useState<string[]>([]);

  useEffect(() => {
    const calculateRowsPerPage = () => {
      const totalHeight = window.innerHeight;
      const availableHeight = totalHeight - 90;
      const rowHeight = 40;
      const calculatedRows = Math.max(
        Math.floor(availableHeight / rowHeight),
        5,
      );
      setRowsPerPage(calculatedRows);
    };

    calculateRowsPerPage();
    window.addEventListener('resize', calculateRowsPerPage);

    return () => window.removeEventListener('resize', calculateRowsPerPage);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    axios
      .get(`https://velsat.pe:2096/api/Turnos/empresa/${username}`)
      .then((response) => {
        setUniqueEmpresas(response.data);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
      });
  }, [username, isReady]);

  const pages = Math.ceil(users.length / rowsPerPage);

  const hasSearchFilter = Boolean(filterValue);

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === 'all') return columns;
    return columns.filter((column) =>
      Array.from(visibleColumns).includes(column.uid),
    );
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    let filteredUsers = [...users];

    if (hasSearchFilter) {
      filteredUsers = filteredUsers.filter((user) =>
        user.rol.toLowerCase().includes(filterValue.toLowerCase()),
      );
    }
    const selectedAreas = Array.from(areaFilter);

    if (!selectedAreas.includes('all') && selectedAreas.length > 0) {
      filteredUsers = filteredUsers.filter((user) =>
        selectedAreas.includes(user.empresa),
      );
    }

    return filteredUsers;
  }, [users, filterValue, areaFilter]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const items = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return filteredItems.slice(start, end);
  }, [page, filteredItems, rowsPerPage]);

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a: any, b: any) => {
      const first = a[sortDescriptor.column as keyof (typeof users)[0]] as
        | number
        | string;
      const second = b[sortDescriptor.column as keyof (typeof users)[0]] as
        | number
        | string;
      const cmp = first < second ? -1 : first > second ? 1 : 0;

      return sortDescriptor.direction === 'descending' ? -cmp : cmp;
    });
  }, [sortDescriptor, items]);

  const handleDelete = async (codigo: number) => {
    try {
      await axios.delete(`https://velsat.pe:2096/api/Turnos/${codigo}`);
      onSaveSuccess();
      console.log('Elimnado ...');
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

  const renderCell = React.useCallback((user: any, columnKey: React.Key) => {
    const cellValue = user[columnKey as keyof typeof user];
    switch (columnKey) {
      case 'rol':
        return (
          <div className="flex flex-col">
            <p className="text-bold rowTable text-small capitalize">
              {cellValue}
            </p>
          </div>
        );
      case 'operaciones':
        return (
          <div className="relative flex items-center gap-3 justify-center">
            <ModalTurnoEdit
              user={user}
              titleM={title}
              onEditSuccess={onEditSuccess}
            />

            <div className="relative inline-block h-6 w-7">
              <div className="group relative h-full w-full">
                <button
                  onClick={() => confirmDelete(user.codigo)}
                  type="button"
                  className="flex h-full w-full items-center justify-center rounded-lg bg-red-100 hover:bg-red-200 focus:outline-none"
                >
                  <MdDelete size={16} className="text-red-700" />
                </button>

                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-md bg-red-800 px-3 py-1.5 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  Eliminar turno
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return cellValue;
    }
  }, []);

  const onSearchChange = React.useCallback((value?: string) => {
    if (value) {
      setFilterValue(value);
      setPage(1);
    } else {
      setFilterValue('');
    }
  }, []);

  const onAreaFilterChange = (selected: Selection) => {
    if (selected instanceof Set) {
      setAreaFilter(new Set(selected));
    } else if (typeof selected === 'string') {
      setAreaFilter(new Set([selected]));
    }
    setPage(1);
  };

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4 ">
        <h2 className="tituloTunos">TURNOS DE {title}</h2>
        <div className="flex items-end justify-between gap-3 px-1">
          <Input
            isClearable
            classNames={{
              base: 'w-full sm:max-w-[44%] bg-[#fff] rounded-[10px]',
              inputWrapper: 'border-1',
            }}
            placeholder="Buscar por Rol"
            size="sm"
            startContent={
              <SearchIcon className="colorIcono text-default-300" />
            }
            value={filterValue}
            variant="bordered"
            onClear={() => setFilterValue('')}
            onValueChange={onSearchChange}
          />

          <Select
            style={{ background: '#fff' }}
            label=""
            placeholder="Filtrar por Empresa"
            labelPlacement="outside"
            size="sm"
            className="max-w-xs"
            disableSelectorIconRotation
            onSelectionChange={onAreaFilterChange}
          >
            {uniqueEmpresas.map((empresa) => (
              <SelectItem key={empresa}>{empresa}</SelectItem>
            ))}
          </Select>
          <div className="flex gap-3">
            <Dropdown>
              <DropdownTrigger className="hidden sm:flex">
                <Button
                  style={{ background: '#1C5ED8', color: 'white' }}
                  endContent={<ChevronDownIcon className="text-small" />}
                  size="sm"
                  variant="flat"
                >
                  Columnas
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection
                aria-label="Table Columns"
                closeOnSelect={false}
                selectedKeys={visibleColumns}
                selectionMode="multiple"
                onSelectionChange={setVisibleColumns}
              >
                {columns.map((column) => (
                  <DropdownItem key={column.uid} className="capitalize">
                    {capitalize(column.name)}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
            <ModalTurnos
              titleM={title}
              onSaveSuccess={onSaveSuccess}
            ></ModalTurnos>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="totalItems text-small text-default-400">
            Total : {users.length} items
          </span>
        </div>
      </div>
    );
  }, [
    filterValue,
    visibleColumns,
    onSearchChange,
    users.length,
    hasSearchFilter,
  ]);

  const bottomContent = React.useMemo(() => {
    const maxVisiblePages = 6;
    const startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pages, startPage + maxVisiblePages - 1);

    return (
      <div className="flex items-center px-2 py-1 bg-gray-100 rounded">
        <div className="flex items-center gap-2">
          {page > 1 && (
            <button
              onClick={() => handlePageChange(page - 1)}
              className="rounded-lg border border-blue-500 bg-white px-4 py-2 text-[12px] text-blue-500 hover:bg-blue-100"
            >
              Anterior
            </button>
          )}

          {Array.from({ length: endPage - startPage + 1 }, (_, index) => {
            const pageNumber = startPage + index;
            return (
              <button
                key={pageNumber}
                onClick={() => handlePageChange(pageNumber)}
                className={`rounded-lg px-3 py-2 text-[12px] 
                  ${
                    page === pageNumber
                      ? 'bg-blue-500 text-white'
                      : 'border border-blue-500 bg-white text-blue-500 hover:bg-blue-100'
                  }
                `}
              >
                {pageNumber}
              </button>
            );
          })}

          {page < pages && (
            <button
              onClick={() => handlePageChange(page + 1)}
              className="rounded-lg border border-blue-500 bg-white px-2 py-2 text-[12px] text-blue-500 hover:bg-blue-100"
            >
              Siguiente
            </button>
          )}

          <span className="ml-4 text-sm text-blue-500">
            {page}/{pages}
          </span>
        </div>
      </div>
    );
  }, [page, pages, users.length]);

  const classNames = React.useMemo(
    () => ({
      wrapper: ['max-h-[382px]', 'max-w-3xl'],
      th: ['bg-transparent', 'text-default-500', 'border-b', 'border-divider'],
      td: [
        'group-data-[first=true]:first:before:rounded-none',
        'group-data-[first=true]:last:before:rounded-none',
        'group-data-[middle=true]:before:rounded-none',

        'group-data-[last=true]:first:before:rounded-none',
        'group-data-[last=true]:last:before:rounded-none',
      ],
    }),
    [],
  );

  return (
    <Table
      className="tableScrooll"
      isCompact
      removeWrapper
      aria-label="Example table with custom cells, pagination and sorting"
      bottomContent={bottomContent}
      bottomContentPlacement="outside"
      classNames={classNames}
      sortDescriptor={sortDescriptor}
      topContent={topContent}
      topContentPlacement="outside"
      onSelectionChange={setSelectedKeys}
      onSortChange={setSortDescriptor}
      
    >
      <TableHeader columns={headerColumns}>
        {(column) => (
          <TableColumn
            className="headTabla"
            key={column.uid}
            allowsSorting={column.sortable}
          >
            {column.name}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody emptyContent={'No items found'} items={sortedItems}>
        {(item) => (
          <TableRow key={item.id} className="bg-gray-50">
            {(columnKey) => (
              <TableCell className="rowTable">
                {renderCell(item, columnKey)}
              </TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
