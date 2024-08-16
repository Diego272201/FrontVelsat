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
  Chip,
  Pagination,
  Selection,
  ChipProps,
  SortDescriptor,
  Select,
  SelectItem,
  Tooltip,
} from '@nextui-org/react';
import { PlusIcon } from './PlusIcon';
import { VerticalDotsIcon } from './VerticalDotsIcon';
import { ChevronDownIcon } from './ChevronDownIcon';
import { SearchIcon } from './SearchIcon';
import { capitalize } from './utils';
import ModalTurnos from './ModalTurnos';
import { animals } from './data';
import { EyeIcon } from '@/app/components/table/operaciones/EyeIcon';
import { EditIcon } from '@/app/components/table/operaciones/EditIcon';
import { DeleteIcon } from '@/app/components/table/operaciones/DeleteIcon';
import { GrView } from 'react-icons/gr';

const columns = [
  { name: 'N°', uid: 'n', sortable: true },
  { name: 'EMPRESA', uid: 'empresa', sortable: true },
  { name: 'ÁREA', uid: 'area', sortable: true },
  { name: 'SUB ÁREA', uid: 'subarea', sortable: true },
  { name: 'ROL', uid: 'rol' }, // Mapeado desde "codrl"
  { name: 'HORA', uid: 'hora' },
  { name: 'PROGRAMACIÓN', uid: 'programacion', sortable: true },
  { name: 'OPERACIONES', uid: 'operaciones' },
];

