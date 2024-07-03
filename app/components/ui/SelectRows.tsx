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
      </div>

      <Select
      style={{background:'#d9dcd6'}}
        defaultSelectedKeys={[selectedRows]}
        className="custom-select"
        onChange={handleSelectChange}
        label="Filas por página" 

      >
        {numbers.map((num) => (
          <SelectItem key={num.value} value={num.value} >
            {num.label}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}