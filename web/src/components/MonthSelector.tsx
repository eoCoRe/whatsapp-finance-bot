'use client';

import { useRouter } from 'next/navigation';
import { formatMonthLabel } from '@/lib/format';

interface MonthSelectorProps {
  months: string[];
  selected: string;
}

export default function MonthSelector({ months, selected }: MonthSelectorProps) {
  const router = useRouter();

  return (
    <div className="filter-row">
      <label className="month-selector">
        <span className="month-selector__label">Mês de referência</span>
        <select
          value={selected}
          onChange={e => router.push(`/?mes=${e.target.value}`)}
        >
          {months.map(mes => (
            <option key={mes} value={mes}>
              {formatMonthLabel(mes)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
