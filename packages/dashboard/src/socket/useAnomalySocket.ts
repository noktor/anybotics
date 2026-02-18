import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export type AnomalyEvent = {
  id: string;
  severity?: string;
  message?: string;
  timestamp?: string;
  acknowledged?: boolean;
  [key: string]: unknown;
};

export function useAnomalySocket() {
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [latestAnomaly, setLatestAnomaly] = useState<AnomalyEvent | null>(null);

  useEffect(() => {
    const socket = io(window.location.origin + '/alerts', { path: '/socket.io' });

    socket.on('anomaly', (event: AnomalyEvent) => {
      setLatestAnomaly(event);
      setAnomalies((prev) => [event, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const unacknowledgedCount = anomalies.filter((a) => !a.acknowledged).length;

  return { anomalies, latestAnomaly, unacknowledgedCount };
}
