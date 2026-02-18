import { useMemo, useRef, useEffect, useState } from 'react';
import { MapPin, Battery, Gauge, Navigation2, ScanSearch, MoveRight, BatteryCharging, Undo2, WifiOff, Wifi, Clock } from 'lucide-react';
import { useRobots, useLatestPoses } from '@/api/hooks';
import { usePoseSocket, type PoseEvent } from '@/socket/usePoseSocket';

function timeAgo(ts: string | undefined): string {
  if (!ts) return 'unknown';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 0) return 'just now';
  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ROBOT_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

const WAYPOINTS = [
  { x: 0,  y: 0,  label: 'Dock',              inspection: false, deadZone: false, weakSignal: false },
  { x: 10, y: 0,  label: 'Corridor A',         inspection: false, deadZone: false, weakSignal: false },
  { x: 20, y: 5,  label: 'Turbine Hall Entry', inspection: false, deadZone: false, weakSignal: false },
  { x: 30, y: 10, label: 'Turbine T-101',      inspection: true,  deadZone: false, weakSignal: false },
  { x: 35, y: 20, label: 'Bearing B-101',      inspection: true,  deadZone: false, weakSignal: false },
  { x: 40, y: 30, label: 'Cooling Section',    inspection: true,  deadZone: false, weakSignal: false },
  { x: 35, y: 40, label: 'Pump P-201',         inspection: true,  deadZone: false, weakSignal: false },
  { x: 25, y: 45, label: 'Pipe Gallery',       inspection: false, deadZone: true,  weakSignal: false },
  { x: 15, y: 40, label: 'Gas Detection',      inspection: true,  deadZone: false, weakSignal: true },
  { x: 10, y: 30, label: 'Storage Area',       inspection: false, deadZone: true,  weakSignal: false },
  { x: 5,  y: 20, label: 'Corridor B',         inspection: false, deadZone: false, weakSignal: false },
  { x: 0,  y: 10, label: 'Return Path',        inspection: false, deadZone: false, weakSignal: false },
];

const MAP_PADDING = 30;
const MAP_MIN_X = -5;
const MAP_MAX_X = 45;
const MAP_MIN_Y = -5;
const MAP_MAX_Y = 50;

function toSvg(x: number, y: number, width: number, height: number) {
  const sx = MAP_PADDING + ((x - MAP_MIN_X) / (MAP_MAX_X - MAP_MIN_X)) * (width - 2 * MAP_PADDING);
  const sy = MAP_PADDING + ((MAP_MAX_Y - y - MAP_MIN_Y) / (MAP_MAX_Y - MAP_MIN_Y)) * (height - 2 * MAP_PADDING);
  return { sx, sy };
}

type RobotRow = { robotId?: string; robot_id?: string; name?: string; status?: string };

