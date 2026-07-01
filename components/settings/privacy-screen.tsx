"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Eye,
  Lock,
  MessageCircle,
  Radio,
  UserX,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import type { PrivacySettings } from "@/lib/api/types";

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

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="bg-elevated inline-flex rounded-lg p-0.5">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-brand text-brand-fg" : "text-muted hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
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
  children: React.ReactNode;
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

export function PrivacyScreen() {
  const qc = useQueryClient();
  const { data, status } = useQuery({
    queryKey: ["privacy"],
    queryFn: ({ signal }) => api.privacy.get(signal),
  });

  const update = useMutation({
    mutationFn: (next: PrivacySettings) => api.privacy.update(next),
    onMutate: (next) => {
      const prev = qc.getQueryData<PrivacySettings>(["privacy"]);
      qc.setQueryData<PrivacySettings>(["privacy"], next);
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["privacy"], ctx.prev),
    onSuccess: (saved) => qc.setQueryData(["privacy"], saved),
  });

  const set = (patch: Partial<PrivacySettings>) => data && update.mutate({ ...data, ...patch });

  return (
    <main id="main" className="mx-auto max-w-full md:max-w-6xl px-4 pt-6 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/settings" aria-label="Back to settings" className="text-muted hover:text-fg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Privacy</h1>
      </div>

      {status === "pending" && <div className="bg-surface mt-6 h-72 animate-pulse rounded-lg" />}

      {status === "success" && data && (
        <>
          <section className="mt-4">
            <h2 className="text-subtle mb-1 text-xs font-medium uppercase">Visibility</h2>
            <div className="divide-line divide-y">
              <Row
                icon={Lock}
                title="Private account"
                desc="Only approved followers can see your clips"
              >
                <Toggle
                  label="Private account"
                  checked={data.privateAccount}
                  onChange={() => set({ privateAccount: !data.privateAccount })}
                />
              </Row>
              <Row icon={Radio} title="Activity status" desc="Show others when you're active">
                <Toggle
                  label="Activity status"
                  checked={data.activityStatus}
                  onChange={() => set({ activityStatus: !data.activityStatus })}
                />
              </Row>
              <Row icon={Download} title="Allow downloads" desc="Let others save your clips">
                <Toggle
                  label="Allow downloads"
                  checked={data.allowDownloads}
                  onChange={() => set({ allowDownloads: !data.allowDownloads })}
                />
              </Row>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-subtle mb-1 text-xs font-medium uppercase">Who can reach you</h2>
            <div className="divide-line divide-y">
              <Row icon={MessageCircle} title="Messages" desc="Who can send you direct messages">
                <Segmented
                  label="Messages from"
                  value={data.messagesFrom}
                  onChange={(v) => set({ messagesFrom: v })}
                  options={[
                    { value: "everyone", label: "Everyone" },
                    { value: "following", label: "Following" },
                  ]}
                />
              </Row>
              <Row icon={Eye} title="Comments" desc="Who can comment on your clips">
                <Segmented
                  label="Comments from"
                  value={data.commentsFrom}
                  onChange={(v) => set({ commentsFrom: v })}
                  options={[
                    { value: "everyone", label: "All" },
                    { value: "following", label: "Following" },
                    { value: "off", label: "Off" },
                  ]}
                />
              </Row>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-subtle mb-1 text-xs font-medium uppercase">Safety</h2>
            <Link href="/settings/privacy/blocked" className="flex items-center gap-3 py-4">
              <span className="bg-elevated text-muted grid h-9 w-9 shrink-0 place-items-center rounded-full">
                <UserX className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Blocked accounts</p>
                <p className="text-subtle text-xs">Manage who you&apos;ve blocked</p>
              </div>
              <ChevronRight className="text-subtle h-4 w-4" aria-hidden />
            </Link>
          </section>

          <p className="text-subtle mt-6 text-xs">
            Changes save automatically and apply across your account.
          </p>
        </>
      )}
    </main>
  );
}
