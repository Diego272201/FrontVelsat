import React from 'react';
import { Select, SelectItem } from '@nextui-org/react';
import { numbers } from './datarows';
import '@/app/styles/selectrows.css';

export default function SelectRows() {
  return (
    <div>
      <div className="titleSelect">
        {' '}
        <span className="selecttitle">Filas por página</span>
      </div>

      <Select defaultSelectedKeys={['15']} className="custom-select max-w-xs">
        {numbers.map((num) => (
          <SelectItem key={num.value} value={num.value}>
            {num.label}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}
