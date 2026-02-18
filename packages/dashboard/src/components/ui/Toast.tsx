import { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

type ToastSeverity = 'low' | 'medium' | 'high' | 'critical';

type ToastProps = {
  message: string;
  severity?: ToastSeverity;
  onDismiss: () => void;
};

const SEVERITY_STYLES: Record<ToastSeverity, string> = {
  low: 'border-gray-600 bg-gray-800 text-gray-200',
  medium: 'border-amber-600/50 bg-amber-900/30 text-amber-200',
  high: 'border-orange-600/50 bg-orange-900/30 text-orange-200',
  critical: 'border-red-600/50 bg-red-900/30 text-red-200',
};

const AUTO_DISMISS_MS = 5000;

export default function Toast({
  message,
  severity = 'low',
  onDismiss,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="alert"
      className={clsx(
        'flex items-center justify-between gap-4 rounded-lg border px-4 py-3 shadow-lg',
        'animate-toast-slide-in',
        SEVERITY_STYLES[severity]
      )}
    >
      <p className="text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-1 transition-colors hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
