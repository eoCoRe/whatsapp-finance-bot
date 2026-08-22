'use client';

import { useRef, useState } from 'react';
import { formatBRL, formatCompactBRL, formatMonthShort } from '@/lib/format';
import { MonthlyTrendPoint } from '@/lib/aggregate';

interface Series {
  key: string;
  name: string;
  color: string;
}

interface LineChartMultiProps {
  trend: MonthlyTrendPoint[];
  series: Series[];
}

const WIDTH = 880;
const HEIGHT = 300;
const PAD_LEFT = 56;
const PAD_RIGHT = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 36;

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const fraction = value / base;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * base;
}

export default function LineChartMulti({ trend, series }: LineChartMultiProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (trend.length === 0) {
    return <p className="chart-empty">Sem dados suficientes para exibir a tendência.</p>;
  }

  const innerWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const maxRaw = Math.max(
    1,
    ...trend.flatMap(point => series.map(s => point.byPerson[s.key] ?? 0))
  );
  const max = niceMax(maxRaw);

  const xFor = (i: number) =>
    trend.length === 1 ? PAD_LEFT + innerWidth / 2 : PAD_LEFT + (i / (trend.length - 1)) * innerWidth;
  const yFor = (value: number) => PAD_TOP + innerHeight - (value / max) * innerHeight;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ frac: f, value: Math.round(max * f) }));
  const labelStep = trend.length > 8 ? 2 : 1;

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const frac = (relX - PAD_LEFT) / innerWidth;
    const idx = Math.round(frac * (trend.length - 1));
    setHoverIndex(Math.min(Math.max(idx, 0), trend.length - 1));
  }

  const hovered = hoverIndex !== null ? trend[hoverIndex] : null;
  const hoveredX = hoverIndex !== null ? xFor(hoverIndex) : null;

  // Rótulos de fim de linha só aparecem se não colidirem entre si — do
  // contrário o texto sobrepõe e fica ilegível; a legenda já cobre a identidade.
  const lastIdx = trend.length - 1;
  const endLabelYs = series.map(s => yFor(trend[lastIdx].byPerson[s.key] ?? 0));
  const labelsCollide = endLabelYs.some((y, i) =>
    endLabelYs.some((otherY, j) => i !== j && Math.abs(y - otherY) < 14)
  );

  return (
    <div className="line-chart">
      <div className="line-chart__legend">
        {series.map(s => (
          <span key={s.key} className="legend-item">
            <span className="legend-item__key" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="line-chart__svg"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
        role="img"
        aria-label="Gráfico de tendência de gastos por mês"
      >
        {ticks.map(tick => (
          <g key={tick.frac}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(tick.value)}
              y2={yFor(tick.value)}
              className="grid-line"
            />
            <text x={PAD_LEFT - 8} y={yFor(tick.value)} className="axis-label" textAnchor="end" dy="0.32em">
              {formatCompactBRL(tick.value)}
            </text>
          </g>
        ))}

        {trend.map((point, i) =>
          i % labelStep === 0 ? (
            <text
              key={point.mes}
              x={xFor(i)}
              y={HEIGHT - 10}
              className="axis-label"
              textAnchor="middle"
            >
              {formatMonthShort(point.mes)}
            </text>
          ) : null
        )}

        {hoveredX !== null && (
          <line
            x1={hoveredX}
            x2={hoveredX}
            y1={PAD_TOP}
            y2={PAD_TOP + innerHeight}
            className="crosshair"
          />
        )}

        {series.map(s => {
          const points = trend.map((point, i) => `${xFor(i)},${yFor(point.byPerson[s.key] ?? 0)}`).join(' ');
          return (
            <polyline
              key={s.key}
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {series.map(s =>
          trend.map((point, i) => (
            <circle
              key={`${s.key}-${point.mes}`}
              cx={xFor(i)}
              cy={yFor(point.byPerson[s.key] ?? 0)}
              r={4}
              fill={s.color}
              stroke="var(--surface-1)"
              strokeWidth={2}
            />
          ))
        )}

        {!labelsCollide &&
          series.map(s => {
            const lastValue = trend[lastIdx].byPerson[s.key] ?? 0;
            return (
              <text
                key={`${s.key}-label`}
                x={xFor(lastIdx) + 8}
                y={yFor(lastValue)}
                className="line-end-label"
                dy="0.32em"
                fill="var(--text-secondary)"
              >
                {s.name}
              </text>
            );
          })}
      </svg>

      {hovered && hoveredX !== null && (
        <div
          className="line-tooltip"
          style={{ left: `${(hoveredX / WIDTH) * 100}%` }}
          role="tooltip"
        >
          <div className="line-tooltip__title">{formatMonthShort(hovered.mes)}</div>
          {series.map(s => (
            <div key={s.key} className="line-tooltip__row">
              <span className="line-tooltip__key" style={{ backgroundColor: s.color }} />
              <strong>{formatBRL(hovered.byPerson[s.key] ?? 0)}</strong>
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
