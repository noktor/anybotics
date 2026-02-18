import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { useRobot, useRobotReadings } from '@/api/hooks';
import SensorChart from '@/components/charts/SensorChart';
import StatusBadge from '@/components/ui/StatusBadge';

const TIME_RANGES = [
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '7d', hours: 24 * 7 },
] as const;

const SENSOR_TYPES = ['temperature', 'vibration', 'pressure', 'gas_concentration', 'humidity'];

export default function RobotDetail() {
  const { id } = useParams<{ id: string }>();
  const [timeRange, setTimeRange] = useState<(typeof TIME_RANGES)[number]>(TIME_RANGES[0]);

  const from = new Date(Date.now() - timeRange.hours * 60 * 60 * 1000).toISOString();
  const to = new Date().toISOString();

  const { data: robot, isLoading: robotLoading } = useRobot(id);
  const resolution = timeRange.hours <= 6 ? 'raw' : '1h';
  const { data: readings } = useRobotReadings(id, {
    from,
    to,
    limit: 2000,
    resolution,
  });

  const readingsArray = Array.isArray(readings) ? readings : readings?.data ?? readings ?? [];

  if (robotLoading || !robot) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-gray-500">Loading robot...</p>
      </div>
    );
  }

  const r = robot as {
    name?: string;
    model?: string;
    status?: string;
    firmwareVersion?: string;
    site?: { name?: string };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-gray-800 p-3">
            <Bot className="h-10 w-10 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{r.name ?? 'Robot'}</h1>
            <p className="text-gray-400">
              {r.model ?? 'ANYmal X'} • {r.firmwareVersion ?? 'N/A'} • {r.site?.name ?? 'No site'}
            </p>
          </div>
        </div>
        <StatusBadge status={r.status ?? 'offline'} />
      </div>

      {/* Time range selector */}
      <div className="flex gap-2">
        {TIME_RANGES.map((tr) => (
          <button
            key={tr.label}
            type="button"
            onClick={() => setTimeRange(tr)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              timeRange.label === tr.label
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {tr.label}
          </button>
        ))}
      </div>

      {/* Sensor charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {SENSOR_TYPES.map((sensorType) => {
          const filtered = (readingsArray as { sensor_type?: string; avg_value?: number; value?: number }[]).filter(
            (x) => x.sensor_type === sensorType
          );
          const valueKey = filtered[0] && ('avg_value' in filtered[0] || filtered[0].avg_value !== undefined) ? 'avg_value' : 'value';
          return (
            <SensorChart
              key={sensorType}
              title={sensorType.charAt(0).toUpperCase() + sensorType.slice(1)}
              data={filtered.length > 0 ? filtered : []}
              valueKey={valueKey}
            />
          );
        })}
      </div>
    </div>
  );
}
