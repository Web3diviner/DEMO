"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bell,
  ChevronRight,
  Coins,
  Crown,
  Gauge,
  LogOut,
  Mail,
  MessageCircle,
  Shield,
  Swords,
  UserPlus,
} from "lucide-react";
import { useDataPolicy } from "@/lib/hooks/use-data-policy";
import { getPushState, enablePush, disablePush, type PushState } from "@/lib/push/web-push";
import { api } from "@/lib/api/client";
import { useSession, signOut, KYC_LABEL } from "@/lib/auth/session";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils/cn";
import { VerifyIdentitySheet } from "./verify-identity-sheet";
import type { NotificationPrefKey, NotificationPrefs } from "@/lib/api/types";

const NOTIF_CATEGORIES: {
  key: NotificationPrefKey;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "tips",
    title: "Tips & earnings",
    desc: "When fans support you or a payout is ready",
    icon: Coins,
  },
  {
    key: "battles",
    title: "Battle results",
    desc: "Match starts, votes and outcomes",
    icon: Swords,
  },
  { key: "follows", title: "New followers", desc: "When someone follows you", icon: UserPlus },
  {
    key: "comments",
    title: "Comments",
    desc: "Replies and mentions on your clips",
    icon: MessageCircle,
  },
  { key: "messages", title: "Direct messages", desc: "New DMs", icon: Mail },
];

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
  const qc = useQueryClient();
  const router = useRouter();
  const session = useSession();
  const [verifyOpen, setVerifyOpen] = React.useState(false);
  const { policy, manualDataSaver, setManualDataSaver } = useDataPolicy();
  const [push, setPush] = React.useState<PushState>("unsupported");
  const [busy, setBusy] = React.useState(false);

  const { data: prefs } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: ({ signal }) => api.notifications.preferences(signal),
  });

  const setPref = useMutation({
    mutationFn: ({ key, value }: { key: NotificationPrefKey; value: boolean }) =>
      api.notifications.setPreference(key, value),
    onMutate: ({ key, value }) => {
      const prev = qc.getQueryData<NotificationPrefs>(["notification-prefs"]);
      if (prev)
        qc.setQueryData<NotificationPrefs>(["notification-prefs"], { ...prev, [key]: value });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["notification-prefs"], ctx.prev),
    onSuccess: (next) => qc.setQueryData(["notification-prefs"], next),
  });

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
    <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-6 pb-28">
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
        <h2 className="text-subtle mb-1 text-xs font-medium uppercase">
          What you&apos;re notified about
        </h2>
        <div className="divide-line divide-y">
          {NOTIF_CATEGORIES.map(({ key, title, desc, icon }) => (
            <Row key={key} icon={icon} title={title} desc={desc}>
              <Toggle
                label={title}
                checked={prefs ? prefs[key] : false}
                disabled={!prefs || (setPref.isPending && setPref.variables?.key === key)}
                onChange={() => prefs && setPref.mutate({ key, value: !prefs[key] })}
              />
            </Row>
          ))}
        </div>
        <p className="text-subtle mt-1 text-xs">
          Applies when push notifications are on. You can still see everything in Activity.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-subtle mb-1 text-xs font-medium uppercase">Account</h2>
        <div className="divide-line divide-y">
          <div className="flex items-center gap-3 py-4">
            <span className="bg-elevated text-muted grid h-9 w-9 shrink-0 place-items-center rounded-full">
              <BadgeCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Verification</p>
              <p className="text-subtle text-xs">
                {session.user ? KYC_LABEL[session.user.kycTier] : "Not signed in"}
                {session.user?.verifiedCreator ? " · Creator" : ""}
                {session.user?.verifiedFan ? " · Verified fan" : ""}
              </p>
            </div>
            {session.user && session.user.kycTier < 2 && (
              <button
                type="button"
                onClick={() => setVerifyOpen(true)}
                className="text-brand text-sm font-medium"
              >
                Verify identity
              </button>
            )}
          </div>
          {session.user && !session.user.verifiedFan && !session.user.verifiedCreator && (
            <Link href="/fan/verify" className="flex items-center gap-3 py-4">
              <span className="bg-brand/15 text-brand grid h-9 w-9 shrink-0 place-items-center rounded-full">
                <BadgeCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Become a verified fan</p>
                <p className="text-subtle text-xs">2× your votes · &lt; $1</p>
              </div>
              <ChevronRight className="text-subtle h-4 w-4" aria-hidden />
            </Link>
          )}
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
          <Link href="/settings/privacy" className="flex items-center gap-3 py-4">
            <span className="bg-elevated text-muted grid h-9 w-9 shrink-0 place-items-center rounded-full">
              <Shield className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Privacy</p>
              <p className="text-subtle text-xs">Visibility, messages &amp; comments</p>
            </div>
            <ChevronRight className="text-subtle h-4 w-4" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => {
              signOut();
              router.push("/");
            }}
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

      <VerifyIdentitySheet open={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </main>
  );
}
