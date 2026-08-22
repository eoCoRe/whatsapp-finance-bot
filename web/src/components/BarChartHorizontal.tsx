'use client';

import { useState } from 'react';
import { formatBRL } from '@/lib/format';
import { Breakdown } from '@/lib/aggregate';

interface BarChartHorizontalProps {
  data: Breakdown[];
  color: string;
  emptyLabel?: string;
}

export default function BarChartHorizontal({ data, color, emptyLabel }: BarChartHorizontalProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="chart-empty">{emptyLabel ?? 'Sem dados para este período.'}</p>;
  }

  const max = Math.max(...data.map(d => d.value));

  return (
    <div className="bar-chart" role="list">
      {data.map((item, i) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0;
        const isHovered = hovered === i;
        return (
          <div
            key={item.label}
            role="listitem"
            tabIndex={0}
            className={`bar-row${isHovered ? ' bar-row--active' : ''}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
          >
            <span className="bar-row__label">{item.label}</span>
            <div className="bar-row__track">
              <div
                className="bar-row__fill"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="bar-row__value">{formatBRL(item.value)}</span>

            {isHovered && (
              <div className="bar-tooltip" role="tooltip">
                <span className="bar-tooltip__key" style={{ backgroundColor: color }} />
                <strong>{formatBRL(item.value)}</strong>
                <span>{item.label}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
