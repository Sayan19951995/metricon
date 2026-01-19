'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  isBefore,
  isAfter,
} from 'date-fns';
import { ru } from 'date-fns/locale';

interface DateRangeCalendarProps {
  startDate: Date | null;
  endDate: Date | null;
  onApply: (startDate: Date | null, endDate: Date | null) => void;
  onCancel: () => void;
}

export default function DateRangeCalendar({
  startDate: initialStartDate,
  endDate: initialEndDate,
  onApply,
  onCancel,
}: DateRangeCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate);
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const weekDays = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

  const handleDateClick = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      // Начинаем новый выбор
      setStartDate(date);
      setEndDate(null);
    } else if (isBefore(date, startDate)) {
      // Если выбрали дату раньше начальной - делаем её новой начальной
      setStartDate(date);
      setEndDate(null);
    } else {
      // Устанавливаем конечную дату
      setEndDate(date);
    }
  };

  const isInRange = (date: Date) => {
    if (!startDate) return false;

    const rangeEnd = hoverDate && !endDate ? hoverDate : endDate;
    if (!rangeEnd) return false;

    try {
      return isWithinInterval(date, {
        start: startDate,
        end: rangeEnd,
      });
    } catch {
      return false;
    }
  };

  const isRangeStart = (date: Date) => {
    return startDate && isSameDay(date, startDate);
  };

  const isRangeEnd = (date: Date) => {
    return endDate && isSameDay(date, endDate);
  };

  const getDaysInMonth = (month: Date) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);

    // Получаем первый день недели для месяца (понедельник)
    const startWeek = startOfWeek(start, { weekStartsOn: 1 });
    // Получаем последний день недели для месяца
    const endWeek = endOfWeek(end, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startWeek, end: endWeek });
  };

  const renderMonth = (month: Date, isSecond: boolean = false) => {
    const days = getDaysInMonth(month);

    return (
      <div className="flex-1">
        {/* Заголовок месяца */}
        <div className="flex items-center justify-between mb-4 px-2">
          {!isSecond && (
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <h3 className="text-base font-semibold text-gray-900 capitalize">
            {format(month, 'LLLL yyyy', { locale: ru })}
          </h3>
          {isSecond && (
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          )}
          {!isSecond && <div className="w-9" />}
          {isSecond && <div className="w-9" />}
        </div>

        {/* Дни недели */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 uppercase py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Дни месяца */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, month);
            const isStart = isRangeStart(day);
            const isEnd = isRangeEnd(day);
            const inRange = isInRange(day);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={index}
                onClick={() => isCurrentMonth && handleDateClick(day)}
                onMouseEnter={() => isCurrentMonth && setHoverDate(day)}
                onMouseLeave={() => setHoverDate(null)}
                disabled={!isCurrentMonth}
                className={`
                  relative h-9 w-9 text-sm font-medium rounded-lg transition-all
                  ${!isCurrentMonth ? 'text-gray-300 cursor-default' : 'text-gray-900 hover:bg-gray-100'}
                  ${isStart || isEnd ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
                  ${inRange && !isStart && !isEnd ? 'bg-emerald-100 text-emerald-900' : ''}
                  ${isToday && !isStart && !isEnd && !inRange ? 'border-2 border-emerald-500' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.2 }}
      className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl p-6 z-50 border border-gray-200"
      style={{ minWidth: '680px' }}
    >
      {/* Два месяца рядом */}
      <div className="flex gap-8 mb-6">
        {renderMonth(currentMonth)}
        {renderMonth(addMonths(currentMonth, 1), true)}
      </div>

      {/* Кнопки действий */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
        >
          Отмена
        </button>
        <button
          onClick={() => onApply(startDate, endDate)}
          disabled={!startDate || !endDate}
          className={`
            px-6 py-2.5 rounded-xl text-sm font-medium transition-colors
            ${startDate && endDate
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Применить
        </button>
      </div>
    </motion.div>
  );
}
