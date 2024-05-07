import React, { useState } from 'react';
import { DatePicker, DateValue } from '@nextui-org/react';
import '@/app/styles/components.css';
import {now, getLocalTimeZone, ZonedDateTime} from "@internationalized/date";

interface AppProps {
  texto: string;
  onDateSelect: (date: ZonedDateTime) => void;
}

export default function App(props: AppProps) {

  const handleDateSelect = (date: ZonedDateTime) => {
    props.onDateSelect(date); 
  };

  return (
    <div className="flex w-[50%] flex-row gap-4 responsiveTime">
      <DatePicker
        label={props.texto}
        hideTimeZone
        showMonthAndYearPickers
        onChange={handleDateSelect}
        defaultValue={null}
        granularity="minute"
        hourCycle={24}
      />
    </div>
  );
}
