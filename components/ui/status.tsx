import { cn } from "@/lib/utils/formatters";
import type { MessageStatus, RequestStatus } from "@/lib/types";

const PATH: RequestStatus[] = ["submitted", "validated", "confirmed", "dispatched", "completed"];

const tone: Record<RequestStatus, string> = {
  submitted: "bg-tone-cream text-ink",
  validated: "bg-tone-sand text-ink",
  confirmed: "bg-ok-soft text-ok",
  dispatched: "bg-ink text-card",
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

/** Progress along the request lifecycle (hidden for cancelled/rejected requests). */
export function StatusTrack({ status, labels }: { status: RequestStatus; labels: Record<RequestStatus, string> }) {
  const at = PATH.indexOf(status);
  if (at < 0) return null;
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label={labels[status]}>
      {PATH.map((s, i) => (
        <li key={s} className="space-y-1.5">
          <span className={cn("block h-1 rounded-full", i <= at ? "bg-ink" : "bg-line")} aria-hidden />
          <span className={cn("hidden text-[11px] sm:block", i === at ? "font-medium text-ink" : "text-ink/45")} aria-current={i === at ? "step" : undefined}>{labels[s]}</span>
        </li>
      ))}
    </ol>
  );
}
