import React, { useState } from 'react';
import { Select, SelectItem } from '@nextui-org/react';
import { numbers } from './datarows';
import '@/app/styles/selectrows.css';

interface SelectRowsProps {
  onChange: (value: number) => void;
}

export default function SelectRows({ onChange }: SelectRowsProps) {
  const [selectedRows, setSelectedRows] = useState('15');

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedRows(value);
    onChange(Number(value));
  };

  return (
    <div className='selectrowstable'>
      <div className="titleSelect">
        <span className="selecttitle">Filas por página</span>
      </div>

      <Select
        defaultSelectedKeys={[selectedRows]}
        className="custom-select max-w-xs"
        onChange={handleSelectChange}
      >
        {numbers.map((num) => (
          <SelectItem key={num.value} value={num.value}>
            {num.label}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}