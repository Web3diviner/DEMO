import type { TopUpIntent } from "@/lib/api/types";

/**
 * Paystack Inline checkout.
 *
 * The popup only collects payment; it does NOT credit anything. Confirmation is the backend's job
 * (it verifies the Paystack webhook), and the client learns the outcome by polling top-up status.
 * So this resolves "completed" / "cancelled" purely as a UX signal to start polling.
 *
 * Mock / no-key mode: there is no real Paystack key in dev, so we resolve "completed" immediately
 * (the mock's status poll then walks pending → success). Swapping in the real popup is a one-branch
 * change gated on NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export type CheckoutOutcome = "completed" | "cancelled";

type PaystackPopup = {
  resumeTransaction: (
    accessCode: string,
    handlers?: { onSuccess?: () => void; onCancel?: () => void; onError?: () => void },
  ) => void;
};

declare global {
  interface Window {
    PaystackPop?: { new (): PaystackPopup };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadPaystackScript(): Promise<void> {
  if (typeof window !== "undefined" && window.PaystackPop) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v2/inline.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Paystack"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export async function openCheckout(intent: TopUpIntent): Promise<CheckoutOutcome> {
  if (USE_MOCK || !PUBLIC_KEY) {
    // Simulate the user completing the popup; real confirmation still comes from status polling.
    await new Promise((r) => setTimeout(r, 450));
    return "completed";
  }

  await loadPaystackScript();
  if (!window.PaystackPop) throw new Error("Paystack unavailable");

  return new Promise<CheckoutOutcome>((resolve) => {
    const popup = new window.PaystackPop!();
    popup.resumeTransaction(intent.accessCode, {
      onSuccess: () => resolve("completed"),
      onCancel: () => resolve("cancelled"),
      onError: () => resolve("cancelled"),
    });
  });
}
