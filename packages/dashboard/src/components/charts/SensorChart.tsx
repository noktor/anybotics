import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

export type SensorReading = {
  time?: string;
  bucket?: string;
  value?: number;
  avg_value?: number;
  min_value?: number;
  max_value?: number;
  sensor_type?: string;
  [key: string]: unknown;
};

type SensorChartProps = {
  title: string;
  data: SensorReading[] | unknown[];
  valueKey?: string;
  height?: number;
};

export default function SensorChart({
  title,
  data,
  valueKey = 'value',
  height = 280,
}: SensorChartProps) {
  const seriesData = useMemo(() => {
    const readings = (data ?? []) as SensorReading[];
    const points: [number, number][] = [];

    for (const r of readings) {
      const raw = r.time ?? r.bucket;
      if (!raw) continue;
      const ts = typeof raw === 'string' ? new Date(raw).getTime() : Number(raw);
      if (Number.isNaN(ts)) continue;

      const v = (r[valueKey] as number | undefined) ?? r.avg_value ?? r.value;
      if (v == null) continue;
      points.push([ts, typeof v === 'number' ? v : 0]);
    }

    points.sort((a, b) => a[0] - b[0]);
    return points;
  }, [data, valueKey]);

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'line',
        toolbar: { show: false },
        zoom: { enabled: false },
        background: 'transparent',
        foreColor: '#9ca3af',
        animations: { enabled: false },
      },
      theme: { mode: 'dark' },
      stroke: { curve: 'smooth', width: 2 },
      colors: ['#10b981'],
      grid: {
        borderColor: '#374151',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
      },
      xaxis: {
        type: 'datetime',
        labels: {
          style: { colors: '#9ca3af', fontSize: '11px' },
          datetimeUTC: false,
        },
      },
      yaxis: {
        labels: {
          style: { colors: '#9ca3af' },
          formatter: (v: number) => v?.toFixed(1) ?? '',
        },
      },
      tooltip: {
        theme: 'dark',
        x: { format: 'HH:mm:ss' },
      },
      noData: {
        text: 'No data for this range',
        style: { color: '#6b7280', fontSize: '14px' },
      },
    }),
    [],
  );

  const series = [{ name: title, data: seriesData }];

  return (
    <div className="rounded-xl bg-gray-900 p-4 shadow-lg">
      <h3 className="mb-3 text-sm font-medium text-gray-100">{title}</h3>
      <Chart
        options={options}
        series={series}
        type="line"
        height={height}
      />
    </div>
  );
}
