
'use client';

import * as React from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CustomCalendarProps {
  initialFocus?: boolean;
  mode: 'single';
  selected?: Date;
  onSelect: (date?: Date) => void;
  disabled?: (date: Date) => boolean;
}

export function CustomCalendar({
  initialFocus,
  mode,
  selected,
  onSelect,
  disabled
}: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date());
  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const firstDayOfMonth = startOfMonth(currentMonth);
  const lastDayOfMonth = endOfMonth(currentMonth);
  const startDate = startOfWeek(firstDayOfMonth);
  const endDate = endOfWeek(lastDayOfMonth);

  const daysInMonth = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <div className="p-3 w-80">
        <div className="h-9 mb-2 flex items-center justify-between px-2">
            <h3 className="font-semibold text-sm">{format(currentMonth, 'MMMM yyyy')}</h3>
            <div className="flex items-center">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
            {daysOfWeek.map((day) => (
                <div key={day}>{day}</div>
            ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((day, index) => {
                 const isSelected = selected ? isSameDay(day, selected) : false;
                 const isDisabled = disabled ? disabled(day) : false;

                 return (
                    <Button
                        key={index}
                        variant={isSelected ? 'default' : isToday(day) ? 'secondary' : 'ghost'}
                        onClick={() => !isDisabled && onSelect(day)}
                        disabled={isDisabled}
                        className={cn("h-9 w-9 p-0 font-normal", 
                            !isSameMonth(day, currentMonth) && 'text-muted-foreground opacity-50'
                        )}
                    >
                        {format(day, 'd')}
                    </Button>
                )}
            )}
        </div>
    </div>
  );
}

      
