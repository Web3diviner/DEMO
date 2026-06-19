import { describe, it, expect } from "vitest";
import { chunkSizeFor } from "./tus-upload";
import { maybePrecompress } from "./precompress";
import type { DataPolicy } from "@/lib/connection";

const cellular: DataPolicy = { maxHeight: 480, prefetch: false, dataSaver: true };
const wifi: DataPolicy = { maxHeight: 720, prefetch: true, dataSaver: false };

describe("upload chunk sizing", () => {
  it("uses smaller chunks on cellular for finer-grained resume", () => {
    expect(chunkSizeFor(cellular)).toBe(2 * 1024 * 1024);
  });
  it("uses larger chunks on Wi-Fi for throughput", () => {
    expect(chunkSizeFor(wifi)).toBe(8 * 1024 * 1024);
  });
  it("cellular chunk is strictly smaller than Wi-Fi", () => {
    expect(chunkSizeFor(cellular)).toBeLessThan(chunkSizeFor(wifi));
  });
});

describe("pre-compression policy", () => {
  const file = new File([new Uint8Array(1024)], "clip.mp4", { type: "video/mp4" });

  it("never pre-compresses on cellular (data is the user's money)", async () => {
    const r = await maybePrecompress(file, cellular);
    expect(r.applied).toBe(false);
    expect(r.reason).toBe("cellular");
    expect(r.file).toBe(file);
  });

  it("on Wi-Fi without WebCodecs, skips as unsupported", async () => {
    // jsdom has no VideoEncoder.
    const r = await maybePrecompress(file, wifi);
    expect(r.applied).toBe(false);
    expect(r.reason).toBe("unsupported");
  });
});
