import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export type PoseEvent = {
  robotId: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  batteryLevel: number;
  timestamp: string;
  waypointIndex?: number;
  state?: 'traveling' | 'inspecting' | 'returning_to_dock' | 'charging';
  currentWaypoint?: string;
};

type Point = { x: number; y: number };

const MAX_TRAIL_POINTS = 200;
const JUMP_THRESHOLD = 5;
const POSE_STALE_MS = 5_000; // consider robot offline if no pose for 5 seconds

export function usePoseSocket() {
  const [poses, setPoses] = useState<Record<string, PoseEvent>>({});
  const [trails, setTrails] = useState<Record<string, Point[][]>>({});
  const [stale, setStale] = useState<Record<string, boolean>>({});
  const lastSeenRef = useRef<Record<string, number>>({});

  const clearTrails = useCallback(() => setTrails({}), []);

  useEffect(() => {
    const socket: Socket = io(window.location.origin + '/poses', {
      path: '/socket.io',
    });

    socket.on('pose', (event: PoseEvent) => {
      lastSeenRef.current[event.robotId] = Date.now();

      setPoses((prev) => ({ ...prev, [event.robotId]: event }));
      setStale((prev) => (prev[event.robotId] ? { ...prev, [event.robotId]: false } : prev));

      setTrails((prev) => {
        const segments = prev[event.robotId] ?? [[]];
        const lastSeg = segments[segments.length - 1];
        const lastPt = lastSeg[lastSeg.length - 1];
        const pt: Point = { x: event.x, y: event.y };

        let updated: Point[][];
        if (lastPt) {
          const dx = pt.x - lastPt.x;
          const dy = pt.y - lastPt.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > JUMP_THRESHOLD) {
            updated = [...segments, [pt]];
          } else {
            updated = [...segments.slice(0, -1), [...lastSeg, pt]];
          }
        } else {
          updated = [[pt]];
        }

        let total = updated.reduce((s, seg) => s + seg.length, 0);
        while (total > MAX_TRAIL_POINTS && updated.length > 1) {
          total -= updated[0].length;
          updated.shift();
        }

        return { ...prev, [event.robotId]: updated };
      });
    });

    // Check for stale poses every 2 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      const next: Record<string, boolean> = {};
      let changed = false;
      for (const [id, ts] of Object.entries(lastSeenRef.current)) {
        const isStale = now - ts > POSE_STALE_MS;
        next[id] = isStale;
        if (isStale !== (stale[id] ?? false)) changed = true;
      }
      if (changed) setStale(next);
    }, 2_000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { poses, trails, stale, clearTrails };
}
