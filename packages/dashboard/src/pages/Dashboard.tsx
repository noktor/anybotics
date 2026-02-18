import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, AlertTriangle } from 'lucide-react';
import { useRobots, useAnomalies } from '@/api/hooks';
import { useAnomalySocket } from '@/socket/useAnomalySocket';
import { usePoseSocket } from '@/socket/usePoseSocket';
import AnomalySummary from '@/components/charts/AnomalySummary';
import StatusBadge from '@/components/ui/StatusBadge';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: robots = [], isLoading: robotsLoading } = useRobots();
  const { data: anomalies = [] } = useAnomalies();
  const { latestAnomaly } = useAnomalySocket();
  const { stale } = usePoseSocket();

  useEffect(() => {
    if (latestAnomaly) {
      const desc = (latestAnomaly.description ?? latestAnomaly.message ?? '') as string;
      const severity = (latestAnomaly.severity ?? 'medium') as string;
      const msg = desc || `New ${severity} anomaly detected`;
      toast.error(msg, {
        icon: severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : '⚠️',
        duration: 6000,
      });
    }
  }, [latestAnomaly]);

  const summaryData = (() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const a of anomalies as { severity?: string }[]) {
      const s = (a.severity ?? 'medium').toLowerCase();
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return Object.entries(counts).map(([severity, count]) => ({ severity, count }));
  })();

  const recentAnomalies = (anomalies as { id?: string; anomaly_id?: string; time?: string; severity?: string; description?: string; message?: string; robot_name?: string; metadata?: Record<string, string> | null }[]).slice(0, 5);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>

      {/* Robot status cards */}
      <section>
        <h2 className="mb-4 text-lg font-medium text-gray-300">Robot Status</h2>
        {robotsLoading ? (
          <p className="text-gray-500">Loading robots...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(robots as { robotId?: string; name?: string; model?: string; status?: string; lastSeenAt?: string }[]).map((robot) => {
              const liveOffline = robot.robotId ? stale[robot.robotId] : false;
              const effectiveStatus = liveOffline ? 'offline' : (robot.status ?? 'offline');
              return (
                <button
                  key={robot.robotId ?? robot.name}
                  type="button"
                  onClick={() => navigate(`/robots/${robot.robotId ?? ''}`)}
                  className="flex items-start gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4 text-left transition-colors hover:border-gray-700 hover:bg-gray-800/50"
                >
                  <div className="rounded-lg bg-gray-800 p-2">
                    <Bot className={`h-6 w-6 ${liveOffline ? 'text-gray-500' : 'text-emerald-500'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-100">{robot.name ?? 'Unknown'}</p>
                    <p className="text-sm text-gray-400">{robot.model ?? 'ANYmal X'}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <StatusBadge status={effectiveStatus} size="sm" />
                      <span className="text-xs text-gray-500">
                        {robot.lastSeenAt
                          ? new Date(robot.lastSeenAt).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Anomaly summary + recent anomalies */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AnomalySummary data={summaryData} />
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-lg">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-100">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Recent Anomalies
            </h3>
            <ul className="space-y-2">
              {recentAnomalies.length === 0 ? (
                <li className="text-sm text-gray-500">No recent anomalies</li>
              ) : (
                recentAnomalies.map((a) => (
                  <li
                    key={a.anomaly_id ?? a.id ?? a.time}
                    className="flex items-start justify-between gap-3 rounded-lg bg-gray-800/50 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-gray-200">{a.description ?? a.message ?? 'Anomaly detected'}</p>
                      {a.robot_name && (
                        <p className="text-xs text-gray-500">{a.robot_name}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={a.severity ?? 'medium'} size="sm" />
                      <span className="whitespace-nowrap text-xs text-gray-500">
                        {a.time ? new Date(a.time).toLocaleString() : ''}
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
