import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

type AnomalySummaryProps = {
  data?: { severity?: string; count?: number }[] | Record<string, number>;
};

export default function AnomalySummary({ data }: AnomalySummaryProps) {
  const { labels, series } = useMemo(() => {
    if (Array.isArray(data)) {
      const labels = data.map((d) => d.severity ?? 'unknown');
      const series = data.map((d) => d.count ?? 0);
      return { labels, series };
    }
    if (data && typeof data === 'object') {
      const labels = Object.keys(data);
      const series = Object.values(data) as number[];
      return { labels, series };
    }
    return { labels: ['critical', 'high', 'medium', 'low'], series: [0, 0, 0, 0] };
  }, [data]);

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'donut',
        background: 'transparent',
        foreColor: '#9ca3af',
      },
      theme: { mode: 'dark' },
      colors: ['#ef4444', '#f97316', '#eab308', '#6b7280'],
      labels,
      legend: {
        position: 'bottom',
        labels: { colors: '#9ca3af' },
      },
      dataLabels: { enabled: true },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                color: '#9ca3af',
              },
            },
          },
        },
      },
    }),
    [labels]
  );

  return (
    <div className="rounded-xl bg-gray-900 p-4 shadow-lg">
      <h3 className="mb-3 text-sm font-medium text-gray-100">Anomaly Summary</h3>
      <Chart options={options} series={series} type="donut" height={220} />
    </div>
  );
}
