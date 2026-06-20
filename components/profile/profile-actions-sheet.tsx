"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Flag, ShieldBan } from "lucide-react";
import { api } from "@/lib/api/client";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { BlockedUser } from "@/lib/api/types";

type Phase = "menu" | "block" | "blocked" | "report" | "reported";

const REPORT_REASONS = [
  "Spam or scam",
  "Harassment or bullying",
  "Nudity or sexual content",
  "Hate speech",
  "Something else",
];

export function ProfileActionsSheet({
  open,
  onClose,
  handle,
  displayName,
  verified,
}: {
  open: boolean;
  onClose: () => void;
  handle: string;
  displayName: string;
  verified: boolean;
}) {
  const qc = useQueryClient();
  const [phase, setPhase] = React.useState<Phase>("menu");
  const [reason, setReason] = React.useState<string | null>(null);

  // Reset to the menu whenever the sheet (re)opens.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPhase("menu");
      setReason(null);
    }
  }

  const block = useMutation({
    mutationFn: () => api.privacy.block(handle),
    onSuccess: (list: BlockedUser[]) => {
      qc.setQueryData(["blocked"], list);
      setPhase("blocked");
    },
  });

  const report = useMutation({
    mutationFn: () => api.profiles.report(handle, reason ?? "Something else"),
    onSuccess: () => setPhase("reported"),
  });

  return (
    <Sheet open={open} onClose={onClose} title={phase === "menu" ? `@${handle}` : " "}>
      {phase === "menu" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setPhase("report")}
            className="border-line hover:bg-elevated/60 flex w-full items-center gap-3 rounded-lg border p-4 text-left"
          >
            <Flag className="text-muted h-5 w-5 shrink-0" aria-hidden />
            <span>
              <span className="block font-medium">Report</span>
              <span className="text-subtle text-xs">Flag this account for review</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPhase("block")}
            className="border-line text-danger hover:bg-danger/5 flex w-full items-center gap-3 rounded-lg border p-4 text-left"
          >
            <ShieldBan className="h-5 w-5 shrink-0" aria-hidden />
            <span>
              <span className="block font-medium">Block @{handle}</span>
              <span className="text-subtle text-xs">They can&apos;t find or message you</span>
            </span>
          </button>
        </div>
      )}

      {phase === "block" && (
        <div className="text-center">
          <span className="bg-danger/15 text-danger mx-auto grid h-14 w-14 place-items-center rounded-full">
            <ShieldBan className="h-7 w-7" aria-hidden />
          </span>
          <p className="mt-3 text-lg font-semibold">Block {displayName}?</p>
          <p className="text-subtle mx-auto mt-1 max-w-xs text-sm">
            They won&apos;t be able to find your profile, view your clips, or message you. They
            won&apos;t be told.
          </p>
          <div className="mt-4 flex gap-2">
            <Button block variant="secondary" onClick={() => setPhase("menu")}>
              Cancel
            </Button>
            <Button
              block
              className="bg-danger text-white"
              busy={block.isPending}
              onClick={() => block.mutate()}
            >
              Block
            </Button>
          </div>
        </div>
      )}

      {phase === "blocked" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="bg-success/15 text-success grid h-14 w-14 place-items-center rounded-full">
            <Check className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-lg font-semibold">Blocked @{handle}</p>
          <p className="text-subtle max-w-xs text-xs">
            You can manage blocked accounts anytime in Settings → Privacy.
          </p>
          <Button block onClick={onClose} className="mt-1">
            Done
          </Button>
        </div>
      )}

      {phase === "report" && (
        <div>
          <p className="text-muted mb-3 text-sm">
            Why are you reporting{" "}
            <span className="text-fg font-medium">
              @{handle}
              {verified ? " ✓" : ""}
            </span>
            ?
          </p>
          <div className="space-y-2">
            {REPORT_REASONS.map((r) => (
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
        </div>
      )}

      {phase === "reported" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="bg-success/15 text-success grid h-14 w-14 place-items-center rounded-full">
            <Check className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-lg font-semibold">Thanks for reporting</p>
          <p className="text-subtle max-w-xs text-xs">
            Our team will review @{handle}. We keep reports anonymous.
          </p>
          <Button block onClick={onClose} className="mt-1">
            Done
          </Button>
        </div>
      )}
    </Sheet>
  );
}
