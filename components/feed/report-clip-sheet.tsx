"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { api } from "@/lib/api/client";
import { track } from "@/lib/analytics";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const REASONS = [
  "Spam or scam",
  "Nudity or sexual content",
  "Hate or harassment",
  "Violence or dangerous acts",
  "Intellectual property",
  "Something else",
];

export function ReportClipSheet({
  clipId,
  open,
  onClose,
}: {
  clipId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = React.useState<string | null>(null);

  // Reset on open — adjust-state-during-render, not an effect.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setReason(null);
  }

  const report = useMutation({
    mutationFn: () => api.clips.report(clipId, reason ?? "Something else"),
    onSuccess: () => track({ type: "engagement", action: "report", clipId }),
  });

  return (
    <Sheet open={open} onClose={onClose} title={report.isSuccess ? " " : "Report this clip"}>
      {report.isSuccess ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="bg-success/15 text-success grid h-14 w-14 place-items-center rounded-full">
            <Check className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-lg font-semibold">Thanks for reporting</p>
          <p className="text-subtle max-w-xs text-xs">
            Our team will review it. Reports are anonymous.
          </p>
          <Button block onClick={onClose} className="mt-1">
            Done
          </Button>
        </div>
      ) : (
        <>
          <p className="text-muted mb-3 text-sm">Why are you reporting this?</p>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(r)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border p-3.5 text-left text-sm transition-colors",
                  reason === r ? "border-brand bg-brand/10 text-brand" : "border-line text-fg",
                )}
              >
                {r}
                {reason === r && <Check className="h-4 w-4" aria-hidden />}
              </button>
            ))}
          </div>
          <Button
            block
            className="mt-4"
            busy={report.isPending}
            disabled={!reason || report.isPending}
            onClick={() => report.mutate()}
          >
            Submit report
          </Button>
        </>
      )}
    </Sheet>
  );
}
