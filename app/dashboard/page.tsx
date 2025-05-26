"use client";

import { useState } from "react";
import { DateTimePicker } from "./DateTimePicker";

export default function Home() {
  const now = new Date();
  const nowISO = now.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"

  const [selectedDate, setSelectedDate] = useState<string>(nowISO);

  const handleUserInput = (fechaISO: string) => {
    setSelectedDate(fechaISO);
    // Aquí puedes hacer lo que necesites con la nueva fecha ISO
    console.log("Fecha seleccionada:", fechaISO);
  };

  return (

    <div className="bg-red-500 w-78 h-[500px]">
    <div className="w-[220px] m-4">
      <DateTimePicker
        initialDateTime={selectedDate}
        onDateSelect={handleUserInput}
      />
    </div>

    </div>
  );
}
