"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { signIn } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";

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

type Phase = "phone" | "code" | "profile";

export function AuthFlow() {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("phone");
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [challengeId, setChallengeId] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [campus, setCampus] = React.useState<string | null>(null);

  const start = useMutation({
    mutationFn: () => api.auth.otp(phone.trim()),
    onSuccess: (r) => {
      setChallengeId(r.challengeId);
      setPhase("code");
    },
  });

  const verify = useMutation({
    mutationFn: () => api.auth.verify(challengeId, code.trim()),
    onSuccess: (r) => {
      if (r.isNew) setPhase("profile");
      else {
        signIn(r.user);
        router.push("/feed");
      }
    },
  });

  const finish = useMutation({
    mutationFn: () =>
      api.auth.completeProfile({ handle: handle.trim().toLowerCase(), displayName, campus }),
    onSuccess: (r) => {
      signIn(r.user);
      router.push("/feed");
    },
  });

  return (
    <main id="main" className="min-h-dscreen mx-auto flex max-w-md flex-col px-6 pt-10 pb-12">
      <div className="flex items-center gap-3">
        {phase !== "phone" && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => setPhase(phase === "code" ? "phone" : "code")}
            className="text-muted hover:text-fg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <Wordmark markSize={32} className="text-xl" />
      </div>

      {phase === "phone" && (
        <form
          className="mt-12 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (phone.trim()) start.mutate();
          }}
        >
          <h1 className="text-3xl font-semibold tracking-tight">Get started</h1>
          <p className="text-muted mt-2 text-sm">
            Enter your phone number to join your campus. We&apos;ll text you a code.
          </p>
          <label htmlFor="phone" className="text-subtle mt-8 mb-1 block text-xs font-medium">
            Phone number
          </label>
          <input
            id="phone"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0801 234 5678"
            className="border-line bg-surface focus-visible:outline-ring h-12 w-full rounded-lg border px-4 text-base focus-visible:outline-2"
          />
          {start.isError && (
            <p className="text-danger mt-2 text-sm" role="alert">
              {start.error instanceof Error ? start.error.message : "Couldn't send a code."}
            </p>
          )}
          <Button
            size="lg"
            block
            className="mt-auto"
            busy={start.isPending}
            disabled={!phone.trim() || start.isPending}
          >
            {start.isPending ? "Sending…" : "Send code"}
          </Button>
          <p className="text-subtle mt-3 text-center text-xs">
            By continuing you agree to our Terms &amp; Privacy Policy.
          </p>
        </form>
      )}

      {phase === "code" && (
        <form
          className="mt-12 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim().length === 6) verify.mutate();
          }}
        >
          <h1 className="text-3xl font-semibold tracking-tight">Enter your code</h1>
          <p className="text-muted mt-2 text-sm">
            We sent a 6-digit code to <span className="text-fg font-medium">{phone}</span>.
          </p>
          <label htmlFor="code" className="sr-only">
            Verification code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            className="border-line bg-surface focus-visible:outline-ring mt-8 h-14 w-full rounded-lg border px-4 text-center text-2xl font-semibold tracking-[0.4em] tabular-nums focus-visible:outline-2"
          />
          {verify.isError && (
            <p className="text-danger mt-2 text-sm" role="alert">
              {verify.error instanceof Error ? verify.error.message : "Couldn't verify that code."}
            </p>
          )}
          <p className="text-subtle mt-3 text-xs">Demo code: 123456</p>
          <Button
            size="lg"
            block
            className="mt-auto"
            busy={verify.isPending}
            disabled={code.trim().length !== 6 || verify.isPending}
          >
            {verify.isPending ? "Verifying…" : "Verify"}
          </Button>
        </form>
      )}

      {phase === "profile" && (
        <form
          className="mt-12 flex flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (handle.trim() && displayName.trim()) finish.mutate();
          }}
        >
          <h1 className="text-3xl font-semibold tracking-tight">Set up your profile</h1>
          <p className="text-muted mt-2 text-sm">This is how your campus will find you.</p>

          <label htmlFor="dn" className="text-subtle mt-8 mb-1 block text-xs font-medium">
            Display name
          </label>
          <input
            id="dn"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            placeholder="Ada"
            className="border-line bg-surface focus-visible:outline-ring h-12 w-full rounded-lg border px-4 text-base focus-visible:outline-2"
          />

          <label htmlFor="hn" className="text-subtle mt-4 mb-1 block text-xs font-medium">
            Username
          </label>
          <div className="border-line bg-surface focus-within:outline-ring flex h-12 items-center rounded-lg border px-4 focus-within:outline-2">
            <span className="text-subtle">@</span>
            <input
              id="hn"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9._]/gi, "").slice(0, 20))}
              placeholder="ada.beats"
              autoCapitalize="none"
              className="ml-0.5 h-full flex-1 bg-transparent text-base outline-none"
            />
          </div>

          <label htmlFor="cp" className="text-subtle mt-4 mb-1 block text-xs font-medium">
            Campus
          </label>
          <select
            id="cp"
            value={campus ?? ""}
            onChange={(e) => setCampus(e.target.value || null)}
            className="border-line bg-surface focus-visible:outline-ring h-12 w-full rounded-lg border px-4 text-base focus-visible:outline-2"
          >
            <option value="">Choose your campus</option>
            {CAMPUSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {finish.isError && (
            <p className="text-danger mt-2 text-sm" role="alert">
              {finish.error instanceof Error ? finish.error.message : "Couldn't save your profile."}
            </p>
          )}
          <Button
            size="lg"
            block
            className="mt-auto"
            busy={finish.isPending}
            disabled={!handle.trim() || !displayName.trim() || finish.isPending}
          >
            {finish.isPending ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> Setting up…
              </>
            ) : (
              "Enter Skylora"
            )}
          </Button>
        </form>
      )}
    </main>
  );
}
