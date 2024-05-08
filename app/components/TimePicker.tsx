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
      <input
        id="dateTimeInput"
        type="datetime-local"
        value={selectedDate}
        onChange={handleDateChange}
      />
   
  );
}
