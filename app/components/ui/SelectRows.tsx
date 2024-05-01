import React from "react";
import {Select, SelectItem} from "@nextui-org/react";
import {numbers} from "./datarows";
import '@/app/styles/selectrows.css';

export default function SelectRows() {
  return (
    <Select
      label="Filas por página"
      defaultSelectedKeys={["15"]}
      className="max-w-xs custom-select"
    >
      {numbers.map((num) => (
        <SelectItem key={num.value} value={num.value}>
          {num.label}
        </SelectItem>
      ))}
    </Select>
  );
}
