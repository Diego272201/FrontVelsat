"use client";

import { useState } from "react";
import { DateTimePicker } from "./DateTimePicker";

export default function Home() {
  const fechaManualISO = "2025-06-17T14:30"; 
  const [selectedDate, setSelectedDate] = useState<string>(fechaManualISO);

  const handleUserInput = (fechaISO: string) => {
    setSelectedDate(fechaISO);
    console.log("Fecha seleccionada:", fechaISO);
  };

  return (
    <div className="bg-red-500">
      <div className="w-[220px] m-4">
        <DateTimePicker
          initialDateTime={selectedDate}
          onDateSelect={handleUserInput}
        />
      </div>
    </div>
  );
}
