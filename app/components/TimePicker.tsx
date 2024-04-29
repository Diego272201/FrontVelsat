import React from 'react';
import { DatePicker } from '@nextui-org/react';
import { now, getLocalTimeZone } from '@internationalized/date';
import '@/app/styles/components.css';

interface AppProps {
  texto: string;
}

export default function App(props: AppProps) {
  return (
    <div className="flex w-[50%] flex-row gap-4 responsiveTime">
      <DatePicker
        label={props.texto}
        hideTimeZone
        showMonthAndYearPickers
        defaultValue={now(getLocalTimeZone())}
      />
    </div>
  );
}
