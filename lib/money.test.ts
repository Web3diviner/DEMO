import { describe, it, expect } from "vitest";
import {
  fromMinor,
  fromMajor,
  add,
  subtract,
  multiply,
  gte,
  format,
  zero,
  MoneyError,
} from "./money";

describe("money — integer minor units", () => {
  it("rejects non-integer minor amounts", () => {
    expect(() => fromMinor(10.5, "NGN")).toThrow(MoneyError);
  });

  it("converts major → minor correctly per currency", () => {
    expect(fromMajor(500, "NGN").minor).toBe(50_000); // 500 NGN = 50,000 kobo
    expect(fromMajor(1, "USD").minor).toBe(100); // $1 = 100 cents
    expect(fromMajor(1240, "CREDITS").minor).toBe(1240); // Credits have no sub-unit
  });

  it("adds and subtracts within a currency", () => {
    expect(add(fromMinor(100, "NGN"), fromMinor(50, "NGN")).minor).toBe(150);
    expect(subtract(fromMinor(100, "CREDITS"), fromMinor(30, "CREDITS")).minor).toBe(70);
  });

  it("refuses to mix currencies", () => {
    expect(() => add(fromMinor(1, "NGN"), fromMinor(1, "USD"))).toThrow(MoneyError);
    expect(() => gte(fromMinor(1, "CREDITS"), fromMinor(1, "NGN"))).toThrow(MoneyError);
  });

  it("multiplies by a vote count and stays integer", () => {
    expect(multiply(fromMinor(25, "CREDITS"), 3).minor).toBe(75);
    expect(multiply(fromMinor(33, "CREDITS"), 2.5).minor).toBe(83); // rounds
  });

  it("formats Credits as a count (never a currency symbol)", () => {
    expect(format(fromMinor(1, "CREDITS"))).toBe("1 Credit");
    expect(format(fromMinor(1240, "CREDITS"))).toMatch(/1,240 Credits/);
    expect(format(fromMinor(1240, "CREDITS"))).not.toMatch(/[₦$]/);
  });

  it("formats NGN with currency", () => {
    expect(format(fromMinor(875_000, "NGN"))).toMatch(/8,750/);
  });

  it("zero helper", () => {
    expect(zero("CREDITS").minor).toBe(0);
  });
});