export default function App() {
  const [filterValue, setFilterValue] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [visibleColumns, setVisibleColumns] = useState<Selection>(
    new Set(columns.map((c) => c.uid)),
  );
  const [areaFilter, setAreaFilter] = useState<Selection>(new Set(['all']));
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'n',
    direction: 'ascending',
  });
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<any[]>([]);
  const [uniqueAreas, setUniqueAreas] = useState<string[]>([]);

  useEffect(() => {
    // Realizando ambas solicitudes a las APIs
    axios
      .all([
        axios.get('http://66.240.210.125:8586/api/Turnos/movilbus'),
        axios.get('http://66.240.210.125:8586/api/Turnos/area/movilbus'),
      ])
      .then(
        axios.spread((turnosResponse, areasResponse) => {
          // Procesando datos de la primera API (Turnos)
          const data = turnosResponse.data.map((item: any, index: number) => ({
            id: index + 1,
            n: index + 1,
            empresa: item.empresa,
            area: item.area,
            subarea: item.subarea,
            rol: item.codrl, // Mapeo de "codrl" a "rol"
            hora: item.hora,
            programacion: item.programa,
          }));
          setUsers(data);

          // Procesando datos de la segunda API (Áreas)
          setUniqueAreas(areasResponse.data);
        }),
      )
      .catch((error) => {
        console.error('Error fetching data:', error);
      });
  }, []);

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
        user.empresa.toLowerCase().includes(filterValue.toLowerCase()),
      );
    }
    const selectedAreas = Array.from(areaFilter);

    if (!selectedAreas.includes('all') && selectedAreas.length > 0) {
      filteredUsers = filteredUsers.filter((user) =>
        selectedAreas.includes(user.area),
      );
    }

    return filteredUsers;
  }, [users, filterValue, areaFilter]);

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

  const renderCell = React.useCallback((user: any, columnKey: React.Key) => {
    const cellValue = user[columnKey as keyof typeof user];
    switch (columnKey) {
      case 'rol':
        return (
          <div className="flex flex-col">
            <p className="text-bold text-small capitalize rowTable">{cellValue}</p>
          </div>
        );
      case 'operaciones':
        return (
          <div className="relative flex items-center gap-3">
            <Tooltip color="primary" content="Editar Turno">
              <span className="cursor-pointer text-sm text-[#0d47a1] active:opacity-50">
                <Button isIconOnly variant="light" color="primary" size="sm" className='btnEdit'>
                  <EditIcon />
                </Button>
              </span>
            </Tooltip>
            <Tooltip color="danger" content="Eliminar Turno">
              <span className="cursor-pointer text-sm text-danger active:opacity-50">
              <Button isIconOnly variant="light" color="danger" size="sm" className='btnDelete'>

                <DeleteIcon />
                </Button>

              </span>
            </Tooltip>
          </div>
        );
      default:
        return cellValue;
    }
  }, []);

  const onRowsPerPageChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setRowsPerPage(Number(e.target.value));
      setPage(1);
    },
    [],
  );

  const onSearchChange = React.useCallback((value?: string) => {
    if (value) {
      setFilterValue(value);
      setPage(1);
    } else {
      setFilterValue('');
    }
  }, []);

  const onAreaFilterChange = (selected: Selection) => {
    console.log('Selected:', selected);
    if (selected instanceof Set) {
      setAreaFilter(new Set(selected));
    } else if (typeof selected === 'string') {
      setAreaFilter(new Set([selected]));
    }
    setPage(1);
  };

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <Input
            isClearable
            classNames={{
              base: 'w-full sm:max-w-[44%] bg-[#dddedf] rounded-[10px]',
              inputWrapper: 'border-1',
            }}
            placeholder="Buscar por empresa"
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
            style={{ background: '#dddedf' }}
            label=""
            placeholder="Filtrar por Área"
            labelPlacement="outside"
            size="sm"
            className="max-w-xs"
            disableSelectorIconRotation
            onSelectionChange={onAreaFilterChange}
          >
            {uniqueAreas.map((area) => (
              <SelectItem key={area}>{area}</SelectItem>
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
            <ModalTurnos></ModalTurnos>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-small text-default-400 totalItems">
            Total {users.length} items
          </span>
          <label className="flex items-center text-small text-default-400 totalItems">
            Filas por página :
            <select
              className="bg-transparent text-small text-default-400 outline-none totalItems"
              onChange={onRowsPerPageChange}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
            </select>
          </label>
        </div>
      </div>
    );
  }, [
    filterValue,
    visibleColumns,
    onSearchChange,
    onRowsPerPageChange,
    users.length,
    hasSearchFilter,
  ]);

  const bottomContent = React.useMemo(() => {
    return (
      <div className="flex items-center justify-between px-2 py-2">
        <Pagination
          showControls
          classNames={{
            cursor: 'bg-[#FF6300] text-background',
          }}
          color="default"
          isDisabled={hasSearchFilter}
          page={page}
          total={pages}
          variant="light"
          onChange={setPage}
        />
        <span className="text-small text-default-400 totalItems">
          {selectedKeys === 'all'
            ? 'All items selected'
            : `${selectedKeys.size} of ${items.length} selected`}
        </span>
      </div>
    );
  }, [selectedKeys, items.length, page, pages, hasSearchFilter]);

  const classNames = React.useMemo(
    () => ({
      wrapper: ['max-h-[382px]', 'max-w-3xl'],
      th: ['bg-transparent', 'text-default-500', 'border-b', 'border-divider'],
      td: [
        // changing the rows border radius
        // first
        'group-data-[first=true]:first:before:rounded-none',
        'group-data-[first=true]:last:before:rounded-none',
        // middle
        'group-data-[middle=true]:before:rounded-none',
        // last
        'group-data-[last=true]:first:before:rounded-none',
        'group-data-[last=true]:last:before:rounded-none',
      ],
    }),
    [],
  );

  return (
    <Table
      isCompact
      removeWrapper
      aria-label="Example table with custom cells, pagination and sorting"
      bottomContent={bottomContent}
      bottomContentPlacement="outside"
      checkboxesProps={{
        classNames: {
          wrapper: 'after:bg-[#FF6300] after:text-background text-background checkB',
        },
      }}
      classNames={classNames}
      selectedKeys={selectedKeys}
      selectionMode="multiple"
      sortDescriptor={sortDescriptor}
      topContent={topContent}
      topContentPlacement="outside"
      // visibleColumns={visibleColumns}
      onSelectionChange={setSelectedKeys}
      onSortChange={setSortDescriptor}
    >
      <TableHeader columns={headerColumns} >
        {(column) => (
          <TableColumn className='headTabla' key={column.uid} allowsSorting={column.sortable}>
            {column.name}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody emptyContent={'No items found'} items={sortedItems}>
        {(item) => (
          <TableRow key={item.id} >
            {(columnKey) => (
              <TableCell className='rowTable'>{renderCell(item, columnKey)}</TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
