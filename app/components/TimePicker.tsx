import React, { useState } from 'react';

interface AppProps {
  onDateSelect: (date: string) => void;
}

export default function App(props: AppProps) {
  const [selectedDate, setSelectedDate] = useState('');

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
    props.onDateSelect(event.target.value);
  };

  return (
    <div className="flex w-[50%] flex-row gap-4 responsiveTime">
      <input
        id="dateTimeInput"
        type="datetime-local"
        value={selectedDate}
        onChange={handleDateChange}
        // Considerar agregar atributos mínimos y máximos para restricciones de rango de fechas
      />
    </div>
  );
}
