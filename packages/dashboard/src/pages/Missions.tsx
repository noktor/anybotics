import { useState, type FormEvent } from 'react';
import { Plus, Play, Check, X } from 'lucide-react';
import {
  useMissions,
  useCreateMission,
  useUpdateMissionStatus,
  useRobots,
  useSites,
} from '@/api/hooks';
import DataTable, { type Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';

type MissionRow = {
  missionId?: string;
  mission_id?: string;
  name?: string;
  robot?: { name?: string };
  robotId?: string;
  site?: { name?: string };
  siteId?: string;
  status?: string;
  scheduledAt?: string;
  scheduled_at?: string;
  createdAt?: string;
  created_at?: string;
};

export default function Missions() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    siteId: '',
    robotId: '',
    cronExpression: '',
    scheduledAt: '',
  });

  const { data: missions = [] } = useMissions();
  const { data: robots = [] } = useRobots();
  const { data: sites = [] } = useSites();
  const createMutation = useCreateMission();
  const updateStatusMutation = useUpdateMissionStatus();

  const rows = (Array.isArray(missions) ? missions : missions?.data ?? missions ?? []) as MissionRow[];
  const robotsList = Array.isArray(robots) ? robots : robots?.data ?? robots ?? [];
  const sitesList = Array.isArray(sites) ? sites : sites?.data ?? sites ?? [];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate(
      {
        name: form.name,
        description: form.description || undefined,
        siteId: form.siteId,
        robotId: form.robotId || undefined,
        cronExpression: form.cronExpression || undefined,
        scheduledAt: form.scheduledAt || undefined,
      },
      {
        onSuccess: () => {
          setModalOpen(false);
          setForm({ name: '', description: '', siteId: '', robotId: '', cronExpression: '', scheduledAt: '' });
        },
      }
    );
  }

  const columns: Column<MissionRow>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-gray-100">{r.name ?? '—'}</span> },
    {
      key: 'robot',
      header: 'Robot',
      render: (r) => (
        <span className="text-gray-200">{r.robot?.name ?? r.robotId ?? '—'}</span>
      ),
    },
    {
      key: 'site',
      header: 'Site',
      render: (r) => (
        <span className="text-gray-200">{r.site?.name ?? r.siteId ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status ?? 'scheduled'} size="sm" />,
    },
    {
      key: 'scheduled',
      header: 'Scheduled',
      render: (r) => {
        const d = r.scheduledAt ?? r.scheduled_at;
        return (
          <span className="text-gray-200">
            {d ? new Date(d).toLocaleString() : '—'}
          </span>
        );
      },
    },
    {
      key: 'created',
      header: 'Created',
      render: (r) => {
        const d = r.createdAt ?? r.created_at;
        return (
          <span className="text-gray-200">
            {d ? new Date(d).toLocaleString() : '—'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => {
        const id = r.missionId ?? r.mission_id ?? '';
        const status = r.status ?? '';
        return (
          <div className="flex gap-2">
            {status === 'scheduled' && (
              <button
                type="button"
                onClick={() => updateStatusMutation.mutate({ id, status: 'running' })}
                disabled={updateStatusMutation.isPending}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600/20 px-2 py-1 text-xs font-medium text-blue-400 hover:bg-blue-600/30 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                Dispatch
              </button>
            )}
            {status === 'running' && (
              <button
                type="button"
                onClick={() => updateStatusMutation.mutate({ id, status: 'completed' })}
                disabled={updateStatusMutation.isPending}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/20 px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                Complete
              </button>
            )}
            {(status === 'scheduled' || status === 'running') && (
              <button
                type="button"
                onClick={() => updateStatusMutation.mutate({ id, status: 'cancelled' })}
                disabled={updateStatusMutation.isPending}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600/20 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-600/30 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-100">Missions</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-500"
        >
          <Plus className="h-5 w-5" />
          Create Mission
        </button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        keyExtractor={(r) => r.missionId ?? r.mission_id ?? r.name ?? ''}
        emptyMessage="No missions yet"
      />

      {/* Create mission modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-gray-900 p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-semibold text-gray-100">
              Create Mission
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Site</label>
                <select
                  value={form.siteId}
                  onChange={(e) => setForm((f) => ({ ...f, siteId: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select site</option>
                  {(sitesList as { siteId?: string; name?: string }[]).map((s) => (
                    <option key={s.siteId ?? s.name} value={s.siteId ?? (s as { id?: string }).id ?? ''}>
                      {s.name ?? 'Unnamed'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Robot</label>
                <select
                  value={form.robotId}
                  onChange={(e) => setForm((f) => ({ ...f, robotId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select robot (optional)</option>
                  {(robotsList as { robotId?: string; name?: string }[]).map((r) => (
                    <option key={r.robotId ?? r.name} value={r.robotId ?? (r as { id?: string }).id ?? ''}>
                      {r.name ?? 'Unnamed'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Cron Expression</label>
                <input
                  type="text"
                  value={form.cronExpression}
                  onChange={(e) => setForm((f) => ({ ...f, cronExpression: e.target.value }))}
                  placeholder="0 6 * * 2,4"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Scheduled At</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg bg-gray-800 px-4 py-2 font-medium text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
