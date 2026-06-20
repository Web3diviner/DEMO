"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import type { Me, Profile } from "@/lib/api/types";

const CAMPUSES = [
  "UNILAG",
  "UI Ibadan",
  "OAU",
  "ABU Zaria",
  "UNN",
  "UNIBEN",
  "LASU",
  "Covenant",
  "UNILORIN",
  "FUTA",
];

const BIO_MAX = 160;

export function EditProfileScreen() {
  const qc = useQueryClient();
  const router = useRouter();

  const { data: me, status } = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => api.me.get(signal),
  });

  const [displayName, setDisplayName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [campus, setCampus] = React.useState<string | null>(null);

  // Seed the form once, when `me` first loads — adjust-state-during-render.
  const [seededId, setSeededId] = React.useState<string | null>(null);
  if (me && seededId !== me.handle) {
    setSeededId(me.handle);
    setDisplayName(me.displayName);
    setBio(me.bio);
    setCampus(me.campus);
  }

  const save = useMutation({
    mutationFn: () => api.me.update({ displayName: displayName.trim(), bio, campus }),
    onSuccess: (updated: Me) => {
      qc.setQueryData(["me"], updated);
      // Keep the public Talent Hub cache in sync without a refetch.
      qc.setQueryData<Profile>(["profile", updated.handle], (prev) =>
        prev
          ? {
              ...prev,
              bio: updated.bio,
              creator: {
                ...prev.creator,
                displayName: updated.displayName,
                campus: updated.campus,
              },
            }
          : prev,
      );
      router.push("/profile");
    },
  });

  const nameError = displayName.trim() === "";
  const dirty =
    !!me && (displayName.trim() !== me.displayName || bio !== me.bio || campus !== me.campus);

  return (
    <main id="main" className="mx-auto max-w-md px-4 pt-6 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/profile" aria-label="Back to profile" className="text-muted hover:text-fg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit profile</h1>
      </div>

      {status === "pending" && <div className="bg-surface mt-6 h-64 animate-pulse rounded-lg" />}

      {status === "success" && me && (
        <form
          className="mt-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nameError && dirty) save.mutate();
          }}
        >
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="bg-brand text-brand-fg grid h-20 w-20 place-items-center rounded-full text-3xl font-bold">
              {displayName.charAt(0) || me.displayName.charAt(0)}
            </div>
            <div className="text-subtle text-xs">
              Your photo uploads with the same flow as clips.
              <br />
              Coming soon.
            </div>
          </div>

          {/* Display name */}
          <label className="block">
            <span className="text-subtle mb-1 block text-xs font-medium">Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              className="border-line bg-surface focus-visible:outline-ring h-11 w-full rounded-lg border px-3 text-sm focus-visible:outline-2"
            />
          </label>

          {/* Handle (read-only) */}
          <label className="block">
            <span className="text-subtle mb-1 block text-xs font-medium">Username</span>
            <div className="border-line bg-elevated text-muted flex h-11 items-center rounded-lg border px-3 text-sm">
              @{me.handle}
            </div>
          </label>

          {/* Bio */}
          <label className="block">
            <span className="text-subtle mb-1 block text-xs font-medium">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
              rows={3}
              className="border-line bg-surface focus-visible:outline-ring w-full resize-none rounded-lg border p-3 text-sm focus-visible:outline-2"
            />
            <span className="text-subtle mt-1 block text-right text-xs tabular-nums">
              {bio.length}/{BIO_MAX}
            </span>
          </label>

          {/* Campus */}
          <label className="block">
            <span className="text-subtle mb-1 block text-xs font-medium">Campus</span>
            <select
              value={campus ?? ""}
              onChange={(e) => setCampus(e.target.value || null)}
              className="border-line bg-surface focus-visible:outline-ring h-11 w-full rounded-lg border px-3 text-sm focus-visible:outline-2"
            >
              <option value="">Not set</option>
              {CAMPUSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <Button block busy={save.isPending} disabled={save.isPending || nameError || !dirty}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
          {save.isError && (
            <p className="text-danger text-center text-sm" role="alert">
              {save.error instanceof Error ? save.error.message : "Couldn't save your profile."}
            </p>
          )}
        </form>
      )}
    </main>
  );
}
