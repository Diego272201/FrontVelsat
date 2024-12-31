'use client';
import React, { useEffect, useState } from 'react';
import {
  Button,
  DateInput,
  Input,
  Select,
  SelectItem,
} from '@nextui-org/react';
import { CalendarDate, parseDate } from '@internationalized/date';
import '@/app/styles/planiTep.css';

export const animals = [
  { key: 'cat', label: 'Cat' },
  { key: 'dog', label: 'Dog' },
  { key: 'elephant', label: 'Elephant' },
  { key: 'lion', label: 'Lion' },
  { key: 'tiger', label: 'Tiger' },
  { key: 'giraffe', label: 'Giraffe' },
  { key: 'dolphin', label: 'Dolphin' },
  { key: 'penguin', label: 'Penguin' },
  { key: 'zebra', label: 'Zebra' },
  { key: 'shark', label: 'Shark' },
  { key: 'whale', label: 'Whale' },
  { key: 'otter', label: 'Otter' },
  { key: 'crocodile', label: 'Crocodile' },
];

export const CalendarIcon = (props: any) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...props}
    >
      <path
        d="M7.75 2.5a.75.75 0 0 0-1.5 0v1.58c-1.44.115-2.384.397-3.078 1.092c-.695.694-.977 1.639-1.093 3.078h19.842c-.116-1.44-.398-2.384-1.093-3.078c-.694-.695-1.639-.977-3.078-1.093V2.5a.75.75 0 0 0-1.5 0v1.513C15.585 4 14.839 4 14 4h-4c-.839 0-1.585 0-2.25.013z"
        fill="currentColor"
      />
      <path
        clipRule="evenodd"
        d="M2 12c0-.839 0-1.585.013-2.25h19.974C22 10.415 22 11.161 22 12v2c0 3.771 0 5.657-1.172 6.828C19.657 22 17.771 22 14 22h-4c-3.771 0-5.657 0-6.828-1.172C2 19.657 2 17.771 2 14zm15 2a1 1 0 1 0 0-2a1 1 0 0 0 0 2m0 4a1 1 0 1 0 0-2a1 1 0 0 0 0 2m-4-5a1 1 0 1 1-2 0a1 1 0 0 1 2 0m0 4a1 1 0 1 1-2 0a1 1 0 0 1 2 0m-6-3a1 1 0 1 0 0-2a1 1 0 0 0 0 2m0 4a1 1 0 1 0 0-2a1 1 0 0 0 0 2"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
};

export default function Page() {
  const [isVisible, setIsVisible] = useState(false);

  const toggleContent = () => {
    setIsVisible((prev) => !prev);
  };

  useEffect(() => {
    setIsVisible(false);
  }, []);

  return (
    <div className="containerTep">
      <div>
        <div className="title">
          Modulo de Planificación de Servicios
          <label className="switch">
            <input
              type="checkbox"
              className="checkbox"
              onChange={toggleContent}
              checked={isVisible}
            />
            <div className="slider"></div>
          </label>
        </div>

        {isVisible && (
          <div id="contenido">
            <div className="fristFileT">
              <div>
                <div className="grid w-full max-w-xs items-center gap-1.5">
                  <label
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    htmlFor="picture"
                  >
                    Catgar Excel
                  </label>
                  <input
                    id="picture"
                    type="file"
                    className="border-input flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-400 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-gray-600"
                  />
                </div>
              </div>

              <div>
                <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
                  <DateInput
                    defaultValue={parseDate('2024-04-04')}
                    endContent={
                      <CalendarIcon className="pointer-events-none flex-shrink-0 text-2xl text-default-400" />
                    }
                    label="Fecha"
                    labelPlacement="outside"
                    placeholderValue={new CalendarDate(1995, 11, 6)}
                  />
                </div>
              </div>

              <div className="selectTipoA">
                <Select
                  className="max-w-xl"
                  items={animals}
                  label="Tipo de Archivo"
                  labelPlacement="outside"
                  placeholder="Choose an animal"
                >
                  {(animal) => (
                    <SelectItem key={animal.key} textValue={animal.label}>
                      <div className="flex flex-col">
                        <span className="text-small font-medium">
                          {animal.label}
                        </span>
                      </div>
                    </SelectItem>
                  )}
                </Select>
              </div>

              <div className='buttonsTep'>
                <Button color="default">Cargar Archivo </Button>
                <Button color="default">Eliminar Archivo </Button>
              </div>

              <div className="selectTipoA">
                <Select
                  className="max-w-xl"
                  items={animals}
                  label="Select an Animal"
                  labelPlacement="outside"
                  placeholder="Obtener Datos"
                >
                  {(animal) => (
                    <SelectItem key={animal.key} textValue={animal.label}>
                      <div className="flex flex-col">
                        <span className="text-small font-medium">
                          {animal.label}
                        </span>
                      </div>
                    </SelectItem>
                  )}
                </Select>
              </div>

              <div className='buttonsTep'>
                <Button color="success">Success</Button>
                <Button color="success">Success</Button>
                <Button color="success">Success</Button>
              </div>
            </div>

            <div className="fristFileT">
              <div className="selectTipoA">
                <Select
                  className="max-w-xl"
                  items={animals}
                  label="Select an Animal"
                  labelPlacement="outside"
                  placeholder="Obtener Datos"
                >
                  {(animal) => (
                    <SelectItem key={animal.key} textValue={animal.label}>
                      <div className="flex flex-col">
                        <span className="text-small font-medium">
                          {animal.label}
                        </span>
                      </div>
                    </SelectItem>
                  )}
                </Select>
              </div>

              <div className="servicesP">
                <div>Total Servicios : 0</div>

                <div>Total Pasajeros : 0</div>
              </div>

              <div>
                <div className="mb-6 flex w-full flex-wrap gap-4 md:mb-0 md:flex-nowrap">
                  <DateInput
                    defaultValue={parseDate('2024-04-04')}
                    endContent={
                      <CalendarIcon className="pointer-events-none flex-shrink-0 text-2xl text-default-400" />
                    }
                    label="Fecha"
                    labelPlacement="outside"
                    placeholderValue={new CalendarDate(1995, 11, 6)}
                  />
                </div>
              </div>

              <div className="selectTipoA">
                <Select
                  className="max-w-xl"
                  items={animals}
                  label="Select an Animal"
                  labelPlacement="outside"
                  placeholder="Choose an animal"
                >
                  {(animal) => (
                    <SelectItem key={animal.key} textValue={animal.label}>
                      <div className="flex flex-col">
                        <span className="text-small font-medium">
                          {animal.label}
                        </span>
                      </div>
                    </SelectItem>
                  )}
                </Select>
              </div>

              <div className="selectTipoA">
                <Select
                  className="max-w-xl"
                  items={animals}
                  label="Select an Animal"
                  labelPlacement="outside"
                  placeholder="Choose an animal"
                >
                  {(animal) => (
                    <SelectItem key={animal.key} textValue={animal.label}>
                      <div className="flex flex-col">
                        <span className="text-small font-medium">
                          {animal.label}
                        </span>
                      </div>
                    </SelectItem>
                  )}
                </Select>
              </div>

              <div>
                <Input
                  label="Website"
                  labelPlacement="outside"
                  placeholder="nextui.org"
                  startContent={
                    <div className="pointer-events-none flex items-center"></div>
                  }
                />
              </div>

              <Button color="success">Success</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
