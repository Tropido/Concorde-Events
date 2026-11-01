import { cn } from "@/lib/utils/formatters";
import type { MessageStatus, RequestStatus } from "@/lib/types";

const PATH: RequestStatus[] = ["submitted", "validated", "accepted", "confirmed", "dispatched", "returned", "completed"];

const tone: Record<RequestStatus, string> = {
  submitted: "bg-tone-cream text-ink",
  validated: "bg-tone-sand text-ink",
  accepted: "bg-warn-soft text-warn",
  confirmed: "bg-ok-soft text-ok",
  dispatched: "bg-ink text-card",
  returned: "bg-tone-tan text-ink",
  completed: "bg-paper text-ink/60",
  cancelled: "bg-paper text-ink/45 line-through",
  rejected: "bg-bad-soft text-bad",
};

export function StatusPill({ status, label, className }: { status: RequestStatus; label: string; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium", tone[status], className)}>{label}</span>;
}

const msgTone: Record<MessageStatus, string> = {
  open: "bg-warn-soft text-warn",
  in_progress: "bg-tone-sand text-ink",
  resolved: "bg-paper text-ink/50",
};

export function MessagePill({ status, label }: { status: MessageStatus; label: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium", msgTone[status])}>{label}</span>;
}

/** Received against expected, with its figures written out. */
export function ProgressBar({ label, value, max, caption }: { label: string; value: number; max: number; caption: string }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <p className="flex items-baseline justify-between gap-3 text-xs"><span className="text-ink/60">{label}</span><span className="tabular-nums">{caption}</span></p>
      <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/** Progress along the request lifecycle (hidden for cancelled/rejected requests). */
export function StatusTrack({ status, labels }: { status: RequestStatus; labels: Record<RequestStatus, string> }) {
  const at = PATH.indexOf(status);
  if (at < 0) return null;
  return (
    <ol className="grid grid-cols-7 gap-1.5" aria-label={labels[status]}>
      {PATH.map((s, i) => (
        <li key={s} className="space-y-1.5">
          <span className={cn("block h-1 rounded-full", i <= at ? "bg-ink" : "bg-line")} aria-hidden />
          <span className={cn("hidden text-[11px] sm:block", i === at ? "font-medium text-ink" : "text-ink/45")} aria-current={i === at ? "step" : undefined}>{labels[s]}</span>
        </li>
      ))}
    </ol>
  );
}