export default function LiveMap() {
  const { data: robots = [] } = useRobots();
  const { data: apiPoses = [] } = useLatestPoses();
  const { poses: livePoses, trails, stale } = usePoseSocket();
  const svgRef = useRef<SVGSVGElement>(null);

  // Re-render every 5s so "time ago" labels stay current
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const robotList = (Array.isArray(robots) ? robots : []) as RobotRow[];

  const robotMap = useMemo(() => {
    const m: Record<string, { name: string; color: string; status: string }> = {};
    robotList.forEach((r, i) => {
      const id = r.robotId ?? r.robot_id ?? '';
      m[id] = { name: r.name ?? `Robot ${i}`, color: ROBOT_COLORS[i % ROBOT_COLORS.length], status: r.status ?? 'offline' };
    });
    return m;
  }, [robotList]);

  const mergedPoses = useMemo(() => {
    const m: Record<string, PoseEvent> = {};
    (Array.isArray(apiPoses) ? apiPoses : []).forEach((p: Record<string, unknown>) => {
      const id = (p.robot_id ?? p.robotId) as string;
      if (id) m[id] = {
        robotId: id,
        x: p.x as number,
        y: p.y as number,
        z: (p.z ?? 0) as number,
        heading: (p.heading ?? 0) as number,
        speed: (p.speed ?? 0) as number,
        batteryLevel: (p.battery_level ?? p.batteryLevel ?? 100) as number,
        timestamp: (p.time ?? p.timestamp) as string,
        waypointIndex: p.waypoint_idx as number | undefined,
        state: p.state as PoseEvent['state'],
        currentWaypoint: p.current_waypoint as string | undefined,
      };
    });
    Object.entries(livePoses).forEach(([id, pose]) => { m[id] = pose; });
    return m;
  }, [apiPoses, livePoses]);

  const W = 800;
  const H = 600;

  useEffect(() => {
    if (svgRef.current) {
      svgRef.current.setAttribute('viewBox', `0 0 ${W} ${H}`);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-100">
          <MapPin className="h-7 w-7 text-emerald-500" />
          Live Map
        </h1>
        <span className="text-sm text-gray-400">
          {Object.keys(mergedPoses).length} robot(s) tracked
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* SVG Map */}
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-950">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="h-full w-full"
            style={{ minHeight: 500 }}
          >
            {/* Grid */}
            {Array.from({ length: 11 }, (_, i) => {
              const x = MAP_PADDING + (i / 10) * (W - 2 * MAP_PADDING);
              return <line key={`gx${i}`} x1={x} y1={MAP_PADDING} x2={x} y2={H - MAP_PADDING} stroke="#1f2937" strokeWidth="0.5" />;
            })}
            {Array.from({ length: 11 }, (_, i) => {
              const y = MAP_PADDING + (i / 10) * (H - 2 * MAP_PADDING);
              return <line key={`gy${i}`} x1={MAP_PADDING} y1={y} x2={W - MAP_PADDING} y2={y} stroke="#1f2937" strokeWidth="0.5" />;
            })}

            {/* Dead zone / weak signal area shading */}
            <defs>
              <pattern id="dead-zone-hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.3" />
              </pattern>
              <pattern id="weak-signal-hatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(-30)">
                <line x1="0" y1="0" x2="0" y2="10" stroke="#f59e0b" strokeWidth="0.8" strokeOpacity="0.2" />
              </pattern>
            </defs>
            {WAYPOINTS.filter((wp) => wp.deadZone || wp.weakSignal).map((wp, i) => {
              const { sx, sy } = toSvg(wp.x, wp.y, W, H);
              const isDeadZone = wp.deadZone;
              return (
                <g key={`zone-${i}`}>
                  <circle
                    cx={sx}
                    cy={sy}
                    r="35"
                    fill={isDeadZone ? 'url(#dead-zone-hatch)' : 'url(#weak-signal-hatch)'}
                    stroke={isDeadZone ? '#ef4444' : '#f59e0b'}
                    strokeWidth="1"
                    strokeOpacity="0.25"
                    strokeDasharray={isDeadZone ? '4,2' : '2,3'}
                  />
                  <text x={sx + 28} y={sy + 28} fill={isDeadZone ? '#ef4444' : '#f59e0b'} fontSize="7" fontFamily="sans-serif" opacity="0.6">
                    {isDeadZone ? 'NO SIGNAL' : 'WEAK'}
                  </text>
                </g>
              );
            })}

            {/* Waypoint route */}
            <polyline
              points={WAYPOINTS.map((wp) => {
                const { sx, sy } = toSvg(wp.x, wp.y, W, H);
                return `${sx},${sy}`;
              }).join(' ')}
              fill="none"
              stroke="#374151"
              strokeWidth="2"
              strokeDasharray="6,4"
            />
            {(() => {
              const last = WAYPOINTS[WAYPOINTS.length - 1];
              const first = WAYPOINTS[0];
              const p1 = toSvg(last.x, last.y, W, H);
              const p2 = toSvg(first.x, first.y, W, H);
              return (
                <line x1={p1.sx} y1={p1.sy} x2={p2.sx} y2={p2.sy} stroke="#374151" strokeWidth="2" strokeDasharray="6,4" />
              );
            })()}

            {/* Waypoint markers */}
            {WAYPOINTS.map((wp, i) => {
              const { sx, sy } = toSvg(wp.x, wp.y, W, H);
              return (
                <g key={`wp${i}`}>
                  {wp.inspection ? (
                    <>
                      <rect x={sx - 6} y={sy - 6} width="12" height="12" rx="2" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.2" />
                      <text x={sx} y={sy - 10} textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="600" fontFamily="sans-serif">
                        {wp.label}
                      </text>
                    </>
                  ) : (
                    <>
                      <circle cx={sx} cy={sy} r="3" fill={wp.deadZone ? '#7f1d1d' : '#374151'} stroke={wp.deadZone ? '#ef4444' : '#6b7280'} strokeWidth="0.8" />
                      <text x={sx} y={sy - 8} textAnchor="middle" fill={wp.deadZone ? '#fca5a5' : '#6b7280'} fontSize="8" fontFamily="sans-serif">
                        {wp.label}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Robot trails (segmented — breaks at dead zone gaps) */}
            {Object.entries(trails).map(([robotId, segments]) => {
              const color = robotMap[robotId]?.color ?? '#6b7280';
              return segments.map((seg, si) => {
                if (seg.length < 2) return null;
                return (
                  <polyline
                    key={`trail-${robotId}-${si}`}
                    points={seg.map((p) => {
                      const { sx, sy } = toSvg(p.x, p.y, W, H);
                      return `${sx},${sy}`;
                    }).join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />
                );
              });
            })}

            {/* Robot positions */}
            {Object.entries(mergedPoses).map(([robotId, pose]) => {
              const { sx, sy } = toSvg(pose.x, pose.y, W, H);
              const info = robotMap[robotId];
              const color = info?.color ?? '#6b7280';
              const name = info?.name ?? robotId.slice(-4);
              const isOffline = stale[robotId] || info?.status === 'offline';
              const st = isOffline ? 'offline' : (pose.state ?? (pose.speed === 0 ? 'inspecting' : 'traveling'));
              const headingRad = (pose.heading * Math.PI) / 180;
              const arrowLen = 14;
              const ax = sx + Math.cos(headingRad) * arrowLen;
              const ay = sy - Math.sin(headingRad) * arrowLen;

              const stLabel: Record<string, string> = {
                inspecting: 'inspecting',
                charging: 'charging',
                returning_to_dock: 'returning',
                offline: `signal lost · ${timeAgo(pose.timestamp)}`,
              };

              const renderColor = isOffline ? '#6b7280' : color;

              return (
                <g key={`robot-${robotId}`} opacity={isOffline ? 0.45 : 1}>
                  {isOffline ? (
                    <>
                      <circle cx={sx} cy={sy} r="18" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.5">
                        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <line x1={sx - 5} y1={sy - 5} x2={sx + 5} y2={sy + 5} stroke="#ef4444" strokeWidth="1.5" opacity="0.6" />
                      <line x1={sx + 5} y1={sy - 5} x2={sx - 5} y2={sy + 5} stroke="#ef4444" strokeWidth="1.5" opacity="0.6" />
                    </>
                  ) : st === 'charging' ? (
                    <>
                      <circle cx={sx} cy={sy} r="20" fill="#facc15" fillOpacity="0.08" stroke="#facc15" strokeWidth="1.5">
                        <animate attributeName="r" values="18;22;18" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
                      </circle>
                    </>
                  ) : st === 'inspecting' ? (
                    <>
                      <circle cx={sx} cy={sy} r="22" fill="none" stroke={renderColor} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6">
                        <animateTransform attributeName="transform" type="rotate" from={`0 ${sx} ${sy}`} to={`360 ${sx} ${sy}`} dur="3s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={sx} cy={sy} r="15" fill={renderColor} fillOpacity="0.1" stroke={renderColor} strokeWidth="0.8" />
                    </>
                  ) : st === 'returning_to_dock' ? (
                    <>
                      <circle cx={sx} cy={sy} r="18" fill="#f59e0b" fillOpacity="0.1" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" />
                      <line x1={sx} y1={sy} x2={ax} y2={ay} stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,2" />
                      <circle cx={ax} cy={ay} r="2" fill="#f59e0b" />
                    </>
                  ) : (
                    <>
                      <circle cx={sx} cy={sy} r="18" fill={renderColor} fillOpacity="0.15" stroke={renderColor} strokeWidth="1" />
                      <line x1={sx} y1={sy} x2={ax} y2={ay} stroke={renderColor} strokeWidth="2.5" />
                      <circle cx={ax} cy={ay} r="2" fill={renderColor} />
                    </>
                  )}
                  <circle cx={sx} cy={sy} r="7" fill={isOffline ? '#6b7280' : st === 'charging' ? '#facc15' : st === 'returning_to_dock' ? '#f59e0b' : renderColor} />
                  <text x={sx} y={sy - 26} textAnchor="middle" fill={renderColor} fontSize="11" fontWeight="bold" fontFamily="sans-serif">
                    {name}
                  </text>
                  {stLabel[st] && (
                    <text x={sx} y={sy + 20} textAnchor="middle" fill={isOffline ? '#ef4444' : st === 'charging' ? '#facc15' : renderColor} fontSize="8" fontFamily="sans-serif" opacity="0.8">
                      {stLabel[st]}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Robot info cards */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {Object.entries(mergedPoses).length === 0 && (
            <p className="text-center text-sm text-gray-500">No pose data yet. Start the simulator.</p>
          )}
          {Object.entries(mergedPoses).map(([robotId, pose]) => {
            const info = robotMap[robotId];
            const color = info?.color ?? '#6b7280';
            const isOffline = stale[robotId] || info?.status === 'offline';
            const st = isOffline ? 'offline' : (pose.state ?? (pose.speed === 0 ? 'inspecting' : 'traveling'));
            const wpLabel = pose.currentWaypoint ?? WAYPOINTS[pose.waypointIndex ?? 0]?.label ?? `WP ${pose.waypointIndex}`;
            const batteryLow = pose.batteryLevel < 30;

            const stateBadge: Record<string, { icon: typeof Battery; label: string; cls: string }> = {
              traveling:         { icon: MoveRight,        label: 'Traveling',    cls: 'bg-emerald-500/15 text-emerald-400' },
              inspecting:        { icon: ScanSearch,       label: 'Inspecting',   cls: 'bg-blue-500/15 text-blue-400' },
              returning_to_dock: { icon: Undo2,            label: 'Returning',    cls: 'bg-amber-500/15 text-amber-400' },
              charging:          { icon: BatteryCharging,  label: 'Charging',     cls: 'bg-yellow-500/15 text-yellow-400' },
              offline:           { icon: WifiOff,          label: 'Signal Lost',  cls: 'bg-red-500/15 text-red-400' },
            };
            const badge = stateBadge[st] ?? stateBadge.traveling;
            const BadgeIcon = badge.icon;

            return (
              <div
                key={robotId}
                className={`rounded-xl border bg-gray-900 p-4 ${isOffline ? 'border-red-900/50 opacity-60' : 'border-gray-800'}`}
                style={{ borderLeftColor: isOffline ? '#ef4444' : color, borderLeftWidth: 3 }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-gray-100">
                    {isOffline ? <WifiOff className="h-3.5 w-3.5 text-red-400" /> : <Wifi className="h-3.5 w-3.5 text-emerald-400" />}
                    {info?.name ?? robotId.slice(-8)}
                  </span>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                    <BadgeIcon className="h-3 w-3" />
                    {badge.label}
                  </span>
                </div>
                {isOffline && (
                  <p className="mb-2 flex items-center gap-1 text-xs text-red-400/80">
                    <Clock className="h-3 w-3" />
                    Last seen {timeAgo(pose.timestamp)} — no telemetry
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {wpLabel}
                  </span>
                  <span className="flex items-center gap-1">
                    <Gauge className="h-3 w-3" />
                    {isOffline ? '—' : `${pose.speed} m/s`}
                  </span>
                  <span className={`flex items-center gap-1 ${batteryLow && !isOffline ? 'text-amber-400' : ''}`}>
                    {st === 'charging' ? <BatteryCharging className="h-3 w-3" /> : <Battery className="h-3 w-3" />}
                    {isOffline ? `~${pose.batteryLevel}%` : `${pose.batteryLevel}%`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Navigation2 className="h-3 w-3" />
                    ({pose.x}, {pose.y})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-6 rounded-xl border border-gray-800 bg-gray-900 px-5 py-3 text-xs text-gray-400">
        <span className="font-medium text-gray-300">Map legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-blue-500 bg-blue-900/50" />
          Inspection point
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border border-red-500/50 bg-red-900/30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(239,68,68,0.2) 2px, rgba(239,68,68,0.2) 3px)' }} />
          Dead zone (no signal)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border border-amber-500/50 bg-amber-900/20" style={{ backgroundImage: 'repeating-linear-gradient(-30deg, transparent, transparent 2px, rgba(245,158,11,0.2) 2px, rgba(245,158,11,0.2) 3px)' }} />
          Weak signal (EMI)
        </span>
        <span className="flex items-center gap-1.5">
          <WifiOff className="h-3 w-3 text-red-400" />
          Robot offline
        </span>
      </div>
    </div>
  );
}
