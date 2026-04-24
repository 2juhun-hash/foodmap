'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Hours } from '@/types';
import { getBusinessStatus, STATUS_LABEL, DAY_LABEL } from '@/lib/businessHours';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const TODAY_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

interface Props { hours?: Hours }

export default function BusinessHours({ hours }: Props) {
  const [open, setOpen] = useState(false);
  const status = getBusinessStatus(hours);
  const todayHours = hours?.[TODAY_KEY as keyof Hours];

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 w-full text-left"
      >
        <span className={`text-sm font-medium ${status === 'open' ? 'text-green-600' : 'text-gray-500'}`}>
          ● {STATUS_LABEL[status]}
        </span>
        {todayHours && <span className="text-sm text-gray-600">{todayHours}</span>}
        <ChevronDown className={`ml-auto w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && hours && (
        <ul className="mt-2 space-y-1" role="list">
          {DAY_ORDER.map(day => (
            <li key={day} className={`flex justify-between text-sm ${day === TODAY_KEY ? 'font-semibold text-primary' : 'text-gray-600'}`}>
              <span className="w-6">{DAY_LABEL[day]}</span>
              <span>{hours[day as keyof Hours] ?? '-'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
