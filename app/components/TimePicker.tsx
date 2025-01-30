import React, { useState } from 'react';
import '@/app/styles/timepicker.css';

interface AppProps {
  onDateSelect: (date: string) => void;
  backgroundColor?: string;
  height?: string;
  borderRadius?: string;
}
export default function App({
  onDateSelect,
  backgroundColor = '#ffffff',
  height = '38px',
  borderRadius = '10px',
}: AppProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value;
    setSelectedDate(newDate);
    if (!newDate) {
      onDateSelect('');
    } else {
      combineDateTime(newDate, selectedTime);
    }
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = event.target.value;
    setSelectedTime(newTime);
    if (!newTime) {
      onDateSelect('');
    } else {
      combineDateTime(selectedDate, newTime);
    }
  };

  const combineDateTime = (date: string, time: string) => {
    if (date && time) {
      const combinedDateTime = `${date}T${time}`;
      onDateSelect(combinedDateTime);
    } else {
      onDateSelect('');
    }
  };

  return (
    <div>
      <input
        id="dateInput"
        type="date"
        value={selectedDate}
        onChange={handleDateChange}
        style={{
          backgroundColor,
          height,
          borderRadius: `${borderRadius} 0 0 ${borderRadius}`, 

        }}
      />
      <input
        id="timeInput"
        type="time"
        value={selectedTime}
        onChange={handleTimeChange}
        min="00:00"
        max="23:59"
        style={{
          backgroundColor,
          height,
          borderRadius: `0 ${borderRadius} ${borderRadius} 0`, 

        }}
      />
    </div>
  );
}
