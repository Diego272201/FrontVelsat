import React, { useState } from 'react';
import '@/app/styles/timepicker.css';

interface AppProps {
  onDateSelect: (date: string) => void;
}

export default function App(props: AppProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value;
    setSelectedDate(newDate);
    if (!newDate) {
      props.onDateSelect('');
    } else {
      combineDateTime(newDate, selectedTime);
    }
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = event.target.value;
    setSelectedTime(newTime);
    if (!newTime) {
      props.onDateSelect('');
    } else {
      combineDateTime(selectedDate, newTime);
    }
  };

  const combineDateTime = (date: string, time: string) => {
    if (date && time) {
      const combinedDateTime = `${date}T${time}`;
      props.onDateSelect(combinedDateTime);
    } else {
      props.onDateSelect('');
    }
  };

  return (
    <div>
      <input
        id="dateInput"
        type="date"
        value={selectedDate}
        onChange={handleDateChange}
      />
      <input
        id="timeInput"
        type="time"
        value={selectedTime}
        onChange={handleTimeChange}
        min="00:00"
        max="23:59"
      />
    </div>
  );
}
