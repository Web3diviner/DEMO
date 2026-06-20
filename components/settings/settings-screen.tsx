"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, ChevronRight, Crown, Gauge, LogOut, Shield } from "lucide-react";
import { useDataPolicy } from "@/lib/hooks/use-data-policy";
import { getPushState, enablePush, disablePush, type PushState } from "@/lib/push/web-push";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils/cn";

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-brand" : "bg-elevated",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

function Row({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-4">
      <span className="bg-elevated text-muted grid h-9 w-9 shrink-0 place-items-center rounded-full">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-subtle text-xs">{desc}</p>
      </div>
      {children}
    </div>
  );
}

export function SettingsScreen() {
  const { policy, manualDataSaver, setManualDataSaver } = useDataPolicy();
  const [push, setPush] = React.useState<PushState>("unsupported");
  const [busy, setBusy] = React.useState(false);

  // Read current push state on mount (async continuation — lint-safe, no sync setState in effect).
  React.useEffect(() => {
    let active = true;
    void getPushState().then((s) => active && setPush(s));
    return () => {
      active = false;
    };
  }, []);

  const togglePush = async () => {
    setBusy(true);
    try {
      const next = push === "subscribed" ? await disablePush() : await enablePush();
      setPush(next);
      if (next === "subscribed") track({ type: "route_view", path: "/settings:push-on" });
    } finally {
      setBusy(false);
    }
  };

  const pushDesc =
    push === "unsupported"
      ? "Not supported on this device"
      : push === "denied"
        ? "Blocked — enable in browser settings"
        : push === "subscribed"
          ? "On — battle results, earnings & DMs"
          : "Off — turn on to get notified";

  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-6 pb-28">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <section className="mt-4">
        <h2 className="text-subtle mb-1 text-xs font-medium uppercase">Notifications &amp; data</h2>
        <div className="divide-line divide-y">
          <Row icon={Bell} title="Push notifications" desc={pushDesc}>
            <Toggle
              label="Push notifications"
              checked={push === "subscribed"}
              disabled={busy || push === "unsupported" || push === "denied"}
              onChange={togglePush}
            />
          </Row>
          <Row
            icon={Gauge}
            title="Data Saver"
            desc={
              policy.dataSaver
                ? `On — capped at ${policy.maxHeight}p, no auto-prefetch`
                : `Off — up to ${policy.maxHeight}p on Wi-Fi`
            }
          >
            <Toggle
              label="Data Saver"
              checked={manualDataSaver || policy.dataSaver}
              disabled={policy.dataSaver && !manualDataSaver}
              onChange={() => setManualDataSaver(!manualDataSaver)}
            />
          </Row>
        </div>
        {policy.dataSaver && !manualDataSaver && (
          <p className="text-subtle mt-1 text-xs">Data Saver is on automatically (cellular).</p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-subtle mb-1 text-xs font-medium uppercase">Account</h2>
        <div className="divide-line divide-y">
          <Link href="/memberships" className="flex items-center gap-3 py-4">
            <span className="bg-elevated text-muted grid h-9 w-9 shrink-0 place-items-center rounded-full">
              <Crown className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Memberships</p>
              <p className="text-subtle text-xs">Your Fan Club subscriptions</p>
            </div>
            <ChevronRight className="text-subtle h-4 w-4" aria-hidden />
          </Link>
          <Row icon={Shield} title="Privacy" desc="Manage your data and consent" />
          <button
            type="button"
            className="text-danger flex w-full items-center gap-3 py-4 text-left"
          >
            <span className="bg-danger/10 text-danger grid h-9 w-9 shrink-0 place-items-center rounded-full">
              <LogOut className="h-4 w-4" />
            </span>
            <span className="font-medium">Sign out</span>
          </button>
        </div>
      </section>

      <p className="text-subtle mt-8 text-center text-xs">Skylora · mobile-web (PWA)</p>
    </main>
  );
}
