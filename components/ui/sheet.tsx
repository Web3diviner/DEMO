"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Accessible bottom sheet (mobile-native pattern).
 *
 * - `role="dialog"` + `aria-modal`; labelled by its title.
 * - Focus moves in on open and is restored to the trigger on close.
 * - Tab is trapped within the sheet; Escape and backdrop click close it.
 * - Body scroll is locked while open. Motion respects reduced-motion (token-driven).
 */
type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional id for the title element (defaults generated). */
  className?: string;
};

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const restoreRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the sheet.
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
    );
    (focusable ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="bg-overlay absolute inset-0 animate-[fadeIn_var(--dur-2)_var(--ease-out)]"
      />
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "bg-canvas border-line absolute inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t",
          "flex flex-col outline-none",
          "motion-safe:animate-[slideUp_var(--dur-3)_var(--ease-out)]",
          className,
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Grab handle */}
        <div className="flex shrink-0 justify-center pt-2.5 pb-1">
          <span className="bg-line-strong h-1 w-10 rounded-full" aria-hidden />
        </div>
        <h2 id={titleId} className="shrink-0 px-4 pt-1 pb-3 text-center text-base font-semibold">
          {title}
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}
