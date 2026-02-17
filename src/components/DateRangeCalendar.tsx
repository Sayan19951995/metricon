'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
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
      setStartDate(date);
      setEndDate(null);
    } else if (isBefore(date, startDate)) {
      setStartDate(date);
      setEndDate(null);
    } else {
      setEndDate(date);
    }
  };

  const isInRange = (date: Date) => {
    if (!startDate) return false;
    const rangeEnd = hoverDate && !endDate ? hoverDate : endDate;
    if (!rangeEnd) return false;
    try {
      return isWithinInterval(date, { start: startDate, end: rangeEnd });
    } catch {
      return false;
    }
  };

  const isRangeStart = (date: Date) => startDate && isSameDay(date, startDate);
  const isRangeEnd = (date: Date) => endDate && isSameDay(date, endDate);

  const getDaysInMonth = (month: Date) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const startWeek = startOfWeek(start, { weekStartsOn: 1 });
    const endWeek = endOfWeek(end, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startWeek, end: endWeek });
  };

  const renderMonth = (month: Date, showLeftArrow: boolean, showRightArrow: boolean) => {
    const days = getDaysInMonth(month);

    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4 px-2">
          {showLeftArrow ? (
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <h3 className="text-base font-semibold text-gray-900 dark:text-white capitalize">
            {format(month, 'LLLL yyyy', { locale: ru })}
          </h3>
          {showRightArrow ? (
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase py-2">
              {day}
            </div>
          ))}
        </div>

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
                  relative h-9 w-full text-sm font-medium rounded-lg transition-all
                  ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600 cursor-default' : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}
                  ${isStart || isEnd ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}
                  ${inRange && !isStart && !isEnd ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-400' : ''}
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
    <>
      {/* Backdrop на мобилке */}
      <div className="fixed inset-0 bg-black/30 z-40 sm:hidden" onClick={onCancel} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:absolute sm:inset-auto sm:top-full sm:right-0 sm:translate-y-0 sm:mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-6 z-50 border border-gray-200 dark:border-gray-700 sm:min-w-[680px] max-h-[90vh] overflow-y-auto"
      >
        {/* Мобилка: 1 месяц, Десктоп: 2 месяца */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mb-6">
          {/* На мобилке показываем 1 месяц с обеими стрелками */}
          <div className="sm:hidden">
            {renderMonth(currentMonth, true, true)}
          </div>
          {/* На десктопе — 2 месяца */}
          <div className="hidden sm:contents">
            {renderMonth(currentMonth, true, false)}
            {renderMonth(addMonths(currentMonth, 1), false, true)}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors"
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
    </>
  );
}
