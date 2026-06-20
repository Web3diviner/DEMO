"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api/client";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { EarningsSummary, PayoutMethod } from "@/lib/api/types";

export function PayoutMethodSheet({
  open,
  onClose,
  currentMethod,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  currentMethod: PayoutMethod | null;
  onSaved: (summary: EarningsSummary) => void;
}) {
  const [bankCode, setBankCode] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");

  // Reset on open — adjust-state-during-render, not an effect.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setBankCode("");
      setAccountNumber("");
    }
  }

  const { data: banks } = useQuery({
    queryKey: ["banks"],
    queryFn: ({ signal }) => api.earnings.banks(signal),
    enabled: open,
    staleTime: Infinity,
  });

  const valid = bankCode !== "" && /^\d{10}$/.test(accountNumber);

  // Resolve the account holder's name once a bank + full account number are present.
  const resolved = useQuery({
    queryKey: ["resolve-account", bankCode, accountNumber],
    queryFn: ({ signal }) => api.earnings.resolveAccount(bankCode, accountNumber, signal),
    enabled: open && valid,
    retry: false,
    staleTime: Infinity,
  });

  const save = useMutation({
    mutationFn: () => api.earnings.setPayoutMethod(bankCode, accountNumber),
    onSuccess: (summary) => {
      onSaved(summary);
      onClose();
    },
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={currentMethod ? "Change payout account" : "Add payout account"}
    >
      <div className="space-y-3">
        <label className="block">
          <span className="text-subtle mb-1 block text-xs font-medium">Bank</span>
          <select
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            className="border-line bg-surface focus-visible:outline-ring h-11 w-full rounded-lg border px-3 text-sm focus-visible:outline-2"
          >
            <option value="" disabled>
              Choose your bank
            </option>
            {banks?.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-subtle mb-1 block text-xs font-medium">Account number</span>
          <input
            inputMode="numeric"
            autoComplete="off"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="0123456789"
            className="border-line bg-surface focus-visible:outline-ring h-11 w-full rounded-lg border px-3 text-sm tabular-nums focus-visible:outline-2"
          />
        </label>

        {/* Resolution feedback — confirm the name before saving (anti-typo, anti-fraud). */}
        <div aria-live="polite" className="min-h-11">
          {valid && resolved.isFetching && (
            <p className="text-subtle flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking account…
            </p>
          )}
          {valid && resolved.isError && (
            <p className="text-danger flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              {resolved.error instanceof Error
                ? resolved.error.message
                : "Couldn't verify that account"}
            </p>
          )}
          {resolved.data && (
            <p className="border-success/30 bg-success/10 text-success flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium">
              <Check className="h-4 w-4 shrink-0" aria-hidden /> {resolved.data.accountName}
            </p>
          )}
        </div>

        <Button
          block
          busy={save.isPending}
          disabled={!resolved.data || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving…" : "Save payout account"}
        </Button>
        {save.isError && (
          <p className="text-danger text-center text-sm" role="alert">
            {save.error instanceof Error ? save.error.message : "Couldn't save that account."}
          </p>
        )}
        <p className="text-subtle text-center text-xs">
          We confirm the account name with your bank. Your full number is never shown again.
        </p>
      </div>
    </Sheet>
  );
}
