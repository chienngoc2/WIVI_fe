import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber, formatPeriod } from '../../lib/format'
import { chartTheme } from '../../theme/chart'

export interface TimeSeriesChartSeries {
  key: string
  label: string
  axis?: 'left' | 'right'
  format?: (val: number) => string
  color?: string
}

export interface TimeSeriesChartProps<T = Record<string, unknown>> {
  data: T[]
  xKey?: string
  granularity?: 'day' | 'month'
  series: TimeSeriesChartSeries[]
  height?: number
  ariaLabel: string
  variant?: 'line' | 'area'
}

export const TimeSeriesChart = <T extends object>({
  data,
  xKey = 'period',
  granularity = 'day',
  series,
  height = 320,
  ariaLabel,
  variant = 'line',
}: TimeSeriesChartProps<T>) => {
  const hasRightAxis = series.some((s) => s.axis === 'right')
  const showDots = data.length <= 31

  const formatXAxis = (tick: string) => formatPeriod(tick, granularity)

  const ChartComponent = variant === 'area' ? AreaChart : LineChart

  return (
    <>
      <div
        className="w-full min-w-0"
        style={{ height }}
        role="figure"
        aria-label={ariaLabel}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ChartComponent
            data={data}
            margin={{ top: 16, right: hasRightAxis ? 24 : 12, left: 8, bottom: 8 }}
          >
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatXAxis}
            />
            <YAxis
              yAxisId="left"
              allowDecimals={false}
              width={54}
              tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => {
                const s = series.find((item) => (item.axis ?? 'left') === 'left')
                return s?.format ? s.format(v) : formatNumber(v)
              }}
            />
            {hasRightAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                allowDecimals={false}
                width={54}
                tick={{ fill: chartTheme.axisTick, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => {
                  const s = series.find((item) => item.axis === 'right')
                  return s?.format ? s.format(v) : formatNumber(v)
                }}
              />
            )}
            <Tooltip
              contentStyle={chartTheme.tooltip}
              cursor={{ fill: chartTheme.grid }}
              formatter={(value, name) => {
                const s = series.find(
                  (item) => item.key === name || item.label === name,
                )
                const num = typeof value === 'number' ? value : Number(value)
                const formatted = s?.format
                  ? s.format(num)
                  : formatNumber(Number.isFinite(num) ? num : null)
                return [formatted, s?.label ?? String(name)]
              }}
              labelFormatter={(label) => `Thời gian: ${formatXAxis(String(label))}`}
            />
            <Legend
              verticalAlign="top"
              height={32}
              wrapperStyle={{ fontSize: 12 }}
            />
            {series.map((s, index) => {
              const color =
                s.color ?? chartTheme.series[index % chartTheme.series.length]
              const axisId = s.axis ?? 'left'

              if (variant === 'area') {
                return (
                  <Area
                    key={s.key}
                    yAxisId={axisId}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={color}
                    fill={color}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    dot={showDots ? { r: 3, fill: color } : false}
                    isAnimationActive={false}
                  />
                )
              }

              return (
                <Line
                  key={s.key}
                  yAxisId={axisId}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={color}
                  strokeWidth={2}
                  dot={showDots ? { r: 3, fill: color } : false}
                  isAnimationActive={false}
                />
              )
            })}
          </ChartComponent>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th>Thời gian</th>
            {series.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const record = row as Record<string, unknown>
            return (
              <tr key={String(record[xKey] ?? idx)}>
                <td>{formatXAxis(String(record[xKey]))}</td>
                {series.map((s) => (
                  <td key={s.key}>{String(record[s.key] ?? '—')}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
