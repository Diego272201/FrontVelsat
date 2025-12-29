'use client';

import React, { useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { Calendar } from 'lucide-react';
import { es } from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('es', es);

interface DatePickerFieldProps {
  label: string;
  selected: Date;
  onChange: (date: Date | null) => void;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({ 
  label, 
  selected, 
  onChange 
}) => {
  useEffect(() => {
    // Verificar si el estilo ya existe
    if (!document.getElementById('datepicker-custom-styles')) {
      const style = document.createElement('style');
      style.id = 'datepicker-custom-styles';
      style.textContent = `
        .custom-datepicker {
          font-size: 0.875rem;
          padding: 0.25rem 0.5rem;
          width: 140px;
          font-weight: 500;
        }
        
        .custom-datepicker:focus {
          outline: none;
          border-color: transparent;
        }
        
        .react-datepicker-wrapper {
          display: inline-block;
        }
        
        .react-datepicker__input-container {
          display: inline-block;
        }
        
        .react-datepicker {
          font-family: inherit;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        
        .react-datepicker__header {
          background-color: #3b82f6;
          border-bottom: none;
        }
        
        .react-datepicker__current-month,
        .react-datepicker__day-name {
          color: white;
        }
        
        .react-datepicker__time-container .react-datepicker__header {
          background-color: #3b82f6;
        }
        
        .react-datepicker__time-container .react-datepicker__header--time {
          color: white !important;
        }
        
        .react-datepicker-time__header {
          color: white !important;
        }
        
        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background-color: #3b82f6;
        }
        
        .react-datepicker__day:hover {
          background-color: #dbeafe;
        }
        
        .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item--selected {
          background-color: #3b82f6;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-700">{label}:</span>
      <DatePicker
        selected={selected}
        onChange={onChange}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        dateFormat="dd/MM/yyyy HH:mm"
        locale="es"
        timeCaption="Hora"
        className="custom-datepicker"
        wrapperClassName="inline-block"
      />
      <Calendar className="w-4 h-4 text-gray-600" />
    </div>
  );
};