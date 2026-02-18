import { useState, useMemo } from 'react';
import { useTrends, useComparison, useAssets } from '@/api/hooks';
import SensorChart from '@/components/charts/SensorChart';

const SENSOR_TYPES = ['temperature', 'vibration', 'pressure'];
const TIME_PRESETS = [
  { label: '24h', hours: 24 },
  { label: '7d', hours: 24 * 7 },
  { label: '30d', hours: 24 * 30 },
] as const;

export default function Analytics() {
  const [sensorType, setSensorType] = useState(SENSOR_TYPES[0]);
  const [timePreset, setTimePreset] = useState<(typeof TIME_PRESETS)[number]>(TIME_PRESETS[1]);
  const [assetId, setAssetId] = useState('');
  const [compareAssetId1, setCompareAssetId1] = useState('');
  const [compareAssetId2, setCompareAssetId2] = useState('');

  const { from, to } = useMemo(() => {
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - timePreset.hours * 60 * 60 * 1000);
    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    };
  }, [timePreset]);

  const { data: assets = [] } = useAssets();
  const { data: trends } = useTrends(
    assetId ? { assetId, sensorType, from, to } : undefined
  );
  const { data: trends1 } = useTrends(
    compareAssetId1 ? { assetId: compareAssetId1, sensorType, from, to } : undefined
  );
  const { data: trends2 } = useTrends(
    compareAssetId2 ? { assetId: compareAssetId2, sensorType, from, to } : undefined
  );
  const period2From = useMemo(() => {
    const d = new Date(from);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, [from]);
  const period2To = from;
  const { data: comparison } = useComparison(
    compareAssetId1
      ? {
          assetId: compareAssetId1,
          sensorType,
          period1From: from,
          period1To: to,
          period2From,
          period2To,
        }
      : undefined
  );

  const assetsList = Array.isArray(assets) ? assets : assets?.data ?? assets ?? [];
  const trendsArray = Array.isArray(trends) ? trends : trends?.data ?? trends ?? [];
  const trends1Array = Array.isArray(trends1) ? trends1 : trends1?.data ?? trends1 ?? [];
  const trends2Array = Array.isArray(trends2) ? trends2 : trends2?.data ?? trends2 ?? [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Analytics</h1>

      {/* Selector bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Sensor Type</label>
          <select
            value={sensorType}
            onChange={(e) => setSensorType(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {SENSOR_TYPES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Time Range</label>
          <div className="flex gap-1">
            {TIME_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setTimePreset(p)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  timePreset.label === p.label
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <section>
        <h2 className="mb-4 text-lg font-medium text-gray-300">Trend Analysis</h2>
        <div className="mb-4">
          <label className="mb-1 block text-sm text-gray-400">Select Asset</label>
          <select
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Select asset</option>
            {(assetsList as { assetId?: string; name?: string }[]).map((a) => (
              <option key={a.assetId ?? a.name} value={a.assetId ?? (a as { id?: string }).id ?? ''}>
                {a.name ?? 'Unnamed'}
              </option>
            ))}
          </select>
        </div>
        {assetId ? (
          <SensorChart
            title={`${sensorType.charAt(0).toUpperCase() + sensorType.slice(1)} Trend`}
            data={trendsArray}
            valueKey="avg_value"
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-gray-500">
            Select an asset to view trends
          </div>
        )}
      </section>

      {/* Comparison section - two assets side-by-side */}
      <section>
        <h2 className="mb-4 text-lg font-medium text-gray-300">Comparison</h2>
        <div className="mb-4 flex flex-wrap gap-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Asset 1</label>
            <select
              value={compareAssetId1}
              onChange={(e) => setCompareAssetId1(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select asset</option>
              {(assetsList as { assetId?: string; name?: string }[]).map((a) => (
                <option key={a.assetId ?? a.name} value={a.assetId ?? (a as { id?: string }).id ?? ''}>
                  {a.name ?? 'Unnamed'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Asset 2</label>
            <select
              value={compareAssetId2}
              onChange={(e) => setCompareAssetId2(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Select asset</option>
              {(assetsList as { assetId?: string; name?: string }[]).map((a) => (
                <option key={a.assetId ?? a.name} value={a.assetId ?? (a as { id?: string }).id ?? ''}>
                  {a.name ?? 'Unnamed'}
                </option>
              ))}
            </select>
          </div>
        </div>
        {compareAssetId1 || compareAssetId2 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {compareAssetId1 && (
              <SensorChart
                title={`${(assetsList as { assetId?: string; name?: string }[]).find((a) => (a.assetId ?? (a as { id?: string }).id) === compareAssetId1)?.name ?? 'Asset 1'} - ${sensorType}`}
                data={trends1Array}
                valueKey="avg_value"
              />
            )}
            {compareAssetId2 && (
              <SensorChart
                title={`${(assetsList as { assetId?: string; name?: string }[]).find((a) => (a.assetId ?? (a as { id?: string }).id) === compareAssetId2)?.name ?? 'Asset 2'} - ${sensorType}`}
                data={trends2Array}
                valueKey="avg_value"
              />
            )}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-gray-500">
            Select one or two assets to compare
          </div>
        )}
        {comparison && compareAssetId1 && (
          <div className="mt-6 grid gap-6 rounded-xl border border-gray-800 bg-gray-900 p-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-400">Current Period (Avg/Min/Max)</h3>
              <dl className="space-y-1 text-sm">
                <dd className="text-gray-100">
                  {(comparison as { period1?: { avg?: number; min?: number; max?: number } })?.period1?.avg?.toFixed(2) ?? '—'} /{' '}
                  {(comparison as { period1?: { avg?: number; min?: number; max?: number } })?.period1?.min?.toFixed(2) ?? '—'} /{' '}
                  {(comparison as { period1?: { avg?: number; min?: number; max?: number } })?.period1?.max?.toFixed(2) ?? '—'}
                </dd>
              </dl>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-400">Previous Period (Avg/Min/Max)</h3>
              <dl className="space-y-1 text-sm">
                <dd className="text-gray-100">
                  {(comparison as { period2?: { avg?: number; min?: number; max?: number } })?.period2?.avg?.toFixed(2) ?? '—'} /{' '}
                  {(comparison as { period2?: { avg?: number; min?: number; max?: number } })?.period2?.min?.toFixed(2) ?? '—'} /{' '}
                  {(comparison as { period2?: { avg?: number; min?: number; max?: number } })?.period2?.max?.toFixed(2) ?? '—'}
                </dd>
              </dl>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
