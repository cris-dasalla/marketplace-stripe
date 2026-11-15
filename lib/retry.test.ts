import { describe, expect, it, vi } from "vitest";
import { retryUntil } from "./retry";

const noSleep = () => Promise.resolve();

describe("retryUntil", () => {
  it("returns immediately when the first result is done", async () => {
    const fetch = vi.fn().mockResolvedValue("paid");
    expect(await retryUntil(fetch, (v) => v === "paid", { sleep: noSleep })).toBe("paid");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("keeps checking until the session becomes paid", async () => {
    const fetch = vi.fn().mockResolvedValueOnce("unpaid").mockResolvedValueOnce("unpaid").mockResolvedValue("paid");
    expect(await retryUntil(fetch, (v) => v === "paid", { sleep: noSleep })).toBe("paid");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("gives up after the attempt limit and returns the last result", async () => {
    const fetch = vi.fn().mockResolvedValue("unpaid");
    expect(await retryUntil(fetch, (v) => v === "paid", { attempts: 4, sleep: noSleep })).toBe("unpaid");
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});
