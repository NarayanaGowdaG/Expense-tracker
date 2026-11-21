import { useState } from 'react';
import { formatINR, formatINRCompact } from '../../lib/format.ts';

export interface MonthlyComparisonPoint {
  monthKey: string;
  label: string;
  income: number;
  expense: number;
  savings: number;
}

export function IncomeVsExpenseChart({ data }: { data: MonthlyComparisonPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxVal = Math.max(
    1,
    ...data.flatMap((d) => [d.income, d.expense]),
  );

  const width = 620;
  const height = 240;
  const padLeft = 56;
  const padRight = 16;
  const padTop = 20;
  const padBottom = 34;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const groupW = chartW / Math.max(data.length, 1);
  const barW = Math.min(20, Math.max(8, groupW * 0.28));

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-60 overflow-visible"
        role="img"
        aria-label="Income versus expenses bar chart"
      >
        {yTicks.map((t) => {
          const y = padTop + chartH * (1 - t);
          return (
            <g key={t}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                className="stroke-slate-200 dark:stroke-[#1E2E4D]"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                {formatINRCompact(maxVal * t)}
              </text>
            </g>
          );
        })}

        {data.map((d, idx) => {
          const cx = padLeft + idx * groupW + groupW / 2;
          const incH = (d.income / maxVal) * chartH;
          const expH = (d.expense / maxVal) * chartH;
          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={d.monthKey}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              {isHovered && (
                <rect
                  x={padLeft + idx * groupW + 2}
                  y={padTop}
                  width={Math.max(groupW - 4, 8)}
                  height={chartH}
                  rx={8}
                  className="fill-[#287BFF]/10"
                />
              )}
              <rect
                x={cx - barW - 2}
                y={padTop + chartH - incH}
                width={barW}
                height={Math.max(incH, 2)}
                rx={4}
                fill="#22C55E"
                opacity={hoveredIdx === null || isHovered ? 0.95 : 0.45}
              />
              <rect
                x={cx + 2}
                y={padTop + chartH - expH}
                width={barW}
                height={Math.max(expH, 2)}
                rx={4}
                fill="#F87171"
                opacity={hoveredIdx === null || isHovered ? 0.95 : 0.45}
              />
              <text
                x={cx}
                y={height - 10}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400 text-[11px] font-medium"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredIdx !== null && data[hoveredIdx] && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0B1224] border border-slate-200 dark:border-[#1E2E4D] text-xs">
          <span className="font-semibold text-slate-900 dark:text-white">
            {data[hoveredIdx].label}
          </span>
          <div className="flex items-center gap-4 tabular-nums font-mono">
            <span className="text-emerald-600 dark:text-[#22C55E]">
              In: {formatINR(data[hoveredIdx].income)}
            </span>
            <span className="text-red-600 dark:text-[#F87171]">
              Out: {formatINR(data[hoveredIdx].expense)}
            </span>
            <span className="text-cyan-600 dark:text-[#22D3EE]">
              Net: {formatINR(data[hoveredIdx].savings)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export interface TrendPoint {
  label: string;
  value: number;
}

export function SpendingTrendChart({
  data,
  strokeColor = '#287BFF',
  gradientId = 'spendGrad',
  seriesLabel = 'Spent',
}: {
  data: TrendPoint[];
  strokeColor?: string;
  gradientId?: string;
  seriesLabel?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxVal = Math.max(1, ...data.map((d) => d.value));

  const width = 620;
  const height = 220;
  const padLeft = 56;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 34;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = data.map((d, idx) => {
    const x =
      data.length <= 1
        ? padLeft + chartW / 2
        : padLeft + (idx / (data.length - 1)) * chartW;
    const y = padTop + chartH - (d.value / maxVal) * chartH;
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`
      : '';

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-56 overflow-visible"
        role="img"
        aria-label={`${seriesLabel} trend chart`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.33, 0.66, 1].map((t) => {
          const y = padTop + chartH * (1 - t);
          return (
            <g key={t}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                className="stroke-slate-200 dark:stroke-[#1E2E4D]"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                {formatINRCompact(maxVal * t)}
              </text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((p, idx) => (
          <g
            key={`${p.label}-${idx}`}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="cursor-pointer"
          >
            <circle cx={p.x} cy={p.y} r={14} fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === idx ? 5.5 : 3.5}
              fill={strokeColor}
              className="stroke-white dark:stroke-[#111C32]"
              strokeWidth={2}
            />
            {(data.length <= 12 || idx % Math.ceil(data.length / 8) === 0 || idx === data.length - 1) && (
              <text
                x={p.x}
                y={height - 10}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400 text-[10px] font-medium"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {hoveredIdx !== null && points[hoveredIdx] && (
        <div className="mt-2 flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0B1224] border border-slate-200 dark:border-[#1E2E4D] text-xs">
          <span className="font-semibold text-slate-900 dark:text-white">
            {points[hoveredIdx].label}
          </span>
          <span className="font-mono tabular-nums font-semibold" style={{ color: strokeColor }}>
            {seriesLabel}: {formatINR(points[hoveredIdx].value)}
          </span>
        </div>
      )}
    </div>
  );
}

export interface CategorySlice {
  name: string;
  amount: number;
  color: string;
}

export function CategoryDonutChart({ slices }: { slices: CategorySlice[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const total = slices.reduce((sum, s) => sum + s.amount, 0);

  if (total <= 0 || slices.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        No expense data available for this period.
      </div>
    );
  }

  const radius = 66;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  const activeSlice = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
      <div className="sm:col-span-5 flex items-center justify-center">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              className="stroke-slate-100 dark:stroke-[#17243B]"
            />
            {slices.map((slice, idx) => {
              const fraction = slice.amount / total;
              const dashLength = fraction * circumference;
              const dashOffset = -cumulative * circumference;
              cumulative += fraction;
              const isActive = hoveredIdx === idx;

              return (
                <circle
                  key={slice.name}
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${Math.max(dashLength - 2, 1)} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="transition-all duration-150 cursor-pointer"
                  opacity={hoveredIdx === null || isActive ? 1 : 0.45}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
              {activeSlice ? activeSlice.name : 'Total Spent'}
            </span>
            <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {formatINRCompact(activeSlice ? activeSlice.amount : total)}
            </span>
          </div>
        </div>
      </div>

      <div className="sm:col-span-7 space-y-2 max-h-52 overflow-y-auto pr-1">
        {slices.slice(0, 7).map((slice, idx) => {
          const pct = ((slice.amount / total) * 100).toFixed(1);
          return (
            <div
              key={slice.name}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                hoveredIdx === idx ? 'bg-slate-100 dark:bg-[#17243B]' : ''
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                  {slice.name}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-mono tabular-nums shrink-0">
                <span className="text-slate-500 dark:text-slate-400">{pct}%</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatINR(slice.amount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DailySpendingBarChart({ data }: { data: TrendPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxVal = Math.max(1, ...data.map((d) => d.value));

  const width = 620;
  const height = 210;
  const padLeft = 52;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const slotW = chartW / Math.max(data.length, 1);
  const barW = Math.max(4, Math.min(16, slotW * 0.65));

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-52 overflow-visible"
        role="img"
        aria-label="Daily spending pattern bar chart"
      >
        {[0, 0.5, 1].map((t) => {
          const y = padTop + chartH * (1 - t);
          return (
            <g key={t}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                className="stroke-slate-200 dark:stroke-[#1E2E4D]"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                {formatINRCompact(maxVal * t)}
              </text>
            </g>
          );
        })}

        {data.map((d, idx) => {
          const x = padLeft + idx * slotW + (slotW - barW) / 2;
          const barH = (d.value / maxVal) * chartH;
          const isHovered = hoveredIdx === idx;
          return (
            <g
              key={d.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={padTop + chartH - barH}
                width={barW}
                height={Math.max(barH, 2)}
                rx={3}
                fill={isHovered ? '#38BDF8' : '#A855F7'}
                opacity={d.value > 0 ? 0.9 : 0.2}
              />
              {(idx % 3 === 0 || idx === data.length - 1) && (
                <text
                  x={x + barW / 2}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hoveredIdx !== null && data[hoveredIdx] && (
        <div className="mt-2 flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0B1224] border border-slate-200 dark:border-[#1E2E4D] text-xs">
          <span className="font-semibold text-slate-900 dark:text-white">
            Day {data[hoveredIdx].label}
          </span>
          <span className="font-mono tabular-nums font-semibold text-purple-600 dark:text-[#A855F7]">
            Spent: {formatINR(data[hoveredIdx].value)}
          </span>
        </div>
      )}
    </div>
  );
}
