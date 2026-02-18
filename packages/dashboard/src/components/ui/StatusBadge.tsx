import clsx from 'clsx';

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-emerald-500',
  completed: 'bg-emerald-500',
  offline: 'bg-red-500',
  failed: 'bg-red-500',
  charging: 'bg-amber-500',
  scheduled: 'bg-amber-500',
  on_mission: 'bg-blue-500',
  running: 'bg-blue-500',
  error: 'bg-red-500',
  critical: 'bg-red-500',
  maintenance: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-gray-500',
  high: 'bg-orange-500',
};

type StatusBadgeProps = {
  status: string;
  size?: 'sm' | 'md';
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  const dotColor = STATUS_COLORS[normalized] ?? 'bg-gray-500';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' && 'gap-1 px-2 py-0.5 text-xs',
        size === 'md' && 'gap-1.5 px-2.5 py-1 text-sm',
        'bg-gray-800 text-gray-200'
      )}
    >
      <span
        className={clsx(
          'shrink-0 rounded-full',
          dotColor,
          size === 'sm' && 'h-1.5 w-1.5',
          size === 'md' && 'h-2 w-2'
        )}
      />
      <span className="capitalize">{status.replace(/_/g, ' ')}</span>
    </span>
  );
}
