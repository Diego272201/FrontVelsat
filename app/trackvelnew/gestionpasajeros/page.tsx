'use client';
import React, { useEffect, useMemo, useState } from 'react';
import '@/app/styles/pasajeros.css';
import { AiFillPlayCircle } from 'react-icons/ai';
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Input,
  Tooltip,
} from '@nextui-org/react';
import { EyeIcon } from '@/app/components/table/operaciones/EyeIcon';
import { EditIcon } from '@/app/components/table/operaciones/EditIcon';
import { DeleteIcon } from '@/app/components/table/operaciones/DeleteIcon';
import { IoIosAddCircle } from 'react-icons/io';
import ModalPasajeros from './ModalPasajeros';
import { BiEditAlt } from 'react-icons/bi';
import axios from 'axios';
import { debounce } from 'lodash';
import ModalPasajerosEdit from './ModalPasajerosEdit';

interface Pasajero {
  codcliente: number;
  apellidos: string;
}



export default function Page() {
  const [pasajeros, setPasajeros] = useState<
    { value: number; label: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCodCliente, setSelectedCodCliente] = useState<number | null>(null); 


  useEffect(() => {
    const fetchPasajeros = async () => {
      try {
        setLoading(true);
        const response = await axios.get<Pasajero[]>(
          'http://66.240.210.125:8586/api/Pasajero',
        );
        const data = response.data.map((pasajero) => ({
          value: pasajero.codcliente,
          label: pasajero.apellidos,
        }));
        setPasajeros(data);
        setLoading(false);
      } catch (error) {
        console.error('Error al obtener los pasajeros:', error);
        setLoading(false);
      }
    };

    fetchPasajeros();
  }, []);


  const filteredPasajeros = useMemo(() => {
    if (query.length < 6) return [];
    return pasajeros.filter((pasajero) =>
      pasajero.label?.toLowerCase().includes(query.toLowerCase() || ''),
    );
  }, [pasajeros, query]);

  const handleSearchChange = debounce((value: string) => {
    setQuery(value);
  }, 300);


  const handleSelectionChange = (key: React.Key) => {
    const selectedValue = Number(key); // Convertir el key a número
    const selectedPasajero = pasajeros.find((pasajero) => pasajero.value === selectedValue);
    if (selectedPasajero) {
      console.log('Apellido:', selectedPasajero.label);
      console.log('CodCliente:', selectedPasajero.value);
      setSelectedCodCliente(selectedPasajero.value);
    }
  };

  return (
    <div className="gestionPasajeros">
      <div className="titleP">
        <h2 className="title">Gestion de Pasajeros</h2>
      </div>

      <div className="subContent">
        <AiFillPlayCircle color="#FF6300" />
        <div className="flex w-full flex-col gap-4">
          <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
            <Autocomplete
              size="lg"
              variant="underlined"
              label="Búsqueda de Usuarios por Nombre:"
              onInputChange={handleSearchChange}
              isLoading={loading}
              defaultItems={filteredPasajeros}
              onSelectionChange={handleSelectionChange}
            >
              {(item) => (
                <AutocompleteItem key={item.value}>
                  {item.label}
                </AutocompleteItem>
              )}
            </Autocomplete>
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          <ModalPasajeros
            title="Nuevo Pasajero"
            icon={<IoIosAddCircle size={22} color="#0ead69" />}
            contenido="Nuevo"
          ></ModalPasajeros>

          <ModalPasajerosEdit
            title="Detalle Pasajero"
            icon={<BiEditAlt size={22} color="#0582ca" />}
            contenido="Detalle"
            codCliente={selectedCodCliente}
          />

          <Tooltip color="danger" content="Eliminar">
            <span className="cursor-pointer text-lg text-danger active:opacity-50">
              <DeleteIcon />
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="subContent">
        <div className="subStart">
          <AiFillPlayCircle color="#FF6300" />
          Búsqueda de Usuarios por Código:
        </div>

        <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
          <Input type="text" variant="underlined" color="primary" />
        </div>

        <div className="relative flex items-center gap-2">
          <Tooltip color="primary" content="Detalle">
            <span className="cursor-pointer text-lg text-default-400 active:opacity-50">
              <EditIcon color="#2e7ff9" />
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="cargaMasiva">
        <div className="subStart titleCargaM">
          <AiFillPlayCircle color="#FF6300" />
          Carga Masiva:
        </div>

        <form className="form">
          <label htmlFor="file-input" className="drop-container">
            <span className="drop-title">Suelte los archivos aquí</span>
            o
            <input type="file" accept="/*" id="file-input" />
            <Button color="primary" type="submit">
              Cargar
            </Button>
          </label>
        </form>
      </div>
    </div>
  );
}
