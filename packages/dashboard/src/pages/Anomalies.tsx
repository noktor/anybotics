import { useState } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { useAnomalies, useAcknowledgeAnomaly } from '@/api/hooks';
import { useAnomalySocket } from '@/socket/useAnomalySocket';
import DataTable, { type Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';

type AnomalyRow = {
  anomaly_id?: string;
  id?: string;
  time?: string;
  robot_id?: string;
  robot_name?: string;
  asset_name?: string;
  sensor_id?: string;
  anomaly_type?: string;
  severity?: string;
  description?: string;
  value?: number;
  threshold?: number;
  acknowledged?: boolean;
  metadata?: Record<string, string> | null;
};

function formatAnomalyType(t?: string): string {
  if (!t) return '—';
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Anomalies() {
  const [severity, setSeverity] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { unacknowledgedCount } = useAnomalySocket();

  const params = {
    severity: severity || undefined,
    from: from || undefined,
    to: to || undefined,
  };

  const { data: anomalies = [], isLoading } = useAnomalies(params);
  const acknowledgeMutation = useAcknowledgeAnomaly();

  const rows = (Array.isArray(anomalies) ? anomalies : anomalies?.data ?? anomalies ?? []) as AnomalyRow[];

  const columns: Column<AnomalyRow>[] = [
    {
      key: 'time',
      header: 'Time',
      render: (r) => (
        <span className="whitespace-nowrap text-gray-200">
          {r.time ? new Date(r.time).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (r) => <StatusBadge status={r.severity ?? 'medium'} size="sm" />,
    },
    {
      key: 'description',
      header: 'Description',
      render: (r) => (
        <div className="max-w-md">
          <p className="text-sm text-gray-200">{r.description ?? '—'}</p>
          {r.metadata?.currentWaypoint && (
            <p className="mt-0.5 text-xs text-gray-500">
              Location: {r.metadata.currentWaypoint}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'robot',
      header: 'Robot',
      render: (r) => (
        <span className="text-gray-200">
          {r.robot_name ?? r.robot_id?.slice(0, 8) ?? '—'}
        </span>
      ),
    },
    {
      key: 'asset',
      header: 'Asset',
      render: (r) => (
        <span className="text-gray-200">
          {r.asset_name ?? r.metadata?.assetName ?? '—'}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => (
        <span className="text-gray-300 text-xs">
          {formatAnomalyType(r.anomaly_type)}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (r) => {
        const unit = r.metadata?.unit ?? '';
        return (
          <span className="font-mono text-gray-200">
            {r.value != null ? `${r.value}${unit}` : '—'}
          </span>
        );
      },
    },
    {
      key: 'threshold',
      header: 'Threshold',
      render: (r) => {
        const unit = r.metadata?.unit ?? '';
        return (
          <span className="font-mono text-gray-400">
            {r.threshold != null ? `${r.threshold}${unit}` : '—'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (r) => {
        const id = r.anomaly_id ?? r.id ?? '';
        if (r.acknowledged) {
          return <span className="text-xs text-emerald-500">Acknowledged</span>;
        }
        return (
          <button
            type="button"
            onClick={() => acknowledgeMutation.mutate(id)}
            disabled={acknowledgeMutation.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-800 px-2 py-1 text-xs font-medium text-gray-200 hover:bg-gray-700 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Ack
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-100">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          Anomalies
          {unacknowledgedCount != null && unacknowledgedCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-sm font-medium text-amber-400">
              {unacknowledgedCount} new
            </span>
          )}
        </h1>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center gap-2">
          <label htmlFor="severity" className="text-sm text-gray-400">
            Severity
          </label>
          <select
            id="severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="from" className="text-sm text-gray-400">
            From
          </label>
          <input
            id="from"
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="to" className="text-sm text-gray-400">
            To
          </label>
          <input
            id="to"
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading anomalies...</p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          keyExtractor={(r) => r.anomaly_id ?? r.id ?? r.time ?? ''}
          emptyMessage="No anomalies found"
        />
      )}
    </div>
  );
}
