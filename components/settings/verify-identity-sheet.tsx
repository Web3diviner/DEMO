"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api/client";
import { patchSession } from "@/lib/auth/session";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/**
 * Tier-2 KYC (PRD §9.3): ID/BVN unlocks creator payouts. The BVN never persists client-side; the
 * backend verifies it and returns the new tier, which we reflect in the session.
 */
export function VerifyIdentitySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [bvn, setBvn] = React.useState("");
  const [done, setDone] = React.useState(false);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setBvn("");
      setDone(false);
    }
  }

  const verify = useMutation({
    mutationFn: () => api.auth.verifyIdentity(bvn),
    onSuccess: (r) => {
      patchSession({ kycTier: r.kycTier });
      setDone(true);
    },
  });

  return (
    <Sheet open={open} onClose={onClose} title={done ? " " : "Verify your identity"}>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="bg-success/15 text-success grid h-14 w-14 place-items-center rounded-full">
            <Check className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-lg font-semibold">Identity verified</p>
          <p className="text-subtle max-w-xs text-xs">
            You can now withdraw creator earnings to your bank.
          </p>
          <Button block onClick={onClose} className="mt-1">
            Done
          </Button>
        </div>
      ) : (
        <>
          <div className="bg-brand/15 text-brand mx-auto grid h-12 w-12 place-items-center rounded-2xl">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-muted mt-3 text-center text-sm">
            Required for creator payouts. We verify your BVN with your bank — it&apos;s never stored
            on your device.
          </p>
          <label htmlFor="bvn" className="text-subtle mt-5 mb-1 block text-xs font-medium">
            Bank Verification Number (BVN)
          </label>
          <input
            id="bvn"
            inputMode="numeric"
            autoComplete="off"
            value={bvn}
            onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
            placeholder="12345678901"
            className="border-line bg-surface focus-visible:outline-ring h-12 w-full rounded-lg border px-4 text-base tabular-nums focus-visible:outline-2"
          />
          {verify.isError && (
            <p className="text-danger mt-2 text-sm" role="alert">
              {verify.error instanceof Error ? verify.error.message : "Couldn't verify that BVN."}
            </p>
          )}
          <Button
            block
            className="mt-4"
            busy={verify.isPending}
            disabled={bvn.length !== 11 || verify.isPending}
            onClick={() => verify.mutate()}
          >
            {verify.isPending ? "Verifying…" : "Verify"}
          </Button>
        </>
      )}
    </Sheet>
  );
}
