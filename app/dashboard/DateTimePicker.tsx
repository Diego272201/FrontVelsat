'use client';
import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateTimePickerProps {
  initialDateTime?: string;
  onDateSelect: (date: string) => void;
  className?: string;
}

export function DateTimePicker({
  initialDateTime = '',
  onDateSelect,
  className,
}: DateTimePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [inputValue, setInputValue] = React.useState<string>('');
  const [isOpen, setIsOpen] = React.useState(false);

React.useEffect(() => {
  if (initialDateTime) {
    const parsed = parseISO(initialDateTime);
    if (!isNaN(parsed.getTime())) {
      setDate(parsed);
      setInputValue(format(parsed, 'dd/MM/yyyy HH:mm'));
    }
  } else {
    // ⚠️ Esto estaba faltando
    setDate(undefined);
    setInputValue('');
  }
}, [initialDateTime]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.trim() === '') {
      setDate(undefined);
      onDateSelect('');
      return;
    }

    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
    if (match) {
      const [_, dd, MM, yyyy, HH, mm] = match;
      const parsedDate = new Date(
        parseInt(yyyy),
        parseInt(MM) - 1,
        parseInt(dd),
        parseInt(HH),
        parseInt(mm),
      );
      if (!isNaN(parsedDate.getTime())) {
        setDate(parsedDate);
        onDateSelect(format(parsedDate, "yyyy-MM-dd'T'HH:mm"));
      }
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleCalendarSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setDate(undefined);
      onDateSelect('');
      setInputValue('');
      return;
    }

    const currentHours = date?.getHours() ?? 0;
    const currentMinutes = date?.getMinutes() ?? 0;
    newDate.setHours(currentHours, currentMinutes);

    setDate(newDate);
    const formatted = format(newDate, 'dd/MM/yyyy HH:mm');
    setInputValue(formatted);
    onDateSelect(format(newDate, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleHourChange = (value: string) => {
    const hour = parseInt(value);
    const baseDate = date ?? new Date(2000, 0, 1);
    const newDate = new Date(baseDate);
    newDate.setHours(hour);
    setDate(newDate);
    setInputValue(format(newDate, 'dd/MM/yyyy HH:mm'));
    onDateSelect(format(newDate, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleMinuteChange = (value: string) => {
    const minute = parseInt(value);
    const baseDate = date ?? new Date(2000, 0, 1);
    const newDate = new Date(baseDate);
    newDate.setMinutes(minute);
    setDate(newDate);
    setInputValue(format(newDate, 'dd/MM/yyyy HH:mm'));
    onDateSelect(format(newDate, "yyyy-MM-dd'T'HH:mm"));
  };

  return (
    <div className={cn('relative', className)}>
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="dd/mm/yy hh:mm"
        className="w-full placeholder-red-700"
      />

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="absolute right-0 top-0 h-full rounded-l-none border-l bg-gray-200"
            onClick={() => setIsOpen(true)}
            aria-label="Abrir calendario"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto bg-white p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            locale={es}
            initialFocus
          />

          <div className="flex items-center justify-center gap-2 border-t p-3">
            <Clock className="h-4 w-4" />
            <Select
              value={date ? date.getHours().toString() : ''}
              onValueChange={handleHourChange}
            >
              <SelectTrigger className="w-16">
                <SelectValue placeholder="--" />
              </SelectTrigger>
              <SelectContent>
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour.toString()}>
                    {hour.toString().padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>:</span>
            <Select
              value={date ? date.getMinutes().toString() : ''}
              onValueChange={handleMinuteChange}
            >
              <SelectTrigger className="w-16">
                <SelectValue placeholder="--" />
              </SelectTrigger>
              <SelectContent>
                {minutes.map((minute) => (
                  <SelectItem key={minute} value={minute.toString()}>
                    {minute.toString().padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
